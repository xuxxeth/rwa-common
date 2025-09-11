

import TradingAbi from './abi.json';
import { ChainId } from '../../wallet/types';
import { Address } from 'viem';
import { bscContracts } from '../contracts';

const TradingNetworks: {[chainId in ChainId]: Address} = {
  [ChainId.BSC]: bscContracts.trading
}

export {
  TradingAbi,
  TradingNetworks
}
