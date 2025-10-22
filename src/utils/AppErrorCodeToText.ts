export const AppErrorCodeToTextMap = new Map([
  ['1001', "operationTemporarilySuspended"],
  ['1002', "orderDoesNotExist"],
  ['1003', "insufficientNetworkFee"],
  ['1004', "oraclePriceExpired"],
  ['1005', "priceError"],
  ['1006', "insufficientAmount"],
  ['1007', "parameterError"],

  // 智能合约错误代码
  ['1166040925', "priceFeedNotFoundWithinRange"],
  ['3869245134', "invalidUpdateData"],
  ['39697876', "insufficientFee"],

  // 委托相关错误代码
  ['1101', "multipleNetworkFeesNotSupported"],
  ['1102', "transactionAmountBelowMinimumLimit"],

  // 结算相关错误代码
  ['1201', "settlementStatusError"],
  ['1202', "settlementAmountError"],
  ['1203', "settlementStockQuantityError"],
]);
