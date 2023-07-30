import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import { Trans, t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import useSWR from "swr";
import { ethers } from "ethers";
import Tab from "../Tab/Tab";
import cx from "classnames";
import { getContract } from "config/contracts";
import {
  getBuyElpToAmount,
  getBuyElpFromAmount,
  getSellElpFromAmount,
  getSellElpToAmount,
  adjustForDecimals,
  ELP_DECIMALS,
  USD_DECIMALS,
  BASIS_POINTS_DIVISOR,
  ELP_COOLDOWN_DURATION,
  SECONDS_PER_YEAR,
  USDG_DECIMALS,
  PLACEHOLDER_ACCOUNT,
  importImage,
} from "lib/legacy";

import { useEddxPrice } from "domain/legacy";

import TokenSelector from "components/TokenSelector/TokenSelector";
import BuyInputSection from "../BuyInputSection/BuyInputSection";
import Tooltip from "../Tooltip/Tooltip";

import ReaderV2 from "abis/ReaderV2.json";
import RewardReader from "abis/RewardReader.json";
import VaultV2 from "abis/VaultV2.json";
import ElpManager from "abis/ElpManager.json";
import RewardTracker from "abis/RewardTracker.json";
import Vester from "abis/Vester.json";
import RewardRouter from "abis/RewardRouter.json";
import Token from "abis/Token.json";

import "./ElpSwap.css";
import AssetDropdown from "pages/Dashboard/AssetDropdown";
import SwapErrorModal from "./SwapErrorModal";
import StatsTooltipRow from "../StatsTooltip/StatsTooltipRow";
import { BASE, FEES_HIGH_BPS, getChainName, IS_NETWORK_DISABLED } from "config/chains";
import { callContract, contractFetcher } from "lib/contracts";
import { approveTokens, useInfoTokens } from "domain/tokens";
import { useLocalStorageByChainId } from "lib/localStorage";
import { helperToast } from "lib/helperToast";
import { getTokenInfo, getUsd } from "domain/tokens/utils";
import { bigNumberify, expandDecimals, formatAmount, formatAmountFree, formatKeyAmount, parseValue } from "lib/numbers";
import { getNativeToken, getToken, getTokens, getWhitelistedTokens, getWrappedToken } from "config/tokens";
import { useChainId } from "lib/chains";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { getIcon } from "config/icons";
import Button from "components/Button/Button";
import { IoChevronDownOutline } from "react-icons/io5";

const { AddressZero } = ethers.constants;

function getStakingData(stakingInfo) {
  if (!stakingInfo || stakingInfo.length === 0) {
    return;
  }

  const keys = ["stakedElpTracker", "feeElpTracker"];
  const data = {};
  const propsLength = 5;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    data[key] = {
      claimable: stakingInfo[i * propsLength],
      tokensPerInterval: stakingInfo[i * propsLength + 1],
      averageStakedAmounts: stakingInfo[i * propsLength + 2],
      cumulativeRewards: stakingInfo[i * propsLength + 3],
      totalSupply: stakingInfo[i * propsLength + 4],
    };
  }

  return data;
}

function getTooltipContent(managedUsd, tokenInfo, token) {
  return (
    <>
      <StatsTooltipRow
        label={t`Current Pool Amount`}
        value={[
          `$${formatAmount(managedUsd, USD_DECIMALS, 0, true)}`,
          `(${formatKeyAmount(tokenInfo, "managedAmount", token.decimals, 0, true)} ${token.symbol})`,
        ]}
      />
      <StatsTooltipRow label={t`Max Pool Capacity`} value={formatAmount(tokenInfo.maxUsdgAmount, 18, 0, true)} />
    </>
  );
}

export default function ElpSwap(props) {
  const {
    savedSlippageAmount,
    isBuying,
    setPendingTxns,
    connectWallet,
    setIsBuying,
    savedShouldDisableValidationForTesting,
  } = props;
  const history = useHistory();
  const swapLabel = isBuying ? "BuyElp" : "SellElp";
  const tabLabel = isBuying ? t`Buy ELP` : t`Sell ELP`;
  const { active, library, account } = useWeb3React();
  const { chainId } = useChainId();
  const tokens = getTokens(chainId);
  const whitelistedTokens = getWhitelistedTokens(chainId);
  const tokenList = whitelistedTokens.filter((t) => !t.isWrapped);
  const visibleTokens = tokenList.filter((t) => !t.isTempHidden);
  const [swapValue, setSwapValue] = useState("");
  const [elpValue, setElpValue] = useState("");
  const [swapTokenAddress, setSwapTokenAddress] = useLocalStorageByChainId(
    chainId,
    `${swapLabel}-swap-token-address`,
    AddressZero
  );
  const [isApproving, setIsApproving] = useState(false);
  const [isWaitingForApproval, setIsWaitingForApproval] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [anchorOnSwapAmount, setAnchorOnSwapAmount] = useState(true);
  const [feeBasisPoints, setFeeBasisPoints] = useState("");
  const [modalError, setModalError] = useState(false);

  const readerAddress = getContract(chainId, "Reader");
  const rewardReaderAddress = getContract(chainId, "RewardReader");
  const vaultAddress = getContract(chainId, "Vault");
  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
  const stakedElpTrackerAddress = getContract(chainId, "StakedElpTracker");
  const feeElpTrackerAddress = getContract(chainId, "FeeElpTracker");
  const usdgAddress = getContract(chainId, "USDG");
  const elpManagerAddress = getContract(chainId, "ElpManager");
  const elpRewardRouterAddress = getContract(chainId, "ElpRewardRouter");

  const tokensForBalanceAndSupplyQuery = [stakedElpTrackerAddress, usdgAddress];
  const elpIcon = getIcon(chainId, "elp");

  const isFeesHigh = feeBasisPoints > FEES_HIGH_BPS;

  const tokenAddresses = tokens.map((token) => token.address);
  const { data: tokenBalances } = useSWR(
    [`ElpSwap:getTokenBalances:${active}`, chainId, readerAddress, "getTokenBalances", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: contractFetcher(library, ReaderV2, [tokenAddresses]),
    }
  );

  const { data: balancesAndSupplies } = useSWR(
    [
      `ElpSwap:getTokenBalancesWithSupplies:${active}`,
      chainId,
      readerAddress,
      "getTokenBalancesWithSupplies",
      account || PLACEHOLDER_ACCOUNT,
    ],
    {
      fetcher: contractFetcher(library, ReaderV2, [tokensForBalanceAndSupplyQuery]),
    }
  );

  const { data: aums } = useSWR([`ElpSwap:getAums:${active}`, chainId, elpManagerAddress, "getAums"], {
    fetcher: contractFetcher(library, ElpManager),
  });

  const { data: totalTokenWeights } = useSWR(
    [`ElpSwap:totalTokenWeights:${active}`, chainId, vaultAddress, "totalTokenWeights"],
    {
      fetcher: contractFetcher(library, VaultV2),
    }
  );

  const tokenAllowanceAddress = swapTokenAddress === AddressZero ? nativeTokenAddress : swapTokenAddress;
  const { data: tokenAllowance } = useSWR(
    [active, chainId, tokenAllowanceAddress, "allowance", account || PLACEHOLDER_ACCOUNT, elpManagerAddress],
    {
      fetcher: contractFetcher(library, Token),
    }
  );

  const { data: lastPurchaseTime } = useSWR(
    [`ElpSwap:lastPurchaseTime:${active}`, chainId, elpManagerAddress, "lastAddedAt", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: contractFetcher(library, ElpManager),
    }
  );

  const { data: elpBalance } = useSWR(
    [`ElpSwap:elpBalance:${active}`, chainId, feeElpTrackerAddress, "stakedAmounts", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: contractFetcher(library, RewardTracker),
    }
  );

  const elpVesterAddress = getContract(chainId, "ElpVester");
  const { data: reservedAmount } = useSWR(
    [`ElpSwap:reservedAmount:${active}`, chainId, elpVesterAddress, "pairAmounts", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: contractFetcher(library, Vester),
    }
  );

  const { eddxPrice } = useEddxPrice(chainId, { base: chainId === BASE ? library : undefined }, active);

  const rewardTrackersForStakingInfo = [stakedElpTrackerAddress, feeElpTrackerAddress];
  const { data: stakingInfo } = useSWR(
    [`ElpSwap:stakingInfo:${active}`, chainId, rewardReaderAddress, "getStakingInfo", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: contractFetcher(library, RewardReader, [rewardTrackersForStakingInfo]),
    }
  );

  const stakingData = getStakingData(stakingInfo);

  const redemptionTime = lastPurchaseTime ? lastPurchaseTime.add(ELP_COOLDOWN_DURATION) : undefined;
  const inCooldownWindow = redemptionTime && parseInt(Date.now() / 1000) < redemptionTime;

  const elpSupply = balancesAndSupplies ? balancesAndSupplies[1] : bigNumberify(0);
  const usdgSupply = balancesAndSupplies ? balancesAndSupplies[3] : bigNumberify(0);
  let aum;
  if (aums && aums.length > 0) {
    aum = isBuying ? aums[0] : aums[1];
  }
  const elpPrice =
    aum && aum.gt(0) && elpSupply.gt(0)
      ? aum.mul(expandDecimals(1, ELP_DECIMALS)).div(elpSupply)
      : expandDecimals(1, USD_DECIMALS);
  let elpBalanceUsd;
  if (elpBalance) {
    elpBalanceUsd = elpBalance.mul(elpPrice).div(expandDecimals(1, ELP_DECIMALS));
  }
  const elpSupplyUsd = elpSupply.mul(elpPrice).div(expandDecimals(1, ELP_DECIMALS));

  let reserveAmountUsd;
  if (reservedAmount) {
    reserveAmountUsd = reservedAmount.mul(elpPrice).div(expandDecimals(1, ELP_DECIMALS));
  }

  let maxSellAmount = elpBalance;
  if (elpBalance && reservedAmount) {
    maxSellAmount = elpBalance.sub(reservedAmount);
  }

  const { infoTokens } = useInfoTokens(library, chainId, active, tokenBalances, undefined);
  const swapToken = getToken(chainId, swapTokenAddress);
  const swapTokenInfo = getTokenInfo(infoTokens, swapTokenAddress);

  const swapTokenBalance = swapTokenInfo && swapTokenInfo.balance ? swapTokenInfo.balance : bigNumberify(0);

  const swapAmount = parseValue(swapValue, swapToken && swapToken.decimals);
  const elpAmount = parseValue(elpValue, ELP_DECIMALS);

  const needApproval =
    isBuying && swapTokenAddress !== AddressZero && tokenAllowance && swapAmount && swapAmount.gt(tokenAllowance);

  const swapUsdMin = getUsd(swapAmount, swapTokenAddress, false, infoTokens);
  const elpUsdMax = elpAmount && elpPrice ? elpAmount.mul(elpPrice).div(expandDecimals(1, ELP_DECIMALS)) : undefined;

  let isSwapTokenCapReached;
  if (swapTokenInfo.managedUsd && swapTokenInfo.maxUsdgAmount) {
    isSwapTokenCapReached = swapTokenInfo.managedUsd.gt(
      adjustForDecimals(swapTokenInfo.maxUsdgAmount, USDG_DECIMALS, USD_DECIMALS)
    );
  }

  const onSwapValueChange = (e) => {
    setAnchorOnSwapAmount(true);
    setSwapValue(e.target.value);
  };

  const onElpValueChange = (e) => {
    setAnchorOnSwapAmount(false);
    setElpValue(e.target.value);
  };

  const onSelectSwapToken = (token) => {
    setSwapTokenAddress(token.address);
    setIsWaitingForApproval(false);
  };

  const nativeToken = getTokenInfo(infoTokens, AddressZero);

  let totalApr = bigNumberify(0);

  let feeElpTrackerAnnualRewardsUsd;
  let feeElpTrackerApr;
  if (
    stakingData &&
    stakingData.feeElpTracker &&
    stakingData.feeElpTracker.tokensPerInterval &&
    nativeToken &&
    nativeToken.minPrice &&
    elpSupplyUsd &&
    elpSupplyUsd.gt(0)
  ) {
    feeElpTrackerAnnualRewardsUsd = stakingData.feeElpTracker.tokensPerInterval
      .mul(SECONDS_PER_YEAR)
      .mul(nativeToken.minPrice)
      .div(expandDecimals(1, 18));
    feeElpTrackerApr = feeElpTrackerAnnualRewardsUsd.mul(BASIS_POINTS_DIVISOR).div(elpSupplyUsd);
    totalApr = totalApr.add(feeElpTrackerApr);
  }

  let stakedElpTrackerAnnualRewardsUsd;
  let stakedElpTrackerApr;

  if (
    eddxPrice &&
    stakingData &&
    stakingData.stakedElpTracker &&
    stakingData.stakedElpTracker.tokensPerInterval &&
    elpSupplyUsd &&
    elpSupplyUsd.gt(0)
  ) {
    stakedElpTrackerAnnualRewardsUsd = stakingData.stakedElpTracker.tokensPerInterval
      .mul(SECONDS_PER_YEAR)
      .mul(eddxPrice)
      .div(expandDecimals(1, 18));
    stakedElpTrackerApr = stakedElpTrackerAnnualRewardsUsd.mul(BASIS_POINTS_DIVISOR).div(elpSupplyUsd);
    totalApr = totalApr.add(stakedElpTrackerApr);
  }

  useEffect(() => {
    const updateSwapAmounts = () => {
      if (anchorOnSwapAmount) {
        if (!swapAmount) {
          setElpValue("");
          setFeeBasisPoints("");
          return;
        }

        if (isBuying) {
          const { amount: nextAmount, feeBasisPoints: feeBps } = getBuyElpToAmount(
            swapAmount,
            swapTokenAddress,
            infoTokens,
            elpPrice,
            usdgSupply,
            totalTokenWeights
          );
          const nextValue = formatAmountFree(nextAmount, ELP_DECIMALS, ELP_DECIMALS);
          setElpValue(nextValue);
          setFeeBasisPoints(feeBps);
        } else {
          const { amount: nextAmount, feeBasisPoints: feeBps } = getSellElpFromAmount(
            swapAmount,
            swapTokenAddress,
            infoTokens,
            elpPrice,
            usdgSupply,
            totalTokenWeights
          );
          const nextValue = formatAmountFree(nextAmount, ELP_DECIMALS, ELP_DECIMALS);
          setElpValue(nextValue);
          setFeeBasisPoints(feeBps);
        }

        return;
      }

      if (!elpAmount) {
        setSwapValue("");
        setFeeBasisPoints("");
        return;
      }

      if (swapToken) {
        if (isBuying) {
          const { amount: nextAmount, feeBasisPoints: feeBps } = getBuyElpFromAmount(
            elpAmount,
            swapTokenAddress,
            infoTokens,
            elpPrice,
            usdgSupply,
            totalTokenWeights
          );
          const nextValue = formatAmountFree(nextAmount, swapToken.decimals, swapToken.decimals);
          setSwapValue(nextValue);
          setFeeBasisPoints(feeBps);
        } else {
          const { amount: nextAmount, feeBasisPoints: feeBps } = getSellElpToAmount(
            elpAmount,
            swapTokenAddress,
            infoTokens,
            elpPrice,
            usdgSupply,
            totalTokenWeights,
            true
          );

          const nextValue = formatAmountFree(nextAmount, swapToken.decimals, swapToken.decimals);
          setSwapValue(nextValue);
          setFeeBasisPoints(feeBps);
        }
      }
    };

    updateSwapAmounts();
  }, [
    isBuying,
    anchorOnSwapAmount,
    swapAmount,
    elpAmount,
    swapToken,
    swapTokenAddress,
    infoTokens,
    elpPrice,
    usdgSupply,
    totalTokenWeights,
  ]);

  const switchSwapOption = (hash = "") => {
    const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    history.push(`${history.location.pathname}#${hash}`);
    props.setIsBuying(hash === "redeem" ? false : true);
    window.scrollTo(0, currentScrollPosition);
  };

  const fillMaxAmount = () => {
    if (isBuying) {
      setAnchorOnSwapAmount(true);
      setSwapValue(formatAmountFree(swapTokenBalance, swapToken.decimals, swapToken.decimals));
      return;
    }

    setAnchorOnSwapAmount(false);
    setElpValue(formatAmountFree(maxSellAmount, ELP_DECIMALS, ELP_DECIMALS));
  };

  const getError = () => {
    if (IS_NETWORK_DISABLED[chainId]) {
      if (isBuying) return [t`ELP buy disabled, pending ${getChainName(chainId)} upgrade`];
      return [t`ELP sell disabled, pending ${getChainName(chainId)} upgrade`];
    }

    if (!isBuying && inCooldownWindow) {
      return [t`Redemption time not yet reached`];
    }

    if (!swapAmount || swapAmount.eq(0)) {
      return [t`Enter an amount`];
    }
    if (!elpAmount || elpAmount.eq(0)) {
      return [t`Enter an amount`];
    }

    if (isBuying) {
      const swapTokenInfo = getTokenInfo(infoTokens, swapTokenAddress);
      if (
        !savedShouldDisableValidationForTesting &&
        swapTokenInfo &&
        swapTokenInfo.balance &&
        swapAmount &&
        swapAmount.gt(swapTokenInfo.balance)
      ) {
        return [t`Insufficient ${swapTokenInfo.symbol} balance`];
      }

      if (swapTokenInfo.maxUsdgAmount && swapTokenInfo.usdgAmount && swapUsdMin) {
        const usdgFromAmount = adjustForDecimals(swapUsdMin, USD_DECIMALS, USDG_DECIMALS);
        const nextUsdgAmount = swapTokenInfo.usdgAmount.add(usdgFromAmount);
        if (swapTokenInfo.maxUsdgAmount.gt(0) && nextUsdgAmount.gt(swapTokenInfo.maxUsdgAmount)) {
          return [t`${swapTokenInfo.symbol} pool exceeded, try different token`, true];
        }
      }
    }

    if (!isBuying) {
      if (maxSellAmount && elpAmount && elpAmount.gt(maxSellAmount)) {
        return [t`Insufficient ELP balance`];
      }

      const swapTokenInfo = getTokenInfo(infoTokens, swapTokenAddress);
      if (
        swapTokenInfo &&
        swapTokenInfo.availableAmount &&
        swapAmount &&
        swapAmount.gt(swapTokenInfo.availableAmount)
      ) {
        return [t`Insufficient liquidity`];
      }
    }

    return [false];
  };

  const isPrimaryEnabled = () => {
    if (IS_NETWORK_DISABLED[chainId]) {
      return false;
    }
    if (!active) {
      return true;
    }
    const [error, modal] = getError();
    if (error && !modal) {
      return false;
    }
    if ((needApproval && isWaitingForApproval) || isApproving) {
      return false;
    }
    if (isApproving) {
      return false;
    }
    if (isSubmitting) {
      return false;
    }
    if (isBuying && isSwapTokenCapReached) {
      return false;
    }

    return true;
  };

  const getPrimaryText = () => {
    if (!active) {
      return t`Connect Wallet`;
    }
    const [error, modal] = getError();
    if (error && !modal) {
      return error;
    }
    if (isBuying && isSwapTokenCapReached) {
      return t`Max Capacity for ${swapToken.symbol} Reached`;
    }

    if (needApproval && isWaitingForApproval) {
      return t`Waiting for Approval`;
    }
    if (isApproving) {
      return t`Approving ${swapToken.symbol}...`;
    }
    if (needApproval) {
      return t`Approve ${swapToken.symbol}`;
    }

    if (isSubmitting) {
      return isBuying ? t`Buying...` : t`Selling...`;
    }

    return isBuying ? t`Buy ELP` : t`Sell ELP`;
  };

  const approveFromToken = () => {
    approveTokens({
      setIsApproving,
      library,
      tokenAddress: swapToken.address,
      spender: elpManagerAddress,
      chainId: chainId,
      onApproveSubmitted: () => {
        setIsWaitingForApproval(true);
      },
      infoTokens,
      getTokenInfo,
    });
  };

  const buyElp = () => {
    setIsSubmitting(true);

    const minElp = elpAmount.mul(BASIS_POINTS_DIVISOR - savedSlippageAmount).div(BASIS_POINTS_DIVISOR);

    const contract = new ethers.Contract(elpRewardRouterAddress, RewardRouter.abi, library.getSigner());
    const method = swapTokenAddress === AddressZero ? "mintAndStakeElpETH" : "mintAndStakeElp";
    const params = swapTokenAddress === AddressZero ? [0, minElp] : [swapTokenAddress, swapAmount, 0, minElp];
    const value = swapTokenAddress === AddressZero ? swapAmount : 0;

    callContract(chainId, contract, method, params, {
      value,
      sentMsg: t`Buy submitted.`,
      failMsg: t`Buy failed.`,
      successMsg: t`${formatAmount(elpAmount, 18, 4, true)} ELP bought with ${formatAmount(
        swapAmount,
        swapTokenInfo.decimals,
        4,
        true
      )} ${swapTokenInfo.symbol}!`,
      setPendingTxns,
    })
      .then(async () => {})
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const sellElp = () => {
    setIsSubmitting(true);

    const minOut = swapAmount.mul(BASIS_POINTS_DIVISOR - savedSlippageAmount).div(BASIS_POINTS_DIVISOR);

    const contract = new ethers.Contract(elpRewardRouterAddress, RewardRouter.abi, library.getSigner());
    const method = swapTokenAddress === AddressZero ? "unstakeAndRedeemElpETH" : "unstakeAndRedeemElp";
    const params =
      swapTokenAddress === AddressZero ? [elpAmount, minOut, account] : [swapTokenAddress, elpAmount, minOut, account];

    callContract(chainId, contract, method, params, {
      sentMsg: t`Sell submitted!`,
      failMsg: t`Sell failed.`,
      successMsg: t`${formatAmount(elpAmount, 18, 4, true)} ELP sold for ${formatAmount(
        swapAmount,
        swapTokenInfo.decimals,
        4,
        true
      )} ${swapTokenInfo.symbol}!`,
      setPendingTxns,
    })
      .then(async () => {})
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const onClickPrimary = () => {
    if (!active) {
      connectWallet();
      return;
    }

    if (needApproval) {
      approveFromToken();
      return;
    }

    const [, modal] = getError();

    if (modal) {
      setModalError(true);
      return;
    }

    if (isBuying) {
      buyElp();
    } else {
      sellElp();
    }
  };

  let payLabel = t`Pay:`;
  let receiveLabel = t`Receive:`;
  let payBalance = "$0.00";
  let receiveBalance = "$0.00";
  if (isBuying) {
    if (swapUsdMin) {
      payBalance = `$${formatAmount(swapUsdMin, USD_DECIMALS, 2, true)}`;
    }
    if (elpUsdMax) {
      receiveBalance = `$${formatAmount(elpUsdMax, USD_DECIMALS, 2, true)}`;
    }
  } else {
    if (elpUsdMax) {
      payBalance = `$${formatAmount(elpUsdMax, USD_DECIMALS, 2, true)}`;
    }
    if (swapUsdMin) {
      receiveBalance = `$${formatAmount(swapUsdMin, USD_DECIMALS, 2, true)}`;
    }
  }

  const selectToken = (token) => {
    setAnchorOnSwapAmount(false);
    setSwapTokenAddress(token.address);
    helperToast.success(t`${token.symbol} selected in order form`);
  };

  let feePercentageText = formatAmount(feeBasisPoints, 2, 2, true, "-");
  if (feeBasisPoints !== undefined && feeBasisPoints.toString().length > 0) {
    feePercentageText += "%";
  }

  const wrappedTokenSymbol = getWrappedToken(chainId).symbol;
  const nativeTokenSymbol = getNativeToken(chainId).symbol;

  const onSwapOptionChange = (opt) => {
    if (opt === t`Sell ELP`) {
      switchSwapOption("redeem");
    } else {
      switchSwapOption();
    }
  };

  return (
    <div className="ElpSwap">
      <SwapErrorModal
        isVisible={Boolean(modalError)}
        setIsVisible={setModalError}
        swapToken={swapToken}
        chainId={chainId}
        elpAmount={elpAmount}
        usdgSupply={usdgSupply}
        totalTokenWeights={totalTokenWeights}
        elpPrice={elpPrice}
        infoTokens={infoTokens}
        swapUsdMin={swapUsdMin}
      />
      <div className="ElpSwap-content">
        <div className="App-card ElpSwap-stats-card">
          <div className="App-card-title">
            <div className="App-card-title-mark">
              <div className="App-card-title-mark-icon">
                <img width="40" src={elpIcon} alt="ELP" />
              </div>
              <div className="App-card-title-mark-info">
                <div className="App-card-title-mark-title">ELP</div>
                <div className="App-card-title-mark-subtitle">ELP</div>
              </div>
              <div>
                <AssetDropdown assetSymbol="ELP" />
              </div>
            </div>
          </div>
          <div className="App-card-divider" />
          <div className="App-card-content">
            <div className="App-card-row">
              <div className="label">
                <Trans>Price</Trans>
              </div>
              <div className="value">${formatAmount(elpPrice, USD_DECIMALS, 3, true)}</div>
            </div>
            <div className="App-card-row">
              <div className="label">
                <Trans>Wallet</Trans>
              </div>
              <div className="value">
                {formatAmount(elpBalance, ELP_DECIMALS, 4, true)} ELP ($
                {formatAmount(elpBalanceUsd, USD_DECIMALS, 2, true)})
              </div>
            </div>
            <div className="App-card-row">
              <div className="label">
                <Trans>Staked</Trans>
              </div>
              <div className="value">
                {formatAmount(elpBalance, ELP_DECIMALS, 4, true)} ELP ($
                {formatAmount(elpBalanceUsd, USD_DECIMALS, 2, true)})
              </div>
            </div>
          </div>
          <div className="App-card-divider" />
          <div className="App-card-content">
            {!isBuying && (
              <div className="App-card-row">
                <div className="label">
                  <Trans>Reserved</Trans>
                </div>
                <div className="value">
                  <Tooltip
                    handle={`${formatAmount(reservedAmount, 18, 4, true)} ELP ($${formatAmount(
                      reserveAmountUsd,
                      USD_DECIMALS,
                      2,
                      true
                    )})`}
                    position="right-bottom"
                    renderContent={() =>
                      t`${formatAmount(reservedAmount, 18, 4, true)} ELP have been reserved for vesting.`
                    }
                  />
                </div>
              </div>
            )}
            <div className="App-card-row">
              <div className="label">
                <Trans>APR</Trans>
              </div>
              <div className="value">
                <Tooltip
                  handle={`${formatAmount(totalApr, 2, 2, true)}%`}
                  position="right-bottom"
                  renderContent={() => {
                    return (
                      <>
                        <StatsTooltipRow
                          label={t`${nativeTokenSymbol} (${wrappedTokenSymbol}) APR`}
                          value={`${formatAmount(feeElpTrackerApr, 2, 2, false)}%`}
                          showDollar={false}
                        />
                        <StatsTooltipRow
                          label={t`Escrowed EDDX APR`}
                          value={`${formatAmount(stakedElpTrackerApr, 2, 2, false)}%`}
                          showDollar={false}
                        />
                      </>
                    );
                  }}
                />
              </div>
            </div>
            <div className="App-card-row">
              <div className="label">
                <Trans>Total Supply</Trans>
              </div>
              <div className="value">
                <Trans>
                  {formatAmount(elpSupply, ELP_DECIMALS, 4, true)} ELP ($
                  {formatAmount(elpSupplyUsd, USD_DECIMALS, 2, true)})
                </Trans>
              </div>
            </div>
          </div>
        </div>
        <div className="ElpSwap-box App-box">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onClickPrimary();
            }}
          >
            <Tab
              options={[t`Buy ELP`, t`Sell ELP`]}
              option={tabLabel}
              onChange={onSwapOptionChange}
              className="Exchange-swap-option-tabs"
            />
            {isBuying && (
              <BuyInputSection
                topLeftLabel={payLabel}
                topRightLabel={t`Balance`}
                topRightValue={`${formatAmount(swapTokenBalance, swapToken.decimals, 4, true)}`}
                inputValue={swapValue}
                onInputValueChange={onSwapValueChange}
                showMaxButton={swapValue !== formatAmountFree(swapTokenBalance, swapToken.decimals, swapToken.decimals)}
                onClickTopRightLabel={fillMaxAmount}
                onClickMax={fillMaxAmount}
                topLeftValue={payBalance}
              >
                <TokenSelector
                  label={t`Pay`}
                  chainId={chainId}
                  tokenAddress={swapTokenAddress}
                  onSelectToken={onSelectSwapToken}
                  tokens={whitelistedTokens}
                  infoTokens={infoTokens}
                  className="ElpSwap-from-token"
                  showSymbolImage={true}
                  showTokenImgInDropdown={true}
                />
              </BuyInputSection>
            )}

            {!isBuying && (
              <BuyInputSection
                topLeftLabel={payLabel}
                topRightLabel={t`Available`}
                topRightValue={`${formatAmount(maxSellAmount, ELP_DECIMALS, 4, true)}`}
                inputValue={elpValue}
                onInputValueChange={onElpValueChange}
                showMaxButton={elpValue !== formatAmountFree(maxSellAmount, ELP_DECIMALS, ELP_DECIMALS)}
                onClickTopRightLabel={fillMaxAmount}
                onClickMax={fillMaxAmount}
                topLeftValue={payBalance}
              >
                <div className="selected-token">ELP</div>
              </BuyInputSection>
            )}

            <div className="AppOrder-ball-container">
              <button
                type="button"
                className="AppOrder-ball"
                onClick={() => {
                  setIsBuying(!isBuying);
                  switchSwapOption(isBuying ? "redeem" : "");
                }}
              >
                <IoChevronDownOutline className="AppOrder-ball-icon" />
              </button>
            </div>

            {isBuying && (
              <BuyInputSection
                topLeftLabel={receiveLabel}
                topRightLabel={t`Balance`}
                topLeftValue={receiveBalance}
                topRightValue={`${formatAmount(elpBalance, ELP_DECIMALS, 4, true)}`}
                inputValue={elpValue}
                onInputValueChange={onElpValueChange}
                defaultTokenName={"ELP"}
              >
                <div className="selected-token">ELP</div>
              </BuyInputSection>
            )}

            {!isBuying && (
              <BuyInputSection
                topLeftLabel={receiveLabel}
                topRightLabel={t`Balance`}
                topLeftValue={receiveBalance}
                topRightValue={`${formatAmount(swapTokenBalance, swapToken.decimals, 4, true)}`}
                inputValue={swapValue}
                onInputValueChange={onSwapValueChange}
                selectedToken={swapToken}
              >
                <TokenSelector
                  label={t`Receive`}
                  chainId={chainId}
                  tokenAddress={swapTokenAddress}
                  onSelectToken={onSelectSwapToken}
                  tokens={whitelistedTokens}
                  infoTokens={infoTokens}
                  className="ElpSwap-from-token"
                  showSymbolImage={true}
                  showTokenImgInDropdown={true}
                />
              </BuyInputSection>
            )}

            <div>
              <div className="Exchange-info-row">
                <div className="Exchange-info-label">{isFeesHigh ? t`WARNING: High Fees` : t`Fees`}</div>
                <div className="align-right fee-block">
                  {isBuying && (
                    <Tooltip
                      handle={isBuying && isSwapTokenCapReached ? "NA" : feePercentageText}
                      position="right-bottom"
                      renderContent={() => {
                        if (!feeBasisPoints) {
                          return (
                            <div className="text-white">
                              <Trans>Fees will be shown once you have entered an amount in the order form.</Trans>
                            </div>
                          );
                        }
                        return (
                          <div className="text-white">
                            {isFeesHigh && <Trans>To reduce fees, select a different asset to pay with.</Trans>}
                            <Trans>Check the "Save on Fees" section below to get the lowest fee percentages.</Trans>
                          </div>
                        );
                      }}
                    />
                  )}
                  {!isBuying && (
                    <Tooltip
                      handle={feePercentageText}
                      position="right-bottom"
                      renderContent={() => {
                        if (!feeBasisPoints) {
                          return (
                            <div className="text-white">
                              <Trans>Fees will be shown once you have entered an amount in the order form.</Trans>
                            </div>
                          );
                        }
                        return (
                          <div className="text-white">
                            {isFeesHigh && <Trans>To reduce fees, select a different asset to receive.</Trans>}
                            <Trans>Check the "Save on Fees" section below to get the lowest fee percentages.</Trans>
                          </div>
                        );
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
            <div className="ElpSwap-cta Exchange-swap-button-container">
              <Button type="submit" variant="primary-action" className="w-full" disabled={!isPrimaryEnabled()}>
                {getPrimaryText()}
              </Button>
            </div>
          </form>
        </div>
      </div>
      <div className="Tab-title-section">
        <div className="Page-title">
          <Trans>Save on Fees</Trans>
        </div>
        {isBuying && (
          <div className="Page-description">
            <Trans>
              Fees may vary depending on which asset you use to buy ELP. <br />
              Enter the amount of ELP you want to purchase in the order form, then check here to compare fees.
            </Trans>
          </div>
        )}
        {!isBuying && (
          <div className="Page-description">
            <Trans>
              Fees may vary depending on which asset you sell ELP for. <br />
              Enter the amount of ELP you want to redeem in the order form, then check here to compare fees.
            </Trans>
          </div>
        )}
      </div>
      <div className="ElpSwap-token-list">
        {/* <div className="ElpSwap-token-list-content"> */}
        <table className="token-table">
          <thead>
            <tr>
              <th>
                <Trans>TOKEN</Trans>
              </th>
              <th>
                <Trans>PRICE</Trans>
              </th>
              <th>
                {isBuying ? (
                  <Tooltip
                    handle={t`AVAILABLE`}
                    tooltipIconPosition="right"
                    position="right-bottom text-none"
                    renderContent={() => (
                      <p className="text-white">
                        <Trans>Available amount to deposit into ELP.</Trans>
                      </p>
                    )}
                  />
                ) : (
                  <Tooltip
                    handle={t`AVAILABLE`}
                    tooltipIconPosition="right"
                    position="center-bottom text-none"
                    renderContent={() => {
                      return (
                        <p className="text-white">
                          <Trans>
                            Available amount to withdraw from ELP. Funds not utilized by current open positions.
                          </Trans>
                        </p>
                      );
                    }}
                  />
                )}
              </th>
              <th>
                <Trans>WALLET</Trans>
              </th>
              <th>
                <Tooltip
                  handle={t`FEES`}
                  tooltipIconPosition="right"
                  position="right-bottom text-none"
                  renderContent={() => {
                    return (
                      <div className="text-white">
                        <Trans>Fees will be shown once you have entered an amount in the order form.</Trans>
                      </div>
                    );
                  }}
                />
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibleTokens.map((token) => {
              let tokenFeeBps;
              if (isBuying) {
                const { feeBasisPoints: feeBps } = getBuyElpFromAmount(
                  elpAmount,
                  token.address,
                  infoTokens,
                  elpPrice,
                  usdgSupply,
                  totalTokenWeights
                );
                tokenFeeBps = feeBps;
              } else {
                const { feeBasisPoints: feeBps } = getSellElpToAmount(
                  elpAmount,
                  token.address,
                  infoTokens,
                  elpPrice,
                  usdgSupply,
                  totalTokenWeights
                );
                tokenFeeBps = feeBps;
              }
              const tokenInfo = getTokenInfo(infoTokens, token.address);
              let managedUsd;
              if (tokenInfo && tokenInfo.managedUsd) {
                managedUsd = tokenInfo.managedUsd;
              }
              let availableAmountUsd;
              if (tokenInfo && tokenInfo.minPrice && tokenInfo.availableAmount) {
                availableAmountUsd = tokenInfo.availableAmount
                  .mul(tokenInfo.minPrice)
                  .div(expandDecimals(1, token.decimals));
              }
              let balanceUsd;
              if (tokenInfo && tokenInfo.minPrice && tokenInfo.balance) {
                balanceUsd = tokenInfo.balance.mul(tokenInfo.minPrice).div(expandDecimals(1, token.decimals));
              }
              const tokenImage = importImage("ic_" + token.symbol.toLowerCase() + "_40.svg");
              let isCapReached = tokenInfo.managedAmount?.gt(tokenInfo.maxUsdgAmount);

              let amountLeftToDeposit = bigNumberify(0);
              if (tokenInfo.maxUsdgAmount && tokenInfo.maxUsdgAmount.gt(0)) {
                amountLeftToDeposit = tokenInfo.maxUsdgAmount
                  .sub(tokenInfo.usdgAmount)
                  .mul(expandDecimals(1, USD_DECIMALS))
                  .div(expandDecimals(1, USDG_DECIMALS));
              }
              if (amountLeftToDeposit.lt(0)) {
                amountLeftToDeposit = bigNumberify(0);
              }
              function renderFees() {
                const swapUrl = `https://app.1inch.io/#/${chainId}/swap/`;
                switch (true) {
                  case (isBuying && isCapReached) || (!isBuying && managedUsd?.lt(1)):
                    return (
                      <Tooltip
                        handle="NA"
                        position="right-bottom"
                        renderContent={() => (
                          <div className="text-white">
                            <Trans>
                              Max pool capacity reached for {tokenInfo.symbol}
                              <br />
                              <br />
                              Please mint ELP using another token
                            </Trans>
                            <br />
                            <p>
                              <ExternalLink href={swapUrl}>
                                <Trans> Swap {tokenInfo.symbol} on 1inch</Trans>
                              </ExternalLink>
                            </p>
                          </div>
                        )}
                      />
                    );
                  case (isBuying && !isCapReached) || (!isBuying && managedUsd?.gt(0)):
                    return `${formatAmount(tokenFeeBps, 2, 2, true, "-")}${
                      tokenFeeBps !== undefined && tokenFeeBps.toString().length > 0 ? "%" : ""
                    }`;
                  default:
                    return "";
                }
              }

              return (
                <tr key={token.symbol}>
                  <td>
                    <div className="App-card-title-info">
                      <div className="App-card-title-info-icon">
                        <img src={tokenImage} alt={token.symbol} width="40" />
                      </div>
                      <div className="App-card-title-info-text">
                        <div className="App-card-info-title">{token.name}</div>
                        <div className="App-card-info-subtitle">{token.symbol}</div>
                      </div>
                      <div>
                        <AssetDropdown assetSymbol={token.symbol} assetInfo={token} />
                      </div>
                    </div>
                  </td>
                  <td>${formatKeyAmount(tokenInfo, "minPrice", USD_DECIMALS, 2, true)}</td>
                  <td>
                    {isBuying && (
                      <div>
                        <Tooltip
                          handle={
                            amountLeftToDeposit && amountLeftToDeposit.lt(0)
                              ? "$0.00"
                              : `$${formatAmount(amountLeftToDeposit, USD_DECIMALS, 2, true)}`
                          }
                          className="nowrap"
                          position="right-bottom"
                          tooltipIconPosition="right"
                          renderContent={() => getTooltipContent(managedUsd, tokenInfo, token)}
                        />
                      </div>
                    )}
                    {!isBuying && (
                      <div>
                        <Tooltip
                          handle={
                            availableAmountUsd && availableAmountUsd.lt(0)
                              ? "$0.00"
                              : `$${formatAmount(availableAmountUsd, USD_DECIMALS, 2, true)}`
                          }
                          className="nowrap"
                          position="right-bottom"
                          tooltipIconPosition="right"
                          renderContent={() => getTooltipContent(managedUsd, tokenInfo, token)}
                        />
                      </div>
                    )}
                  </td>
                  <td>
                    {formatKeyAmount(tokenInfo, "balance", tokenInfo.decimals, 2, true)} {tokenInfo.symbol} ($
                    {formatAmount(balanceUsd, USD_DECIMALS, 2, true)})
                  </td>
                  <td>{renderFees()}</td>
                  <td>
                    <Button
                      variant="secondary"
                      className={cx("w-full", isBuying ? "buying" : "selling")}
                      onClick={() => selectToken(token)}
                    >
                      {isBuying ? t`Buy with ${token.symbol}` : t`Sell for ${token.symbol}`}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="token-grid">
          {visibleTokens.map((token) => {
            let tokenFeeBps;
            if (isBuying) {
              const { feeBasisPoints: feeBps } = getBuyElpFromAmount(
                elpAmount,
                token.address,
                infoTokens,
                elpPrice,
                usdgSupply,
                totalTokenWeights
              );
              tokenFeeBps = feeBps;
            } else {
              const { feeBasisPoints: feeBps } = getSellElpToAmount(
                elpAmount,
                token.address,
                infoTokens,
                elpPrice,
                usdgSupply,
                totalTokenWeights
              );
              tokenFeeBps = feeBps;
            }
            const tokenInfo = getTokenInfo(infoTokens, token.address);
            let managedUsd;
            if (tokenInfo && tokenInfo.managedUsd) {
              managedUsd = tokenInfo.managedUsd;
            }
            let availableAmountUsd;
            if (tokenInfo && tokenInfo.minPrice && tokenInfo.availableAmount) {
              availableAmountUsd = tokenInfo.availableAmount
                .mul(tokenInfo.minPrice)
                .div(expandDecimals(1, token.decimals));
            }
            let balanceUsd;
            if (tokenInfo && tokenInfo.minPrice && tokenInfo.balance) {
              balanceUsd = tokenInfo.balance.mul(tokenInfo.minPrice).div(expandDecimals(1, token.decimals));
            }

            let amountLeftToDeposit = bigNumberify(0);
            if (tokenInfo.maxUsdgAmount && tokenInfo.maxUsdgAmount.gt(0)) {
              amountLeftToDeposit = tokenInfo.maxUsdgAmount
                .sub(tokenInfo.usdgAmount)
                .mul(expandDecimals(1, USD_DECIMALS))
                .div(expandDecimals(1, USDG_DECIMALS));
            }
            if (amountLeftToDeposit.lt(0)) {
              amountLeftToDeposit = bigNumberify(0);
            }
            let isCapReached = tokenInfo.managedAmount?.gt(tokenInfo.maxUsdgAmount);

            function renderFees() {
              switch (true) {
                case (isBuying && isCapReached) || (!isBuying && managedUsd?.lt(1)):
                  return (
                    <Tooltip
                      handle="NA"
                      position="right-bottom"
                      renderContent={() => (
                        <Trans>
                          Max pool capacity reached for {tokenInfo.symbol}. Please mint ELP using another token
                        </Trans>
                      )}
                    />
                  );
                case (isBuying && !isCapReached) || (!isBuying && managedUsd?.gt(0)):
                  return `${formatAmount(tokenFeeBps, 2, 2, true, "-")}${
                    tokenFeeBps !== undefined && tokenFeeBps.toString().length > 0 ? "%" : ""
                  }`;
                default:
                  return "";
              }
            }
            const tokenImage = importImage("ic_" + token.symbol.toLowerCase() + "_24.svg");
            return (
              <div className="App-card" key={token.symbol}>
                <div className="mobile-token-card">
                  <img src={tokenImage} alt={token.symbol} width="20px" />
                  <div className="token-symbol-text">{token.symbol}</div>
                  <div>
                    <AssetDropdown assetSymbol={token.symbol} assetInfo={token} />
                  </div>
                </div>
                <div className="App-card-divider" />
                <div className="App-card-content">
                  <div className="App-card-row">
                    <div className="label">
                      <Trans>Price</Trans>
                    </div>
                    <div>${formatKeyAmount(tokenInfo, "minPrice", USD_DECIMALS, 2, true)}</div>
                  </div>
                  {isBuying && (
                    <div className="App-card-row">
                      <Tooltip
                        handle={t`Available`}
                        position="left-bottom"
                        className="label"
                        renderContent={() => (
                          <p className="text-white">
                            <Trans>Available amount to deposit into ELP.</Trans>
                          </p>
                        )}
                      />
                      <div>
                        <Tooltip
                          handle={amountLeftToDeposit && `$${formatAmount(amountLeftToDeposit, USD_DECIMALS, 2, true)}`}
                          position="right-bottom"
                          tooltipIconPosition="right"
                          renderContent={() => getTooltipContent(managedUsd, tokenInfo, token)}
                        />
                      </div>
                    </div>
                  )}
                  {!isBuying && (
                    <div className="App-card-row">
                      <div className="label">
                        <Tooltip
                          handle={t`Available`}
                          position="left-bottom"
                          renderContent={() => {
                            return (
                              <p className="text-white">
                                <Trans>
                                  Available amount to withdraw from ELP. Funds not utilized by current open positions.
                                </Trans>
                              </p>
                            );
                          }}
                        />
                      </div>

                      <div>
                        <Tooltip
                          handle={
                            availableAmountUsd && availableAmountUsd.lt(0)
                              ? "$0.00"
                              : `$${formatAmount(availableAmountUsd, USD_DECIMALS, 2, true)}`
                          }
                          position="right-bottom"
                          tooltipIconPosition="right"
                          renderContent={() => getTooltipContent(managedUsd, tokenInfo, token)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="App-card-row">
                    <div className="label">
                      <Trans>Wallet</Trans>
                    </div>
                    <div>
                      {formatKeyAmount(tokenInfo, "balance", tokenInfo.decimals, 2, true)} {tokenInfo.symbol} ($
                      {formatAmount(balanceUsd, USD_DECIMALS, 2, true)})
                    </div>
                  </div>
                  <div className="App-card-row">
                    <div>
                      {tokenFeeBps ? (
                        t`Fees`
                      ) : (
                        <Tooltip
                          handle={t`Fees`}
                          className="label"
                          renderContent={() => (
                            <p className="text-white">
                              <Trans>Fees will be shown once you have entered an amount in the order form.</Trans>
                            </p>
                          )}
                        />
                      )}
                    </div>
                    <div>{renderFees()}</div>
                  </div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-options">
                    {isBuying && (
                      <Button variant="secondary" onClick={() => selectToken(token)}>
                        <Trans>Buy with {token.symbol}</Trans>
                      </Button>
                    )}
                    {!isBuying && (
                      <Button variant="secondary" onClick={() => selectToken(token)}>
                        <Trans>Sell for {token.symbol}</Trans>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
