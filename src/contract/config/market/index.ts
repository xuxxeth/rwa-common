

import MarketAbi from './abi.json';
import { ChainId } from '../../../wallet/types';
import type { Address } from 'viem';
import { bscContracts, bscTestContracts, xLayerTestContracts } from '../contracts';

const MarketNetworks: Record<ChainId, Address> = {
  [ChainId.BSC]: bscContracts.market,
  [ChainId.XLAYER]: bscContracts.market,
  [ChainId.BSCTEST]: bscTestContracts.market,
  [ChainId.XLAYERTEST]: xLayerTestContracts.market,
}

export {
  MarketAbi,
  MarketNetworks
}
