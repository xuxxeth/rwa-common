import type { Meta, StoryObj } from '@storybook/react-vite';

import { fn } from 'storybook/test';
import { WalletProvider } from '../wallet/providers/WalletProvider';
import { xLayerTestnet } from '../wallet/config/chains';
import { bscTestnet } from 'viem/chains';
import { WalletPlayground } from '../examples/WalletPlayground';


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
      <WalletPlayground />
    </WalletProvider>
  )
  
}
