import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../components/button';
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain, useWallets } from '../wallet/hooks/hooks';
import { WalletProvider } from '../wallet/providers/WalletProvider';
import {  xLayerTestnet } from '../wallet/config/chains';
import { ConnectorType } from '../wallet/types';
import { useTrading } from '../contract/hooks/useTrading';
import { useCallback, useEffect, useState } from 'react';
import { useClient } from '../wallet/hooks/useClient';
import { bscTestnet, x1Testnet } from 'viem/chains';


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

export const TradingApp: React.FC = () => {
  return (
    <WalletProvider config={{ chains: [bscTestnet, xLayerTestnet], defaultChainId: 97 }}>
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

  const { approvalState, placeOrder } = useTrading('0xbeD5856646F1faBDFc565F47f8Ea18685466B745', '0x7e688A997E5DF68dF6242BD0d2d9351A4BfBcDe9', BigInt('1000000000'))
  const { publicClient} = useClient()

  useEffect(() => {
     publicClient?.getBlockNumber() 
      .then(res => {
        console.log(res)
      })
  }, [publicClient])

  const handlePlaceOrder = useCallback(async () => {
    const params = {
      stockId: '1',
      tradeType: '0',
      side: '0',
      tif: '1',
      sessionType: '0',
      paymentToken: '0xbeD5856646F1faBDFc565F47f8Ea18685466B745', // address
      validDate: '10', // s
      networkFee: '30000', // 0.002
      amount: '10000000', // 10 usdt
      price: '1000000',   // 1 usdt
      size: '10000000'    // 10
    }
    const res = await placeOrder(params)
  }, [placeOrder])

  console.log(approvalState)

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
      <div className=' flex gap-x-4 items-center'>
        <Button onClick={() => handlePlaceOrder()} label='placeOrder'></Button>
      </div>
    </div>
    </>

  )
}

