import { BigNumber, ethers } from "ethers";
import { gql } from "@apollo/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Token as UniToken } from "@uniswap/sdk-core";
import { Pool } from "@uniswap/v3-sdk";
import useSWR from "swr";

import OrderBook from "abis/OrderBook.json";
import PositionManager from "abis/PositionManager.json";
import Vault from "abis/Vault.json";
import Router from "abis/Router.json";
import UniPool from "abis/UniPool.json";
import UniswapV2 from "abis/UniswapV2.json";
import Token from "abis/Token.json";
import PositionRouter from "abis/PositionRouter.json";

import { getContract } from "config/contracts";
import { BASE, BASE_GOERLI, AVALANCHE, getConstant, getHighExecutionFee } from "config/chains";
import { DECREASE, getOrderKey, INCREASE, SWAP, USD_DECIMALS } from "lib/legacy";

import { groupBy } from "lodash";
import { UI_VERSION } from "config/env";
import { getServerBaseUrl, getServerUrl } from "config/backend";
import { getEddxGraphClient, nissohGraphClient } from "lib/subgraph/clients";
import { callContract, contractFetcher } from "lib/contracts";
import { replaceNativeTokenAddress } from "./tokens";
import { getUsd } from "./tokens/utils";
import { getProvider } from "lib/rpc";
import { bigNumberify, expandDecimals, parseValue } from "lib/numbers";
import { getTokenBySymbol } from "config/tokens";
import { t } from "@lingui/macro";

export * from "./prices";

const { AddressZero } = ethers.constants;

export function useAllOrdersStats(chainId) {
  const query = gql(`{
    orderStat(id: "total") {
      openSwap
      openIncrease
      openDecrease
      executedSwap
      executedIncrease
      executedDecrease
      cancelledSwap
      cancelledIncrease
      cancelledDecrease
    }
  }`);

  const [res, setRes] = useState<any>();

  useEffect(() => {
    const graphClient = getEddxGraphClient(chainId);
    if (graphClient) {
      // eslint-disable-next-line no-console
      graphClient.query({ query }).then(setRes).catch(console.warn);
    }
  }, [setRes, query, chainId]);

  return res ? res.data.orderStat : null;
}

export function useUserStat(chainId) {
  const query = gql(`{
    userStat(id: "total") {
      id
      uniqueCount
    }
  }`);

  const [res, setRes] = useState<any>();

  useEffect(() => {
    // eslint-disable-next-line no-console
    getEddxGraphClient(chainId)?.query({ query }).then(setRes).catch(console.warn);
  }, [setRes, query, chainId]);

  return res ? res.data.userStat : null;
}

export function useLiquidationsData(chainId, account) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (account) {
      const query = gql(`{
         liquidatedPositions(
           where: {account: "${account.toLowerCase()}"}
           first: 100
           orderBy: timestamp
           orderDirection: desc
         ) {
           key
           timestamp
           borrowFee
           loss
           collateral
           size
           markPrice
           type
         }
      }`);
      const graphClient = getEddxGraphClient(chainId);
      if (!graphClient) {
        return;
      }

      graphClient
        .query({ query })
        .then((res) => {
          const _data = res.data.liquidatedPositions.map((item) => {
            return {
              ...item,
              size: bigNumberify(item.size),
              collateral: bigNumberify(item.collateral),
              markPrice: bigNumberify(item.markPrice),
            };
          });
          setData(_data);
        })
        // eslint-disable-next-line no-console
        .catch(console.warn);
    }
  }, [setData, chainId, account]);

  return data;
}

export function useAllPositions(chainId, library) {
  const count = 1000;
  const query = gql(`{
    aggregatedTradeOpens(
      first: ${count}
    ) {
      account
      initialPosition{
        indexToken
        collateralToken
        isLong
        sizeDelta
      }
      increaseList {
        sizeDelta
      }
      decreaseList {
        sizeDelta
      }
    }
  }`);

  const [res, setRes] = useState<any>();

  useEffect(() => {
    // eslint-disable-next-line no-console
    nissohGraphClient.query({ query }).then(setRes).catch(console.warn);
  }, [setRes, query]);

  const key = res ? `allPositions${count}__` : null;

  const { data: positions = [] } = useSWR(key, async () => {
    const provider = getProvider(library, chainId);
    const vaultAddress = getContract(chainId, "Vault");
    const contract = new ethers.Contract(vaultAddress, Vault.abi, provider);
    const ret = await Promise.all(
      res.data.aggregatedTradeOpens.map(async (dataItem) => {
        try {
          const { indexToken, collateralToken, isLong } = dataItem.initialPosition;
          const positionData = await contract.getPosition(dataItem.account, collateralToken, indexToken, isLong);
          const position: any = {
            size: bigNumberify(positionData[0]),
            collateral: bigNumberify(positionData[1]),
            entryFundingRate: bigNumberify(positionData[3]),
            account: dataItem.account,
          };
          position.fundingFee = await contract.getFundingFee(collateralToken, position.size, position.entryFundingRate);
          position.marginFee = position.size.div(1000);
          position.fee = position.fundingFee.add(position.marginFee);

          const THRESHOLD = 5000;
          const collateralDiffPercent = position.fee.mul(10000).div(position.collateral);
          position.danger = collateralDiffPercent.gt(THRESHOLD);

          return position;
        } catch (ex) {
          // eslint-disable-next-line no-console
          console.error(ex);
        }
      })
    );

    return ret.filter(Boolean);
  });

  return positions;
}

export function useAllOrders(chainId, library) {
  const query = gql(`{
    orders(
      first: 1000,
      orderBy: createdTimestamp,
      orderDirection: desc,
      where: {status: "open"}
    ) {
      type
      account
      index
      status
      createdTimestamp
    }
  }`);

  const [res, setRes] = useState<any>();

  useEffect(() => {
    getEddxGraphClient(chainId)?.query({ query }).then(setRes);
  }, [setRes, query, chainId]);

  const key = res ? res.data.orders.map((order) => `${order.type}-${order.account}-${order.index}`) : null;
  const { data: orders = [] } = useSWR(key, () => {
    const provider = getProvider(library, chainId);
    const orderBookAddress = getContract(chainId, "OrderBook");
    const contract = new ethers.Contract(orderBookAddress, OrderBook.abi, provider);
    return Promise.all(
      res.data.orders.map(async (order) => {
        try {
          const type = order.type.charAt(0).toUpperCase() + order.type.substring(1);
          const method = `get${type}Order`;
          const orderFromChain = await contract[method](order.account, order.index);
          const ret: any = {};
          for (const [key, val] of Object.entries(orderFromChain)) {
            ret[key] = val;
          }
          if (order.type === "swap") {
            ret.path = [ret.path0, ret.path1, ret.path2].filter((address) => address !== AddressZero);
          }
          ret.type = type;
          ret.index = order.index;
          ret.account = order.account;
          ret.createdTimestamp = order.createdTimestamp;
          return ret;
        } catch (ex) {
          // eslint-disable-next-line no-console
          console.error(ex);
        }
      })
    );
  });

  return orders.filter(Boolean);
}

export function usePositionsForOrders(chainId, library, orders) {
  const key = orders ? orders.map((order) => getOrderKey(order) + "____") : null;
  const { data: positions = {} } = useSWR(key, async () => {
    const provider = getProvider(library, chainId);
    const vaultAddress = getContract(chainId, "Vault");
    const contract = new ethers.Contract(vaultAddress, Vault.abi, provider);
    const data = await Promise.all(
      orders.map(async (order) => {
        try {
          const position = await contract.getPosition(
            order.account,
            order.collateralToken,
            order.indexToken,
            order.isLong
          );
          if (position[0].eq(0)) {
            return [null, order];
          }
          return [position, order];
        } catch (ex) {
          // eslint-disable-next-line no-console
          console.error(ex);
        }
      })
    );
    return data.reduce((memo, [position, order]) => {
      memo[getOrderKey(order)] = position;
      return memo;
    }, {});
  });

  return positions;
}

function invariant(condition, errorMsg) {
  if (!condition) {
    throw new Error(errorMsg);
  }
}

export function useTrades(chainId, account, forSingleAccount, afterId) {
  let url =
    account && account.length > 0
      ? `${getServerBaseUrl(chainId)}/actions?account=${account}`
      : !forSingleAccount && `${getServerBaseUrl(chainId)}/actions`;

  if (afterId && afterId.length > 0) {
    const urlItem = new URL(url as string);
    urlItem.searchParams.append("after", afterId);
    url = urlItem.toString();
  }

  const { data: trades, mutate: updateTrades } = useSWR(url ? url : null, {
    dedupingInterval: 10000,
    // @ts-ignore
    fetcher: (...args) => fetch(...args).then((res) => res.json()),
  });

  if (trades) {
    trades.sort((item0, item1) => {
      const data0 = item0.data;
      const data1 = item1.data;
      const time0 = parseInt(data0.timestamp);
      const time1 = parseInt(data1.timestamp);
      if (time1 > time0) {
        return 1;
      }
      if (time1 < time0) {
        return -1;
      }

      const block0 = parseInt(data0.blockNumber);
      const block1 = parseInt(data1.blockNumber);

      if (isNaN(block0) && isNaN(block1)) {
        return 0;
      }

      if (isNaN(block0)) {
        return 1;
      }

      if (isNaN(block1)) {
        return -1;
      }

      if (block1 > block0) {
        return 1;
      }

      if (block1 < block0) {
        return -1;
      }

      return 0;
    });
  }

  return { trades, updateTrades };
}

export function useExecutionFee(library, active, chainId, infoTokens) {
  const positionRouterAddress = getContract(chainId, "PositionRouter");
  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");

  const { data: minExecutionFee } = useSWR<BigNumber>([active, chainId, positionRouterAddress, "minExecutionFee"], {
    fetcher: contractFetcher(library, PositionRouter),
  });

  const { data: gasPrice } = useSWR<BigNumber | undefined>(["gasPrice", chainId], {
    fetcher: () => {
      return new Promise(async (resolve, reject) => {
        const provider = getProvider(library, chainId);
        if (!provider) {
          resolve(undefined);
          return;
        }

        try {
          const gasPrice = await provider.getGasPrice();
          resolve(gasPrice);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
        }
      });
    },
  });

  let multiplier;

  if (chainId === BASE || chainId === BASE_GOERLI) {
    multiplier = 2150000;
  }

  // multiplier for Avalanche is just the average gas usage
  if (chainId === AVALANCHE) {
    multiplier = 700000;
  }

  let finalExecutionFee = minExecutionFee;

  if (gasPrice && minExecutionFee) {
    const estimatedExecutionFee = gasPrice.mul(multiplier);
    if (estimatedExecutionFee.gt(minExecutionFee)) {
      finalExecutionFee = estimatedExecutionFee;
    }
  }

  const finalExecutionFeeUSD = getUsd(finalExecutionFee, nativeTokenAddress, false, infoTokens);
  const isFeeHigh = finalExecutionFeeUSD?.gt(expandDecimals(getHighExecutionFee(chainId), USD_DECIMALS));
  const errorMessage =
    isFeeHigh &&
    `The network cost to send transactions is high at the moment, please check the "Execution Fee" value before proceeding.`;

  return {
    minExecutionFee: finalExecutionFee,
    minExecutionFeeUSD: finalExecutionFeeUSD,
    minExecutionFeeErrorMessage: errorMessage,
  };
}

export function useStakedEddxSupply(library, active) {
  const eddxAddressArb = getContract(BASE, "EDDX");
  const stakedEddxTrackerAddressArb = getContract(BASE, "StakedEddxTracker");

  const { data: arbData, mutate: arbMutate } = useSWR<any>(
    [`StakeV2:stakedEddxSupply:${active}`, BASE, eddxAddressArb, "balanceOf", stakedEddxTrackerAddressArb],
    {
      fetcher: contractFetcher(library, Token),
    }
  );

  const eddxAddressAvax = getContract(AVALANCHE, "EDDX");
  const stakedEddxTrackerAddressAvax = getContract(AVALANCHE, "StakedEddxTracker");

  const { data: avaxData, mutate: avaxMutate } = useSWR(
    [`StakeV2:stakedEddxSupply:${active}`, AVALANCHE, eddxAddressAvax, "balanceOf", stakedEddxTrackerAddressAvax],
    {
      fetcher: contractFetcher(undefined, Token),
    }
  );

  let data;
  if (arbData && avaxData) {
    data = arbData.add(avaxData);
  }

  const mutate = () => {
    arbMutate();
    avaxMutate();
  };

  return { data, mutate };
}

export function useHasOutdatedUi() {
  const url = getServerUrl(BASE, "/ui_version");
  const { data, mutate } = useSWR([url], {
    // @ts-ignore
    fetcher: (...args) => fetch(...args).then((res) => res.text()),
  });

  let hasOutdatedUi = false;

  if (data && parseFloat(data) > parseFloat(UI_VERSION)) {
    hasOutdatedUi = true;
  }

  return { data: hasOutdatedUi, mutate };
}

export function useEddxPrice(chainId, libraries, active) {
  const baseLibrary = libraries && libraries.base ? libraries.base : undefined;
  const { data: eddxPriceFromBase, mutate: mutateFromBase } = useEddxPriceFromBase(baseLibrary, active);
  const { data: eddxPriceFromAvalanche, mutate: mutateFromAvalanche } = useEddxPriceFromAvalanche();

  const eddxPrice = chainId === BASE ? eddxPriceFromBase : eddxPriceFromAvalanche;
  const mutate = useCallback(() => {
    mutateFromAvalanche();
    mutateFromBase();
  }, [mutateFromAvalanche, mutateFromBase]);

  return {
    eddxPrice,
    eddxPriceFromBase,
    eddxPriceFromAvalanche,
    mutate,
  };
}

// use only the supply endpoint on base, it includes the supply on avalanche
export function useTotalEddxSupply() {
  const eddxSupplyUrlBase = getServerUrl(BASE, "/eddx_supply");

  const { data: eddxSupply, mutate: updateEddxSupply } = useSWR([eddxSupplyUrlBase], {
    // @ts-ignore
    fetcher: (...args) => fetch(...args).then((res) => res.text()),
  });

  return {
    total: eddxSupply ? bigNumberify(eddxSupply) : undefined,
    mutate: updateEddxSupply,
  };
}

export function useTotalEddxStaked() {
  const stakedEddxTrackerAddressBase = getContract(BASE, "StakedEddxTracker");
  const stakedEddxTrackerAddressAvax = getContract(AVALANCHE, "StakedEddxTracker");
  let totalStakedEddx = useRef(bigNumberify(0));
  const { data: stakedEddxSupplyBase, mutate: updateStakedEddxSupplyBase } = useSWR<BigNumber>(
    [
      `StakeV2:stakedEddxSupply:${BASE}`,
      BASE,
      getContract(BASE, "EDDX"),
      "balanceOf",
      stakedEddxTrackerAddressBase,
    ],
    {
      fetcher: contractFetcher(undefined, Token),
    }
  );
  const { data: stakedEddxSupplyAvax, mutate: updateStakedEddxSupplyAvax } = useSWR<BigNumber>(
    [
      `StakeV2:stakedEddxSupply:${AVALANCHE}`,
      AVALANCHE,
      getContract(AVALANCHE, "EDDX"),
      "balanceOf",
      stakedEddxTrackerAddressAvax,
    ],
    {
      fetcher: contractFetcher(undefined, Token),
    }
  );

  const mutate = useCallback(() => {
    updateStakedEddxSupplyBase();
    updateStakedEddxSupplyAvax();
  }, [updateStakedEddxSupplyBase, updateStakedEddxSupplyAvax]);

  if (stakedEddxSupplyBase && stakedEddxSupplyAvax) {
    let total = bigNumberify(stakedEddxSupplyBase)!.add(stakedEddxSupplyAvax);
    totalStakedEddx.current = total;
  }

  return {
    avax: stakedEddxSupplyAvax,
    base: stakedEddxSupplyBase,
    total: totalStakedEddx.current,
    mutate,
  };
}

export function useTotalEddxInLiquidity() {
  let poolAddressBase = getContract(BASE, "UniswapEddxEthPool");
  let poolAddressAvax = getContract(AVALANCHE, "TraderJoeEddxAvaxPool");
  let totalEDDX = useRef(bigNumberify(0));

  const { data: eddxInLiquidityOnBase, mutate: mutateEDDXInLiquidityOnBase } = useSWR<any>(
    [`StakeV2:eddxInLiquidity:${BASE}`, BASE, getContract(BASE, "EDDX"), "balanceOf", poolAddressBase],
    {
      fetcher: contractFetcher(undefined, Token),
    }
  );
  const { data: eddxInLiquidityOnAvax, mutate: mutateEDDXInLiquidityOnAvax } = useSWR<any>(
    [`StakeV2:eddxInLiquidity:${AVALANCHE}`, AVALANCHE, getContract(AVALANCHE, "EDDX"), "balanceOf", poolAddressAvax],
    {
      fetcher: contractFetcher(undefined, Token),
    }
  );
  const mutate = useCallback(() => {
    mutateEDDXInLiquidityOnBase();
    mutateEDDXInLiquidityOnAvax();
  }, [mutateEDDXInLiquidityOnBase, mutateEDDXInLiquidityOnAvax]);

  if (eddxInLiquidityOnAvax && eddxInLiquidityOnBase) {
    let total = bigNumberify(eddxInLiquidityOnBase)!.add(eddxInLiquidityOnAvax);
    totalEDDX.current = total;
  }
  return {
    avax: eddxInLiquidityOnAvax,
    base: eddxInLiquidityOnBase,
    total: totalEDDX.current,
    mutate,
  };
}

function useEddxPriceFromAvalanche() {
  const poolAddress = getContract(AVALANCHE, "TraderJoeEddxAvaxPool");

  const { data, mutate: updateReserves } = useSWR(["TraderJoeEddxAvaxReserves", AVALANCHE, poolAddress, "getReserves"], {
    fetcher: contractFetcher(undefined, UniswapV2),
  });
  const { _reserve0: eddxReserve, _reserve1: avaxReserve }: any = data || {};

  const vaultAddress = getContract(AVALANCHE, "Vault");
  const avaxAddress = getTokenBySymbol(AVALANCHE, "WAVAX").address;
  const { data: avaxPrice, mutate: updateAvaxPrice } = useSWR(
    [`StakeV2:avaxPrice`, AVALANCHE, vaultAddress, "getMinPrice", avaxAddress],
    {
      fetcher: contractFetcher(undefined, Vault),
    }
  );

  const PRECISION = bigNumberify(10)!.pow(18);
  let eddxPrice;
  if (avaxReserve && eddxReserve && avaxPrice) {
    eddxPrice = avaxReserve.mul(PRECISION).div(eddxReserve).mul(avaxPrice).div(PRECISION);
  }

  const mutate = useCallback(() => {
    updateReserves(undefined, true);
    updateAvaxPrice(undefined, true);
  }, [updateReserves, updateAvaxPrice]);

  return { data: eddxPrice, mutate };
}

function useEddxPriceFromBase(library, active) {
  const poolAddress = getContract(BASE, "UniswapEddxEthPool");
  const { data: uniPoolSlot0, mutate: updateUniPoolSlot0 } = useSWR<any>(
    [`StakeV2:uniPoolSlot0:${active}`, BASE, poolAddress, "slot0"],
    {
      fetcher: contractFetcher(library, UniPool),
    }
  );

  const vaultAddress = getContract(BASE, "Vault");
  const ethAddress = getTokenBySymbol(BASE, "WETH").address;
  const { data: ethPrice, mutate: updateEthPrice } = useSWR<BigNumber>(
    [`StakeV2:ethPrice:${active}`, BASE, vaultAddress, "getMinPrice", ethAddress],
    {
      fetcher: contractFetcher(library, Vault),
    }
  );

  const eddxPrice = useMemo(() => {
    if (uniPoolSlot0 && ethPrice) {
      const tokenA = new UniToken(BASE, ethAddress, 18, "SYMBOL", "NAME");

      const eddxAddress = getContract(BASE, "EDDX");
      const tokenB = new UniToken(BASE, eddxAddress, 18, "SYMBOL", "NAME");

      const pool = new Pool(
        tokenA, // tokenA
        tokenB, // tokenB
        10000, // fee
        uniPoolSlot0.sqrtPriceX96, // sqrtRatioX96
        1, // liquidity
        uniPoolSlot0.tick, // tickCurrent
        []
      );

      const poolTokenPrice = pool.priceOf(tokenB).toSignificant(6);
      const poolTokenPriceAmount = parseValue(poolTokenPrice, 18);
      return poolTokenPriceAmount?.mul(ethPrice).div(expandDecimals(1, 18));
    }
  }, [ethPrice, uniPoolSlot0, ethAddress]);

  const mutate = useCallback(() => {
    updateUniPoolSlot0(undefined, true);
    updateEthPrice(undefined, true);
  }, [updateEthPrice, updateUniPoolSlot0]);

  return { data: eddxPrice, mutate };
}

export async function approvePlugin(chainId, pluginAddress, { library, setPendingTxns, sentMsg, failMsg }) {
  const routerAddress = getContract(chainId, "Router");
  const contract = new ethers.Contract(routerAddress, Router.abi, library.getSigner());
  return callContract(chainId, contract, "approvePlugin", [pluginAddress], {
    sentMsg,
    failMsg,
    setPendingTxns,
  });
}

export async function createSwapOrder(
  chainId,
  library,
  path,
  amountIn,
  minOut,
  triggerRatio,
  nativeTokenAddress,
  opts: any = {}
) {
  const executionFee = getConstant(chainId, "SWAP_ORDER_EXECUTION_GAS_FEE");
  const triggerAboveThreshold = false;
  let shouldWrap = false;
  let shouldUnwrap = false;
  opts.value = executionFee;

  if (path[0] === AddressZero) {
    shouldWrap = true;
    opts.value = opts.value.add(amountIn);
  }
  if (path[path.length - 1] === AddressZero) {
    shouldUnwrap = true;
  }
  path = replaceNativeTokenAddress(path, nativeTokenAddress);

  const params = [path, amountIn, minOut, triggerRatio, triggerAboveThreshold, executionFee, shouldWrap, shouldUnwrap];

  const orderBookAddress = getContract(chainId, "OrderBook");
  const contract = new ethers.Contract(orderBookAddress, OrderBook.abi, library.getSigner());

  return callContract(chainId, contract, "createSwapOrder", params, opts);
}

export async function createIncreaseOrder(
  chainId,
  library,
  nativeTokenAddress,
  path,
  amountIn,
  indexTokenAddress,
  minOut,
  sizeDelta,
  collateralTokenAddress,
  isLong,
  triggerPrice,
  opts: any = {}
) {
  invariant(!isLong || indexTokenAddress === collateralTokenAddress, "invalid token addresses");
  invariant(indexTokenAddress !== AddressZero, "indexToken is 0");
  invariant(collateralTokenAddress !== AddressZero, "collateralToken is 0");

  const fromETH = path[0] === AddressZero;

  path = replaceNativeTokenAddress(path, nativeTokenAddress);
  const shouldWrap = fromETH;
  const triggerAboveThreshold = !isLong;
  const executionFee = getConstant(chainId, "INCREASE_ORDER_EXECUTION_GAS_FEE");

  const params = [
    path,
    amountIn,
    indexTokenAddress,
    minOut,
    sizeDelta,
    collateralTokenAddress,
    isLong,
    triggerPrice,
    triggerAboveThreshold,
    executionFee,
    shouldWrap,
  ];

  if (!opts.value) {
    opts.value = fromETH ? amountIn.add(executionFee) : executionFee;
  }

  const orderBookAddress = getContract(chainId, "OrderBook");
  const contract = new ethers.Contract(orderBookAddress, OrderBook.abi, library.getSigner());

  return callContract(chainId, contract, "createIncreaseOrder", params, opts);
}

export async function createDecreaseOrder(
  chainId,
  library,
  indexTokenAddress,
  sizeDelta,
  collateralTokenAddress,
  collateralDelta,
  isLong,
  triggerPrice,
  triggerAboveThreshold,
  opts: any = {}
) {
  invariant(!isLong || indexTokenAddress === collateralTokenAddress, "invalid token addresses");
  invariant(indexTokenAddress !== AddressZero, "indexToken is 0");
  invariant(collateralTokenAddress !== AddressZero, "collateralToken is 0");

  const executionFee = getConstant(chainId, "DECREASE_ORDER_EXECUTION_GAS_FEE");

  const params = [
    indexTokenAddress,
    sizeDelta,
    collateralTokenAddress,
    collateralDelta,
    isLong,
    triggerPrice,
    triggerAboveThreshold,
  ];
  opts.value = executionFee;
  const orderBookAddress = getContract(chainId, "OrderBook");
  const contract = new ethers.Contract(orderBookAddress, OrderBook.abi, library.getSigner());

  return callContract(chainId, contract, "createDecreaseOrder", params, opts);
}

export async function cancelSwapOrder(chainId, library, index, opts) {
  const params = [index];
  const method = "cancelSwapOrder";
  const orderBookAddress = getContract(chainId, "OrderBook");
  const contract = new ethers.Contract(orderBookAddress, OrderBook.abi, library.getSigner());

  return callContract(chainId, contract, method, params, opts);
}

export async function cancelDecreaseOrder(chainId, library, index, opts) {
  const params = [index];
  const method = "cancelDecreaseOrder";
  const orderBookAddress = getContract(chainId, "OrderBook");
  const contract = new ethers.Contract(orderBookAddress, OrderBook.abi, library.getSigner());

  return callContract(chainId, contract, method, params, opts);
}

export async function cancelIncreaseOrder(chainId, library, index, opts) {
  const params = [index];
  const method = "cancelIncreaseOrder";
  const orderBookAddress = getContract(chainId, "OrderBook");
  const contract = new ethers.Contract(orderBookAddress, OrderBook.abi, library.getSigner());

  return callContract(chainId, contract, method, params, opts);
}

export function handleCancelOrder(chainId, library, order, opts) {
  let func;
  if (order.type === SWAP) {
    func = cancelSwapOrder;
  } else if (order.type === INCREASE) {
    func = cancelIncreaseOrder;
  } else if (order.type === DECREASE) {
    func = cancelDecreaseOrder;
  }

  return func(chainId, library, order.index, {
    successMsg: t`Order cancelled.`,
    failMsg: t`Cancel failed.`,
    sentMsg: t`Cancel submitted.`,
    pendingTxns: opts.pendingTxns,
    setPendingTxns: opts.setPendingTxns,
  });
}

export async function cancelMultipleOrders(chainId, library, allIndexes = [], opts) {
  const ordersWithTypes = groupBy(allIndexes, (v) => v.split("-")[0]);
  function getIndexes(key) {
    if (!ordersWithTypes[key]) return;
    return ordersWithTypes[key].map((d) => d.split("-")[1]);
  }
  // params order => swap, increase, decrease
  const params = ["Swap", "Increase", "Decrease"].map((key) => getIndexes(key) || []);
  const method = "cancelMultiple";
  const orderBookAddress = getContract(chainId, "OrderBook");
  const contract = new ethers.Contract(orderBookAddress, OrderBook.abi, library.getSigner());
  return callContract(chainId, contract, method, params, opts);
}

export async function updateDecreaseOrder(
  chainId,
  library,
  index,
  collateralDelta,
  sizeDelta,
  triggerPrice,
  triggerAboveThreshold,
  opts
) {
  const params = [index, collateralDelta, sizeDelta, triggerPrice, triggerAboveThreshold];
  const method = "updateDecreaseOrder";
  const orderBookAddress = getContract(chainId, "OrderBook");
  const contract = new ethers.Contract(orderBookAddress, OrderBook.abi, library.getSigner());

  return callContract(chainId, contract, method, params, opts);
}

export async function updateIncreaseOrder(
  chainId,
  library,
  index,
  sizeDelta,
  triggerPrice,
  triggerAboveThreshold,
  opts
) {
  const params = [index, sizeDelta, triggerPrice, triggerAboveThreshold];
  const method = "updateIncreaseOrder";
  const orderBookAddress = getContract(chainId, "OrderBook");
  const contract = new ethers.Contract(orderBookAddress, OrderBook.abi, library.getSigner());

  return callContract(chainId, contract, method, params, opts);
}

export async function updateSwapOrder(chainId, library, index, minOut, triggerRatio, triggerAboveThreshold, opts) {
  const params = [index, minOut, triggerRatio, triggerAboveThreshold];
  const method = "updateSwapOrder";
  const orderBookAddress = getContract(chainId, "OrderBook");
  const contract = new ethers.Contract(orderBookAddress, OrderBook.abi, library.getSigner());

  return callContract(chainId, contract, method, params, opts);
}

export async function _executeOrder(chainId, library, method, account, index, feeReceiver, opts) {
  const params = [account, index, feeReceiver];
  const positionManagerAddress = getContract(chainId, "PositionManager");
  const contract = new ethers.Contract(positionManagerAddress, PositionManager.abi, library.getSigner());
  return callContract(chainId, contract, method, params, opts);
}

export function executeSwapOrder(chainId, library, account, index, feeReceiver, opts) {
  return _executeOrder(chainId, library, "executeSwapOrder", account, index, feeReceiver, opts);
}

export function executeIncreaseOrder(chainId, library, account, index, feeReceiver, opts) {
  return _executeOrder(chainId, library, "executeIncreaseOrder", account, index, feeReceiver, opts);
}

export function executeDecreaseOrder(chainId, library, account, index, feeReceiver, opts) {
  return _executeOrder(chainId, library, "executeDecreaseOrder", account, index, feeReceiver, opts);
}