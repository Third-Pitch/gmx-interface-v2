import React, { useEffect, useState } from "react";
import { Link, useHistory } from "react-router-dom";

import ElpSwap from "components/Elp/ElpSwap";
import Footer from "components/Footer/Footer";
import "./BuyElp.css";

import { Trans } from "@lingui/macro";
import { getNativeToken } from "config/tokens";
import { useChainId } from "lib/chains";
import ExternalLink from "components/ExternalLink/ExternalLink";

export default function BuyElp(props) {
  const { chainId } = useChainId();
  const history = useHistory();
  const [isBuying, setIsBuying] = useState(true);
  const nativeTokenSymbol = getNativeToken(chainId).symbol;

  useEffect(() => {
    const hash = history.location.hash.replace("#", "");
    const buying = hash === "redeem" ? false : true;
    setIsBuying(buying);
  }, [history.location.hash]);

  return (
    <div className="default-container page-layout">
      <div className="section-title-block">
        <div className="section-title-content">
          <div className="Page-title">
            <Trans>Buy / Sell ELP</Trans>
          </div>
          <div className="Page-description">
            <Trans>
              Purchase <ExternalLink href="https://eddxio.gitbook.io/eddx/elp">ELP tokens</ExternalLink> to earn{" "}
              {nativeTokenSymbol} fees from swaps and leverages trading.
            </Trans>
            <br />
            <Trans>
              View <Link to="/earn">staking</Link> page.
            </Trans>
          </div>
        </div>
      </div>
      <ElpSwap {...props} isBuying={isBuying} setIsBuying={setIsBuying} />
      <Footer />
    </div>
  );
}
