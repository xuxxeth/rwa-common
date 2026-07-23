

import SplitAbi from './abi.json';
import { ChainId } from '../../../wallet/types';
import type { Address } from 'viem';
import { bscContracts, bscTestContracts, xLayerTestContracts } from '../contracts';

const SplitNetworks: Record<ChainId, Address> = {
  [ChainId.BSC]: bscContracts.trading,
  [ChainId.XLAYER]: bscContracts.trading,
  [ChainId.BSCTEST]: bscTestContracts.trading,
  [ChainId.XLAYERTEST]: xLayerTestContracts.trading,
}

export {
  SplitAbi,
  SplitNetworks
}
