import React from "react";
import { Trans, t } from "@lingui/macro";
import Footer from "components/Footer/Footer";
import "./Buy.css";
import TokenCard from "components/TokenCard/TokenCard";
import buyEDDXIcon from "img/buy_eddx.svg";
import SEO from "components/Common/SEO";
import { getPageTitle } from "lib/legacy";

export default function BuyEDDXELP() {
  return (
    <SEO title={getPageTitle(t`Buy ELP or EDDX`)}>
      <div className="BuyEDDXELP page-layout">
        <div className="BuyEDDXELP-container default-container">
          <div className="section-title-block">
            <div className="section-title-icon">
              <img src={buyEDDXIcon} alt="buyEDDXIcon" />
            </div>
            <div className="section-title-content">
              <div className="Page-title">
                <Trans>Buy Protocol Tokens</Trans>
              </div>
            </div>
          </div>
          <TokenCard />
        </div>
        <Footer />
      </div>
    </SEO>
  );
}
