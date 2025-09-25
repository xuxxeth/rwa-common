

import TradingAbi from './abi.json';
import { ChainId } from '../../../wallet/types';
import type { Address } from 'viem';
import { bscContracts } from '../contracts';

const TradingNetworks: Record<ChainId, Address> = {
  [ChainId.BSC]: bscContracts.trading,
  [ChainId.XLAYER]: bscContracts.trading,
  [ChainId.BSCTEST]: bscContracts.trading,
  [ChainId.XLAYERTEST]: bscContracts.trading,
}

export {
  TradingAbi,
  TradingNetworks
}
