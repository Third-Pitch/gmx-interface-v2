import React, { useState, useCallback } from "react";
import { Trans, t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";

import Modal from "components/Modal/Modal";
import Checkbox from "components/Checkbox/Checkbox";
import Tooltip from "components/Tooltip/Tooltip";
import Footer from "components/Footer/Footer";

import Vault from "abis/Vault.json";
import ReaderV2 from "abis/ReaderV2.json";
import Vester from "abis/Vester.json";
import RewardRouter from "abis/RewardRouter.json";
import RewardReader from "abis/RewardReader.json";
import Token from "abis/Token.json";
import ElpManager from "abis/ElpManager.json";

import { ethers } from "ethers";
import {
  ELP_DECIMALS,
  USD_DECIMALS,
  BASIS_POINTS_DIVISOR,
  PLACEHOLDER_ACCOUNT,
  getBalanceAndSupplyData,
  getDepositBalanceData,
  getVestingData,
  getStakingData,
  getProcessedData,
  getPageTitle,
} from "lib/legacy";
import { useEddxPrice, useTotalEddxStaked, useTotalEddxSupply } from "domain/legacy";
import { BASE, getChainName, getConstant } from "config/chains";

import useSWR from "swr";

import { getContract } from "config/contracts";

import "./StakeV2.css";
import SEO from "components/Common/SEO";
import ChainsStatsTooltipRow from "components/StatsTooltip/ChainsStatsTooltipRow";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { getServerUrl } from "config/backend";
import { callContract, contractFetcher } from "lib/contracts";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { helperToast } from "lib/helperToast";
import { approveTokens } from "domain/tokens";
import { bigNumberify, expandDecimals, formatAmount, formatAmountFree, formatKeyAmount, parseValue } from "lib/numbers";
import { useChainId } from "lib/chains";
import ExternalLink from "components/ExternalLink/ExternalLink";
import EDDXAprTooltip from "components/Stake/EDDXAprTooltip";
import Button from "components/Button/Button";
import { EmList } from "components/Synthetics/EmList/EmList";
import { getIsSyntheticsSupported } from "config/features";
import { useMarketTokensData, useMarketsInfo } from "domain/synthetics/markets";
import { useMarketTokensAPR } from "domain/synthetics/markets/useMarketTokensAPR";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";

const { AddressZero } = ethers.constants;

function StakeModal(props) {
  const {
    isVisible,
    setIsVisible,
    chainId,
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
    rewardRouterAddress,
    stakeMethodName,
    setPendingTxns,
  } = props;
  const [isStaking, setIsStaking] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const { data: tokenAllowance } = useSWR(
    active && stakingTokenAddress && [active, chainId, stakingTokenAddress, "allowance", account, farmAddress],
    {
      fetcher: contractFetcher(library, Token),
    }
  );

  let amount = parseValue(value, 18);
  const needApproval = farmAddress !== AddressZero && tokenAllowance && amount && amount.gt(tokenAllowance);

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
        chainId,
      });
      return;
    }

    setIsStaking(true);
    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner());

    callContract(chainId, contract, stakeMethodName, [amount], {
      sentMsg: t`Stake submitted!`,
      failMsg: t`Stake failed.`,
      setPendingTxns,
    })
      .then(async (res) => {
        setIsVisible(false);
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
        <BuyInputSection
          topLeftLabel={t`Stake`}
          topRightLabel={t`Max`}
          topRightValue={formatAmount(maxAmount, 18, 4, true)}
          onClickTopRightLabel={() => setValue(formatAmountFree(maxAmount, 18, 18))}
          inputValue={value}
          onInputValueChange={(e) => setValue(e.target.value)}
          showMaxButton={false}
        >
          {stakingTokenSymbol}
        </BuyInputSection>

        <div className="Exchange-swap-button-container">
          <Button variant="primary-action" className="w-full" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function UnstakeModal(props) {
  const {
    isVisible,
    setIsVisible,
    chainId,
    title,
    maxAmount,
    value,
    setValue,
    library,
    unstakingTokenSymbol,
    rewardRouterAddress,
    unstakeMethodName,
    multiplierPointsAmount,
    reservedAmount,
    bonusEddxInFeeEddx,
    setPendingTxns,
  } = props;
  const [isUnstaking, setIsUnstaking] = useState(false);

  let amount = parseValue(value, 18);
  let burnAmount;

  if (
    multiplierPointsAmount &&
    multiplierPointsAmount.gt(0) &&
    amount &&
    amount.gt(0) &&
    bonusEddxInFeeEddx &&
    bonusEddxInFeeEddx.gt(0)
  ) {
    burnAmount = multiplierPointsAmount.mul(amount).div(bonusEddxInFeeEddx);
  }

  const shouldShowReductionAmount = true;
  let rewardReductionBasisPoints;
  if (burnAmount && bonusEddxInFeeEddx) {
    rewardReductionBasisPoints = burnAmount.mul(BASIS_POINTS_DIVISOR).div(bonusEddxInFeeEddx);
  }

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
    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner());
    callContract(chainId, contract, unstakeMethodName, [amount], {
      sentMsg: t`Unstake submitted!`,
      failMsg: t`Unstake failed.`,
      successMsg: t`Unstake completed!`,
      setPendingTxns,
    })
      .then(async (res) => {
        setIsVisible(false);
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
        <BuyInputSection
          topLeftLabel={t`Unstake`}
          topRightLabel={t`Max`}
          topRightValue={formatAmount(maxAmount, 18, 4, true)}
          onClickTopRightLabel={() => setValue(formatAmountFree(maxAmount, 18, 18))}
          inputValue={value}
          onInputValueChange={(e) => setValue(e.target.value)}
          showMaxButton={false}
        >
          {unstakingTokenSymbol}
        </BuyInputSection>
        {reservedAmount && reservedAmount.gt(0) && (
          <div className="Modal-note">
            You have {formatAmount(reservedAmount, 18, 2, true)} tokens reserved for vesting.
          </div>
        )}
        {burnAmount && burnAmount.gt(0) && rewardReductionBasisPoints && rewardReductionBasisPoints.gt(0) && (
          <div className="Modal-note">
            <Trans>
              Unstaking will burn&nbsp;
              <ExternalLink className="display-inline" href="https://eddxio.gitbook.io/eddx/rewards">
                {formatAmount(burnAmount, 18, 4, true)} Multiplier Points
              </ExternalLink>
              .&nbsp;
              {shouldShowReductionAmount && (
                <span>Boost Percentage: -{formatAmount(rewardReductionBasisPoints, 2, 2)}%.</span>
              )}
            </Trans>
          </div>
        )}
        <div className="Exchange-swap-button-container">
          <Button variant="primary-action" className="w-full" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function VesterDepositModal(props) {
  const {
    isVisible,
    setIsVisible,
    chainId,
    title,
    maxAmount,
    value,
    setValue,
    balance,
    vestedAmount,
    averageStakedAmount,
    maxVestableAmount,
    library,
    stakeTokenLabel,
    reserveAmount,
    maxReserveAmount,
    vesterAddress,
    setPendingTxns,
    month,
    setMonth
  } = props;
  const [isDepositing, setIsDepositing] = useState(false);

  let amount = parseValue(value, 18);

  let nextReserveAmount = reserveAmount;

  let nextDepositAmount = vestedAmount;
  if (amount) {
    nextDepositAmount = vestedAmount.add(amount);
  }

  let additionalReserveAmount = bigNumberify(0);
  if (amount && averageStakedAmount && maxVestableAmount && maxVestableAmount.gt(0)) {
    nextReserveAmount = nextDepositAmount.mul(averageStakedAmount).div(maxVestableAmount);
    if (nextReserveAmount.gt(reserveAmount)) {
      additionalReserveAmount = nextReserveAmount.sub(reserveAmount);
    }
  }

  const getError = () => {
    if (!amount || amount.eq(0)) {
      return t`Enter an amount`;
    }
    if (maxAmount && amount.gt(maxAmount)) {
      return t`Max amount exceeded`;
    }
    if (nextReserveAmount.gt(maxReserveAmount)) {
      return t`Insufficient staked tokens`;
    }
  };

  const onClickPrimary = () => {
    setIsDepositing(true);
    const contract = new ethers.Contract(vesterAddress, Vester.abi, library.getSigner());

    callContract(chainId, contract, "deposit", [amount], {
      sentMsg: t`Deposit submitted!`,
      failMsg: t`Deposit failed!`,
      successMsg: t`Deposited!`,
      setPendingTxns,
    })
      .then(async (res) => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsDepositing(false);
      });
  };

  const isPrimaryEnabled = () => {
    const error = getError();
    if (error) {
      return false;
    }
    if (isDepositing) {
      return false;
    }
    return true;
  };

  const getPrimaryText = () => {
    const error = getError();
    if (error) {
      return error;
    }
    if (isDepositing) {
      return t`Depositing...`;
    }
    return t`Deposit`;
  };

  return (
    <SEO title={getPageTitle(t`Earn`)}>
      <div className="StakeModal">
        <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title} className="non-scrollable">
          <BuyInputSection
            topLeftLabel={t`Deposit`}
            topRightLabel={t`Max`}
            topRightValue={formatAmount(maxAmount, 18, 4, true)}
            onClickTopRightLabel={() => setValue(formatAmountFree(maxAmount, 18, 18))}
            inputValue={value}
            onInputValueChange={(e) => setValue(e.target.value)}
            showMaxButton={false}
          >
            esEDDX
          </BuyInputSection>
          <BuyInputSection
            topLeftLabel={t`Stake period`}
            topRightLabel={t`Max`}
            topRightValue={12}
            placeholder="0"
            onClickTopRightLabel={() => setMonth(12)}
            inputValue={month}
            onSelect={setMonth}
            disabled
            // onInputValueChange={(e) => {
            //   let val = e.target.value;
            //   // 必须是0-12的数字 或者空字符串才能setMonth(e.target.value)
            //   if (val === "") {
            //     setMonth(undefined);
            //   }
            //   else if (/^[0-9]*$/.test(val) && val >= 0 && val <= 12) {
            //     setMonth(val);
            //     console.log(123123);
            //   }
            //   else{
            //     setMonth(month)
            //   }

            // }}
            showMaxButton={false}
          >
            month
          </BuyInputSection>

          <div className="VesterDepositModal-info-rows">
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">
                <Trans>Wallet</Trans>
              </div>
              <div className="align-right">{formatAmount(balance, 18, 2, true)} esEDDX</div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">
                <Trans>Vault Capacity</Trans>
              </div>
              <div className="align-right">
                <TooltipWithPortal
                  handle={`${formatAmount(nextDepositAmount, 18, 2, true)} / ${formatAmount(
                    maxVestableAmount,
                    18,
                    2,
                    true
                  )}`}
                  position="right-top"
                  renderContent={() => {
                    return (
                      <div>
                        <p className="text-white">
                          <Trans>Vault Capacity for your Account:</Trans>
                        </p>
                        <StatsTooltipRow
                          showDollar={false}
                          label={t`Deposited`}
                          value={`${formatAmount(vestedAmount, 18, 2, true)} esEDDX`}
                        />
                        <StatsTooltipRow
                          showDollar={false}
                          label={t`Max Capacity`}
                          value={`${formatAmount(maxVestableAmount, 18, 2, true)} esEDDX`}
                        />
                      </div>
                    );
                  }}
                />
              </div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">
                <Trans>Reserve Amount</Trans>
              </div>
              <div className="align-right">
                <TooltipWithPortal
                  handle={`${formatAmount(
                    reserveAmount && reserveAmount.gte(additionalReserveAmount)
                      ? reserveAmount
                      : additionalReserveAmount,
                    18,
                    2,
                    true
                  )} / ${formatAmount(maxReserveAmount, 18, 2, true)}`}
                  position="right-top"
                  renderContent={() => {
                    return (
                      <>
                        <StatsTooltipRow
                          label={t`Current Reserved`}
                          value={formatAmount(reserveAmount, 18, 2, true)}
                          showDollar={false}
                        />
                        <StatsTooltipRow
                          label={t`Additional reserve required`}
                          value={formatAmount(additionalReserveAmount, 18, 2, true)}
                          showDollar={false}
                        />
                        {amount && nextReserveAmount.gt(maxReserveAmount) && (
                          <>
                            <br />
                            <Trans>
                              You need a total of at least {formatAmount(nextReserveAmount, 18, 2, true)}{" "}
                              {stakeTokenLabel} to vest {formatAmount(amount, 18, 2, true)} esEDDX.
                            </Trans>
                          </>
                        )}
                      </>
                    );
                  }}
                />
              </div>
            </div>
          </div>
          <div className="Exchange-swap-button-container">
            <Button variant="primary-action" className="w-full" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
              {getPrimaryText()}
            </Button>
          </div>
        </Modal>
      </div>
    </SEO>
  );
}

function VesterWithdrawModal(props) {
  const { isVisible, setIsVisible, chainId, title, library, vesterAddress, setPendingTxns } = props;
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const onClickPrimary = () => {
    setIsWithdrawing(true);
    const contract = new ethers.Contract(vesterAddress, Vester.abi, library.getSigner());

    callContract(chainId, contract, "withdraw", [], {
      sentMsg: t`Withdraw submitted.`,
      failMsg: t`Withdraw failed.`,
      successMsg: t`Withdrawn!`,
      setPendingTxns,
    })
      .then(async (res) => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsWithdrawing(false);
      });
  };

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
        <Trans>
          <div>
            This will withdraw and unreserve all tokens as well as pause vesting.
            <br />
            <br />
            esEDDX tokens that have been converted to EDDX will remain as EDDX tokens.
            <br />
            <br />
            To claim EDDX tokens without withdrawing, use the "Claim" button under the Total Rewards section.
            <br />
            <br />
          </div>
        </Trans>
        <div className="Exchange-swap-button-container">
          <Button variant="primary-action" className="w-full" onClick={onClickPrimary} disabled={isWithdrawing}>
            {!isWithdrawing && "Confirm Withdraw"}
            {isWithdrawing && "Confirming..."}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function CompoundModal(props) {
  const {
    isVisible,
    setIsVisible,
    rewardRouterAddress,
    active,
    account,
    library,
    chainId,
    setPendingTxns,
    totalVesterRewards,
    nativeTokenSymbol,
    wrappedTokenSymbol,
  } = props;
  const [isCompounding, setIsCompounding] = useState(false);
  const [shouldClaimEddx, setShouldClaimEddx] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-compound-should-claim-eddx"],
    true
  );
  const [shouldStakeEddx, setShouldStakeEddx] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-compound-should-stake-eddx"],
    true
  );
  const [shouldClaimEsEddx, setShouldClaimEsEddx] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-compound-should-claim-es-eddx"],
    true
  );
  const [shouldStakeEsEddx, setShouldStakeEsEddx] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-compound-should-stake-es-eddx"],
    true
  );
  const [shouldStakeMultiplierPoints, setShouldStakeMultiplierPoints] = useState(true);
  const [shouldClaimWeth, setShouldClaimWeth] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-compound-should-claim-weth"],
    true
  );
  const [shouldConvertWeth, setShouldConvertWeth] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-compound-should-convert-weth"],
    true
  );

  const eddxAddress = getContract(chainId, "EDDX");
  const stakedEddxTrackerAddress = getContract(chainId, "StakedEddxTracker");

  const [isApproving, setIsApproving] = useState(false);

  const { data: tokenAllowance } = useSWR(
    active && [active, chainId, eddxAddress, "allowance", account, stakedEddxTrackerAddress],
    {
      fetcher: contractFetcher(library, Token),
    }
  );

  const needApproval = shouldStakeEddx && tokenAllowance && totalVesterRewards && totalVesterRewards.gt(tokenAllowance);

  const isPrimaryEnabled = () => {
    return !isCompounding && !isApproving && !isCompounding;
  };

  const getPrimaryText = () => {
    if (isApproving) {
      return t`Approving EDDX...`;
    }
    if (needApproval) {
      return t`Approve EDDX`;
    }
    if (isCompounding) {
      return t`Compounding...`;
    }
    return t`Compound`;
  };

  const onClickPrimary = () => {
    if (needApproval) {
      approveTokens({
        setIsApproving,
        library,
        tokenAddress: eddxAddress,
        spender: stakedEddxTrackerAddress,
        chainId,
      });
      return;
    }

    setIsCompounding(true);

    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner());
    callContract(
      chainId,
      contract,
      "handleRewards",
      [
        shouldClaimEddx || shouldStakeEddx,
        shouldStakeEddx,
        shouldClaimEsEddx || shouldStakeEsEddx,
        shouldStakeEsEddx,
        shouldStakeMultiplierPoints,
        shouldClaimWeth || shouldConvertWeth,
        shouldConvertWeth,
      ],
      {
        sentMsg: t`Compound submitted!`,
        failMsg: t`Compound failed.`,
        successMsg: t`Compound completed!`,
        setPendingTxns,
      }
    )
      .then(async (res) => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsCompounding(false);
      });
  };

  const toggleShouldStakeEddx = (value) => {
    if (value) {
      setShouldClaimEddx(true);
    }
    setShouldStakeEddx(value);
  };

  const toggleShouldStakeEsEddx = (value) => {
    if (value) {
      setShouldClaimEsEddx(true);
    }
    setShouldStakeEsEddx(value);
  };

  const toggleConvertWeth = (value) => {
    if (value) {
      setShouldClaimWeth(true);
    }
    setShouldConvertWeth(value);
  };

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={t`Compound Rewards`}>
        <div className="CompoundModal-menu">
          <div>
            <Checkbox
              isChecked={shouldStakeMultiplierPoints}
              setIsChecked={setShouldStakeMultiplierPoints}
              disabled={true}
            >
              <Trans>Stake Multiplier Points</Trans>
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldClaimEddx} setIsChecked={setShouldClaimEddx} disabled={shouldStakeEddx}>
              <Trans>Claim EDDX Rewards</Trans>
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldStakeEddx} setIsChecked={toggleShouldStakeEddx}>
              <Trans>Stake EDDX Rewards</Trans>
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldClaimEsEddx} setIsChecked={setShouldClaimEsEddx} disabled={shouldStakeEsEddx}>
              <Trans>Claim esEDDX Rewards</Trans>
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldStakeEsEddx} setIsChecked={toggleShouldStakeEsEddx}>
              <Trans>Stake esEDDX Rewards</Trans>
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldClaimWeth} setIsChecked={setShouldClaimWeth} disabled={shouldConvertWeth}>
              <Trans>Claim {wrappedTokenSymbol} Rewards</Trans>
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldConvertWeth} setIsChecked={toggleConvertWeth}>
              <Trans>
                Convert {wrappedTokenSymbol} to {nativeTokenSymbol}
              </Trans>
            </Checkbox>
          </div>
        </div>
        <div className="Exchange-swap-button-container">
          <Button variant="primary-action" className="w-full" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function ClaimModal(props) {
  const {
    isVisible,
    setIsVisible,
    rewardRouterAddress,
    library,
    chainId,
    setPendingTxns,
    nativeTokenSymbol,
    wrappedTokenSymbol,
  } = props;
  const [isClaiming, setIsClaiming] = useState(false);
  const [shouldClaimEddx, setShouldClaimEddx] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-claim-should-claim-eddx"],
    true
  );
  const [shouldClaimEsEddx, setShouldClaimEsEddx] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-claim-should-claim-es-eddx"],
    true
  );
  const [shouldClaimWeth, setShouldClaimWeth] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-claim-should-claim-weth"],
    true
  );
  const [shouldConvertWeth, setShouldConvertWeth] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-claim-should-convert-weth"],
    true
  );

  const isPrimaryEnabled = () => {
    return !isClaiming;
  };

  const getPrimaryText = () => {
    if (isClaiming) {
      return t`Claiming...`;
    }
    return t`Claim`;
  };

  const onClickPrimary = () => {
    setIsClaiming(true);

    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner());
    callContract(
      chainId,
      contract,
      "handleRewards",
      [
        shouldClaimEddx,
        false, // shouldStakeEddx
        shouldClaimEsEddx,
        false, // shouldStakeEsEddx
        false, // shouldStakeMultiplierPoints
        shouldClaimWeth,
        shouldConvertWeth,
      ],
      {
        sentMsg: t`Claim submitted.`,
        failMsg: t`Claim failed.`,
        successMsg: t`Claim completed!`,
        setPendingTxns,
      }
    )
      .then(async (res) => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsClaiming(false);
      });
  };

  const toggleConvertWeth = (value) => {
    if (value) {
      setShouldClaimWeth(true);
    }
    setShouldConvertWeth(value);
  };

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={t`Claim Rewards`}>
        <div className="CompoundModal-menu">
          <div>
            <Checkbox isChecked={shouldClaimEddx} setIsChecked={setShouldClaimEddx}>
              <Trans>Claim EDDX Rewards</Trans>
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldClaimEsEddx} setIsChecked={setShouldClaimEsEddx}>
              <Trans>Claim esEDDX Rewards</Trans>
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldClaimWeth} setIsChecked={setShouldClaimWeth} disabled={shouldConvertWeth}>
              <Trans>Claim {wrappedTokenSymbol} Rewards</Trans>
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldConvertWeth} setIsChecked={toggleConvertWeth}>
              <Trans>
                Convert {wrappedTokenSymbol} to {nativeTokenSymbol}
              </Trans>
            </Checkbox>
          </div>
        </div>
        <div className="Exchange-swap-button-container">
          <Button variant="primary-action" className="w-full" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default function StakeV2({ setPendingTxns, connectWallet }) {
  const { active, library, account } = useWeb3React();
  const { chainId } = useChainId();

  const chainName = getChainName(chainId);

  const hasInsurance = true;

  const [isStakeModalVisible, setIsStakeModalVisible] = useState(false);
  const [stakeModalTitle, setStakeModalTitle] = useState("");
  const [stakeModalMaxAmount, setStakeModalMaxAmount] = useState(undefined);
  const [stakeValue, setStakeValue] = useState("");
  const [stakingTokenSymbol, setStakingTokenSymbol] = useState("");
  const [stakingTokenAddress, setStakingTokenAddress] = useState("");
  const [stakingFarmAddress, setStakingFarmAddress] = useState("");
  const [stakeMethodName, setStakeMethodName] = useState("");

  const [isUnstakeModalVisible, setIsUnstakeModalVisible] = useState(false);
  const [unstakeModalTitle, setUnstakeModalTitle] = useState("");
  const [unstakeModalMaxAmount, setUnstakeModalMaxAmount] = useState(undefined);
  const [unstakeModalReservedAmount, setUnstakeModalReservedAmount] = useState(undefined);
  const [unstakeValue, setUnstakeValue] = useState("");
  const [unstakingTokenSymbol, setUnstakingTokenSymbol] = useState("");
  const [unstakeMethodName, setUnstakeMethodName] = useState("");

  const [isVesterDepositModalVisible, setIsVesterDepositModalVisible] = useState(false);
  const [vesterDepositTitle, setVesterDepositTitle] = useState("");
  const [vesterDepositStakeTokenLabel, setVesterDepositStakeTokenLabel] = useState("");
  const [vesterDepositMaxAmount, setVesterDepositMaxAmount] = useState("");
  const [vesterDepositBalance, setVesterDepositBalance] = useState("");
  const [vesterDepositEscrowedBalance, setVesterDepositEscrowedBalance] = useState("");
  const [vesterDepositVestedAmount, setVesterDepositVestedAmount] = useState("");
  const [vesterDepositAverageStakedAmount, setVesterDepositAverageStakedAmount] = useState("");
  const [vesterDepositMaxVestableAmount, setVesterDepositMaxVestableAmount] = useState("");
  const [vesterDepositValue, setVesterDepositValue] = useState("");
  const [vesterDepositMonth, setVesterDepositMonth] = useState("");
  const [vesterDepositReserveAmount, setVesterDepositReserveAmount] = useState("");
  const [vesterDepositMaxReserveAmount, setVesterDepositMaxReserveAmount] = useState("");
  const [vesterDepositAddress, setVesterDepositAddress] = useState("");

  const [isVesterWithdrawModalVisible, setIsVesterWithdrawModalVisible] = useState(false);
  const [vesterWithdrawTitle, setVesterWithdrawTitle] = useState(false);
  const [vesterWithdrawAddress, setVesterWithdrawAddress] = useState("");

  const [isCompoundModalVisible, setIsCompoundModalVisible] = useState(false);
  const [isClaimModalVisible, setIsClaimModalVisible] = useState(false);

  const rewardRouterAddress = getContract(chainId, "RewardRouter");
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

  const stakedEddxDistributorAddress = getContract(chainId, "StakedEddxDistributor");
  const stakedElpDistributorAddress = getContract(chainId, "StakedElpDistributor");

  const eddxVesterAddress = getContract(chainId, "EddxVester");
  const elpVesterAddress = getContract(chainId, "ElpVester");

  const vesterAddresses = [eddxVesterAddress, elpVesterAddress];

  const excludedEsEddxAccounts = [stakedEddxDistributorAddress, stakedElpDistributorAddress];

  const nativeTokenSymbol = getConstant(chainId, "nativeTokenSymbol");
  const wrappedTokenSymbol = getConstant(chainId, "wrappedTokenSymbol");

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

  const { marketsInfoData, tokensData } = useMarketsInfo(chainId);
  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit: false });
  const { marketsTokensAPRData } = useMarketTokensAPR(chainId, { marketsInfoData, marketTokensData });

  const { data: walletBalances } = useSWR(
    [
      `StakeV2:walletBalances:${active}`,
      chainId,
      readerAddress,
      "getTokenBalancesWithSupplies",
      account || PLACEHOLDER_ACCOUNT,
    ],
    {
      fetcher: contractFetcher(library, ReaderV2, [walletTokens]),
    }
  );

  const { data: depositBalances } = useSWR(
    [
      `StakeV2:depositBalances:${active}`,
      chainId,
      rewardReaderAddress,
      "getDepositBalances",
      account || PLACEHOLDER_ACCOUNT,
    ],
    {
      fetcher: contractFetcher(library, RewardReader, [depositTokens, rewardTrackersForDepositBalances]),
    }
  );

  const { data: stakingInfo } = useSWR(
    [`StakeV2:stakingInfo:${active}`, chainId, rewardReaderAddress, "getStakingInfo", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: contractFetcher(library, RewardReader, [rewardTrackersForStakingInfo]),
    }
  );

  const { data: stakedEddxSupply } = useSWR(
    [`StakeV2:stakedEddxSupply:${active}`, chainId, eddxAddress, "balanceOf", stakedEddxTrackerAddress],
    {
      fetcher: contractFetcher(library, Token),
    }
  );

  const { data: aums } = useSWR([`StakeV2:getAums:${active}`, chainId, elpManagerAddress, "getAums"], {
    fetcher: contractFetcher(library, ElpManager),
  });

  const { data: nativeTokenPrice } = useSWR(
    [`StakeV2:nativeTokenPrice:${active}`, chainId, vaultAddress, "getMinPrice", nativeTokenAddress],
    {
      fetcher: contractFetcher(library, Vault),
    }
  );

  const { data: esEddxSupply } = useSWR(
    [`StakeV2:esEddxSupply:${active}`, chainId, readerAddress, "getTokenSupply", esEddxAddress],
    {
      fetcher: contractFetcher(library, ReaderV2, [excludedEsEddxAccounts]),
    }
  );

  const { data: vestingInfo } = useSWR(
    [`StakeV2:vestingInfo:${active}`, chainId, readerAddress, "getVestingInfo", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: contractFetcher(library, ReaderV2, [vesterAddresses]),
    }
  );

  const { eddxPrice, eddxPriceFromBase, eddxPriceFromAvalanche } = useEddxPrice(
    chainId,
    { base: chainId === BASE ? library : undefined },
    active
  );

  let { total: totalEddxSupply } = useTotalEddxSupply();

  let { avax: avaxEddxStaked, base: baseEddxStaked, total: totalEddxStaked } = useTotalEddxStaked();

  const eddxSupplyUrl = getServerUrl(chainId, "/eddx_supply");
  const { data: eddxSupply } = useSWR([eddxSupplyUrl], {
    fetcher: (...args) => fetch(...args).then((res) => res.text()),
  });

  const isEddxTransferEnabled = true;

  let esEddxSupplyUsd;
  if (esEddxSupply && eddxPrice) {
    esEddxSupplyUsd = esEddxSupply.mul(eddxPrice).div(expandDecimals(1, 18));
  }

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

  let hasMultiplierPoints = false;
  let multiplierPointsAmount;
  if (processedData && processedData.bonusEddxTrackerRewards && processedData.bnEddxInFeeEddx) {
    multiplierPointsAmount = processedData.bonusEddxTrackerRewards.add(processedData.bnEddxInFeeEddx);
    if (multiplierPointsAmount.gt(0)) {
      hasMultiplierPoints = true;
    }
  }
  let totalRewardTokens;
  if (processedData && processedData.bnEddxInFeeEddx && processedData.bonusEddxInFeeEddx) {
    totalRewardTokens = processedData.bnEddxInFeeEddx.add(processedData.bonusEddxInFeeEddx);
  }

  let totalRewardTokensAndElp;
  if (totalRewardTokens && processedData && processedData.elpBalance) {
    totalRewardTokensAndElp = totalRewardTokens.add(processedData.elpBalance);
  }

  const bonusEddxInFeeEddx = processedData ? processedData.bonusEddxInFeeEddx : undefined;

  let stakedEddxSupplyUsd;
  if (!totalEddxStaked.isZero() && eddxPrice) {
    stakedEddxSupplyUsd = totalEddxStaked.mul(eddxPrice).div(expandDecimals(1, 18));
  }

  let totalSupplyUsd;
  if (totalEddxSupply && !totalEddxSupply.isZero() && eddxPrice) {
    totalSupplyUsd = totalEddxSupply.mul(eddxPrice).div(expandDecimals(1, 18));
  }

  let maxUnstakeableEddx = bigNumberify(0);
  if (
    totalRewardTokens &&
    vestingData &&
    vestingData.eddxVesterPairAmount &&
    multiplierPointsAmount &&
    processedData.bonusEddxInFeeEddx
  ) {
    const availableTokens = totalRewardTokens.sub(vestingData.eddxVesterPairAmount);
    const stakedTokens = processedData.bonusEddxInFeeEddx;
    const divisor = multiplierPointsAmount.add(stakedTokens);
    if (divisor.gt(0)) {
      maxUnstakeableEddx = availableTokens.mul(stakedTokens).div(divisor);
    }
  }

  const showStakeEddxModal = () => {
    if (!isEddxTransferEnabled) {
      helperToast.error(t`EDDX transfers not yet enabled`);
      return;
    }

    setIsStakeModalVisible(true);
    setStakeModalTitle(t`Stake EDDX`);
    setStakeModalMaxAmount(processedData.eddxBalance);
    setStakeValue("");
    setStakingTokenSymbol("EDDX");
    setStakingTokenAddress(eddxAddress);
    setStakingFarmAddress(stakedEddxTrackerAddress);
    setStakeMethodName("stakeEddx");
  };

  const showStakeEsEddxModal = () => {
    setIsStakeModalVisible(true);
    setStakeModalTitle(t`Stake esEDDX`);
    console.log(123123, processedData);
    setStakeModalMaxAmount(processedData.esEddxBalance);
    setStakeValue("");
    setStakingTokenSymbol("esEDDX");
    setStakingTokenAddress(esEddxAddress);
    setStakingFarmAddress(AddressZero);
    setStakeMethodName("stakeEsEddx");
  };

  const showEddxVesterDepositModal = () => {
    let remainingVestableAmount = vestingData.eddxVester.maxVestableAmount.sub(vestingData.eddxVester.vestedAmount);
    if (processedData.esEddxBalance.lt(remainingVestableAmount)) {
      remainingVestableAmount = processedData.esEddxBalance;
    }

    setIsVesterDepositModalVisible(true);
    setVesterDepositTitle(t`EDDX Vault`);
    setVesterDepositStakeTokenLabel("staked EDDX + esEDDX + Multiplier Points");
    setVesterDepositMaxAmount(remainingVestableAmount);
    setVesterDepositBalance(processedData.esEddxBalance);
    setVesterDepositEscrowedBalance(vestingData.eddxVester.escrowedBalance);
    setVesterDepositVestedAmount(vestingData.eddxVester.vestedAmount);
    setVesterDepositMaxVestableAmount(vestingData.eddxVester.maxVestableAmount);
    setVesterDepositAverageStakedAmount(vestingData.eddxVester.averageStakedAmount);
    setVesterDepositReserveAmount(vestingData.eddxVester.pairAmount);
    setVesterDepositMaxReserveAmount(totalRewardTokens);
    setVesterDepositValue("");
    setVesterDepositAddress(eddxVesterAddress);
  };

  const showElpVesterDepositModal = () => {
    let remainingVestableAmount = vestingData.elpVester.maxVestableAmount.sub(vestingData.elpVester.vestedAmount);
    if (processedData.esEddxBalance.lt(remainingVestableAmount)) {
      remainingVestableAmount = processedData.esEddxBalance;
    }

    setIsVesterDepositModalVisible(true);
    setVesterDepositTitle(t`ELP Vault`);
    setVesterDepositStakeTokenLabel("staked ELP");
    setVesterDepositMaxAmount(remainingVestableAmount);
    setVesterDepositBalance(processedData.esEddxBalance);
    setVesterDepositEscrowedBalance(vestingData.elpVester.escrowedBalance);
    setVesterDepositVestedAmount(vestingData.elpVester.vestedAmount);
    setVesterDepositMaxVestableAmount(vestingData.elpVester.maxVestableAmount);
    setVesterDepositAverageStakedAmount(vestingData.elpVester.averageStakedAmount);
    setVesterDepositReserveAmount(vestingData.elpVester.pairAmount);
    setVesterDepositMaxReserveAmount(processedData.elpBalance);
    setVesterDepositValue("");
    setVesterDepositAddress(elpVesterAddress);
  };

  const showEddxVesterWithdrawModal = () => {
    if (!vestingData || !vestingData.eddxVesterVestedAmount || vestingData.eddxVesterVestedAmount.eq(0)) {
      helperToast.error(t`You have not deposited any tokens for vesting.`);
      return;
    }

    setIsVesterWithdrawModalVisible(true);
    setVesterWithdrawTitle(t`Withdraw from EDDX Vault`);
    setVesterWithdrawAddress(eddxVesterAddress);
  };

  const showElpVesterWithdrawModal = () => {
    if (!vestingData || !vestingData.elpVesterVestedAmount || vestingData.elpVesterVestedAmount.eq(0)) {
      helperToast.error(t`You have not deposited any tokens for vesting.`);
      return;
    }

    setIsVesterWithdrawModalVisible(true);
    setVesterWithdrawTitle(t`Withdraw from ELP Vault`);
    setVesterWithdrawAddress(elpVesterAddress);
  };

  const showUnstakeEddxModal = () => {
    if (!isEddxTransferEnabled) {
      helperToast.error(t`EDDX transfers not yet enabled`);
      return;
    }
    setIsUnstakeModalVisible(true);
    setUnstakeModalTitle(t`Unstake EDDX`);
    let maxAmount = processedData.eddxInStakedEddx;
    if (
      processedData.eddxInStakedEddx &&
      vestingData &&
      vestingData.eddxVesterPairAmount.gt(0) &&
      maxUnstakeableEddx &&
      maxUnstakeableEddx.lt(processedData.eddxInStakedEddx)
    ) {
      maxAmount = maxUnstakeableEddx;
    }
    setUnstakeModalMaxAmount(maxAmount);
    setUnstakeModalReservedAmount(vestingData.eddxVesterPairAmount);
    setUnstakeValue("");
    setUnstakingTokenSymbol("EDDX");
    setUnstakeMethodName("unstakeEddx");
  };

  const showUnstakeEsEddxModal = () => {
    setIsUnstakeModalVisible(true);
    setUnstakeModalTitle(t`Unstake esEDDX`);
    let maxAmount = processedData.esEddxInStakedEddx;
    if (
      processedData.esEddxInStakedEddx &&
      vestingData &&
      vestingData.eddxVesterPairAmount.gt(0) &&
      maxUnstakeableEddx &&
      maxUnstakeableEddx.lt(processedData.esEddxInStakedEddx)
    ) {
      maxAmount = maxUnstakeableEddx;
    }
    setUnstakeModalMaxAmount(maxAmount);
    setUnstakeModalReservedAmount(vestingData.eddxVesterPairAmount);
    setUnstakeValue("");
    setUnstakingTokenSymbol("esEDDX");
    setUnstakeMethodName("unstakeEsEddx");
  };

  const renderMultiplierPointsLabel = useCallback(() => {
    return t`Multiplier Points APR`;
  }, []);

  const renderMultiplierPointsValue = useCallback(() => {
    return (
      <Tooltip
        handle={`100.00%`}
        position="right-bottom"
        renderContent={() => {
          return (
            <Trans>
              Boost your rewards with Multiplier Points.&nbsp;
              <ExternalLink href="https://eddxio.gitbook.io/eddx/rewards#multiplier-points">More info</ExternalLink>.
            </Trans>
          );
        }}
      />
    );
  }, []);

  let earnMsg;
  if (totalRewardTokensAndElp && totalRewardTokensAndElp.gt(0)) {
    let eddxAmountStr;
    if (processedData.eddxInStakedEddx && processedData.eddxInStakedEddx.gt(0)) {
      eddxAmountStr = formatAmount(processedData.eddxInStakedEddx, 18, 2, true) + " EDDX";
    }
    let esEddxAmountStr;
    if (processedData.esEddxInStakedEddx && processedData.esEddxInStakedEddx.gt(0)) {
      esEddxAmountStr = formatAmount(processedData.esEddxInStakedEddx, 18, 2, true) + " esEDDX";
    }
    let mpAmountStr;
    if (processedData.bonusEddxInFeeEddx && processedData.bnEddxInFeeEddx.gt(0)) {
      mpAmountStr = formatAmount(processedData.bnEddxInFeeEddx, 18, 2, true) + " MP";
    }
    let elpStr;
    if (processedData.elpBalance && processedData.elpBalance.gt(0)) {
      elpStr = formatAmount(processedData.elpBalance, 18, 2, true) + " ELP";
    }
    const amountStr = [eddxAmountStr, esEddxAmountStr, mpAmountStr, elpStr].filter((s) => s).join(", ");
    earnMsg = (
      <div>
        <Trans>
          You are earning {nativeTokenSymbol} rewards with {formatAmount(totalRewardTokensAndElp, 18, 2, true)} tokens.
          <br />
          Tokens: {amountStr}.
        </Trans>
      </div>
    );
  }

  return (
    <div className="default-container page-layout">
      <StakeModal
        isVisible={isStakeModalVisible}
        setIsVisible={setIsStakeModalVisible}
        chainId={chainId}
        title={stakeModalTitle}
        maxAmount={stakeModalMaxAmount}
        value={stakeValue}
        setValue={setStakeValue}
        active={active}
        account={account}
        library={library}
        stakingTokenSymbol={stakingTokenSymbol}
        stakingTokenAddress={stakingTokenAddress}
        farmAddress={stakingFarmAddress}
        rewardRouterAddress={rewardRouterAddress}
        stakeMethodName={stakeMethodName}
        hasMultiplierPoints={hasMultiplierPoints}
        setPendingTxns={setPendingTxns}
        nativeTokenSymbol={nativeTokenSymbol}
        wrappedTokenSymbol={wrappedTokenSymbol}
      />
      <UnstakeModal
        setPendingTxns={setPendingTxns}
        isVisible={isUnstakeModalVisible}
        setIsVisible={setIsUnstakeModalVisible}
        chainId={chainId}
        title={unstakeModalTitle}
        maxAmount={unstakeModalMaxAmount}
        reservedAmount={unstakeModalReservedAmount}
        value={unstakeValue}
        setValue={setUnstakeValue}
        library={library}
        unstakingTokenSymbol={unstakingTokenSymbol}
        rewardRouterAddress={rewardRouterAddress}
        unstakeMethodName={unstakeMethodName}
        multiplierPointsAmount={multiplierPointsAmount}
        bonusEddxInFeeEddx={bonusEddxInFeeEddx}
      />
      <VesterDepositModal
        isVisible={isVesterDepositModalVisible}
        setIsVisible={setIsVesterDepositModalVisible}
        chainId={chainId}
        title={vesterDepositTitle}
        stakeTokenLabel={vesterDepositStakeTokenLabel}
        maxAmount={vesterDepositMaxAmount}
        balance={vesterDepositBalance}
        escrowedBalance={vesterDepositEscrowedBalance}
        vestedAmount={vesterDepositVestedAmount}
        averageStakedAmount={vesterDepositAverageStakedAmount}
        maxVestableAmount={vesterDepositMaxVestableAmount}
        reserveAmount={vesterDepositReserveAmount}
        maxReserveAmount={vesterDepositMaxReserveAmount}
        value={vesterDepositValue}
        setValue={setVesterDepositValue}
        month={vesterDepositMonth}
        setMonth={setVesterDepositMonth}
        library={library}
        vesterAddress={vesterDepositAddress}
        setPendingTxns={setPendingTxns}
      />
      <VesterWithdrawModal
        isVisible={isVesterWithdrawModalVisible}
        setIsVisible={setIsVesterWithdrawModalVisible}
        vesterAddress={vesterWithdrawAddress}
        chainId={chainId}
        title={vesterWithdrawTitle}
        library={library}
        setPendingTxns={setPendingTxns}
      />
      <CompoundModal
        active={active}
        account={account}
        setPendingTxns={setPendingTxns}
        isVisible={isCompoundModalVisible}
        setIsVisible={setIsCompoundModalVisible}
        rewardRouterAddress={rewardRouterAddress}
        totalVesterRewards={processedData.totalVesterRewards}
        wrappedTokenSymbol={wrappedTokenSymbol}
        nativeTokenSymbol={nativeTokenSymbol}
        library={library}
        chainId={chainId}
      />
      <ClaimModal
        active={active}
        account={account}
        setPendingTxns={setPendingTxns}
        isVisible={isClaimModalVisible}
        setIsVisible={setIsClaimModalVisible}
        rewardRouterAddress={rewardRouterAddress}
        totalVesterRewards={processedData.totalVesterRewards}
        wrappedTokenSymbol={wrappedTokenSymbol}
        nativeTokenSymbol={nativeTokenSymbol}
        library={library}
        chainId={chainId}
      />
      <div className="section-title-block">
        <div className="section-title-icon"></div>
        <div className="section-title-content">
          <div className="Page-title">
            <Trans>Earn</Trans>
          </div>
          <div className="Page-description">
            <Trans>
              Stake <ExternalLink href="https://eddxio.gitbook.io/eddx/tokenomics">EDDX</ExternalLink> and{" "}
              <ExternalLink href="https://eddxio.gitbook.io/eddx/elp">ELP</ExternalLink> to earn rewards.
            </Trans>
          </div>
          {earnMsg && <div className="Page-description">{earnMsg}</div>}
        </div>
      </div>
      <div className="StakeV2-content">
        <div className="StakeV2-cards">
          <div className="App-card StakeV2-eddx-card">
            <div className="App-card-title">EDDX</div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">
                  <Trans>Price</Trans>
                </div>
                <div>
                  {!eddxPrice && "..."}
                  {eddxPrice && (
                    <Tooltip
                      position="right-bottom"
                      className="nowrap"
                      handle={"$" + formatAmount(eddxPrice, USD_DECIMALS, 2, true)}
                      renderContent={() => (
                        <>
                          <StatsTooltipRow
                            label={t`Price on Avalanche`}
                            value={formatAmount(eddxPriceFromAvalanche, USD_DECIMALS, 2, true)}
                          />
                          <StatsTooltipRow
                            label={t`Price on Base`}
                            value={formatAmount(eddxPriceFromBase, USD_DECIMALS, 2, true)}
                          />
                        </>
                      )}
                    />
                  )}
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Wallet</Trans>
                </div>
                <div>
                  {formatKeyAmount(processedData, "eddxBalance", 18, 2, true)} EDDX ($
                  {formatKeyAmount(processedData, "eddxBalanceUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Staked</Trans>
                </div>
                <div>
                  {formatKeyAmount(processedData, "eddxInStakedEddx", 18, 2, true)} EDDX ($
                  {formatKeyAmount(processedData, "eddxInStakedEddxUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>APR</Trans>
                </div>
                <div>
                  <Tooltip
                    handle={`${formatKeyAmount(processedData, "eddxAprTotalWithBoost", 2, 2, true)}%`}
                    position="right-bottom"
                    renderContent={() => (
                      <EDDXAprTooltip processedData={processedData} nativeTokenSymbol={nativeTokenSymbol} />
                    )}
                  />
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Rewards</Trans>
                </div>
                <div>
                  <Tooltip
                    handle={`$${formatKeyAmount(processedData, "totalEddxRewardsUsd", USD_DECIMALS, 2, true)}`}
                    position="right-bottom"
                    renderContent={() => {
                      return (
                        <>
                          <StatsTooltipRow
                            label={`${nativeTokenSymbol} (${wrappedTokenSymbol})`}
                            value={`${formatKeyAmount(
                              processedData,
                              "feeEddxTrackerRewards",
                              18,
                              4
                            )} ($${formatKeyAmount(processedData, "feeEddxTrackerRewardsUsd", USD_DECIMALS, 2, true)})`}
                            showDollar={false}
                          />
                          <StatsTooltipRow
                            label="Escrowed EDDX"
                            value={`${formatKeyAmount(
                              processedData,
                              "stakedEddxTrackerRewards",
                              18,
                              4
                            )} ($${formatKeyAmount(
                              processedData,
                              "stakedEddxTrackerRewardsUsd",
                              USD_DECIMALS,
                              2,
                              true
                            )})`}
                            showDollar={false}
                          />
                        </>
                      );
                    }}
                  />
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">{renderMultiplierPointsLabel()}</div>
                <div>{renderMultiplierPointsValue()}</div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Boost Percentage</Trans>
                </div>
                <div>
                  <Tooltip
                    handle={`${formatAmount(processedData.boostBasisPoints, 2, 2, false)}%`}
                    position="right-bottom"
                    renderContent={() => {
                      return (
                        <div>
                          <Trans>
                            You are earning {formatAmount(processedData.boostBasisPoints, 2, 2, false)}% more{" "}
                            {nativeTokenSymbol} rewards using{" "}
                            {formatAmount(processedData.bnEddxInFeeEddx, 18, 4, 2, true)} Staked Multiplier Points.
                          </Trans>
                          <br />
                          <br />
                          <Trans>Use the "Compound" button to stake your Multiplier Points.</Trans>
                        </div>
                      );
                    }}
                  />
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Total Staked</Trans>
                </div>
                <div>
                  {!totalEddxStaked && "..."}
                  {totalEddxStaked && (
                    <Tooltip
                      position="right-bottom"
                      className="nowrap"
                      handle={
                        formatAmount(totalEddxStaked, 18, 0, true) +
                        " EDDX" +
                        ` ($${formatAmount(stakedEddxSupplyUsd, USD_DECIMALS, 0, true)})`
                      }
                      renderContent={() => (
                        <ChainsStatsTooltipRow
                          showDollar={false}
                          title={t`Staked`}
                          avaxValue={avaxEddxStaked}
                          baseValue={baseEddxStaked}
                          total={totalEddxStaked}
                          decimalsForConversion={18}
                          symbol="EDDX"
                        />
                      )}
                    />
                  )}
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Total Supply</Trans>
                </div>
                {!totalEddxSupply && "..."}
                {totalEddxSupply && (
                  <div>
                    {formatAmount(totalEddxSupply, 18, 0, true)} EDDX ($
                    {formatAmount(totalSupplyUsd, USD_DECIMALS, 0, true)})
                  </div>
                )}
              </div>
              <div className="App-card-divider" />
              <div className="App-card-buttons m-0">
                <Button variant="secondary" to="/buy_eddx">
                  <Trans>Buy EDDX</Trans>
                </Button>
                {active && (
                  <Button variant="secondary" onClick={() => showStakeEddxModal()}>
                    <Trans>Stake</Trans>
                  </Button>
                )}
                {active && (
                  <Button variant="secondary" onClick={() => showUnstakeEddxModal()}>
                    <Trans>Unstake</Trans>
                  </Button>
                )}
                {active && (
                  <Button variant="secondary" to="/begin_account_transfer">
                    <Trans>Transfer Account</Trans>
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="App-card primary StakeV2-total-rewards-card">
            <div className="App-card-title">
              <Trans>Total Rewards</Trans>
            </div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">
                  {nativeTokenSymbol} ({wrappedTokenSymbol})
                </div>
                <div>
                  {formatKeyAmount(processedData, "totalNativeTokenRewards", 18, 4, true)} ($
                  {formatKeyAmount(processedData, "totalNativeTokenRewardsUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">EDDX</div>
                <div>
                  {formatKeyAmount(processedData, "totalVesterRewards", 18, 4, true)} ($
                  {formatKeyAmount(processedData, "totalVesterRewardsUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Escrowed EDDX</Trans>
                </div>
                <div>
                  {formatKeyAmount(processedData, "totalEsEddxRewards", 18, 4, true)} ($
                  {formatKeyAmount(processedData, "totalEsEddxRewardsUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Multiplier Points</Trans>
                </div>
                <div>{formatKeyAmount(processedData, "bonusEddxTrackerRewards", 18, 4, true)}</div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Staked Multiplier Points</Trans>
                </div>
                <div>{formatKeyAmount(processedData, "bnEddxInFeeEddx", 18, 4, true)}</div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Total</Trans>
                </div>
                <div>${formatKeyAmount(processedData, "totalRewardsUsd", USD_DECIMALS, 2, true)}</div>
              </div>
              <div className="App-card-footer">
                <div className="App-card-divider"></div>
                <div className="App-card-buttons m-0">
                  {active && (
                    <Button variant="secondary" onClick={() => setIsCompoundModalVisible(true)}>
                      <Trans>Compound</Trans>
                    </Button>
                  )}
                  {active && (
                    <Button variant="secondary" onClick={() => setIsClaimModalVisible(true)}>
                      <Trans>Claim</Trans>
                    </Button>
                  )}
                  {!active && (
                    <Button variant="secondary" onClick={() => connectWallet()}>
                      <Trans>Connect Wallet</Trans>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="App-card">
            <div className="App-card-title">ELP ({chainName})</div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">
                  <Trans>Price</Trans>
                </div>
                <div>${formatKeyAmount(processedData, "elpPrice", USD_DECIMALS, 3, true)}</div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Wallet</Trans>
                </div>
                <div>
                  {formatKeyAmount(processedData, "elpBalance", ELP_DECIMALS, 2, true)} ELP ($
                  {formatKeyAmount(processedData, "elpBalanceUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Staked</Trans>
                </div>
                <div>
                  {formatKeyAmount(processedData, "elpBalance", ELP_DECIMALS, 2, true)} ELP ($
                  {formatKeyAmount(processedData, "elpBalanceUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>APR</Trans>
                </div>
                <div>
                  <Tooltip
                    handle={`${formatKeyAmount(processedData, "elpAprTotal", 2, 2, true)}%`}
                    position="right-bottom"
                    renderContent={() => {
                      return (
                        <>
                          <StatsTooltipRow
                            label={`${nativeTokenSymbol} (${wrappedTokenSymbol}) APR`}
                            value={`${formatKeyAmount(processedData, "elpAprForNativeToken", 2, 2, true)}%`}
                            showDollar={false}
                          />

                          {processedData?.elpAprForEsEddx.gt(0) && (
                            <StatsTooltipRow
                              label="Escrowed EDDX APR"
                              value={`${formatKeyAmount(processedData, "elpAprForEsEddx", 2, 2, true)}%`}
                              showDollar={false}
                            />
                          )}

                          <br />

                          <Trans>
                            APRs are updated weekly on Wednesday and will depend on the fees collected for the week.{" "}
                            <br />
                            <br />
                            Historical ELP APRs can be checked in this{" "}
                            <ExternalLink href="https://dune.com/saulius/eddx-analytics">
                              community dashboard
                            </ExternalLink>
                            .
                          </Trans>
                        </>
                      );
                    }}
                  />
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Rewards</Trans>
                </div>
                <div>
                  <Tooltip
                    handle={`$${formatKeyAmount(processedData, "totalElpRewardsUsd", USD_DECIMALS, 2, true)}`}
                    position="right-bottom"
                    renderContent={() => {
                      return (
                        <>
                          <StatsTooltipRow
                            label={`${nativeTokenSymbol} (${wrappedTokenSymbol})`}
                            value={`${formatKeyAmount(
                              processedData,
                              "feeElpTrackerRewards",
                              18,
                              4
                            )} ($${formatKeyAmount(processedData, "feeElpTrackerRewardsUsd", USD_DECIMALS, 2, true)})`}
                            showDollar={false}
                          />
                          <StatsTooltipRow
                            label="Escrowed EDDX"
                            value={`${formatKeyAmount(
                              processedData,
                              "stakedElpTrackerRewards",
                              18,
                              4
                            )} ($${formatKeyAmount(
                              processedData,
                              "stakedElpTrackerRewardsUsd",
                              USD_DECIMALS,
                              2,
                              true
                            )})`}
                            showDollar={false}
                          />
                        </>
                      );
                    }}
                  />
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Total Staked</Trans>
                </div>
                <div>
                  {formatKeyAmount(processedData, "elpSupply", 18, 2, true)} ELP ($
                  {formatKeyAmount(processedData, "elpSupplyUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Total Supply</Trans>
                </div>
                <div>
                  {formatKeyAmount(processedData, "elpSupply", 18, 2, true)} ELP ($
                  {formatKeyAmount(processedData, "elpSupplyUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-buttons m-0">
                <Button variant="secondary" to="/buy_elp">
                  <Trans>Buy ELP</Trans>
                </Button>
                <Button variant="secondary" to="/buy_elp#redeem">
                  <Trans>Sell ELP</Trans>
                </Button>
                {hasInsurance && (
                  <Button
                    variant="secondary"
                    to="https://app.insurace.io/Insurance/Cart?id=124&referrer=545066382753150189457177837072918687520318754040"
                  >
                    <Trans>Purchase Insurance</Trans>
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="App-card">
            <div className="App-card-title">
              <Trans>Escrowed EDDX</Trans>
            </div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">
                  <Trans>Price</Trans>
                </div>
                <div>${formatAmount(eddxPrice, USD_DECIMALS, 2, true)}</div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Wallet</Trans>
                </div>
                <div>
                  {formatKeyAmount(processedData, "esEddxBalance", 18, 2, true)} esEDDX ($
                  {formatKeyAmount(processedData, "esEddxBalanceUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Staked</Trans>
                </div>
                <div>
                  {formatKeyAmount(processedData, "esEddxInStakedEddx", 18, 2, true)} esEDDX ($
                  {formatKeyAmount(processedData, "esEddxInStakedEddxUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>APR</Trans>
                </div>
                <div>
                  <Tooltip
                    handle={`${formatKeyAmount(processedData, "eddxAprTotalWithBoost", 2, 2, true)}%`}
                    position="right-bottom"
                    renderContent={() => (
                      <EDDXAprTooltip processedData={processedData} nativeTokenSymbol={nativeTokenSymbol} />
                    )}
                  />
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">{renderMultiplierPointsLabel()}</div>
                <div>{renderMultiplierPointsValue()}</div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Total Staked</Trans>
                </div>
                <div>
                  {formatKeyAmount(processedData, "stakedEsEddxSupply", 18, 0, true)} esEDDX ($
                  {formatKeyAmount(processedData, "stakedEsEddxSupplyUsd", USD_DECIMALS, 0, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Total Supply</Trans>
                </div>
                <div>
                  {formatAmount(esEddxSupply, 18, 0, true)} esEDDX (${formatAmount(esEddxSupplyUsd, USD_DECIMALS, 0, true)}
                  )
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-buttons m-0">
                {active && (
                  <Button variant="secondary" onClick={() => showStakeEsEddxModal()}>
                    <Trans>Stake</Trans>
                  </Button>
                )}
                {active && (
                  <Button variant="secondary" onClick={() => showUnstakeEsEddxModal()}>
                    <Trans>Unstake</Trans>
                  </Button>
                )}
                {!active && (
                  <Button variant="secondary" onClick={() => connectWallet()}>
                    <Trans> Connect Wallet</Trans>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {getIsSyntheticsSupported(chainId) && (
        <div className="StakeV2-section">
          <EmList
            marketsTokensAPRData={marketsTokensAPRData}
            marketTokensData={marketTokensData}
            marketsInfoData={marketsInfoData}
            tokensData={tokensData}
          />
        </div>
      )}

      <div>
        <div className="Tab-title-section">
          <div className="Page-title">
            <Trans>Vest</Trans>
          </div>
          <div className="Page-description">
            <Trans>
              Convert esEDDX tokens to EDDX tokens.
              <br />
              Please read the{" "}
              <ExternalLink href="https://eddxio.gitbook.io/eddx/rewards#vesting">vesting details</ExternalLink> before
              using the vaults.
            </Trans>
          </div>
        </div>
        <div>
          <div className="StakeV2-cards">
            <div className="App-card StakeV2-eddx-card">
              <div className="App-card-title">
                <Trans>EDDX Vault</Trans>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Staked Tokens</Trans>
                  </div>
                  <div>
                    <Tooltip
                      handle={formatAmount(totalRewardTokens, 18, 2, true)}
                      position="right-bottom"
                      renderContent={() => {
                        return (
                          <>
                            <StatsTooltipRow
                              showDollar={false}
                              label="EDDX"
                              value={formatAmount(processedData.eddxInStakedEddx, 18, 2, true)}
                            />

                            <StatsTooltipRow
                              showDollar={false}
                              label="esEDDX"
                              value={formatAmount(processedData.esEddxInStakedEddx, 18, 2, true)}
                            />
                            <StatsTooltipRow
                              showDollar={false}
                              label="Multiplier Points"
                              value={formatAmount(processedData.bnEddxInFeeEddx, 18, 2, true)}
                            />
                          </>
                        );
                      }}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Reserved for Vesting</Trans>
                  </div>
                  <div>
                    {formatKeyAmount(vestingData, "eddxVesterPairAmount", 18, 2, true)} /{" "}
                    {formatAmount(totalRewardTokens, 18, 2, true)}
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Vesting Status</Trans>
                  </div>
                  <div>
                    <Tooltip
                      handle={`${formatKeyAmount(vestingData, "eddxVesterClaimSum", 18, 4, true)} / ${formatKeyAmount(
                        vestingData,
                        "eddxVesterVestedAmount",
                        18,
                        4,
                        true
                      )}`}
                      position="right-bottom"
                      renderContent={() => {
                        return (
                          <div>
                            <Trans>
                              {formatKeyAmount(vestingData, "eddxVesterClaimSum", 18, 4, true)} tokens have been
                              converted to EDDX from the{" "}
                              {formatKeyAmount(vestingData, "eddxVesterVestedAmount", 18, 4, true)} esEDDX deposited for
                              vesting.
                            </Trans>
                          </div>
                        );
                      }}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Claimable</Trans>
                  </div>
                  <div>
                    <Tooltip
                      handle={`${formatKeyAmount(vestingData, "eddxVesterClaimable", 18, 4, true)} EDDX`}
                      position="right-bottom"
                      renderContent={() => (
                        <Trans>
                          {formatKeyAmount(vestingData, "eddxVesterClaimable", 18, 4, true)} EDDX tokens can be claimed,
                          use the options under the Total Rewards section to claim them.
                        </Trans>
                      )}
                    />
                  </div>
                </div>
                <div className="App-card-divider"></div>
                <div className="App-card-buttons m-0">
                  {!active && (
                    <Button variant="secondary" onClick={() => connectWallet()}>
                      <Trans>Connect Wallet</Trans>
                    </Button>
                  )}
                  {active && (
                    <Button variant="secondary" onClick={() => showEddxVesterDepositModal()}>
                      <Trans>Deposit</Trans>
                    </Button>
                  )}
                  {active && (
                    <Button variant="secondary" onClick={() => showEddxVesterWithdrawModal()}>
                      <Trans>Withdraw</Trans>
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="App-card StakeV2-eddx-card">
              <div className="App-card-title">
                <Trans>ELP Vault</Trans>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Staked Tokens</Trans>
                  </div>
                  <div>{formatAmount(processedData.elpBalance, 18, 2, true)} ELP</div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Reserved for Vesting</Trans>
                  </div>
                  <div>
                    {formatKeyAmount(vestingData, "elpVesterPairAmount", 18, 2, true)} /{" "}
                    {formatAmount(processedData.elpBalance, 18, 2, true)}
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Vesting Status</Trans>
                  </div>
                  <div>
                    <Tooltip
                      handle={`${formatKeyAmount(vestingData, "elpVesterClaimSum", 18, 4, true)} / ${formatKeyAmount(
                        vestingData,
                        "elpVesterVestedAmount",
                        18,
                        4,
                        true
                      )}`}
                      position="right-bottom"
                      renderContent={() => {
                        return (
                          <div>
                            <Trans>
                              {formatKeyAmount(vestingData, "elpVesterClaimSum", 18, 4, true)} tokens have been
                              converted to EDDX from the{" "}
                              {formatKeyAmount(vestingData, "elpVesterVestedAmount", 18, 4, true)} esEDDX deposited for
                              vesting.
                            </Trans>
                          </div>
                        );
                      }}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Claimable</Trans>
                  </div>
                  <div>
                    <Tooltip
                      handle={`${formatKeyAmount(vestingData, "elpVesterClaimable", 18, 4, true)} EDDX`}
                      position="right-bottom"
                      renderContent={() => (
                        <Trans>
                          {formatKeyAmount(vestingData, "elpVesterClaimable", 18, 4, true)} EDDX tokens can be claimed,
                          use the options under the Total Rewards section to claim them.
                        </Trans>
                      )}
                    />
                  </div>
                </div>
                <div className="App-card-divider"></div>
                <div className="App-card-buttons m-0">
                  {!active && (
                    <Button variant="secondary" onClick={() => connectWallet()}>
                      <Trans>Connect Wallet</Trans>
                    </Button>
                  )}
                  {active && (
                    <Button variant="secondary" onClick={() => showElpVesterDepositModal()}>
                      <Trans>Deposit</Trans>
                    </Button>
                  )}
                  {active && (
                    <Button variant="secondary" onClick={() => showElpVesterWithdrawModal()}>
                      <Trans>Withdraw</Trans>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
