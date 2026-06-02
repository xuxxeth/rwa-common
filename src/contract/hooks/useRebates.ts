import { useCallback, useState } from "react";
import type { Abi, Address } from "viem";
import { getContract } from "viem";
import { useAccount } from "../../wallet";
import { useClient } from "../../wallet/hooks/useClient";
import { useCallWithGasPrice } from "./useCallWithGasPrice";
import { useContract } from "./useContract";
import { waitForReceiptWithRetry } from "./useTrading";
import vaultAbi from "../config/vault/abi.json";
import { ERROR_CODE, RESPONSE_CODE } from "../../utils/constants";
import {
  extractErrorNameAndCode,
  getAppErrorMessageFromCode,
  getUserRejection,
  parseErrorFromMessage,
} from "../../utils/parseError";

export function useReferralRebates(diamondAddress: Address | undefined) {
  const account = useAccount();
  const { publicClient } = useClient();
  const { callWithGasPrice } = useCallWithGasPrice();
  const vaultContract = useContract(diamondAddress, vaultAbi as Abi);
  const [txStep, setTxStep] = useState(1);

  const getReferralRebates = useCallback(
    async (tokens: Address[]) => {
      if (!diamondAddress) {
        throw new Error("Diamond address is required");
      }
      if (!publicClient) {
        throw new Error("No valid public client");
      }
      if (!vaultContract) {
        throw new Error("Vault address is required");
      }
      const owner = account;
      if (!owner) {
        throw new Error("Account is required");
      }
      if (tokens.length === 0) {
        return [] as bigint[];
      }

      const rebates = await publicClient.readContract({
        address: diamondAddress,
        abi: vaultAbi as Abi,
        functionName: "getReferralRebates",
        args: [owner, tokens],
      });

      return rebates as bigint[];
    },
    [publicClient, vaultContract, account],
  );

  const claimReferralRebates = useCallback(
    async (
      tokens: Address[],
      amounts: bigint[],
      options?: { wait?: boolean; skipSimulate?: boolean },
    ) => {
      try {
        if (!diamondAddress || !vaultContract || !account || !publicClient) {
          return {
            code: RESPONSE_CODE.ERROR,
            data: {
              errorCode: ERROR_CODE.NOCONTRACT,
              message: "no contract or account",
            },
          };
        }

        if (
          tokens.length === 0 ||
          amounts.length === 0 ||
          tokens.length !== amounts.length
        ) {
          return {
            code: RESPONSE_CODE.ERROR,
            data: {
              errorCode: ERROR_CODE.PARAMSERROR,
              message: "tokens or amounts is empty",
            },
          };
        }

        const tx = await callWithGasPrice(
          vaultContract,
          "claimReferralRebates",
          [tokens, amounts],
          { skipSimulate: options?.skipSimulate },
        );

        setTxStep(2);
        const txRes = await waitForReceiptWithRetry(publicClient, tx.hash);

        // 交易上链成功，则返回结果
        if (txRes.code === RESPONSE_CODE.SUCCESS) {
          setTxStep(3);
          return txRes;
        }

        // 交易失败，
          return {
            code: RESPONSE_CODE.ERROR,
            data: {
              errorCode: ERROR_CODE.TXERROR,
              name: 'tx error'
            }
          };
      } catch (error: any) {
        let errorMessage: any = getUserRejection(error.toString());

        if (!errorMessage || !errorMessage.code) {
          errorMessage = extractErrorNameAndCode(error.toString());
        }
        if (!errorMessage) {
          errorMessage = parseErrorFromMessage(error.toString());
        }

        return {
          code: RESPONSE_CODE.ERROR,
          data: {
            errorCode: errorMessage?.code,
            name: errorMessage?.name,
            message:
              errorMessage?.code === ERROR_CODE.USERREJECT
                ? "userReject"
                : getAppErrorMessageFromCode(errorMessage) ||
                  "claimReferralRebatesFail",
          },
        };
      }
    },
    [vaultContract, account, publicClient, callWithGasPrice],
  );

  return {
    contract: vaultContract,
    txStep,
    getReferralRebates,
    claimReferralRebates,
  };
}