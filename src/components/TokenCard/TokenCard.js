import { Trans } from "@lingui/macro";
import { useCallback } from "react";
import { Link } from "react-router-dom";

import { isHomeSite } from "lib/legacy";

import { useWeb3React } from "@web3-react/core";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { BASE, BASE_GOERLI, AVALANCHE, AVALANCHE_FUJI } from "config/chains";
import { getIcon } from "config/icons";
import { useChainId } from "lib/chains";
import { switchNetwork } from "lib/wallets";
import APRLabel from "../APRLabel/APRLabel";
import { HeaderLink } from "../Header/HeaderLink";
import { useMarketTokensAPR } from "domain/synthetics/markets/useMarketTokensAPR";
import { isDevelopment } from "config/env";
import { formatAmount } from "lib/numbers";
import { useMarketTokensData, useMarketsInfo } from "domain/synthetics/markets";

const elpIcon = getIcon("common", "elp");
const eddxIcon = getIcon("common", "eddx");
const emIcon = getIcon("common", "em");

export default function TokenCard({ showRedirectModal, redirectPopupTimestamp }) {
  const isHome = isHomeSite();
  const { chainId } = useChainId();
  const { active } = useWeb3React();

  const { marketsInfoData } = useMarketsInfo(chainId);
  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit: false });

  const { avgMarketsAPR: fujiAvgMarketsAPR } = useMarketTokensAPR(AVALANCHE_FUJI, {
    marketsInfoData,
    marketTokensData,
  });
  const { avgMarketsAPR: goerliAvgMarketsAPR } = useMarketTokensAPR(BASE_GOERLI, {
    marketsInfoData,
    marketTokensData,
  });
  const { avgMarketsAPR: baseAvgMarketsAPR } = useMarketTokensAPR(BASE, { marketsInfoData, marketTokensData });
  const { avgMarketsAPR: avalancheAvgMarketsAPR } = useMarketTokensAPR(AVALANCHE, {
    marketsInfoData,
    marketTokensData,
  });

  const changeNetwork = useCallback(
    (network) => {
      if (network === chainId) {
        return;
      }
      if (!active) {
        setTimeout(() => {
          return switchNetwork(network, active);
        }, 500);
      } else {
        return switchNetwork(network, active);
      }
    },
    [chainId, active]
  );

  const BuyLink = ({ className, to, children, network }) => {
    if (isHome && showRedirectModal) {
      return (
        <HeaderLink
          to={to}
          className={className}
          redirectPopupTimestamp={redirectPopupTimestamp}
          showRedirectModal={showRedirectModal}
        >
          {children}
        </HeaderLink>
      );
    }

    return (
      <Link to={to} className={className} onClick={() => changeNetwork(network)}>
        {children}
      </Link>
    );
  };

  return (
    <div className="Home-token-card-options">
      <div className="Home-token-card-option">
        <div className="Home-token-card-option-icon">
          <img src={eddxIcon} width="40" alt="EDDX Icons" /> EDDX
        </div>
        <div className="Home-token-card-option-info">
          <div className="Home-token-card-option-title">
            <Trans>EDDX is the utility and governance token. Accrues 30% of the platform's generated fees.</Trans>
          </div>
          <div className="Home-token-card-option-apr">
            <Trans>Base APR:</Trans> <APRLabel chainId={BASE} label="eddxAprTotal" />,{" "}
            <Trans>Avalanche APR:</Trans> <APRLabel chainId={AVALANCHE} label="eddxAprTotal" key="AVALANCHE" />
          </div>
          <div className="Home-token-card-option-action">
            <div className="buy">
              <BuyLink to="/buy_eddx" className="default-btn" network={BASE}>
                <Trans>Buy on Base</Trans>
              </BuyLink>
              <BuyLink to="/buy_eddx" className="default-btn" network={AVALANCHE}>
                <Trans>Buy on Avalanche</Trans>
              </BuyLink>
            </div>
            <ExternalLink href="https://eddxio.gitbook.io/eddx/tokenomics" className="default-btn read-more">
              <Trans>Read more</Trans>
            </ExternalLink>
          </div>
        </div>
      </div>
      <div className="Home-token-card-option">
        <div className="Home-token-card-option-icon">
          <img src={elpIcon} width="40" alt="ELP Icon" /> ELP
        </div>
        <div className="Home-token-card-option-info">
          <div className="Home-token-card-option-title">
            <Trans>
              ELP is the liquidity provider token for EDDX V1 markets. Accrues 70% of the V1 markets generated fees.
            </Trans>
          </div>
          <div className="Home-token-card-option-apr">
            <Trans>Base APR:</Trans> <APRLabel chainId={BASE} label="elpAprTotal" key="BASE" />,{" "}
            <Trans>Avalanche APR:</Trans> <APRLabel chainId={AVALANCHE} label="elpAprTotal" key="AVALANCHE" />
          </div>
          <div className="Home-token-card-option-action">
            <div className="buy">
              <BuyLink to="/buy_elp" className="default-btn" network={BASE}>
                <Trans>Buy on Base</Trans>
              </BuyLink>
              <BuyLink to="/buy_elp" className="default-btn" network={AVALANCHE}>
                <Trans>Buy on Avalanche</Trans>
              </BuyLink>
            </div>
            <a
              href="https://eddxio.gitbook.io/eddx/elp"
              target="_blank"
              rel="noreferrer"
              className="default-btn read-more"
            >
              <Trans>Read more</Trans>
            </a>
          </div>
        </div>
      </div>

      <div className="Home-token-card-option">
        <div className="Home-token-card-option-icon">
          <img src={emIcon} alt="eddxBigIcon" /> EM
        </div>
        <div className="Home-token-card-option-info">
          <div className="Home-token-card-option-title">
            <Trans>
              EM is the liquidity provider token for EDDX V2 markets. Accrues 70% of the V2 markets generated fees.
            </Trans>
          </div>

          <div className="Home-token-card-option-apr">
            {isDevelopment() && (
              <>
                <span>
                  <Trans>Avalanche FUJI APR:</Trans> {formatAmount(fujiAvgMarketsAPR, 2, 2)}%
                </span>
                {", "}
                <span>
                  <Trans>Base Goerli APR:</Trans> {formatAmount(goerliAvgMarketsAPR, 2, 2)}%
                </span>
                {", "}
              </>
            )}
            <span>
              <Trans>Base APR:</Trans> {formatAmount(baseAvgMarketsAPR, 2, 2)}%
            </span>
            {", "}
            <span>
              <Trans>Avalanche APR:</Trans> {formatAmount(avalancheAvgMarketsAPR, 2, 2)}%
            </span>
          </div>

          <div className="Home-token-card-option-action">
            <div className="buy">
            <BuyLink to="/pools" className="default-btn" network={BASE}>
                <Trans>Buy on BASE</Trans>
              </BuyLink>
              <BuyLink to="/pools" className="default-btn" network={AVALANCHE_FUJI}>
                <Trans>Buy on Avalanche FUJI</Trans>
              </BuyLink>
              <BuyLink to="/pools" className="default-btn" network={BASE_GOERLI}>
                <Trans>Buy on Base Goerli</Trans>
              </BuyLink>
            </div>
            {/* <a
                href="https://eddxio.gitbook.io/eddx/elp"
                target="_blank"
                rel="noreferrer"
                className="default-btn read-more"
              >
                <Trans>Read more</Trans>
              </a> */}
          </div>
        </div>
      </div>
    </div>
  );
}
