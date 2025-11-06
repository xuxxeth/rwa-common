import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../components/button';
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain, useWallets } from '../wallet/hooks/hooks';
import { WalletProvider } from '../wallet/providers/WalletProvider';
import {  xLayerTestnet } from '../wallet/config/chains';
import { ChainId, ConnectorType } from '../wallet/types';
import { useTrading } from '../contract/hooks/useTrading';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useClient } from '../wallet/hooks/useClient';
import { bscTestnet, x1Testnet } from 'viem/chains';

import '../utils/parseError'
import { TradingNetworks, useTradeUtils } from '../contract';
import { useSignature } from '../wallet/hooks/useSignature';
import { useTokenBalances } from '../wallet/index'
import { Address, parseEther } from 'viem';
import { RESPONSE_CODE } from '../utils/constants';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: 'Example/Trading',
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: 'centered',
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  // tags: ['autodocs'],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {
    // backgroundColor: { control: 'color' },
  },
  // Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#action-args
  // args: { onClick: fn() },
};

export default meta;

type Story = StoryObj<typeof meta>;

const chains = [bscTestnet, xLayerTestnet]

export const TradingApp: React.FC = () => {
  const [innerChains, setInnerChains] = useState<any[]>([])
  useEffect(() => {
    setInnerChains(chains)
  }, [])
  return (
    <WalletProvider config={{ chains: innerChains, defaultChainId: 97 }}>
      <TradingDemo />
    </WalletProvider>
  )
  
}
const TradingDemo: React.FC = () => {

  const wallets = useWallets()
  const connect = useConnect()
  const disconnect = useDisconnect()
  const account = useAccount()
  const chainId = useChainId()
  const switchChain = useSwitchChain()
  const [action, setAction] = useState('buy')
  const [limitPrice, setLimitPrice] = useState('231')
  const [size, setSize] = useState('2')
  const [orderId, setOrderId] = useState('29532595632996353')

  const { requestSignature } = useSignature()
  const { getTokenBalances } = useTokenBalances()
  const [trading, setTrading] = useState<Address | undefined>(undefined)

  const usdt = '0xbeD5856646F1faBDFc565F47f8Ea18685466B745'
  const applec = '0xf552b97B36daC3f263eeb0f930F11E5a065f9d96'

  const payToken = useMemo(() => action === 'buy' ? usdt : applec, [action] )
  const amount = useMemo(() => (BigInt(limitPrice) * BigInt(size)) * BigInt((10 ** 6)), [limitPrice, size])

  const { approvalState, allowance, approve, placeOrder,  } = useTrading(usdt, trading, BigInt(amount))
  console.log(approvalState, allowance)
  const { publicClient} = useClient()
  const { cancelOrder } = useTradeUtils(trading)

  useEffect(() => {
     publicClient?.getBlockNumber() 
      .then(res => {
        console.log(res)
      })

      setTimeout(() => {
        setTrading('0x6c5A81eC1D8cF4A389F6Cc9498A3096CF823cb88')
      }, 500)
  }, [publicClient])

  useEffect(() => {
    if (account) {
      getTokenBalances(account, [usdt, applec])
        .then(res => {
          console.log(res)
        })
    }
    
  }, [account, getTokenBalances])

  const handlePlaceOrder = useCallback(async () => {
    const params = {
      stockId: '1',
      tradeType: '0',
      side: action === 'buy' ? '0' : '1',
      tif: '0',
      sessionType: '0',
      paymentToken: usdt, // address
      validDate: '1', // s
      networkFee: '0', // 0.002
      amount: '0', // 10 usdt
      price: '270000000',   // 1 usdt
      size: '5000000'    // 10
    }
    console.log('params: ', params)
    const res = await placeOrder(params, {wait: true, value: parseEther('0.0001').toString()})
    console.log(res)
    if (res && res.code !== 9200) {
      // @ts-ignore
      alert(res.data.message)
    }
  }, [placeOrder, limitPrice, amount, payToken, action])

  console.log('approvalState: ', approvalState)
  console.log('allowance: ', allowance)

  return (
    <>
    <div className='flex gap-x-5'>
      <div className=''>
        {
          [bscTestnet, xLayerTestnet].map(chain => {
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

    <div className='mt-[100px]'>
      <div className='mb-5'>Contract Methods: </div>
      <div className='grid gap-x-2'>
        <div className='flex gap-x-2'>
          <div>Limit price: </div>
          <input type="text" className='border' value={limitPrice} onChange={e => {
            setLimitPrice(e.target.value)
          }} />
        </div>
        <div className='flex gap-x-2'>
          <div>Size: </div>
          <input type="text" className='border' value={size} onChange={e => {
            setSize(e.target.value)
          }} />
        </div>
        <div>
          <div>Amount: {amount}</div>
        </div>
      </div>
      <div className=' flex gap-x-4 items-center mt-5'>
        <Button onClick={() => setAction('buy')} label='Buy'></Button>
        <Button onClick={() => setAction('sell')} label='Sell'></Button>
        <Button onClick={async () => {
          if (approvalState === 3) {
            handlePlaceOrder()
          } else {
            const res = await approve()
            console.log(res)
            if (res.code !== RESPONSE_CODE.SUCCESS) {
              // @ts-ignore
              alert(res.data.message || res.data.name)
            }
          }
          
            
        }} label={approvalState === 3 ? 'PlaceOrder' : 'Approve'}></Button>
      </div>
      <div className=' flex'>
        <Button onClick={() => {
          requestSignature(Math.floor(Date.now() / 1000 + 100 * 60) )
            .then(res => {
              console.log(res)
              const auth = `Bearer ecdsa-1.${res.account}-${res.nonce}-${res.expires}.${res.signature}`
              console.log(auth)
            })
        }} label='Signature'></Button>
      </div>
      <div className='flex gap-x-2 mt-10'>
        <div>订单编号: </div>
        <input type="text" className='border' value={orderId} onChange={e => {
          setOrderId(e.target.value)
        }} />
      </div>
      <div className=' flex mt-5'>
        <Button onClick={async () => {
          const res = await cancelOrder(Number(orderId), { wait: true })
          console.log(res)
          if (res.code !== 9200) {
            // @ts-ignore
            alert(res.data.message)
          }
        }} label='cancelOrder'></Button>
      </div>
    </div>
    </>

  )
}

