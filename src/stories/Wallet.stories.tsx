import type { Meta, StoryObj } from '@storybook/react-vite';

import { fn } from 'storybook/test';
import { Button } from '../components/button';
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain, useWallets } from '../wallet/hooks/hooks';
import { WalletProvider } from '../wallet/providers/WalletProvider';
import { bsc, xLayer, xLayerTestnet } from '../wallet/config/chains';
import { ConnectorType } from '../wallet/types';
import { useTrading } from '../contract/hooks/useTrading';
import { useCallback, useEffect, useState } from 'react';
import { useClient } from '../wallet/hooks/useClient';
import { useCounter } from '../contract/hooks/useCounter';
import { bscTestnet, x1Testnet } from 'viem/chains';


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
    <WalletProvider config={{ chains: [bscTestnet, xLayerTestnet], defaultChainId: 97 }}>
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

  // const { placeOrder } = useTrading()
  const { publicClient} = useClient()
  const { handleGetX, handleInc, handleIncBy } = useCounter()

  // useEffect(() => {
  //    publicClient?.getBlockNumber() 
  //     .then(res => {
  //       console.log(res)
  //     })
  // }, [handlePlaceOrder, publicClient])

  const [xValue, setXValue] = useState(0)
  const getX = useCallback(async () => {
    const res = await handleGetX()
    console.log(res)
    setXValue(Number(res))
  }, [handleGetX])

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
          <div style={{display: 'flex'}}>
            <img src={w.info.icon} style={{width: 34}} alt="" />
            <Button key={w.info.uuid} onClick={() => connect(ConnectorType.Injected, w)} label={w.info.name}></Button>
          </div>
          
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
    <div className='mt-[100px]'>
      <div className='mb-5'>Contract Methods: </div>
      <div className=' flex gap-x-4 items-center'>
        <Button onClick={() => getX()} label='Get X:'></Button> <span>[ {xValue} ]</span>
        <Button onClick={() => handleInc()} label='Inc'></Button>
        <Button onClick={() => handleIncBy('5')} label='IncBy'></Button>
        {/* <Button onClick={() => handleIncTest()} label='Get X Test'></Button> */}
      </div>
    </div>
    </>

  )
}

