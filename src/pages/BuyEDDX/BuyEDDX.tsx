import React, { useCallback } from "react";
import Footer from "components/Footer/Footer";
import "./BuyEDDX.css";
import { useWeb3React } from "@web3-react/core";
import { Trans, t } from "@lingui/macro";
import Button from "components/Button/Button";
import { BASE, AVALANCHE, getChainName, getConstant } from "config/chains";
import { switchNetwork } from "lib/wallets";
import { useChainId } from "lib/chains";
import Card from "components/Common/Card";
import { importImage } from "lib/legacy";
import ExternalLink from "components/ExternalLink/ExternalLink";

import bondProtocolIcon from "img/ic_bondprotocol_base.svg";
import uniswapBaseIcon from "img/ic_uni_base.svg";
import traderjoeIcon from "img/ic_traderjoe_avax.png";
import {
  BUY_NATIVE_TOKENS,
  CENTRALISED_EXCHANGES,
  DECENTRALISED_AGGRIGATORS,
  EXTERNAL_LINKS,
  FIAT_GATEWAYS,
  EDDX_FROM_ANY_NETWORKS,
  TRANSFER_EXCHANGES,
} from "./constants";

export default function BuyEDDX() {
  const { chainId } = useChainId();
  const isBase = chainId === BASE;
  const { active } = useWeb3React();
  const nativeTokenSymbol = getConstant(chainId, "nativeTokenSymbol");
  const externalLinks = EXTERNAL_LINKS[chainId];

  const onNetworkSelect = useCallback(
    (value) => {
      if (value === chainId) {
        return;
      }
      return switchNetwork(value, active);
    },
    [chainId, active]
  );

  return (
    <div className="BuyEDDXELP default-container page-layout">
      <div className="BuyEDDXELP-container">
        <div className="section-title-block">
          <div className="section-title-content">
            <div className="Page-title">
              <Trans>Buy EDDX on {getChainName(chainId)}</Trans>
            </div>
            <div className="Page-description">
              <Trans>Choose to buy from decentralized or centralized exchanges.</Trans>
              <br />
              <Trans>
                To purchase EDDX on the {isBase ? "Avalanche" : "Base"} blockchain, please{" "}
                <span onClick={() => onNetworkSelect(isBase ? AVALANCHE : BASE)}>change your network</span>.
              </Trans>
            </div>
          </div>
        </div>
        <div className="cards-row">
          <DecentralisedExchanges chainId={chainId} externalLinks={externalLinks} />
          <CentralisedExchanges chainId={chainId} />
        </div>

        {isBase ? (
          <div className="section-title-block mt-top">
            <div className="section-title-content">
              <div className="Page-title">
                <Trans>Buy or Transfer ETH to Base</Trans>
              </div>
              <div className="Page-description">
                <Trans>Buy ETH directly on Base or transfer it there.</Trans>
              </div>
            </div>
          </div>
        ) : (
          <div className="section-title-block mt-top">
            <div className="section-title-content">
              <div className="Page-title">
                <Trans>Buy or Transfer AVAX to Avalanche</Trans>
              </div>
              <div className="Page-description">
                <Trans>Buy AVAX directly to Avalanche or transfer it there.</Trans>
              </div>
            </div>
          </div>
        )}

        <div className="cards-row">
          <Card title={t`Buy ${nativeTokenSymbol}`}>
            <div className="App-card-content">
              <div className="BuyEDDXELP-description">
                {isBase ? (
                  <Trans>
                    You can buy ETH directly on{" "}
                    <ExternalLink href={externalLinks.networkWebsite}>Base</ExternalLink> using these options:
                  </Trans>
                ) : (
                  <Trans>
                    You can buy AVAX directly on{" "}
                    <ExternalLink href={externalLinks.networkWebsite}>Avalanche</ExternalLink> using these options:
                  </Trans>
                )}
              </div>
              <div className="buttons-group">
                {BUY_NATIVE_TOKENS.filter((e) => chainId in e.links).map((exchange) => {
                  const icon = importImage(exchange.icon) || "";
                  const link = exchange.links[chainId];
                  return (
                    <Button
                      variant="secondary"
                      textAlign="left"
                      key={exchange.name}
                      to={link}
                      imgInfo={{ src: icon, alt: exchange.name }}
                      newTab
                    >
                      {exchange.name}
                    </Button>
                  );
                })}
              </div>
            </div>
          </Card>
          <Card title={t`Transfer ${nativeTokenSymbol}`}>
            <div className="App-card-content">
              {isBase ? (
                <div className="BuyEDDXELP-description">
                  <Trans>You can transfer ETH from other networks to Base using any of the below options:</Trans>
                </div>
              ) : (
                <div className="BuyEDDXELP-description">
                  <Trans>You can transfer AVAX from other networks to Avalanche using any of the below options:</Trans>
                </div>
              )}
              <div className="buttons-group">
                {TRANSFER_EXCHANGES.filter((e) => chainId in e.links).map((exchange) => {
                  const icon = importImage(exchange.icon) || "";
                  const link = exchange.links[chainId];
                  return (
                    <Button
                      variant="secondary"
                      textAlign="left"
                      key={exchange.name}
                      to={link}
                      imgInfo={{ src: icon, alt: exchange.name }}
                      newTab
                    >
                      {exchange.name}
                    </Button>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function DecentralisedExchanges({ chainId, externalLinks }) {
  const isBase = chainId === BASE;
  return (
    <Card title={t`Buy EDDX from decentralized exchanges`}>
      <div className="App-card-content">
        {isBase ? (
          <div className="exchange-info-group">
            <div className="BuyEDDXELP-description">
              <Trans>Buy EDDX from Uniswap (make sure to select Base):</Trans>
            </div>
            <div className="buttons-group col-1">
              <Button
                variant="secondary"
                textAlign="left"
                imgInfo={{ src: uniswapBaseIcon, alt: "Uniswap" }}
                to={externalLinks.buyEddx.uniswap}
                newTab
              >
                Uniswap
              </Button>
            </div>
          </div>
        ) : (
          <div className="exchange-info-group">
            <div className="BuyEDDXELP-description">
              <Trans>Buy EDDX from Traderjoe:</Trans>
            </div>
            <div className="buttons-group col-1">
              <Button
                variant="secondary"
                textAlign="left"
                to={externalLinks.buyEddx.traderjoe}
                imgInfo={{ src: traderjoeIcon, alt: "Traderjoe" }}
                newTab
              >
                TraderJoe
              </Button>
            </div>
          </div>
        )}
        <div className="exchange-info-group">
          <div className="BuyEDDXELP-description">
            <Trans>Buy EDDX using Decentralized Exchange Aggregators:</Trans>
          </div>
          <div className="buttons-group">
            {DECENTRALISED_AGGRIGATORS.filter((e) => chainId in e.links).map((exchange) => {
              const icon = importImage(exchange.icon) || "";
              const link = exchange.links[chainId];
              return (
                <Button
                  variant="secondary"
                  textAlign="left"
                  key={exchange.name}
                  to={link}
                  imgInfo={{ src: icon, alt: exchange.name }}
                  newTab
                >
                  {exchange.name}
                </Button>
              );
            })}
          </div>
        </div>
        <div className="exchange-info-group">
          <div className="BuyEDDXELP-description">
            <Trans>Buy EDDX using any token from any network:</Trans>
          </div>
          <div className="buttons-group">
            {EDDX_FROM_ANY_NETWORKS.filter((e) => chainId in e.links).map((exchange) => {
              const icon = importImage(exchange.icon) || "";
              const link = exchange.links[chainId];
              return (
                <Button
                  variant="secondary"
                  textAlign="left"
                  key={exchange.name}
                  to={link}
                  imgInfo={{ src: icon, alt: exchange.name }}
                  newTab
                >
                  {exchange.name}
                </Button>
              );
            })}
          </div>
        </div>
        {isBase && (
          <div className="exchange-info-group">
            <div className="BuyEDDXELP-description">
              <Trans>EDDX bonds can be bought on Bond Protocol with a discount and a small vesting period:</Trans>
            </div>
            <div className="buttons-group col-1">
              <Button
                variant="secondary"
                textAlign="left"
                to={"https://app.bondprotocol.finance/#/issuers/EDDX"}
                imgInfo={{ src: bondProtocolIcon, alt: "Bond Protocol" }}
                newTab
              >
                Bond Protocol
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function CentralisedExchanges({ chainId }) {
  return (
    <Card title={t`Buy EDDX from centralized services`}>
      <div className="App-card-content">
        <div className="exchange-info-group">
          <div className="BuyEDDXELP-description">
            <Trans>Buy EDDX from centralized exchanges:</Trans>
          </div>
          <div className="buttons-group">
            {CENTRALISED_EXCHANGES.filter((e) => chainId in e.links).map((exchange) => {
              const icon = importImage(exchange.icon) || "";
              const link = exchange.links[chainId];
              return (
                <Button
                  variant="secondary"
                  textAlign="left"
                  key={exchange.name}
                  to={link}
                  imgInfo={{ src: icon, alt: exchange.name }}
                  newTab
                >
                  {exchange.name}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="exchange-info-group">
          <div className="BuyEDDXELP-description">
            <Trans>Buy EDDX using FIAT gateways:</Trans>
          </div>
          <div className="buttons-group col-2">
            {FIAT_GATEWAYS.filter((e) => chainId in e.links).map((exchange) => {
              const icon = importImage(exchange.icon) || "";
              let link = exchange.links[chainId];

              return (
                <Button
                  variant="secondary"
                  textAlign="left"
                  key={exchange.name}
                  to={link}
                  imgInfo={{ src: icon, alt: exchange.name }}
                  newTab
                >
                  {exchange.name}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
