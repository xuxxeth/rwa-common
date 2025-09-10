import type { Meta, StoryObj } from '@storybook/react-vite';

import { fn } from 'storybook/test';
import { Button } from '../components/button';
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain, useWallets } from '../wallet/hooks/hooks';
import { WalletProvider } from '../wallet/providers/WalletProvider';
import { bsc, xLayer } from '../wallet/config/chains';
import { ConnectorType } from '../wallet/types';


// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: 'Example/Wallet',
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: 'centered',
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ['autodocs'],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {
    // backgroundColor: { control: 'color' },
  },
  // Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#action-args
  args: { onClick: fn() },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const WalletApp: React.FC = () => {
  return (
    <WalletProvider config={{ chains: [bsc, xLayer], defaultChainId: 56 }}>
      <WalletDemo />
    </WalletProvider>
  )
  
}
const WalletDemo: React.FC = () => {

  const wallets = useWallets()
  const connect = useConnect()
  const disconnect = useDisconnect()
  const account = useAccount()
  const chainId = useChainId()
  const switchChain = useSwitchChain()

  return (
    <>
    <div className='flex gap-x-5'>
      <div className=''>
        {
          [bsc, xLayer].map(chain => {
            return (
              <div key={chain.id}>
                <Button onClick={() => {
                  console.log(chain)
                  switchChain(chain.id)
                }} label={chain.name}></Button>
              </div>
            )
          })
        }
      </div>
      <div>
        {wallets.map(w => (
          <Button key={w.info.uuid} onClick={() => connect(ConnectorType.Injected, w)} label={w.info.name}></Button>
        ))}
        <div>Account: {account}</div>
        <div>ChainId: {chainId}</div>
        {
          account && <Button onClick={() => disconnect()} label='Disconnect'></Button>
        }
        
      </div>

    </div>
    <div className=' mt-11'>
      <Button onClick={() => connect(ConnectorType.WalletConnect, wallets[0] )} label='WalletConnect'></Button>
      <Button onClick={() => disconnect()} label='disconnectWC'></Button>
    </div>
    </>

  )
}

