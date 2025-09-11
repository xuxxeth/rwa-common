

import CounterAbi from './abi.json';
import { ChainId } from '../../wallet/types';
import { Address } from 'viem';
import { bscContracts, bscTestContracts } from '../contracts';

const CounterNetworks: {[chainId in ChainId]: Address} = {
  [ChainId.BSC]: bscContracts.counter,
  [ChainId.BSCTEST]: bscTestContracts.counter,
}

export {
  CounterAbi,
  CounterNetworks
}
