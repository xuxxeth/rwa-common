import { Address, erc20Abi as USDTAbi } from "viem";
import { ChainId } from "../../../wallet/types";
import { bscContracts, xLayerTestContracts } from "../contracts";

const USDTNetworks: Record<ChainId, Address> = {
  [ChainId.BSC]: bscContracts.usdt,
  [ChainId.XLAYER]: bscContracts.usdt,
  [ChainId.BSCTEST]: bscContracts.usdt,
  [ChainId.XLAYERTEST]: xLayerTestContracts.usdt,
}

export {
  USDTAbi,
  USDTNetworks
}