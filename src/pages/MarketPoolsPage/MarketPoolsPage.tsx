import { Trans } from "@lingui/macro";
import SEO from "components/Common/SEO";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Footer from "components/Footer/Footer";
import { EmSwapBox, Mode, Operation } from "components/Synthetics/EmSwap/EmSwapBox/EmSwapBox";
import { MarketStats } from "components/Synthetics/MarketStats/MarketStats";
import { getSyntheticsDepositMarketKey } from "config/localStorage";
import { useMarketTokensData, useMarketsInfo } from "domain/synthetics/markets";
import { useChainId } from "lib/chains";
import { getPageTitle } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useState } from "react";

import { getTokenData } from "domain/synthetics/tokens";
import { getByKey } from "lib/objects";
import "./MarketPoolsPage.scss";
import { EmList } from "components/Synthetics/EmList/EmList";
import { useMarketTokensAPR } from "domain/synthetics/markets/useMarketTokensAPR";

type Props = {
  connectWallet: () => void;
  setPendingTxns: (txns: any) => void;
};

export function MarketPoolsPage(p: Props) {
  const { chainId } = useChainId();

  const { marketsInfoData = {}, tokensData } = useMarketsInfo(chainId);
  const markets = Object.values(marketsInfoData);

  const { marketTokensData: depositMarketTokensData } = useMarketTokensData(chainId, { isDeposit: true });
  const { marketTokensData: withdrawalMarketTokensData } = useMarketTokensData(chainId, { isDeposit: false });

  const { marketsTokensAPRData } = useMarketTokensAPR(chainId, {
    marketsInfoData,
    marketTokensData: withdrawalMarketTokensData,
  });

  const [operation, setOperation] = useState<Operation>(Operation.Deposit);
  const [mode, setMode] = useState<Mode>(Mode.Single);

  const [selectedMarketKey, setSelectedMarketKey] = useLocalStorageSerializeKey<string | undefined>(
    getSyntheticsDepositMarketKey(chainId),
    undefined
  );

  const marketInfo = getByKey(marketsInfoData, selectedMarketKey);

  const marketToken = getTokenData(
    operation === Operation.Deposit ? depositMarketTokensData : withdrawalMarketTokensData,
    selectedMarketKey
  );

  return (
    <SEO title={getPageTitle("V2 Pools")}>
      <div className="default-container page-layout">
        <div className="section-title-block">
          <div className="section-title-content">
            <div className="Page-title">
              <Trans>V2 Pools</Trans>
            </div>
            <div className="Page-description">
              <Trans>
                Purchase <ExternalLink href="https://eddxio.gitbook.io/eddx/em">EM Tokens.</ExternalLink>
              </Trans>
              <br />
            </div>
          </div>
        </div>

        <div className="MarketPoolsPage-content">
          <MarketStats marketsTokensAPRData={marketsTokensAPRData} marketInfo={marketInfo} marketToken={marketToken} />

          <div className="MarketPoolsPage-swap-box">
            <EmSwapBox
              onConnectWallet={p.connectWallet}
              selectedMarketAddress={selectedMarketKey}
              markets={markets}
              marketsInfoData={marketsInfoData}
              tokensData={tokensData}
              onSelectMarket={setSelectedMarketKey}
              setPendingTxns={p.setPendingTxns}
              operation={operation}
              mode={mode}
              setMode={setMode}
              setOperation={setOperation}
            />
          </div>
        </div>

        <div className="Tab-title-section">
          <div className="Page-title">
            <Trans>Select a Market</Trans>
          </div>
        </div>
        <EmList
          marketsTokensAPRData={marketsTokensAPRData}
          marketTokensData={depositMarketTokensData}
          marketsInfoData={marketsInfoData}
          tokensData={tokensData}
        />
      </div>
      <Footer />
    </SEO>
  );
}
