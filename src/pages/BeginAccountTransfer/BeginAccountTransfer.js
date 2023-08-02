import React, { useState } from "react";
import { Link } from "react-router-dom";
import useSWR from "swr";
import { ethers } from "ethers";
import { useWeb3React } from "@web3-react/core";

import { getContract } from "config/contracts";

import Modal from "components/Modal/Modal";
import Footer from "components/Footer/Footer";

import Token from "abis/Token.json";
import Vester from "abis/VesterV2.json";
import RewardTracker from "abis/RewardTracker.json";
import RewardRouter from "abis/RewardRouter.json";

import { FaCheck, FaTimes } from "react-icons/fa";

import { Trans, t } from "@lingui/macro";

import "./BeginAccountTransfer.css";
import { callContract, contractFetcher } from "lib/contracts";
import { approveTokens } from "domain/tokens";
import { useChainId } from "lib/chains";
import Button from "components/Button/Button";

function ValidationRow({ isValid, children }) {
  return (
    <div className="ValidationRow">
      <div className="ValidationRow-icon-container">
        {isValid && <FaCheck className="ValidationRow-icon" />}
        {!isValid && <FaTimes className="ValidationRow-icon" />}
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function BeginAccountTransfer(props) {
  const { setPendingTxns } = props;
  const { active, library, account } = useWeb3React();
  const { chainId } = useChainId();

  const [receiver, setReceiver] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isTransferSubmittedModalVisible, setIsTransferSubmittedModalVisible] = useState(false);
  let parsedReceiver = ethers.constants.AddressZero;
  if (ethers.utils.isAddress(receiver)) {
    parsedReceiver = receiver;
  }

  const eddxAddress = getContract(chainId, "EDDX");
  const eddxVesterAddress = getContract(chainId, "EddxVester");
  const elpVesterAddress = getContract(chainId, "ElpVester");

  const rewardRouterAddress = getContract(chainId, "RewardRouter");

  const { data: eddxVesterBalance } = useSWR(active && [active, chainId, eddxVesterAddress, "balanceOf", account], {
    fetcher: contractFetcher(library, Token),
  });

  const { data: elpVesterBalance } = useSWR(active && [active, chainId, elpVesterAddress, "balanceOf", account], {
    fetcher: contractFetcher(library, Token),
  });

  const stakedEddxTrackerAddress = getContract(chainId, "StakedEddxTracker");
  const { data: cumulativeEddxRewards } = useSWR(
    [active, chainId, stakedEddxTrackerAddress, "cumulativeRewards", parsedReceiver],
    {
      fetcher: contractFetcher(library, RewardTracker),
    }
  );

  const stakedElpTrackerAddress = getContract(chainId, "StakedElpTracker");
  const { data: cumulativeElpRewards } = useSWR(
    [active, chainId, stakedElpTrackerAddress, "cumulativeRewards", parsedReceiver],
    {
      fetcher: contractFetcher(library, RewardTracker),
    }
  );

  const { data: transferredCumulativeEddxRewards } = useSWR(
    [active, chainId, eddxVesterAddress, "transferredCumulativeRewards", parsedReceiver],
    {
      fetcher: contractFetcher(library, Vester),
    }
  );

  const { data: transferredCumulativeElpRewards } = useSWR(
    [active, chainId, elpVesterAddress, "transferredCumulativeRewards", parsedReceiver],
    {
      fetcher: contractFetcher(library, Vester),
    }
  );

  const { data: pendingReceiver } = useSWR(
    active && [active, chainId, rewardRouterAddress, "pendingReceivers", account],
    {
      fetcher: contractFetcher(library, RewardRouter),
    }
  );

  const { data: eddxAllowance } = useSWR(
    active && [active, chainId, eddxAddress, "allowance", account, stakedEddxTrackerAddress],
    {
      fetcher: contractFetcher(library, Token),
    }
  );

  const { data: eddxStaked } = useSWR(
    active && [active, chainId, stakedEddxTrackerAddress, "depositBalances", account, eddxAddress],
    {
      fetcher: contractFetcher(library, RewardTracker),
    }
  );

  const needApproval = eddxAllowance && eddxStaked && eddxStaked.gt(eddxAllowance);

  const hasVestedEddx = eddxVesterBalance && eddxVesterBalance.gt(0);
  const hasVestedElp = elpVesterBalance && elpVesterBalance.gt(0);
  const hasStakedEddx =
    (cumulativeEddxRewards && cumulativeEddxRewards.gt(0)) ||
    (transferredCumulativeEddxRewards && transferredCumulativeEddxRewards.gt(0));
  const hasStakedElp =
    (cumulativeElpRewards && cumulativeElpRewards.gt(0)) ||
    (transferredCumulativeElpRewards && transferredCumulativeElpRewards.gt(0));
  const hasPendingReceiver = pendingReceiver && pendingReceiver !== ethers.constants.AddressZero;

  const getError = () => {
    if (!account) {
      return t`Wallet is not connected`;
    }
    if (hasVestedEddx) {
      return t`Vested EDDX not withdrawn`;
    }
    if (hasVestedElp) {
      return t`Vested ELP not withdrawn`;
    }
    if (!receiver || receiver.length === 0) {
      return t`Enter Receiver Address`;
    }
    if (!ethers.utils.isAddress(receiver)) {
      return t`Invalid Receiver Address`;
    }
    if (hasStakedEddx || hasStakedElp) {
      return t`Invalid Receiver`;
    }
    if ((parsedReceiver || "").toString().toLowerCase() === (account || "").toString().toLowerCase()) {
      return t`Self-transfer not supported`;
    }

    if (
      (parsedReceiver || "").length > 0 &&
      (parsedReceiver || "").toString().toLowerCase() === (pendingReceiver || "").toString().toLowerCase()
    ) {
      return t`Transfer already initiated`;
    }
  };

  const isPrimaryEnabled = () => {
    const error = getError();
    if (error) {
      return false;
    }
    if (isApproving) {
      return false;
    }
    if (isTransferring) {
      return false;
    }
    return true;
  };

  const getPrimaryText = () => {
    const error = getError();
    if (error) {
      return error;
    }
    if (needApproval) {
      return t`Approve EDDX`;
    }
    if (isApproving) {
      return t`Approving...`;
    }
    if (isTransferring) {
      return t`Transferring`;
    }

    return t`Begin Transfer`;
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

    setIsTransferring(true);
    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner());

    callContract(chainId, contract, "signalTransfer", [parsedReceiver], {
      sentMsg: t`Transfer submitted!`,
      failMsg: t`Transfer failed.`,
      setPendingTxns,
    })
      .then(async (res) => {
        setIsTransferSubmittedModalVisible(true);
      })
      .finally(() => {
        setIsTransferring(false);
      });
  };

  const completeTransferLink = `/complete_account_transfer/${account}/${parsedReceiver}`;
  const pendingTransferLink = `/complete_account_transfer/${account}/${pendingReceiver}`;

  return (
    <div className="BeginAccountTransfer Page page-layout">
      <Modal
        isVisible={isTransferSubmittedModalVisible}
        setIsVisible={setIsTransferSubmittedModalVisible}
        label={t`Transfer Submitted`}
      >
        <Trans>Your transfer has been initiated.</Trans>
        <br />
        <br />
        <Link className="App-cta" to={completeTransferLink}>
          <Trans>Continue</Trans>
        </Link>
      </Modal>
      <div className="Page-title-section">
        <div className="Page-title">
          <Trans>Transfer Account</Trans>
        </div>
        <div className="Page-description">
          <Trans>
            Please only use this for full account transfers.
            <br />
            This will transfer all your EDDX, esEDDX, ELP and Multiplier Points to your new account.
            <br />
            Transfers are only supported if the receiving account has not staked EDDX or ELP tokens before.
            <br />
            Transfers are one-way, you will not be able to transfer staked tokens back to the sending account.
          </Trans>
        </div>
        {hasPendingReceiver && (
          <div className="Page-description">
            <Trans>
              You have a <Link to={pendingTransferLink}>pending transfer</Link> to {pendingReceiver}.
            </Trans>
          </div>
        )}
      </div>
      <div className="Page-content">
        <div className="input-form">
          <div className="input-row">
            <label className="input-label">
              <Trans>Receiver Address</Trans>
            </label>
            <div>
              <input
                type="text"
                value={receiver}
                onChange={(e) => setReceiver(e.target.value)}
                className="text-input"
              />
            </div>
          </div>
          <div className="BeginAccountTransfer-validations">
            <ValidationRow isValid={!hasVestedEddx}>
              <Trans>Sender has withdrawn all tokens from EDDX Vesting Vault</Trans>
            </ValidationRow>
            <ValidationRow isValid={!hasVestedElp}>
              <Trans>Sender has withdrawn all tokens from ELP Vesting Vault</Trans>
            </ValidationRow>
            <ValidationRow isValid={!hasStakedEddx}>
              <Trans>Receiver has not staked EDDX tokens before</Trans>
            </ValidationRow>
            <ValidationRow isValid={!hasStakedElp}>
              <Trans>Receiver has not staked ELP tokens before</Trans>
            </ValidationRow>
          </div>
          <div className="input-row">
            <Button
              variant="primary-action"
              className="w-full"
              disabled={!isPrimaryEnabled()}
              onClick={() => onClickPrimary()}
            >
              {getPrimaryText()}
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
