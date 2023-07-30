import React from "react";

import useSWR from "swr";

import {
  PLACEHOLDER_ACCOUNT,
  getBalanceAndSupplyData,
  getDepositBalanceData,
  getVestingData,
  getStakingData,
  getProcessedData,
} from "lib/legacy";

import Vault from "abis/Vault.json";
import ReaderV2 from "abis/ReaderV2.json";
import RewardReader from "abis/RewardReader.json";
import Token from "abis/Token.json";
import ElpManager from "abis/ElpManager.json";

import { useWeb3React } from "@web3-react/core";

import { useEddxPrice } from "domain/legacy";

import { getContract } from "config/contracts";
import { getServerUrl } from "config/backend";
import { contractFetcher } from "lib/contracts";
import { formatKeyAmount } from "lib/numbers";

export default function APRLabel({ chainId, label }) {
  let { active } = useWeb3React();

  const rewardReaderAddress = getContract(chainId, "RewardReader");
  const readerAddress = getContract(chainId, "Reader");

  const vaultAddress = getContract(chainId, "Vault");
  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
  const eddxAddress = getContract(chainId, "EDDX");
  const esEddxAddress = getContract(chainId, "ES_EDDX");
  const bnEddxAddress = getContract(chainId, "BN_EDDX");
  const elpAddress = getContract(chainId, "ELP");

  const stakedEddxTrackerAddress = getContract(chainId, "StakedEddxTracker");
  const bonusEddxTrackerAddress = getContract(chainId, "BonusEddxTracker");
  const feeEddxTrackerAddress = getContract(chainId, "FeeEddxTracker");

  const stakedElpTrackerAddress = getContract(chainId, "StakedElpTracker");
  const feeElpTrackerAddress = getContract(chainId, "FeeElpTracker");

  const elpManagerAddress = getContract(chainId, "ElpManager");

  const eddxVesterAddress = getContract(chainId, "EddxVester");
  const elpVesterAddress = getContract(chainId, "ElpVester");

  const vesterAddresses = [eddxVesterAddress, elpVesterAddress];

  const walletTokens = [eddxAddress, esEddxAddress, elpAddress, stakedEddxTrackerAddress];
  const depositTokens = [
    eddxAddress,
    esEddxAddress,
    stakedEddxTrackerAddress,
    bonusEddxTrackerAddress,
    bnEddxAddress,
    elpAddress,
  ];
  const rewardTrackersForDepositBalances = [
    stakedEddxTrackerAddress,
    stakedEddxTrackerAddress,
    bonusEddxTrackerAddress,
    feeEddxTrackerAddress,
    feeEddxTrackerAddress,
    feeElpTrackerAddress,
  ];
  const rewardTrackersForStakingInfo = [
    stakedEddxTrackerAddress,
    bonusEddxTrackerAddress,
    feeEddxTrackerAddress,
    stakedElpTrackerAddress,
    feeElpTrackerAddress,
  ];

  const { data: walletBalances } = useSWR(
    [`StakeV2:walletBalances:${active}`, chainId, readerAddress, "getTokenBalancesWithSupplies", PLACEHOLDER_ACCOUNT],
    {
      fetcher: contractFetcher(undefined, ReaderV2, [walletTokens]),
    }
  );

  const { data: depositBalances } = useSWR(
    [`StakeV2:depositBalances:${active}`, chainId, rewardReaderAddress, "getDepositBalances", PLACEHOLDER_ACCOUNT],
    {
      fetcher: contractFetcher(undefined, RewardReader, [depositTokens, rewardTrackersForDepositBalances]),
    }
  );

  const { data: stakingInfo } = useSWR(
    [`StakeV2:stakingInfo:${active}`, chainId, rewardReaderAddress, "getStakingInfo", PLACEHOLDER_ACCOUNT],
    {
      fetcher: contractFetcher(undefined, RewardReader, [rewardTrackersForStakingInfo]),
    }
  );

  const { data: stakedEddxSupply } = useSWR(
    [`StakeV2:stakedEddxSupply:${active}`, chainId, eddxAddress, "balanceOf", stakedEddxTrackerAddress],
    {
      fetcher: contractFetcher(undefined, Token),
    }
  );

  const { data: aums } = useSWR([`StakeV2:getAums:${active}`, chainId, elpManagerAddress, "getAums"], {
    fetcher: contractFetcher(undefined, ElpManager),
  });

  const { data: nativeTokenPrice } = useSWR(
    [`StakeV2:nativeTokenPrice:${active}`, chainId, vaultAddress, "getMinPrice", nativeTokenAddress],
    {
      fetcher: contractFetcher(undefined, Vault),
    }
  );

  const { data: vestingInfo } = useSWR(
    [`StakeV2:vestingInfo:${active}`, chainId, readerAddress, "getVestingInfo", PLACEHOLDER_ACCOUNT],
    {
      fetcher: contractFetcher(undefined, ReaderV2, [vesterAddresses]),
    }
  );

  const { eddxPrice } = useEddxPrice(chainId, {}, active);

  const eddxSupplyUrl = getServerUrl(chainId, "/eddx_supply");
  const { data: eddxSupply } = useSWR([eddxSupplyUrl], {
    fetcher: (...args) => fetch(...args).then((res) => res.text()),
  });

  let aum;
  if (aums && aums.length > 0) {
    aum = aums[0].add(aums[1]).div(2);
  }

  const { balanceData, supplyData } = getBalanceAndSupplyData(walletBalances);
  const depositBalanceData = getDepositBalanceData(depositBalances);
  const stakingData = getStakingData(stakingInfo);
  const vestingData = getVestingData(vestingInfo);

  const processedData = getProcessedData(
    balanceData,
    supplyData,
    depositBalanceData,
    stakingData,
    vestingData,
    aum,
    nativeTokenPrice,
    stakedEddxSupply,
    eddxPrice,
    eddxSupply
  );

  return <>{`${formatKeyAmount(processedData, label, 2, 2, true)}%`}</>;
}
