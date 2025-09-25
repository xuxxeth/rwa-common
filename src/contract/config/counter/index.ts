

import CounterAbi from './abi.json';
import { ChainId } from '../../../wallet/types';
import { Address } from 'viem';
import { bscContracts, bscTestContracts, xLayerTestContracts } from '../contracts';

const CounterNetworks: Record<ChainId, Address> = {
  [ChainId.BSC]: bscContracts.counter,
  [ChainId.XLAYER]: bscContracts.counter,
  [ChainId.BSCTEST]: bscTestContracts.counter,
  [ChainId.XLAYERTEST]: xLayerTestContracts.counter,
}

export {
  CounterAbi,
  CounterNetworks
}
