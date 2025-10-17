import type { IWalletConnectConnector, WalletState, ConnectorType, EIP1193Provider } from "../types";
import { type Chain, type Address, createPublicClient, createWalletClient, custom, http } from 'viem';
import { UniversalProvider } from '@walletconnect/universal-provider';
import { getSdkError } from '@walletconnect/utils';
import { SessionTypes } from '@walletconnect/types';
import QRCode from 'qrcode';

interface WalletConnectConfig {
  projectId: string;
  chains: Chain[];
  defaultChainId?: number;
  relayUrl?: string;
}

export class WalletConnectConnector implements IWalletConnectConnector {
  private static instance: WalletConnectConnector | null = null;
  
  // 公共属性
  public connectorType: ConnectorType = 'walletconnect';
  public provider?: any;
  public session?: SessionTypes.Struct;
  
  // 私有属性
  private config: WalletConnectConfig;
  private state: WalletState = {
    accounts: [],
    chainId: null,
    connected: false
  };
  private listeners: Record<
    'accountsChanged' | 'chainChanged' | 'disconnect',
    ((...args: any[]) => void)[]
  > = {
    accountsChanged: [],
    chainChanged: [],
    disconnect: []
  };
  private qrCodeModal?: HTMLDivElement;

  // 构造函数
  private constructor(config: WalletConnectConfig) {
    this.config = {
      ...config,
      defaultChainId: config.defaultChainId || config.chains[0]?.id
    };
  }

  // 单例模式获取实例
  public static getInstance(config: WalletConnectConfig): WalletConnectConnector {
    if (!WalletConnectConnector.instance) {
      WalletConnectConnector.instance = new WalletConnectConnector(config);
    }
    return WalletConnectConnector.instance;
  }

  // 连接钱包
  async connect(pairing?: any): Promise<WalletState> {
    try {
      // 初始化Provider
      await this.initializeProvider();
      
      if (!this.provider) {
        throw new Error('WalletConnect provider not initialized');
      }

      // 断开现有连接
      if (this.session) {
        await this.disconnect();
      }

      // 监听URI生成事件
      this.provider.on('display_uri', async (uri: string) => {
        console.log('WalletConnect URI:', uri);
        await this.showQRCodeModal(uri);
      });

      // 建立连接
      const session = await this.provider.connect({
        pairingTopic: pairing?.topic,
        namespaces: this.getRequiredNamespaces()
      });

      if (!session) {
        throw new Error('Failed to establish session');
      }

      this.session = session;
      await this.onSessionConnected(session);
      
      // 关闭二维码弹窗
      this.closeQRCodeModal();
      
      return this.state;
    } catch (error) {
      this.closeQRCodeModal();
      console.error('WalletConnect connection failed:', error);
      throw error;
    }
  }

  // 断开连接
  async disconnect(): Promise<void> {
    if (this.session && this.provider?.client) {
      try {
        await this.provider.client.disconnect({
          topic: this.session.topic,
          reason: getSdkError('USER_DISCONNECTED')
        });
      } catch (error) {
        console.warn('Error during disconnect:', error);
      }
    }
    
    this.reset();
    this.emit('disconnect');
  }

  // 切换链
  async switchChain(targetChainId: number): Promise<void> {
    console.warn('WalletConnect v2 does not support programmatic chain switching');
    console.warn('Please switch chain in your wallet app:', targetChainId);
    
    this.state.chainId = targetChainId;
    this.emit('chainChanged', targetChainId);
  }

  // 获取账户
  getAccount(): Address | null {
    return this.state.accounts[0] ?? null;
  }

  // 获取所有账户
  getAccounts(): Address[] {
    return this.state.accounts;
  }

  // 获取当前链ID
  getChainId(): number | null {
    return this.state.chainId;
  }

  // 获取公共客户端
  getPublicClient(chainId?: number) {
    const chain = this.getChain(chainId ?? this.state.chainId ?? this.config.defaultChainId!);
    return createPublicClient({ chain, transport: http() });
  }

  // 获取钱包客户端
  getWalletClient(chainId?: number) {
    const chain = this.getChain(chainId ?? this.state.chainId ?? this.config.defaultChainId!);
    if (!this.provider) throw new Error('Provider not initialized');
    return createWalletClient({ chain, transport: custom(this.provider) });
  }

  // 获取连接器类型
  getConnectorType(): ConnectorType | undefined {
    return this.connectorType;
  }

  // 获取Provider
  getProvider(): EIP1193Provider | null {
    return this.provider ?? null;
  }

  // 事件监听
  on(event: 'accountsChanged' | 'chainChanged' | 'disconnect', cb: (...args: any[]) => void) {
    this.listeners[event].push(cb);
    return () => {
      this.listeners[event] = this.listeners[event].filter((l) => l !== cb);
    };
  }

  // 私有方法
  private async initializeProvider(): Promise<void> {
    if (this.provider) return;

    this.provider = await UniversalProvider.init({
      projectId: this.config.projectId,
      relayUrl: this.config.relayUrl,
      metadata: {
        name: 'CA App',
        description: 'CA App',
        url: window.location.origin,
        icons: []
      }
    });

    // 订阅事件
    this.subscribeToEvents();
  }

  private subscribeToEvents(): void {
    if (!this.provider?.client) return;

    const client = this.provider.client;

    // 会话更新
    client.on('session_update', ({ topic, params }) => {
      if (topic === this.session?.topic) {
        const _session = client.session.get(topic);
        const updatedSession = { ..._session, namespaces: params.namespaces };
        this.onSessionConnected(updatedSession);
        this.emit('accountsChanged', this.state.accounts);
        this.emit('chainChanged', this.state.chainId);
      }
    });

    // 会话删除（钱包断开连接）
    client.on('session_delete', () => {
      this.reset();
      this.emit('disconnect');
    });
  }

  private onSessionConnected(session: SessionTypes.Struct): void {
    const firstChain = this.config.chains[0];
    let accounts: Address[] = [];
    let chainId = firstChain.id;

    // 从session中提取账户信息
    if (session.namespaces.eip155) {
      const eip155Namespace = session.namespaces.eip155;
      
      // 查找配置的第一个链上的账户
      accounts = eip155Namespace.accounts
        .filter((account) => account.startsWith(`eip155:${chainId}:`))
        .map((account) => {
          const parts = account.split(':');
          return parts[2] as Address;
        });

      // 如果没有找到对应链的账户，使用第一个可用账户
      if (accounts.length === 0 && eip155Namespace.accounts.length > 0) {
        const firstAccount = eip155Namespace.accounts[0];
        const parts = firstAccount.split(':');
        accounts = [parts[2] as Address];
        chainId = parseInt(parts[1]);
      }
    }

    this.state = { accounts, chainId, connected: true };
    this.session = session;
    
    console.log('Session connected:', { accounts, chainId });
  }

  private getRequiredNamespaces() {
    return {
      eip155: {
        methods: [
          'eth_sendTransaction',
          'personal_sign',
          'eth_signTypedData'
        ],
        chains: this.config.chains.map(chain => `eip155:${chain.id}`),
        events: ['accountsChanged', 'chainChanged']
      }
    };
  }

  private getChain(id: number): Chain {
    const chain = this.config.chains.find(c => c.id === id);
    if (!chain) throw new Error(`Chain not configured: ${id}`);
    return chain;
  }

  private reset(): void {
    this.session = undefined;
    this.state = { accounts: [], chainId: null, connected: false };
  }

  private emit(event: 'accountsChanged' | 'chainChanged' | 'disconnect', ...args: any[]): void {
    for (const listener of this.listeners[event]) {
      listener(...args);
    }
  }

  // 二维码相关方法
  private async showQRCodeModal(uri: string): Promise<void> {
    this.closeQRCodeModal();

    // 创建模态框
    this.qrCodeModal = document.createElement('div');
    this.qrCodeModal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;

    // 生成二维码
    const canvas = document.createElement('canvas');
    await QRCode.toCanvas(canvas, uri, {
      width: 256,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' }
    });

    const qrCodeDataUrl = canvas.toDataURL('image/png');

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 12px;
      text-align: center;
      max-width: 400px;
      width: 90%;
    `;

    modalContent.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h3 style="margin-bottom: 15px; color: #333;">扫描二维码连接钱包</h3>
        <img src="${qrCodeDataUrl}" alt="WalletConnect QR Code" 
             style="width: 256px; height: 256px; border: 1px solid #eee; border-radius: 8px;" />
        <p style="margin-top: 15px; color: #666; font-size: 14px;">
          使用支持WalletConnect的钱包扫描二维码
        </p>
      </div>
      <div style="margin-top: 20px;">
        <button id="copyUriBtn" style="margin-right: 10px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer;">
          复制连接URI
        </button>
        <button id="closeModalBtn" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer;">
          关闭
        </button>
      </div>
    `;

    this.qrCodeModal.appendChild(modalContent);
    document.body.appendChild(this.qrCodeModal);

    // 添加事件监听
    const copyBtn = document.getElementById('copyUriBtn');
    const closeBtn = document.getElementById('closeModalBtn');

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(uri).then(() => {
          copyBtn.textContent = '已复制!';
          setTimeout(() => copyBtn.textContent = '复制连接URI', 2000);
        });
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeQRCodeModal());
    }

    this.qrCodeModal.addEventListener('click', (e) => {
      if (e.target === this.qrCodeModal) {
        this.closeQRCodeModal();
      }
    });
  }

  private closeQRCodeModal(): void {
    if (this.qrCodeModal) {
      this.qrCodeModal.remove();
      this.qrCodeModal = undefined;
    }
  }
}
