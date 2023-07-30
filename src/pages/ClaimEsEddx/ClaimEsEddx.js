import React, { useState } from "react";
import useSWR from "swr";
import { ethers } from "ethers";
import { useWeb3React } from "@web3-react/core";
import { PLACEHOLDER_ACCOUNT } from "lib/legacy";

import { getContract } from "config/contracts";

import Token from "abis/Token.json";
import RewardReader from "abis/RewardReader.json";

import Checkbox from "components/Checkbox/Checkbox";

import "./ClaimEsEddx.css";

import baseIcon from "img/ic_base_96.svg";
import avaIcon from "img/ic_avalanche_96.svg";

import { Trans, t } from "@lingui/macro";
import { BASE, AVALANCHE } from "config/chains";
import { callContract, contractFetcher } from "lib/contracts";
import { bigNumberify, formatAmount, formatAmountFree, parseValue } from "lib/numbers";
import { useChainId } from "lib/chains";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Button from "components/Button/Button";

const VEST_WITH_EDDX_ARB = "VEST_WITH_EDDX_ARB";
const VEST_WITH_ELP_ARB = "VEST_WITH_ELP_ARB";
const VEST_WITH_EDDX_AVAX = "VEST_WITH_EDDX_AVAX";
const VEST_WITH_ELP_AVAX = "VEST_WITH_ELP_AVAX";

export function getVestingDataV2(vestingInfo) {
  if (!vestingInfo || vestingInfo.length === 0) {
    return;
  }

  const keys = ["eddxVester", "elpVester"];
  const data = {};
  const propsLength = 12;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    data[key] = {
      pairAmount: vestingInfo[i * propsLength],
      vestedAmount: vestingInfo[i * propsLength + 1],
      escrowedBalance: vestingInfo[i * propsLength + 2],
      claimedAmounts: vestingInfo[i * propsLength + 3],
      claimable: vestingInfo[i * propsLength + 4],
      maxVestableAmount: vestingInfo[i * propsLength + 5],
      combinedAverageStakedAmount: vestingInfo[i * propsLength + 6],
      cumulativeReward: vestingInfo[i * propsLength + 7],
      transferredCumulativeReward: vestingInfo[i * propsLength + 8],
      bonusReward: vestingInfo[i * propsLength + 9],
      averageStakedAmount: vestingInfo[i * propsLength + 10],
      transferredAverageStakedAmount: vestingInfo[i * propsLength + 11],
    };

    data[key + "PairAmount"] = data[key].pairAmount;
    data[key + "VestedAmount"] = data[key].vestedAmount;
    data[key + "EscrowedBalance"] = data[key].escrowedBalance;
    data[key + "ClaimSum"] = data[key].claimedAmounts.add(data[key].claimable);
    data[key + "Claimable"] = data[key].claimable;
    data[key + "MaxVestableAmount"] = data[key].maxVestableAmount;
    data[key + "CombinedAverageStakedAmount"] = data[key].combinedAverageStakedAmount;
    data[key + "CumulativeReward"] = data[key].cumulativeReward;
    data[key + "TransferredCumulativeReward"] = data[key].transferredCumulativeReward;
    data[key + "BonusReward"] = data[key].bonusReward;
    data[key + "AverageStakedAmount"] = data[key].averageStakedAmount;
    data[key + "TransferredAverageStakedAmount"] = data[key].transferredAverageStakedAmount;
  }

  return data;
}

function getVestingValues({ minRatio, amount, vestingDataItem }) {
  if (!vestingDataItem || !amount || amount.eq(0)) {
    return;
  }

  let currentRatio = bigNumberify(0);

  const ratioMultiplier = 10000;
  const maxVestableAmount = vestingDataItem.maxVestableAmount;
  const nextMaxVestableEsEddx = maxVestableAmount.add(amount);

  const combinedAverageStakedAmount = vestingDataItem.combinedAverageStakedAmount;
  if (maxVestableAmount.gt(0)) {
    currentRatio = combinedAverageStakedAmount.mul(ratioMultiplier).div(maxVestableAmount);
  }

  const transferredCumulativeReward = vestingDataItem.transferredCumulativeReward;
  const nextTransferredCumulativeReward = transferredCumulativeReward.add(amount);
  const cumulativeReward = vestingDataItem.cumulativeReward;
  const totalCumulativeReward = cumulativeReward.add(nextTransferredCumulativeReward);

  let nextCombinedAverageStakedAmount = combinedAverageStakedAmount;

  if (combinedAverageStakedAmount.lt(totalCumulativeReward.mul(minRatio))) {
    const averageStakedAmount = vestingDataItem.averageStakedAmount;
    let nextTransferredAverageStakedAmount = totalCumulativeReward.mul(minRatio);
    nextTransferredAverageStakedAmount = nextTransferredAverageStakedAmount.sub(
      averageStakedAmount.mul(cumulativeReward).div(totalCumulativeReward)
    );
    nextTransferredAverageStakedAmount = nextTransferredAverageStakedAmount
      .mul(totalCumulativeReward)
      .div(nextTransferredCumulativeReward);

    nextCombinedAverageStakedAmount = averageStakedAmount
      .mul(cumulativeReward)
      .div(totalCumulativeReward)
      .add(nextTransferredAverageStakedAmount.mul(nextTransferredCumulativeReward).div(totalCumulativeReward));
  }

  const nextRatio = nextCombinedAverageStakedAmount.mul(ratioMultiplier).div(nextMaxVestableEsEddx);

  const initialStakingAmount = currentRatio.mul(maxVestableAmount);
  const nextStakingAmount = nextRatio.mul(nextMaxVestableEsEddx);

  return {
    maxVestableAmount,
    currentRatio,
    nextMaxVestableEsEddx,
    nextRatio,
    initialStakingAmount,
    nextStakingAmount,
  };
}

export default function ClaimEsEddx({ setPendingTxns }) {
  const { active, account, library } = useWeb3React();
  const { chainId } = useChainId();
  const [selectedOption, setSelectedOption] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);
  const [value, setValue] = useState("");

  const isBase = chainId === BASE;

  const esEddxIouAddress = getContract(chainId, "ES_EDDX_IOU");

  const { data: esEddxIouBalance } = useSWR(
    isBase && [
      `ClaimEsEddx:esEddxIouBalance:${active}`,
      chainId,
      esEddxIouAddress,
      "balanceOf",
      account || PLACEHOLDER_ACCOUNT,
    ],
    {
      fetcher: contractFetcher(library, Token),
    }
  );

  const arbRewardReaderAddress = getContract(BASE, "RewardReader");
  const avaxRewardReaderAddress = getContract(AVALANCHE, "RewardReader");

  const arbVesterAdddresses = [getContract(BASE, "EddxVester"), getContract(BASE, "ElpVester")];
  const avaxVesterAdddresses = [getContract(AVALANCHE, "EddxVester"), getContract(AVALANCHE, "ElpVester")];

  const { data: arbVestingInfo } = useSWR(
    [
      `StakeV2:vestingInfo:${active}`,
      BASE,
      arbRewardReaderAddress,
      "getVestingInfoV2",
      account || PLACEHOLDER_ACCOUNT,
    ],
    {
      fetcher: contractFetcher(undefined, RewardReader, [arbVesterAdddresses]),
    }
  );

  const { data: avaxVestingInfo } = useSWR(
    [
      `StakeV2:vestingInfo:${active}`,
      AVALANCHE,
      avaxRewardReaderAddress,
      "getVestingInfoV2",
      account || PLACEHOLDER_ACCOUNT,
    ],
    {
      fetcher: contractFetcher(undefined, RewardReader, [avaxVesterAdddresses]),
    }
  );

  const arbVestingData = getVestingDataV2(arbVestingInfo);
  const avaxVestingData = getVestingDataV2(avaxVestingInfo);

  let amount = parseValue(value, 18);

  let maxVestableAmount;
  let currentRatio;

  let nextMaxVestableEsEddx;
  let nextRatio;

  let initialStakingAmount;
  let nextStakingAmount;

  let stakingToken = "staked EDDX";

  const shouldShowStakingAmounts = false;

  if (selectedOption === VEST_WITH_EDDX_ARB && arbVestingData) {
    const result = getVestingValues({
      minRatio: bigNumberify(4),
      amount,
      vestingDataItem: arbVestingData.eddxVester,
    });

    if (result) {
      ({ maxVestableAmount, currentRatio, nextMaxVestableEsEddx, nextRatio, initialStakingAmount, nextStakingAmount } =
        result);
    }
  }

  if (selectedOption === VEST_WITH_ELP_ARB && arbVestingData) {
    const result = getVestingValues({
      minRatio: bigNumberify(320),
      amount,
      vestingDataItem: arbVestingData.elpVester,
    });

    if (result) {
      ({ maxVestableAmount, currentRatio, nextMaxVestableEsEddx, nextRatio, initialStakingAmount, nextStakingAmount } =
        result);
    }

    stakingToken = "ELP";
  }

  if (selectedOption === VEST_WITH_EDDX_AVAX && avaxVestingData) {
    const result = getVestingValues({
      minRatio: bigNumberify(4),
      amount,
      vestingDataItem: avaxVestingData.eddxVester,
    });

    if (result) {
      ({ maxVestableAmount, currentRatio, nextMaxVestableEsEddx, nextRatio, initialStakingAmount, nextStakingAmount } =
        result);
    }
  }

  if (selectedOption === VEST_WITH_ELP_AVAX && avaxVestingData) {
    const result = getVestingValues({
      minRatio: bigNumberify(320),
      amount,
      vestingDataItem: avaxVestingData.elpVester,
    });

    if (result) {
      ({ maxVestableAmount, currentRatio, nextMaxVestableEsEddx, nextRatio, initialStakingAmount, nextStakingAmount } =
        result);
    }

    stakingToken = "ELP";
  }

  const getError = () => {
    if (!active) {
      return t`Wallet not connected`;
    }

    if (esEddxIouBalance && esEddxIouBalance.eq(0)) {
      return t`No esEDDX to claim`;
    }

    if (!amount || amount.eq(0)) {
      return t`Enter an amount`;
    }

    if (selectedOption === "") {
      return t`Select an option`;
    }

    return false;
  };

  const error = getError();

  const getPrimaryText = () => {
    if (error) {
      return error;
    }

    if (isClaiming) {
      return t`Claiming...`;
    }

    return t`Claim`;
  };

  const isPrimaryEnabled = () => {
    return !error && !isClaiming;
  };

  const claim = () => {
    setIsClaiming(true);

    let receiver;

    if (selectedOption === VEST_WITH_EDDX_ARB) {
      receiver = "0x544a6ec142Aa9A7F75235fE111F61eF2EbdC250a";
    }

    if (selectedOption === VEST_WITH_ELP_ARB) {
      receiver = "0x9d8f6f6eE45275A5Ca3C6f6269c5622b1F9ED515";
    }

    if (selectedOption === VEST_WITH_EDDX_AVAX) {
      receiver = "0x171a321A78dAE0CDC0Ba3409194df955DEEcA746";
    }

    if (selectedOption === VEST_WITH_ELP_AVAX) {
      receiver = "0x28863Dd19fb52DF38A9f2C6dfed40eeB996e3818";
    }

    const contract = new ethers.Contract(esEddxIouAddress, Token.abi, library.getSigner());
    callContract(chainId, contract, "transfer", [receiver, amount], {
      sentMsg: t`Claim submitted!`,
      failMsg: t`Claim failed.`,
      successMsg: t`Claim completed!`,
      setPendingTxns,
    })
      .then(async (res) => {})
      .finally(() => {
        setIsClaiming(false);
      });
  };

  return (
    <div className="ClaimEsEddx Page page-layout">
      <div className="Page-title-section mt-0">
        <div className="Page-title">
          <Trans>Claim esEDDX</Trans>
        </div>
        {!isBase && (
          <div className="Page-description">
            <br />
            <Trans>Please switch your network to Base.</Trans>
          </div>
        )}
        {isBase && (
          <div>
            <div className="Page-description">
              <br />
              <Trans>You have {formatAmount(esEddxIouBalance, 18, 2, true)} esEDDX (IOU) tokens.</Trans>
              <br />
              <br />
              <Trans>The address of the esEDDX (IOU) token is {esEddxIouAddress}.</Trans>
              <br />
              <Trans>
                The esEDDX (IOU) token is transferrable. You can add the token to your wallet and send it to another
                address to claim if you'd like.
              </Trans>
              <br />
              <br />
              <Trans>Select your vesting option below then click "Claim".</Trans>
              <br />
              <Trans>
                After claiming, the esEDDX tokens will be airdropped to your account on the selected network within 7
                days.
              </Trans>
              <br />
              <Trans>The esEDDX tokens can be staked or vested at any time.</Trans>
              <br />
              <Trans>
                Your esEDDX (IOU) balance will decrease by your claim amount after claiming, this is expected behaviour.
              </Trans>
              <br />
              <Trans>
                You can check your claim history{" "}
                <ExternalLink href={`https://arbiscan.io/token/${esEddxIouAddress}?a=${account}`}>here</ExternalLink>.
              </Trans>
            </div>
            <br />
            <div className="ClaimEsEddx-vesting-options">
              <Checkbox
                className="base vest-option"
                isChecked={selectedOption === VEST_WITH_EDDX_ARB}
                setIsChecked={() => setSelectedOption(VEST_WITH_EDDX_ARB)}
              >
                <Trans>Vest with EDDX on Base</Trans>
                <img src={baseIcon} alt="Base" />
              </Checkbox>
              <Checkbox
                className="base vest-option"
                isChecked={selectedOption === VEST_WITH_ELP_ARB}
                setIsChecked={() => setSelectedOption(VEST_WITH_ELP_ARB)}
              >
                <Trans>Vest with ELP on Base</Trans>
                <img src={baseIcon} alt="Base" />
              </Checkbox>
              <Checkbox
                className="avalanche vest-option"
                isChecked={selectedOption === VEST_WITH_EDDX_AVAX}
                setIsChecked={() => setSelectedOption(VEST_WITH_EDDX_AVAX)}
              >
                <Trans>Vest with EDDX on Avalanche</Trans>
                <img src={avaIcon} alt="Avalanche" />
              </Checkbox>
              <Checkbox
                className="avalanche vest-option"
                isChecked={selectedOption === VEST_WITH_ELP_AVAX}
                setIsChecked={() => setSelectedOption(VEST_WITH_ELP_AVAX)}
              >
                <Trans>Vest with ELP on Avalanche</Trans>
                <img src={avaIcon} alt="Avalanche" />
              </Checkbox>
            </div>
            <br />
            {!error && (
              <div className="muted">
                <Trans>
                  You can currently vest a maximum of {formatAmount(maxVestableAmount, 18, 2, true)} esEDDX tokens at a
                  ratio of {formatAmount(currentRatio, 4, 2, true)} {stakingToken} to 1 esEDDX.
                </Trans>
                {shouldShowStakingAmounts && `${formatAmount(initialStakingAmount, 18, 2, true)}.`}
                <br />
                <Trans>
                  After claiming you will be able to vest a maximum of {formatAmount(nextMaxVestableEsEddx, 18, 2, true)}{" "}
                  esEDDX at a ratio of {formatAmount(nextRatio, 4, 2, true)} {stakingToken} to 1 esEDDX.
                </Trans>
                {shouldShowStakingAmounts && `${formatAmount(nextStakingAmount, 18, 2, true)}.`}
                <br />
                <br />
              </div>
            )}
            <div>
              <div className="ClaimEsEddx-input-label muted">
                <Trans>Amount to claim</Trans>
              </div>
              <div className="ClaimEsEddx-input-container">
                <input type="number" placeholder="0.0" value={value} onChange={(e) => setValue(e.target.value)} />
                {value !== formatAmountFree(esEddxIouBalance, 18, 18) && (
                  <div
                    className="ClaimEsEddx-max-button"
                    onClick={() => setValue(formatAmountFree(esEddxIouBalance, 18, 18))}
                  >
                    <Trans>MAX</Trans>
                  </div>
                )}
              </div>
            </div>
            <br />
            <div>
              <Button
                variant="primary-action"
                className="w-full"
                disabled={!isPrimaryEnabled()}
                onClick={() => claim()}
              >
                {getPrimaryText()}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
