import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWeb3React } from "@web3-react/core";
import useSWR from "swr";
import { ethers } from "ethers";

import { USD_DECIMALS, PRECISION } from "lib/legacy";

import { getContract, XEMT_EXCLUDED_ACCOUNTS } from "config/contracts";

import Reader from "abis/Reader.json";
import Token from "abis/Token.json";
import YieldToken from "abis/YieldToken.json";
import YieldFarm from "abis/YieldFarm.json";

import Modal from "components/Modal/Modal";
import Footer from "components/Footer/Footer";

import "./Stake.css";
import { t, Trans } from "@lingui/macro";
import { CHAIN_ID, getExplorerUrl } from "config/chains";
import { contractFetcher } from "lib/contracts";
import { approveTokens } from "domain/tokens";
import { helperToast } from "lib/helperToast";
import { getInjectedHandler } from "lib/wallets";
import { bigNumberify, expandDecimals, formatAmount, formatAmountFree, formatKeyAmount, parseValue } from "lib/numbers";
import { getTokenBySymbol } from "config/tokens";
import { useChainId } from "lib/chains";
import ExternalLink from "components/ExternalLink/ExternalLink";

const BASIS_POINTS_DIVISOR = 10000;
const HOURS_PER_YEAR = 8760;

const { AddressZero } = ethers.constants;

function getBalanceAndSupplyData(balances) {
  if (!balances || balances.length === 0) {
    return {};
  }

  const keys = [
    "usdg",
    "emt",
    "xemt",
    "emtUsdg",
    "xemtUsdg",
    "emtUsdgFarm",
    "xemtUsdgFarm",
    "autoUsdg",
    "autoUsdgFarm",
  ];
  const balanceData = {};
  const supplyData = {};
  const propsLength = 2;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    balanceData[key] = balances[i * propsLength];
    supplyData[key] = balances[i * propsLength + 1];
  }

  return { balanceData, supplyData };
}

function getStakingData(stakingInfo) {
  if (!stakingInfo || stakingInfo.length === 0) {
    return;
  }

  const keys = [
    "usdg",
    "xemt",
    "emtUsdgFarmXemt",
    "emtUsdgFarmNative",
    "xemtUsdgFarmXemt",
    "xemtUsdgFarmNative",
    "autoUsdgFarmXemt",
    "autoUsdgFarmNative",
  ];
  const data = {};
  const propsLength = 2;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    data[key] = {
      claimable: stakingInfo[i * propsLength],
      tokensPerInterval: stakingInfo[i * propsLength + 1],
    };
  }

  return data;
}

function getTotalStakedData(totalStakedInfo) {
  if (!totalStakedInfo || totalStakedInfo.length === 0) {
    return;
  }

  const keys = ["usdg", "xemt"];
  const data = {};

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    data[key] = totalStakedInfo[i];
  }

  return data;
}

function getPairData(pairInfo) {
  const keys = ["emtUsdg", "xemtUsdg", "bnbBusd", "autoUsdg"];
  if (!pairInfo || pairInfo.length === 0 || pairInfo.length !== keys.length * 2) {
    return;
  }

  const data = {};
  const propsLength = 2;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    data[key] = {
      balance0: pairInfo[i * propsLength],
      balance1: pairInfo[i * propsLength + 1],
    };
  }

  return data;
}

function getProcessedData(balanceData, supplyData, stakingData, totalStakedData, pairData, xemtSupply) {
  if (!balanceData || !supplyData || !stakingData || !totalStakedData || !pairData || !xemtSupply) {
    return {};
  }

  if (!supplyData.emtUsdg || !supplyData.xemtUsdg || !supplyData.autoUsdg) {
    return {};
  }

  // const emtPrice = pairData.emtUsdg.balance1.mul(PRECISION).div(pairData.emtUsdg.balance0)
  const xemtPrice = pairData.xemtUsdg.balance0.eq(0)
    ? bigNumberify(0)
    : pairData.xemtUsdg.balance1.mul(PRECISION).div(pairData.xemtUsdg.balance0);
  const emtUsdgPrice = supplyData.emtUsdg.eq(0)
    ? bigNumberify(0)
    : pairData.emtUsdg.balance1.mul(PRECISION).mul(2).div(supplyData.emtUsdg);
  const xemtUsdgPrice = supplyData.xemtUsdg.eq(0)
    ? bigNumberify(0)
    : pairData.xemtUsdg.balance1.mul(PRECISION).mul(2).div(supplyData.xemtUsdg);
  const bnbPrice = pairData.bnbBusd.balance1.mul(PRECISION).div(pairData.bnbBusd.balance0);
  const autoUsdgPrice = supplyData.autoUsdg.eq(0)
    ? bigNumberify(0)
    : pairData.autoUsdg.balance1.mul(PRECISION).mul(2).div(supplyData.autoUsdg);

  const usdgAnnualRewardsUsd = stakingData.usdg.tokensPerInterval
    .mul(bnbPrice)
    .mul(HOURS_PER_YEAR)
    .div(expandDecimals(1, 18));
  const xemtAnnualRewardsUsd = stakingData.xemt.tokensPerInterval
    .mul(bnbPrice)
    .mul(HOURS_PER_YEAR)
    .div(expandDecimals(1, 18));

  const emtUsdgAnnualRewardsXmgtUsd = stakingData.emtUsdgFarmXemt.tokensPerInterval
    .mul(xemtPrice)
    .mul(HOURS_PER_YEAR)
    .div(expandDecimals(1, 18));
  const emtUsdgAnnualRewardsNativeUsd = stakingData.emtUsdgFarmNative.tokensPerInterval
    .mul(bnbPrice)
    .mul(HOURS_PER_YEAR)
    .div(expandDecimals(1, 18));
  const emtUsdgTotalAnnualRewardsUsd = emtUsdgAnnualRewardsXmgtUsd.add(emtUsdgAnnualRewardsNativeUsd);

  const xemtUsdgAnnualRewardsXmgtUsd = stakingData.xemtUsdgFarmXemt.tokensPerInterval
    .mul(xemtPrice)
    .mul(HOURS_PER_YEAR)
    .div(expandDecimals(1, 18));
  const xemtUsdgAnnualRewardsNativeUsd = stakingData.xemtUsdgFarmNative.tokensPerInterval
    .mul(bnbPrice)
    .mul(HOURS_PER_YEAR)
    .div(expandDecimals(1, 18));
  const xemtUsdgTotalAnnualRewardsUsd = xemtUsdgAnnualRewardsXmgtUsd.add(xemtUsdgAnnualRewardsNativeUsd);

  const autoUsdgAnnualRewardsXemtUsd = stakingData.autoUsdgFarmXemt.tokensPerInterval
    .mul(xemtPrice)
    .mul(HOURS_PER_YEAR)
    .div(expandDecimals(1, 18));
  const autoUsdgAnnualRewardsNativeUsd = stakingData.autoUsdgFarmNative.tokensPerInterval
    .mul(bnbPrice)
    .mul(HOURS_PER_YEAR)
    .div(expandDecimals(1, 18));
  const autoUsdgTotalAnnualRewardsUsd = autoUsdgAnnualRewardsXemtUsd.add(autoUsdgAnnualRewardsNativeUsd);

  const data = {};
  data.usdgBalance = balanceData.usdg;
  data.usdgSupply = supplyData.usdg;
  data.usdgTotalStaked = totalStakedData.usdg;
  data.usdgTotalStakedUsd = totalStakedData.usdg.mul(PRECISION).div(expandDecimals(1, 18));
  data.usdgSupplyUsd = supplyData.usdg.mul(PRECISION).div(expandDecimals(1, 18));
  data.usdgApr = data.usdgTotalStaked.eq(0)
    ? undefined
    : usdgAnnualRewardsUsd
        .mul(BASIS_POINTS_DIVISOR)
        .div(totalStakedData.usdg)
        .mul(expandDecimals(1, 18))
        .div(PRECISION);
  data.usdgRewards = stakingData.usdg.claimable;

  data.xemtBalance = balanceData.xemt;
  data.xemtBalanceUsd = balanceData.xemt.mul(xemtPrice).div(expandDecimals(1, 18));
  data.xemtSupply = xemtSupply;
  data.xemtTotalStaked = totalStakedData.xemt;
  data.xemtTotalStakedUsd = totalStakedData.xemt.mul(xemtPrice).div(expandDecimals(1, 18));
  data.xemtSupplyUsd = xemtSupply.mul(xemtPrice).div(expandDecimals(1, 18));
  data.xemtApr = data.xemtSupplyUsd.eq(0)
    ? bigNumberify(0)
    : xemtAnnualRewardsUsd.mul(BASIS_POINTS_DIVISOR).div(data.xemtTotalStakedUsd);
  data.xemtRewards = stakingData.xemt.claimable;

  data.emtUsdgFarmBalance = balanceData.emtUsdgFarm;

  data.emtUsdgBalance = balanceData.emtUsdg;
  data.emtUsdgBalanceUsd = balanceData.emtUsdg.mul(emtUsdgPrice).div(expandDecimals(1, 18));
  data.emtUsdgSupply = supplyData.emtUsdg;
  data.emtUsdgSupplyUsd = supplyData.emtUsdg.mul(emtUsdgPrice).div(expandDecimals(1, 18));
  data.emtUsdgStaked = balanceData.emtUsdgFarm;
  data.emtUsdgStakedUsd = balanceData.emtUsdgFarm.mul(emtUsdgPrice).div(expandDecimals(1, 18));
  data.emtUsdgFarmSupplyUsd = supplyData.emtUsdgFarm.mul(emtUsdgPrice).div(expandDecimals(1, 18));
  data.emtUsdgApr = data.emtUsdgSupplyUsd.eq(0)
    ? bigNumberify(0)
    : data.emtUsdgFarmSupplyUsd.eq(0)
    ? undefined
    : emtUsdgTotalAnnualRewardsUsd.mul(BASIS_POINTS_DIVISOR).div(data.emtUsdgSupplyUsd);
  data.emtUsdgXemtRewards = stakingData.emtUsdgFarmXemt.claimable;
  data.emtUsdgNativeRewards = stakingData.emtUsdgFarmNative.claimable;
  data.emtUsdgTotalRewards = data.emtUsdgXemtRewards.add(data.emtUsdgNativeRewards);
  data.emtUsdgTotalStaked = supplyData.emtUsdgFarm;
  data.emtUsdgTotalStakedUsd = supplyData.emtUsdgFarm.mul(emtUsdgPrice).div(expandDecimals(1, 18));

  data.xemtUsdgBalance = balanceData.xemtUsdg;
  data.xemtUsdgFarmBalance = balanceData.xemtUsdgFarm;
  data.xemtUsdgBalanceUsd = balanceData.xemtUsdg.mul(xemtUsdgPrice).div(expandDecimals(1, 18));
  data.xemtUsdgSupply = supplyData.xemtUsdg;
  data.xemtUsdgSupplyUsd = supplyData.xemtUsdg.mul(xemtUsdgPrice).div(expandDecimals(1, 18));
  data.xemtUsdgStaked = balanceData.xemtUsdgFarm;
  data.xemtUsdgStakedUsd = balanceData.xemtUsdgFarm.mul(xemtUsdgPrice).div(expandDecimals(1, 18));
  data.xemtUsdgFarmSupplyUsd = supplyData.xemtUsdgFarm.mul(xemtUsdgPrice).div(expandDecimals(1, 18));
  data.xemtUsdgApr = data.xemtUsdgFarmSupplyUsd.eq(0)
    ? undefined
    : xemtUsdgTotalAnnualRewardsUsd.mul(BASIS_POINTS_DIVISOR).div(data.xemtUsdgFarmSupplyUsd);
  data.xemtUsdgXemtRewards = stakingData.xemtUsdgFarmXemt.claimable;
  data.xemtUsdgNativeRewards = stakingData.xemtUsdgFarmNative.claimable;
  data.xemtUsdgTotalRewards = data.xemtUsdgXemtRewards.add(data.xemtUsdgNativeRewards);
  data.xemtUsdgTotalStaked = supplyData.xemtUsdgFarm;
  data.xemtUsdgTotalStakedUsd = supplyData.xemtUsdgFarm.mul(xemtUsdgPrice).div(expandDecimals(1, 18));

  data.autoUsdgBalance = balanceData.autoUsdg;
  data.autoUsdgFarmBalance = balanceData.autoUsdgFarm;
  data.autoUsdgBalanceUsd = balanceData.autoUsdg.mul(autoUsdgPrice).div(expandDecimals(1, 18));
  data.autoUsdgStaked = balanceData.autoUsdgFarm;
  data.autoUsdgStakedUsd = balanceData.autoUsdgFarm.mul(autoUsdgPrice).div(expandDecimals(1, 18));
  data.autoUsdgFarmSupplyUsd = supplyData.autoUsdgFarm.mul(autoUsdgPrice).div(expandDecimals(1, 18));
  data.autoUsdgApr = data.autoUsdgFarmSupplyUsd.eq(0)
    ? bigNumberify(0)
    : autoUsdgTotalAnnualRewardsUsd.mul(BASIS_POINTS_DIVISOR).div(data.autoUsdgFarmSupplyUsd);
  data.autoUsdgXemtRewards = stakingData.autoUsdgFarmXemt.claimable;
  data.autoUsdgNativeRewards = stakingData.autoUsdgFarmNative.claimable;
  data.autoUsdgTotalRewards = data.autoUsdgXemtRewards.add(data.autoUsdgNativeRewards);
  data.autoUsdgTotalStaked = supplyData.autoUsdgFarm;
  data.autoUsdgTotalStakedUsd = supplyData.autoUsdgFarm.mul(autoUsdgPrice).div(expandDecimals(1, 18));

  data.totalStakedUsd = data.usdgTotalStakedUsd
    .add(data.xemtTotalStakedUsd)
    .add(data.emtUsdgTotalStakedUsd)
    .add(data.xemtUsdgTotalStakedUsd)
    .add(data.autoUsdgTotalStakedUsd);

  return data;
}

function StakeModal(props) {
  const {
    isVisible,
    setIsVisible,
    title,
    maxAmount,
    value,
    setValue,
    active,
    account,
    library,
    stakingTokenSymbol,
    stakingTokenAddress,
    farmAddress,
    chainId,
  } = props;
  const [isStaking, setIsStaking] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const { data: tokenAllowance, mutate: updateTokenAllowance } = useSWR(
    [active, chainId, stakingTokenAddress, "allowance", account, farmAddress],
    {
      fetcher: contractFetcher(library, Token),
    }
  );

  useEffect(() => {
    if (active) {
      library.on("block", () => {
        updateTokenAllowance(undefined, true);
      });
      return () => {
        library.removeAllListeners("block");
      };
    }
  }, [active, library, updateTokenAllowance]);

  let amount = parseValue(value, 18);
  const needApproval = tokenAllowance && amount && amount.gt(tokenAllowance);

  const getError = () => {
    if (!amount || amount.eq(0)) {
      return t`Enter an amount`;
    }
    if (maxAmount && amount.gt(maxAmount)) {
      return t`Max amount exceeded`;
    }
  };

  const onClickPrimary = () => {
    if (needApproval) {
      approveTokens({
        setIsApproving,
        library,
        tokenAddress: stakingTokenAddress,
        spender: farmAddress,
        chainId: CHAIN_ID,
      });
      return;
    }

    setIsStaking(true);
    const contract = new ethers.Contract(farmAddress, YieldFarm.abi, library.getSigner());
    contract
      .stake(amount)
      .then(async (res) => {
        const txUrl = getExplorerUrl(CHAIN_ID) + "tx/" + res.hash;
        helperToast.success(
          <div>
            <Trans>
              Stake submitted! <ExternalLink href={txUrl}>View status.</ExternalLink>
            </Trans>
            <br />
          </div>
        );
        setIsVisible(false);
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
        helperToast.error(t`Stake failed`);
      })
      .finally(() => {
        setIsStaking(false);
      });
  };

  const isPrimaryEnabled = () => {
    const error = getError();
    if (error) {
      return false;
    }
    if (isApproving) {
      return false;
    }
    if (isStaking) {
      return false;
    }
    return true;
  };

  const getPrimaryText = () => {
    const error = getError();
    if (error) {
      return error;
    }
    if (isApproving) {
      return t`Approving ${stakingTokenSymbol}...`;
    }
    if (needApproval) {
      return t`Approve ${stakingTokenSymbol}`;
    }
    if (isStaking) {
      return t`Staking...`;
    }
    return t`Stake`;
  };

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
        <div className="Exchange-swap-section">
          <div className="Exchange-swap-section-top">
            <div className="muted">
              <div className="Exchange-swap-usd">
                <Trans>Stake</Trans>
              </div>
            </div>
            <div className="muted align-right clickable" onClick={() => setValue(formatAmountFree(maxAmount, 18, 18))}>
              <Trans>Max: {formatAmount(maxAmount, 18, 4, true)}</Trans>
            </div>
          </div>
          <div className="Exchange-swap-section-bottom">
            <div>
              <input
                type="number"
                placeholder="0.0"
                className="Exchange-swap-input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <div className="PositionEditor-token-symbol">{stakingTokenSymbol}</div>
          </div>
        </div>
        <div className="Exchange-swap-button-container">
          <button className="App-cta Exchange-swap-button" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function UnstakeModal(props) {
  const { isVisible, setIsVisible, title, maxAmount, value, setValue, library, stakingTokenSymbol, farmAddress } =
    props;
  const [isUnstaking, setIsUnstaking] = useState(false);

  let amount = parseValue(value, 18);

  const getError = () => {
    if (!amount) {
      return t`Enter an amount`;
    }
    if (amount.gt(maxAmount)) {
      return t`Max amount exceeded`;
    }
  };

  const onClickPrimary = () => {
    setIsUnstaking(true);
    const contract = new ethers.Contract(farmAddress, YieldFarm.abi, library.getSigner());
    contract
      .unstake(amount)
      .then(async (res) => {
        const txUrl = getExplorerUrl(CHAIN_ID) + "tx/" + res.hash;
        helperToast.success(
          <div>
            <Trans>
              Unstake submitted! <ExternalLink href={txUrl}>View status.</ExternalLink>
            </Trans>
            <br />
          </div>
        );
        setIsVisible(false);
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
        helperToast.error(t`Unstake failed`);
      })
      .finally(() => {
        setIsUnstaking(false);
      });
  };

  const isPrimaryEnabled = () => {
    const error = getError();
    if (error) {
      return false;
    }
    if (isUnstaking) {
      return false;
    }
    return true;
  };

  const getPrimaryText = () => {
    const error = getError();
    if (error) {
      return error;
    }
    if (isUnstaking) {
      return t`Unstaking...`;
    }
    return t`Unstake`;
  };

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
        <div className="Exchange-swap-section">
          <div className="Exchange-swap-section-top">
            <div className="muted">
              <div className="Exchange-swap-usd">
                <Trans>Unstake</Trans>
              </div>
            </div>
            <div className="muted align-right clickable" onClick={() => setValue(formatAmountFree(maxAmount, 18, 18))}>
              <Trans>Max: {formatAmount(maxAmount, 18, 4, true)}</Trans>
            </div>
          </div>
          <div className="Exchange-swap-section-bottom">
            <div>
              <input
                type="number"
                placeholder="0.0"
                className="Exchange-swap-input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <div className="PositionEditor-token-symbol">{stakingTokenSymbol}</div>
          </div>
        </div>
        <div className="Exchange-swap-button-container">
          <button className="App-cta Exchange-swap-button" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default function StakeV1() {
  const { chainId } = useChainId();
  const [isStakeModalVisible, setIsStakeModalVisible] = useState(false);
  const [stakeModalTitle, setStakeModalTitle] = useState("");
  const [stakeModalMaxAmount, setStakeModalMaxAmount] = useState(undefined);
  const [stakeValue, setStakeValue] = useState("");
  const [stakingTokenAddress, setStakingTokenAddress] = useState("");
  const [stakingFarmAddress, setStakingFarmAddress] = useState("");

  const [isUnstakeModalVisible, setIsUnstakeModalVisible] = useState(false);
  const [unstakeModalTitle, setUnstakeModalTitle] = useState("");
  const [unstakeModalMaxAmount, setUnstakeModalMaxAmount] = useState(undefined);
  const [unstakeValue, setUnstakeValue] = useState("");
  const [unstakingFarmAddress, setUnstakingFarmAddress] = useState("");

  const { activate, active, account, library, deactivate } = useWeb3React();
  const connectWallet = getInjectedHandler(activate, deactivate);

  const readerAddress = getContract(CHAIN_ID, "Reader");
  const ammFactoryAddressV2 = getContract(CHAIN_ID, "AmmFactoryV2");
  const usdgAddress = getContract(CHAIN_ID, "USDG");
  const emtAddress = getContract(CHAIN_ID, "EMT");
  const xemtAddress = getContract(CHAIN_ID, "XEMT");
  const autoAddress = getContract(CHAIN_ID, "AUTO");
  const nativeTokenAddress = getContract(CHAIN_ID, "NATIVE_TOKEN");
  const busdAddress = getTokenBySymbol(CHAIN_ID, "BUSD").address;

  const emtUsdgPairAddress = getContract(CHAIN_ID, "EMT_USDG_PAIR");
  const xemtUsdgPairAddress = getContract(CHAIN_ID, "XEMT_USDG_PAIR");
  const autoUsdgPairAddress = getContract(CHAIN_ID, "AUTO_USDG_PAIR");
  const emtUsdgFarmAddress = getContract(CHAIN_ID, "EMT_USDG_FARM");
  const xemtUsdgFarmAddress = getContract(CHAIN_ID, "XEMT_USDG_FARM");
  const autoUsdgFarmAddress = getContract(CHAIN_ID, "AUTO_USDG_FARM");

  const usdgYieldTracker = getContract(CHAIN_ID, "USDG_YIELD_TRACKER");
  const xemtYieldTracker = getContract(CHAIN_ID, "XEMT_YIELD_TRACKER");
  const emtUsdgFarmTrackerXemt = getContract(CHAIN_ID, "EMT_USDG_FARM_TRACKER_XEMT");
  const emtUsdgFarmTrackerNative = getContract(CHAIN_ID, "EMT_USDG_FARM_TRACKER_NATIVE");
  const xemtUsdgFarmTrackerXemt = getContract(CHAIN_ID, "XEMT_USDG_FARM_TRACKER_XEMT");
  const xemtUsdgFarmTrackerNative = getContract(CHAIN_ID, "XEMT_USDG_FARM_TRACKER_NATIVE");
  const autoUsdgFarmTrackerXemt = getContract(CHAIN_ID, "AUTO_USDG_FARM_TRACKER_XEMT");
  const autoUsdgFarmTrackerNative = getContract(CHAIN_ID, "AUTO_USDG_FARM_TRACKER_NATIVE");

  const tokens = [
    usdgAddress,
    emtAddress,
    xemtAddress,
    emtUsdgPairAddress,
    xemtUsdgPairAddress,
    emtUsdgFarmAddress,
    xemtUsdgFarmAddress,
    autoUsdgPairAddress,
    autoUsdgFarmAddress,
  ];

  const yieldTrackers = [
    usdgYieldTracker,
    xemtYieldTracker,
    emtUsdgFarmTrackerXemt,
    emtUsdgFarmTrackerNative,
    xemtUsdgFarmTrackerXemt,
    xemtUsdgFarmTrackerNative,
    autoUsdgFarmTrackerXemt,
    autoUsdgFarmTrackerNative,
  ];

  const pairTokens = [
    emtAddress,
    usdgAddress,
    xemtAddress,
    usdgAddress,
    nativeTokenAddress,
    busdAddress,
    autoAddress,
    usdgAddress,
  ];

  const yieldTokens = [usdgAddress, xemtAddress];

  const { data: xemtSupply, mutate: updateXemtSupply } = useSWR(
    [active, chainId, readerAddress, "getTokenSupply", xemtAddress],
    {
      fetcher: contractFetcher(library, Reader, [XEMT_EXCLUDED_ACCOUNTS]),
    }
  );

  const { data: balances, mutate: updateBalances } = useSWR(
    ["Stake:balances", chainId, readerAddress, "getTokenBalancesWithSupplies", account || AddressZero],
    {
      fetcher: contractFetcher(library, Reader, [tokens]),
    }
  );

  const { data: stakingInfo, mutate: updateStakingInfo } = useSWR(
    [active, chainId, readerAddress, "getStakingInfo", account || AddressZero],
    {
      fetcher: contractFetcher(library, Reader, [yieldTrackers]),
    }
  );

  const { data: totalStakedInfo, mutate: updateTotalStakedInfo } = useSWR(
    [active, chainId, readerAddress, "getTotalStaked"],
    {
      fetcher: contractFetcher(library, Reader, [yieldTokens]),
    }
  );

  const { data: pairInfo, mutate: updatePairInfo } = useSWR(
    [active, chainId, readerAddress, "getPairInfo", ammFactoryAddressV2],
    {
      fetcher: contractFetcher(library, Reader, [pairTokens]),
    }
  );

  const { balanceData, supplyData } = getBalanceAndSupplyData(balances);
  const stakingData = getStakingData(stakingInfo);
  const pairData = getPairData(pairInfo);
  const totalStakedData = getTotalStakedData(totalStakedInfo);

  const processedData = getProcessedData(balanceData, supplyData, stakingData, totalStakedData, pairData, xemtSupply);

  const buyXemtUrl = `https://exchange.pancakeswap.finance/#/swap?outputCurrency=${xemtAddress}&inputCurrency=${usdgAddress}`;
  const buyEmtUrl = `https://exchange.pancakeswap.finance/#/swap?outputCurrency=${emtAddress}&inputCurrency=${usdgAddress}`;

  const addEmtUsdgLpUrl = `https://exchange.pancakeswap.finance/#/add/${emtAddress}/${usdgAddress}`;
  const addXemtUsdgLpUrl = `https://exchange.pancakeswap.finance/#/add/${xemtAddress}/${usdgAddress}`;

  const buyAutoUrl = `https://exchange.pancakeswap.finance/#/swap?outputCurrency=${autoAddress}&inputCurrency=${nativeTokenAddress}`;
  const addAutoUsdgLpUrl = `https://exchange.pancakeswap.finance/#/add/${autoAddress}/${usdgAddress}`;

  useEffect(() => {
    if (active) {
      library.on("block", () => {
        updateXemtSupply(undefined, true);
        updateBalances(undefined, true);
        updateStakingInfo(undefined, true);
        updateTotalStakedInfo(undefined, true);
        updatePairInfo(undefined, true);
      });
      return () => {
        library.removeAllListeners("block");
      };
    }
  }, [active, library, updateXemtSupply, updateBalances, updateStakingInfo, updateTotalStakedInfo, updatePairInfo]);

  const claim = (farmAddress, rewards) => {
    if (!active || !account) {
      helperToast.error(t`Wallet not yet connected`);
      return;
    }
    if (chainId !== CHAIN_ID) {
      helperToast.error(t`Incorrect Network`);
      return;
    }
    if (!rewards || rewards.eq(0)) {
      helperToast.error(t`No rewards to claim yet`);
      return;
    }

    const contract = new ethers.Contract(farmAddress, YieldToken.abi, library.getSigner());
    contract
      .claim(account)
      .then(async (res) => {
        const txUrl = getExplorerUrl(CHAIN_ID) + "tx/" + res.hash;
        helperToast.success(
          <div>
            <Trans>
              Claim submitted! <ExternalLink href={txUrl}>View status.</ExternalLink>
            </Trans>
            <br />
          </div>
        );
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
        helperToast.error(t`Claim failed`);
      });
  };

  const showUnstakeEmtUsdgModal = () => {
    setIsUnstakeModalVisible(true);
    setUnstakeModalTitle("Unstake EMT-USDG");
    setUnstakeModalMaxAmount(processedData.emtUsdgFarmBalance);
    setUnstakeValue("");
    setUnstakingFarmAddress(emtUsdgFarmAddress);
  };

  const showUnstakeXemtUsdgModal = () => {
    setIsUnstakeModalVisible(true);
    setUnstakeModalTitle("Unstake xEMT-USDG");
    setUnstakeModalMaxAmount(processedData.xemtUsdgFarmBalance);
    setUnstakeValue("");
    setUnstakingFarmAddress(xemtUsdgFarmAddress);
  };

  const showStakeAutoUsdgModal = () => {
    setIsStakeModalVisible(true);
    setStakeModalTitle("Stake AUTO-USDG");
    setStakeModalMaxAmount(processedData.autoUsdgBalance);
    setStakeValue("");
    setStakingTokenAddress(autoUsdgPairAddress);
    setStakingFarmAddress(autoUsdgFarmAddress);
  };

  const showUnstakeAutoUsdgModal = () => {
    setIsUnstakeModalVisible(true);
    setUnstakeModalTitle("Unstake AUTO-USDG");
    setUnstakeModalMaxAmount(processedData.autoUsdgFarmBalance);
    setUnstakeValue("");
    setUnstakingFarmAddress(autoUsdgFarmAddress);
  };

  const hasFeeDistribution = true;

  return (
    <div className="Stake Page page-layout">
      <StakeModal
        isVisible={isStakeModalVisible}
        setIsVisible={setIsStakeModalVisible}
        title={stakeModalTitle}
        maxAmount={stakeModalMaxAmount}
        value={stakeValue}
        setValue={setStakeValue}
        active={active}
        account={account}
        library={library}
        stakingTokenAddress={stakingTokenAddress}
        farmAddress={stakingFarmAddress}
      />
      <UnstakeModal
        isVisible={isUnstakeModalVisible}
        setIsVisible={setIsUnstakeModalVisible}
        title={unstakeModalTitle}
        maxAmount={unstakeModalMaxAmount}
        value={unstakeValue}
        setValue={setUnstakeValue}
        active={active}
        account={account}
        library={library}
        farmAddress={unstakingFarmAddress}
      />
      <div className="Stake-title App-hero">
        <div className="Stake-title-primary App-hero-primary">
          ${formatKeyAmount(processedData, "totalStakedUsd", 30, 0, true)}
        </div>
        <div className="Stake-title-secondary">
          <Trans>Total Assets Staked</Trans>
        </div>
      </div>
      <div className="Stake-note">
        <Trans>
          The Gambit protocol is in beta, please read the&nbsp;
          <ExternalLink href="https://gambit.gitbook.io/gambit/staking">staking details</ExternalLink>
          &nbsp; before participating.
        </Trans>
      </div>
      <div className="App-warning Stake-warning">
        <Trans>
          The <Link to="/migrate">EDDX migration</Link> is in progress, please migrate your EMT, xEMT, EMT-USDG and
          xEMT-USDG tokens.
          <br />
          USDG tokens will continue to function as before and do not need to be migrated.
        </Trans>
      </div>
      <div className="Stake-cards">
        <div className="App-card primary">
          <div className="Stake-card-title App-card-title">USDG</div>
          <div className="Stake-card-bottom App-card-content">
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>APR</Trans>
              </div>
              <div>
                {!hasFeeDistribution && "TBC"}
                {hasFeeDistribution && `${formatKeyAmount(processedData, "usdgApr", 2, 2, true)}%`}
              </div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Staked</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "usdgBalance", 18, 2, true)} ($
                {formatKeyAmount(processedData, "usdgBalance", 18, 2, true)})
              </div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Wallet</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "usdgBalance", 18, 2, true)} ($
                {formatKeyAmount(processedData, "usdgBalance", 18, 2, true)})
              </div>
            </div>
            <div className="App-card-row">
              <div className="label">
                <Trans>Rewards</Trans>
              </div>
              <div>
                {!hasFeeDistribution && "TBC"}
                {hasFeeDistribution && `${formatKeyAmount(processedData, "usdgRewards", 18, 8, true)} WBNB`}
              </div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Total Staked</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "usdgTotalStaked", 18, 2, true)} ($
                {formatKeyAmount(processedData, "usdgTotalStakedUsd", 30, 2, true)})
              </div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Total Supply</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "usdgSupply", 18, 2, true)} ($
                {formatKeyAmount(processedData, "usdgSupplyUsd", 30, 2, true)})
              </div>
            </div>
            <div className="App-card-options">
              <Link className="App-button-option App-card-option" to="/trade">
                Get USDG
              </Link>
              {active && (
                <button
                  className="App-button-option App-card-option"
                  onClick={() => claim(usdgAddress, processedData.usdgRewards)}
                >
                  <Trans>Claim</Trans>
                </button>
              )}
              {!active && (
                <button className="App-button-option App-card-option" onClick={connectWallet}>
                  <Trans>Connect Wallet</Trans>
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="App-card">
          <div className="Stake-card-title App-card-title">xEMT</div>
          <div className="Stake-card-bottom App-card-content">
            <div className="Stake-info App-card-row">
              <div className="label">APR</div>
              <div>
                0.00% (
                <Link to="/migrate">
                  <Trans>Migrate</Trans>
                </Link>
                )
              </div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Staked</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "xemtBalance", 18, 2, true)} ($
                {formatKeyAmount(processedData, "xemtBalanceUsd", USD_DECIMALS, 2, true)})
              </div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Wallet</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "xemtBalance", 18, 2, true)} ($
                {formatKeyAmount(processedData, "xemtBalanceUsd", USD_DECIMALS, 2, true)})
              </div>
            </div>
            <div className="App-card-row">
              <div className="label">
                <Trans>Rewards</Trans>
              </div>
              <div>
                {!hasFeeDistribution && "TBC"}
                {hasFeeDistribution && `${formatKeyAmount(processedData, "xemtRewards", 18, 8, true)} WBNB`}
              </div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Total Staked</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "xemtTotalStaked", 18, 2, true)} ($
                {formatKeyAmount(processedData, "xemtTotalStakedUsd", USD_DECIMALS, 2, true)})
              </div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Total Supply</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "xemtSupply", 18, 2, true)} ($
                {formatKeyAmount(processedData, "xemtSupplyUsd", USD_DECIMALS, 2, true)})
              </div>
            </div>
            <div className="App-card-options">
              <ExternalLink className="App-button-option App-card-option" href={buyXemtUrl}>
                Get xEMT
              </ExternalLink>
              {active && (
                <button
                  className="App-button-option App-card-option"
                  onClick={() => claim(xemtAddress, processedData.xemtRewards)}
                >
                  <Trans>Claim</Trans>
                </button>
              )}
              {!active && (
                <button className="App-button-option App-card-option" onClick={connectWallet}>
                  <Trans>Connect Wallet</Trans>
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="App-card">
          <div className="Stake-card-title App-card-title">EMT-USDG LP</div>
          <div className="Stake-card-bottom App-card-content">
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>APR</Trans>
              </div>
              <div>
                0.00% (
                <Link to="/migrate">
                  <Trans>Migrate</Trans>
                </Link>
                )
              </div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Staked</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "emtUsdgStaked", 18, 4, true)} ($
                {formatKeyAmount(processedData, "emtUsdgStakedUsd", 30, 2, true)})
              </div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Wallet</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "emtUsdgBalance", 18, 2, true)} ($
                {formatKeyAmount(processedData, "emtUsdgBalanceUsd", USD_DECIMALS, 2, true)})
              </div>
            </div>
            <div className="App-card-row">
              <div className="label">
                <Trans>Rewards</Trans>
              </div>
              <div>
                {hasFeeDistribution &&
                  processedData.emtUsdgNativeRewards &&
                  processedData.emtUsdgNativeRewards.gt(0) &&
                  `${formatKeyAmount(processedData, "emtUsdgNativeRewards", 18, 8, true)} WBNB, `}
                {formatKeyAmount(processedData, "emtUsdgXemtRewards", 18, 4, true)} xEMT
              </div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Total Staked</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "emtUsdgTotalStaked", 18, 4, true)} ($
                {formatKeyAmount(processedData, "emtUsdgTotalStakedUsd", 30, 2, true)})
              </div>
            </div>
            <div className="App-card-options">
              <ExternalLink className="App-button-option App-card-option" href={buyEmtUrl}>
                Get EMT
              </ExternalLink>
              <ExternalLink className="App-button-option App-card-option" href={addEmtUsdgLpUrl}>
                <Trans>Create</Trans>
              </ExternalLink>
              {active && (
                <button className="App-button-option App-card-option" onClick={() => showUnstakeEmtUsdgModal()}>
                  <Trans>Unstake</Trans>
                </button>
              )}
              {active && (
                <button
                  className="App-button-option App-card-option"
                  onClick={() => claim(emtUsdgFarmAddress, processedData.emtUsdgTotalRewards)}
                >
                  <Trans>Claim</Trans>
                </button>
              )}
              {!active && (
                <button className="App-button-option App-card-option" onClick={connectWallet}>
                  <Trans>Connect Wallet</Trans>
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="App-card">
          <div className="Stake-card-title App-card-title">xEMT-USDG LP</div>
          <div className="Stake-card-bottom App-card-content">
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>APR</Trans>
              </div>
              <div>
                0.00% (
                <Link to="/migrate">
                  <Trans>Migrate</Trans>
                </Link>
                )
              </div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Staked</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "xemtUsdgStaked", 18, 4, true)} ($
                {formatKeyAmount(processedData, "xemtUsdgStakedUsd", 30, 2, true)})
              </div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Wallet</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "xemtUsdgBalance", 18, 2, true)} ($
                {formatKeyAmount(processedData, "xemtUsdgBalanceUsd", USD_DECIMALS, 2, true)})
              </div>
            </div>
            <div className="App-card-row">
              <div className="label">
                <Trans>Rewards</Trans>
              </div>
              <div>
                {hasFeeDistribution &&
                  processedData.xemtUsdgNativeRewards &&
                  processedData.xemtUsdgNativeRewards.gt(0) &&
                  `${formatKeyAmount(processedData, "xemtUsdgNativeRewards", 18, 8, true)} WBNB, `}
                {formatKeyAmount(processedData, "xemtUsdgXemtRewards", 18, 4, true)} xEMT
              </div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Total Staked</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "xemtUsdgTotalStaked", 18, 4, true)} ($
                {formatKeyAmount(processedData, "xemtUsdgTotalStakedUsd", 30, 2, true)})
              </div>
            </div>
            <div className="App-card-options">
              <ExternalLink className="App-button-option App-card-option" href={buyXemtUrl}>
                Get xEMT
              </ExternalLink>
              <ExternalLink className="App-button-option App-card-option" href={addXemtUsdgLpUrl}>
                <Trans>Create</Trans>
              </ExternalLink>
              {active && (
                <button className="App-button-option App-card-option" onClick={() => showUnstakeXemtUsdgModal()}>
                  <Trans>Unstake</Trans>
                </button>
              )}
              {active && (
                <button
                  className="App-button-option App-card-option"
                  onClick={() => claim(xemtUsdgFarmAddress, processedData.xemtUsdgTotalRewards)}
                >
                  <Trans>Claim</Trans>
                </button>
              )}
              {!active && (
                <button className="App-button-option App-card-option" onClick={connectWallet}>
                  <Trans>Connect Wallet</Trans>
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="App-card">
          <div className="Stake-card-title App-card-title">AUTO-USDG LP</div>
          <div className="Stake-card-bottom App-card-content">
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>APR</Trans>
              </div>
              <div>{formatKeyAmount(processedData, "autoUsdgApr", 2, 2, true)}%</div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Staked</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "autoUsdgStaked", 18, 4, true)} ($
                {formatKeyAmount(processedData, "autoUsdgStakedUsd", 30, 2, true)})
              </div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Wallet</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "autoUsdgBalance", 18, 2, true)} ($
                {formatKeyAmount(processedData, "autoUsdgBalanceUsd", USD_DECIMALS, 2, true)})
              </div>
            </div>
            <div className="App-card-row">
              <div className="label">
                <Trans>Rewards</Trans>
              </div>
              <div>{formatKeyAmount(processedData, "autoUsdgXemtRewards", 18, 4, true)} xEMT</div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Total Staked</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "autoUsdgTotalStaked", 18, 4, true)} ($
                {formatKeyAmount(processedData, "autoUsdgTotalStakedUsd", 30, 2, true)})
              </div>
            </div>
            <div className="App-card-options">
              <ExternalLink className="App-button-option App-card-option" href={buyAutoUrl}>
                Get AUTO
              </ExternalLink>
              <ExternalLink className="App-button-option App-card-option" href={addAutoUsdgLpUrl}>
                <Trans>Create</Trans>
              </ExternalLink>
              {active && (
                <button className="App-button-option App-card-option" onClick={() => showStakeAutoUsdgModal()}>
                  <Trans>Stake</Trans>
                </button>
              )}
              {active && (
                <button className="App-button-option App-card-option" onClick={() => showUnstakeAutoUsdgModal()}>
                  <Trans>Unstake</Trans>
                </button>
              )}
              {active && (
                <button
                  className="App-button-option App-card-option"
                  onClick={() => claim(autoUsdgFarmAddress, processedData.autoUsdgTotalRewards)}
                >
                  <Trans>Claim</Trans>
                </button>
              )}
              {!active && (
                <button className="App-button-option App-card-option" onClick={connectWallet}>
                  <Trans>Connect Wallet</Trans>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
