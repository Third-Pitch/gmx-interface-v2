import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useWeb3React } from "@web3-react/core";
import { Trans, t } from "@lingui/macro";
import useSWR from "swr";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import TooltipComponent from "components/Tooltip/Tooltip";

import hexToRgba from "hex-to-rgba";
import { ethers } from "ethers";

import {
  USD_DECIMALS,
  EDDX_DECIMALS,
  ELP_DECIMALS,
  BASIS_POINTS_DIVISOR,
  DEFAULT_MAX_USDG_AMOUNT,
  getPageTitle,
  importImage,
} from "lib/legacy";
import { useTotalEddxInLiquidity, useEddxPrice, useTotalEddxStaked, useTotalEddxSupply } from "domain/legacy";

import { getContract } from "config/contracts";

import VaultV2 from "abis/VaultV2.json";
import ReaderV2 from "abis/ReaderV2.json";
import ElpManager from "abis/ElpManager.json";
import Footer from "components/Footer/Footer";

import "./DashboardV2.css";

import AssetDropdown from "./AssetDropdown";
import ExternalLink from "components/ExternalLink/ExternalLink";
import SEO from "components/Common/SEO";
import { useTotalVolume, useVolumeInfo, useFeesSummary } from "domain/stats";
import ChainsStatsTooltipRow from "components/StatsTooltip/ChainsStatsTooltipRow";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { BASE, AVALANCHE, getChainName } from "config/chains";
import { getServerUrl } from "config/backend";
import { contractFetcher } from "lib/contracts";
import { useInfoTokens } from "domain/tokens";
import { getTokenBySymbol, getWhitelistedTokens, ELP_POOL_COLORS } from "config/tokens";
import { bigNumberify, expandDecimals, formatAmount, formatKeyAmount, numberWithCommas } from "lib/numbers";
import { useChainId } from "lib/chains";
import { formatDate } from "lib/dates";
import { getIcons } from "config/icons";
import { arrayURLFetcher } from "lib/fetcher";
import { getIsSyntheticsSupported } from "config/features";
import { MarketsList } from "components/Synthetics/MarketsList/MarketsList";
import { useMedia } from "react-use";
import useUniqueUsers from "domain/stats/useUniqueUsers";
const ACTIVE_CHAIN_IDS = [BASE, AVALANCHE];

const { AddressZero } = ethers.constants;

function getPositionStats(positionStats) {
  if (!positionStats || positionStats.length === 0) {
    return null;
  }
  return positionStats.reduce(
    (acc, cv, i) => {
      cv.openInterest = bigNumberify(cv.totalLongPositionSizes).add(cv.totalShortPositionSizes).toString();
      acc.totalLongPositionSizes = acc.totalLongPositionSizes.add(cv.totalLongPositionSizes);
      acc.totalShortPositionSizes = acc.totalShortPositionSizes.add(cv.totalShortPositionSizes);
      acc.totalOpenInterest = acc.totalOpenInterest.add(cv.openInterest);

      acc[ACTIVE_CHAIN_IDS[i]] = cv;
      return acc;
    },
    {
      totalLongPositionSizes: bigNumberify(0),
      totalShortPositionSizes: bigNumberify(0),
      totalOpenInterest: bigNumberify(0),
    }
  );
}

function getCurrentFeesUsd(tokenAddresses, fees, infoTokens) {
  if (!fees || !infoTokens) {
    return bigNumberify(0);
  }

  let currentFeesUsd = bigNumberify(0);
  for (let i = 0; i < tokenAddresses.length; i++) {
    const tokenAddress = tokenAddresses[i];
    const tokenInfo = infoTokens[tokenAddress];
    if (!tokenInfo || !tokenInfo.contractMinPrice) {
      continue;
    }

    const feeUsd = fees[i].mul(tokenInfo.contractMinPrice).div(expandDecimals(1, tokenInfo.decimals));
    currentFeesUsd = currentFeesUsd.add(feeUsd);
  }

  return currentFeesUsd;
}

export default function DashboardV2() {
  const { active, library } = useWeb3React();
  const { chainId } = useChainId();
  const totalVolume = useTotalVolume();

  const isMobile = useMedia("(max-width: 1200px)");

  const uniqueUsers = useUniqueUsers();
  const chainName = getChainName(chainId);
  const currentIcons = getIcons(chainId);
  const { data: positionStats } = useSWR(
    ACTIVE_CHAIN_IDS.map((chainId) => getServerUrl(chainId, "/position_stats")),
    {
      fetcher: arrayURLFetcher,
    }
  );

  let { total: totalEddxSupply } = useTotalEddxSupply();

  const currentVolumeInfo = useVolumeInfo();
  console.log(12313, currentVolumeInfo, currentVolumeInfo?.[chainId],chainId)

  const positionStatsInfo = getPositionStats(positionStats);

  function getWhitelistedTokenAddresses(chainId) {
    const whitelistedTokens = getWhitelistedTokens(chainId);
    return whitelistedTokens.map((token) => token.address);
  }

  const whitelistedTokens = getWhitelistedTokens(chainId);
  const tokenList = whitelistedTokens.filter((t) => !t.isWrapped);
  const visibleTokens = tokenList.filter((t) => !t.isTempHidden);

  const readerAddress = getContract(chainId, "Reader");
  const vaultAddress = getContract(chainId, "Vault");
  const elpManagerAddress = getContract(chainId, "ElpManager");

  const eddxAddress = getContract(chainId, "EDDX");
  const elpAddress = getContract(chainId, "ELP");
  const usdgAddress = getContract(chainId, "USDG");

  const tokensForSupplyQuery = [eddxAddress, elpAddress, usdgAddress];

  const { data: aums } = useSWR([`Dashboard:getAums:${active}`, chainId, elpManagerAddress, "getAums"], {
    fetcher: contractFetcher(library, ElpManager),
  });

  const { data: totalSupplies } = useSWR(
    [`Dashboard:totalSupplies:${active}`, chainId, readerAddress, "getTokenBalancesWithSupplies", AddressZero],
    {
      fetcher: contractFetcher(library, ReaderV2, [tokensForSupplyQuery]),
    }
  );

  const { data: totalTokenWeights } = useSWR(
    [`ElpSwap:totalTokenWeights:${active}`, chainId, vaultAddress, "totalTokenWeights"],
    {
      fetcher: contractFetcher(library, VaultV2),
    }
  );

  const { infoTokens } = useInfoTokens(library, chainId, active, undefined, undefined);
  const { infoTokens: infoTokensBase } = useInfoTokens(null, BASE, active, undefined, undefined);
  const { infoTokens: infoTokensAvax } = useInfoTokens(null, AVALANCHE, active, undefined, undefined);

  const { data: currentFees } = useSWR(
    infoTokensBase[AddressZero].contractMinPrice && infoTokensAvax[AddressZero].contractMinPrice
      ? "Dashboard:currentFees"
      : null,
    {
      fetcher: () => {
        return Promise.all(
          ACTIVE_CHAIN_IDS.map((chainId) =>
            contractFetcher(null, ReaderV2, [getWhitelistedTokenAddresses(chainId)])(
              `Dashboard:fees:${chainId}`,
              chainId,
              getContract(chainId, "Reader"),
              "getFees",
              getContract(chainId, "Vault")
            )
          )
        ).then((fees) => {
          return fees.reduce(
            (acc, cv, i) => {
              const feeUSD = getCurrentFeesUsd(
                getWhitelistedTokenAddresses(ACTIVE_CHAIN_IDS[i]),
                cv,
                ACTIVE_CHAIN_IDS[i] === BASE ? infoTokensBase : infoTokensAvax
              );
              acc[ACTIVE_CHAIN_IDS[i]] = feeUSD;
              acc.total = acc.total.add(feeUSD);
              return acc;
            },
            { total: bigNumberify(0) }
          );
        });
      },
    }
  );

  const { data: feesSummaryByChain } = useFeesSummary();
  const feesSummary = feesSummaryByChain[chainId];

  const eth = infoTokens[getTokenBySymbol(chainId, "ETH").address];
  const shouldIncludeCurrrentFees =
    feesSummaryByChain[chainId]?.lastUpdatedAt &&
    parseInt(Date.now() / 1000) - feesSummaryByChain[chainId]?.lastUpdatedAt > 60 * 60;

  const totalFees = ACTIVE_CHAIN_IDS.map((chainId) => {
    if (shouldIncludeCurrrentFees && currentFees && currentFees[chainId]) {
      return currentFees[chainId].div(expandDecimals(1, USD_DECIMALS)).add(feesSummaryByChain[chainId]?.totalFees || 0);
    }

    return feesSummaryByChain[chainId].totalFees || 0;
  })
    .map((v) => Math.round(v))
    .reduce(
      (acc, cv, i) => {
        acc[ACTIVE_CHAIN_IDS[i]] = cv;
        acc.total = acc.total + cv;
        return acc;
      },
      { total: 0 }
    );

  const { eddxPrice, eddxPriceFromBase, eddxPriceFromAvalanche } = useEddxPrice(
    chainId,
    { base: chainId === BASE ? library : undefined },
    active
  );

  let { total: totalEddxInLiquidity } = useTotalEddxInLiquidity(chainId, active);

  let { avax: avaxStakedEddx, base: baseStakedEddx, total: totalStakedEddx } = useTotalEddxStaked();

  let eddxMarketCap;
  if (eddxPrice && totalEddxSupply) {
    eddxMarketCap = eddxPrice.mul(totalEddxSupply).div(expandDecimals(1, EDDX_DECIMALS));
  }

  let stakedEddxSupplyUsd;
  if (eddxPrice && totalStakedEddx) {
    stakedEddxSupplyUsd = totalStakedEddx.mul(eddxPrice).div(expandDecimals(1, EDDX_DECIMALS));
  }

  let aum;
  if (aums && aums.length > 0) {
    aum = aums[0].add(aums[1]).div(2);
  }

  let elpPrice;
  let elpSupply;
  let elpMarketCap;
  if (aum && totalSupplies && totalSupplies[3]) {
    elpSupply = totalSupplies[3];
    elpPrice =
      aum && aum.gt(0) && elpSupply.gt(0)
        ? aum.mul(expandDecimals(1, ELP_DECIMALS)).div(elpSupply)
        : expandDecimals(1, USD_DECIMALS);
    elpMarketCap = elpPrice.mul(elpSupply).div(expandDecimals(1, ELP_DECIMALS));
  }

  let tvl;
  if (elpMarketCap && eddxPrice && totalStakedEddx) {
    tvl = elpMarketCap.add(eddxPrice.mul(totalStakedEddx).div(expandDecimals(1, EDDX_DECIMALS)));
  }

  const ethFloorPriceFund = expandDecimals(350 + 148 + 384, 18);
  const elpFloorPriceFund = expandDecimals(660001, 18);
  const usdcFloorPriceFund = expandDecimals(784598 + 200000, 30);

  let totalFloorPriceFundUsd;

  if (eth && eth.contractMinPrice && elpPrice) {
    const ethFloorPriceFundUsd = ethFloorPriceFund.mul(eth.contractMinPrice).div(expandDecimals(1, eth.decimals));
    const elpFloorPriceFundUsd = elpFloorPriceFund.mul(elpPrice).div(expandDecimals(1, 18));

    totalFloorPriceFundUsd = ethFloorPriceFundUsd.add(elpFloorPriceFundUsd).add(usdcFloorPriceFund);
  }

  let adjustedUsdgSupply = bigNumberify(0);

  for (let i = 0; i < tokenList.length; i++) {
    const token = tokenList[i];
    const tokenInfo = infoTokens[token.address];
    if (tokenInfo && tokenInfo.usdgAmount) {
      adjustedUsdgSupply = adjustedUsdgSupply.add(tokenInfo.usdgAmount);
    }
  }

  const getWeightText = (tokenInfo) => {
    if (
      !tokenInfo.weight ||
      !tokenInfo.usdgAmount ||
      !adjustedUsdgSupply ||
      adjustedUsdgSupply.eq(0) ||
      !totalTokenWeights
    ) {
      return "...";
    }

    const currentWeightBps = tokenInfo.usdgAmount.mul(BASIS_POINTS_DIVISOR).div(adjustedUsdgSupply);
    // use add(1).div(10).mul(10) to round numbers up
    const targetWeightBps = tokenInfo.weight.mul(BASIS_POINTS_DIVISOR).div(totalTokenWeights).add(1).div(10).mul(10);

    const weightText = `${formatAmount(currentWeightBps, 2, 2, false)}% / ${formatAmount(
      targetWeightBps,
      2,
      2,
      false
    )}%`;

    return (
      <TooltipComponent
        handle={weightText}
        position="right-bottom"
        renderContent={() => {
          return (
            <>
              <StatsTooltipRow
                label={t`Current Weight`}
                value={`${formatAmount(currentWeightBps, 2, 2, false)}%`}
                showDollar={false}
              />
              <StatsTooltipRow
                label={t`Target Weight`}
                value={`${formatAmount(targetWeightBps, 2, 2, false)}%`}
                showDollar={false}
              />
              <br />
              {currentWeightBps.lt(targetWeightBps) && (
                <div className="text-white">
                  <Trans>
                    {tokenInfo.symbol} is below its target weight.
                    <br />
                    <br />
                    Get lower fees to{" "}
                    <Link to="/buy_elp" target="_blank" rel="noopener noreferrer">
                      buy ELP
                    </Link>{" "}
                    with {tokenInfo.symbol}, and to{" "}
                    <Link to="/trade" target="_blank" rel="noopener noreferrer">
                      swap
                    </Link>{" "}
                    {tokenInfo.symbol} for other tokens.
                  </Trans>
                </div>
              )}
              {currentWeightBps.gt(targetWeightBps) && (
                <div className="text-white">
                  <Trans>
                    {tokenInfo.symbol} is above its target weight.
                    <br />
                    <br />
                    Get lower fees to{" "}
                    <Link to="/trade" target="_blank" rel="noopener noreferrer">
                      swap
                    </Link>{" "}
                    tokens for {tokenInfo.symbol}.
                  </Trans>
                </div>
              )}
              <br />
              <div>
                <ExternalLink href="https://eddxio.gitbook.io/eddx/elp">
                  <Trans>More Info</Trans>
                </ExternalLink>
              </div>
            </>
          );
        }}
      />
    );
  };

  let stakedPercent = 0;

  if (totalEddxSupply && !totalEddxSupply.isZero() && !totalStakedEddx.isZero()) {
    stakedPercent = totalStakedEddx.mul(100).div(totalEddxSupply).toNumber();
  }

  let liquidityPercent = 0;

  if (totalEddxSupply && !totalEddxSupply.isZero() && totalEddxInLiquidity) {
    liquidityPercent = totalEddxInLiquidity.mul(100).div(totalEddxSupply).toNumber();
  }

  let notStakedPercent = 100 - stakedPercent - liquidityPercent;

  let eddxDistributionData = [
    {
      name: t`staked`,
      value: stakedPercent,
      color: "#4353fa",
    },
    {
      name: t`in liquidity`,
      value: liquidityPercent,
      color: "#0598fa",
    },
    {
      name: t`not staked`,
      value: notStakedPercent,
      color: "#5c0af5",
    },
  ];

  const totalStatsStartDate = chainId === AVALANCHE ? t`06 Jan 2022` : t`01 Sep 2021`;

  let stableElp = 0;
  let totalElp = 0;

  let elpPool = tokenList.map((token) => {
    const tokenInfo = infoTokens[token.address];
    if (tokenInfo.usdgAmount && adjustedUsdgSupply && adjustedUsdgSupply.gt(0)) {
      const currentWeightBps = tokenInfo.usdgAmount.mul(BASIS_POINTS_DIVISOR).div(adjustedUsdgSupply);
      if (tokenInfo.isStable) {
        stableElp += parseFloat(`${formatAmount(currentWeightBps, 2, 2, false)}`);
      }
      totalElp += parseFloat(`${formatAmount(currentWeightBps, 2, 2, false)}`);
      return {
        fullname: token.name,
        name: token.symbol,
        value: parseFloat(`${formatAmount(currentWeightBps, 2, 2, false)}`),
      };
    }
    return null;
  });

  let stablePercentage = totalElp > 0 ? ((stableElp * 100) / totalElp).toFixed(2) : "0.0";

  elpPool = elpPool.filter(function (element) {
    return element !== null;
  });

  elpPool = elpPool.sort(function (a, b) {
    if (a.value < b.value) return 1;
    else return -1;
  });

  eddxDistributionData = eddxDistributionData.sort(function (a, b) {
    if (a.value < b.value) return 1;
    else return -1;
  });

  const [eddxActiveIndex, setEDDXActiveIndex] = useState(null);

  const onEDDXDistributionChartEnter = (_, index) => {
    setEDDXActiveIndex(index);
  };

  const onEDDXDistributionChartLeave = (_, index) => {
    setEDDXActiveIndex(null);
  };

  const [elpActiveIndex, setELPActiveIndex] = useState(null);

  const onELPPoolChartEnter = (_, index) => {
    setELPActiveIndex(index);
  };

  const onELPPoolChartLeave = (_, index) => {
    setELPActiveIndex(null);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="stats-label">
          <div className="stats-label-color" style={{ backgroundColor: payload[0].color }}></div>
          {payload[0].value}% {payload[0].name}
        </div>
      );
    }

    return null;
  };

  return (
    <SEO title={getPageTitle(t`Dashboard`)}>
      <div className="default-container DashboardV2 page-layout">
        <div className="section-title-block">
          <div className="section-title-icon"></div>
          <div className="section-title-content">
            <div className="Page-title">
              <Trans>Stats</Trans> <img width="24" src={currentIcons.network} alt="Network Icon" />
            </div>
            <div className="Page-description">
              <Trans>
                {chainName} Total Stats start from {totalStatsStartDate}.<br /> For detailed stats:
              </Trans>{" "}
              {chainId === BASE && <ExternalLink href="https://stats.eddx.io">https://stats.eddx.io</ExternalLink>}
              {chainId === AVALANCHE && (
                <ExternalLink href="https://stats.eddx.io/avalanche">https://stats.eddx.io/avalanche</ExternalLink>
              )}
              .
            </div>
          </div>
        </div>
        <div className="DashboardV2-content">
          <div className="DashboardV2-cards">
            <div className="App-card">
              <div className="App-card-title">
                <Trans>Overview</Trans>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">
                    <Trans>AUM</Trans>
                  </div>
                  <div>
                    <TooltipComponent
                      handle={`$${formatAmount(tvl, USD_DECIMALS, 0, true)}`}
                      position="right-bottom"
                      renderContent={() => (
                        <span>{t`Assets Under Management: EDDX staked (All chains) + ELP pool (${chainName}).`}</span>
                      )}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>ELP Pool</Trans>
                  </div>
                  <div>
                    <TooltipComponent
                      handle={`$${formatAmount(aum, USD_DECIMALS, 0, true)}`}
                      position="right-bottom"
                      renderContent={() => (
                        <Trans>
                          <p>Total value of tokens in ELP pool ({chainName}).</p>
                          <p>
                            Other websites may show a higher value as they add positions' collaterals to the ELP pool.
                          </p>
                        </Trans>
                      )}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>24h Volume</Trans>
                  </div>
                  <div>
                    ${formatAmount(currentVolumeInfo?.[chainId], USD_DECIMALS, 0, true)}
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Open Interest</Trans>
                  </div>
                  <div>
                    <TooltipComponent
                      position="right-bottom"
                      className="nowrap"
                      handle={`$${formatAmount(positionStatsInfo?.[chainId]?.openInterest, USD_DECIMALS, 0, true)}`}
                      renderContent={() => (
                        <ChainsStatsTooltipRow
                          title={t`Open Interest`}
                          baseValue={positionStatsInfo?.[BASE].openInterest}
                          avaxValue={positionStatsInfo?.[AVALANCHE].openInterest}
                          total={positionStatsInfo?.totalOpenInterest}
                        />
                      )}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Long Positions</Trans>
                  </div>
                  <div>
                    <TooltipComponent
                      position="right-bottom"
                      className="nowrap"
                      handle={`$${formatAmount(
                        positionStatsInfo?.[chainId]?.totalLongPositionSizes,
                        USD_DECIMALS,
                        0,
                        true
                      )}`}
                      renderContent={() => (
                        <ChainsStatsTooltipRow
                          title={t`Long Positions`}
                          baseValue={positionStatsInfo?.[BASE].totalLongPositionSizes}
                          avaxValue={positionStatsInfo?.[AVALANCHE].totalLongPositionSizes}
                          total={positionStatsInfo?.totalLongPositionSizes}
                        />
                      )}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Short Positions</Trans>
                  </div>
                  <div>
                    <TooltipComponent
                      position="right-bottom"
                      className="nowrap"
                      handle={`$${formatAmount(
                        positionStatsInfo?.[chainId]?.totalShortPositionSizes,
                        USD_DECIMALS,
                        0,
                        true
                      )}`}
                      renderContent={() => (
                        <ChainsStatsTooltipRow
                          title={t`Short Positions`}
                          baseValue={positionStatsInfo?.[BASE].totalShortPositionSizes}
                          avaxValue={positionStatsInfo?.[AVALANCHE].totalShortPositionSizes}
                          total={positionStatsInfo?.totalShortPositionSizes}
                        />
                      )}
                    />
                  </div>
                </div>
                {feesSummary?.lastUpdatedAt ? (
                  <div className="App-card-row">
                    <div className="label">
                      <Trans>Fees since</Trans> {formatDate(feesSummary.lastUpdatedAt)}
                    </div>
                    <div>
                      <TooltipComponent
                        position="right-bottom"
                        className="nowrap"
                        handle={`$${formatAmount(currentFees?.[chainId], USD_DECIMALS, 2, true)}`}
                        renderContent={() => (
                          <ChainsStatsTooltipRow
                            title={t`Fees`}
                            baseValue={currentFees?.[BASE]}
                            avaxValue={currentFees?.[AVALANCHE]}
                            total={currentFees?.total}
                          />
                        )}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="App-card">
              <div className="App-card-title">
                <Trans>Total Stats</Trans>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Total Fees</Trans>
                  </div>
                  <div>
                    <TooltipComponent
                      position="right-bottom"
                      className="nowrap"
                      handle={`$${numberWithCommas(totalFees?.[chainId])}`}
                      renderContent={() => (
                        <ChainsStatsTooltipRow
                          title={t`Total Fees`}
                          baseValue={totalFees?.[BASE]}
                          avaxValue={totalFees?.[AVALANCHE]}
                          total={totalFees?.total}
                          decimalsForConversion={0}
                        />
                      )}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Total Volume</Trans>
                  </div>
                  <div>
                    <TooltipComponent
                      position="right-bottom"
                      className="nowrap"
                      handle={`$${formatAmount(totalVolume?.[chainId], USD_DECIMALS, 0, true)}`}
                      renderContent={() => (
                        <ChainsStatsTooltipRow
                          title={t`Total Volume`}
                          baseValue={totalVolume?.[BASE]}
                          avaxValue={totalVolume?.[AVALANCHE]}
                          total={totalVolume?.total}
                        />
                      )}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Total Users</Trans>
                  </div>
                  <div>
                    <TooltipComponent
                      position="right-bottom"
                      className="nowrap"
                      handle={formatAmount(uniqueUsers?.[chainId], 0, 0, true)}
                      renderContent={() => (
                        <ChainsStatsTooltipRow
                          title={t`Total Users`}
                          baseValue={uniqueUsers?.[BASE]}
                          avaxValue={uniqueUsers?.[AVALANCHE]}
                          total={uniqueUsers?.total}
                          showDollar={false}
                          shouldFormat={false}
                        />
                      )}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Floor Price Fund</Trans>
                  </div>
                  <div>${formatAmount(totalFloorPriceFundUsd, 30, 0, true)}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="Tab-title-section">
            <div className="Page-title">
              <Trans>Tokens</Trans> <img src={currentIcons.network} width="24" alt="Network Icon" />
            </div>
            <div className="Page-description">
              <Trans>Platform, ELP and EM tokens.</Trans>
            </div>
          </div>
          <div className="DashboardV2-token-cards">
            <div className="stats-wrapper stats-wrapper--eddx">
              <div className="App-card">
                <div className="stats-block">
                  <div className="App-card-title">
                    <div className="App-card-title-mark">
                      <div className="App-card-title-mark-icon">
                        <img src={currentIcons.eddx} width="40" alt="EDDX Token Icon" />
                      </div>
                      <div className="App-card-title-mark-info">
                        <div className="App-card-title-mark-title">EDDX</div>
                        <div className="App-card-title-mark-subtitle">EDDX</div>
                      </div>
                      <div>
                        <AssetDropdown assetSymbol="EDDX" />
                      </div>
                    </div>
                  </div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Price</Trans>
                      </div>
                      <div>
                        {!eddxPrice && "..."}
                        {eddxPrice && (
                          <TooltipComponent
                            position="right-bottom"
                            className="nowrap"
                            handle={"$" + formatAmount(eddxPrice, USD_DECIMALS, 2, true)}
                            renderContent={() => (
                              <>
                                <StatsTooltipRow
                                  label={t`Price on Base`}
                                  value={formatAmount(eddxPriceFromBase, USD_DECIMALS, 2, true)}
                                  showDollar={true}
                                />
                                <StatsTooltipRow
                                  label={t`Price on Avalanche`}
                                  value={formatAmount(eddxPriceFromAvalanche, USD_DECIMALS, 2, true)}
                                  showDollar={true}
                                />
                              </>
                            )}
                          />
                        )}
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Supply</Trans>
                      </div>
                      <div>{formatAmount(totalEddxSupply, EDDX_DECIMALS, 0, true)} EDDX</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Total Staked</Trans>
                      </div>
                      <div>
                        <TooltipComponent
                          position="right-bottom"
                          className="nowrap"
                          handle={`$${formatAmount(stakedEddxSupplyUsd, USD_DECIMALS, 0, true)}`}
                          renderContent={() => (
                            <ChainsStatsTooltipRow
                              title={t`Staked`}
                              baseValue={baseStakedEddx}
                              avaxValue={avaxStakedEddx}
                              total={totalStakedEddx}
                              decimalsForConversion={EDDX_DECIMALS}
                              showDollar={false}
                            />
                          )}
                        />
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Market Cap</Trans>
                      </div>
                      <div>${formatAmount(eddxMarketCap, USD_DECIMALS, 0, true)}</div>
                    </div>
                  </div>
                </div>
                <div className="stats-piechart" onMouseLeave={onEDDXDistributionChartLeave}>
                  {eddxDistributionData.length > 0 && (
                    <PieChart width={210} height={210}>
                      <Pie
                        data={eddxDistributionData}
                        cx={100}
                        cy={100}
                        innerRadius={73}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        paddingAngle={2}
                        onMouseEnter={onEDDXDistributionChartEnter}
                        onMouseOut={onEDDXDistributionChartLeave}
                        onMouseLeave={onEDDXDistributionChartLeave}
                      >
                        {eddxDistributionData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            style={{
                              filter:
                                eddxActiveIndex === index
                                  ? `drop-shadow(0px 0px 6px ${hexToRgba(entry.color, 0.7)})`
                                  : "none",
                              cursor: "pointer",
                            }}
                            stroke={entry.color}
                            strokeWidth={eddxActiveIndex === index ? 1 : 1}
                          />
                        ))}
                      </Pie>
                      <text x={"50%"} y={"50%"} fill="white" textAnchor="middle" dominantBaseline="middle">
                        <Trans>Distribution</Trans>
                      </text>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  )}
                </div>
              </div>
              <div className="App-card">
                <div className="stats-block">
                  <div className="App-card-title">
                    <div className="App-card-title-mark">
                      <div className="App-card-title-mark-icon">
                        <img src={currentIcons.elp} width="40" alt="ELP Icon" />
                      </div>
                      <div className="App-card-title-mark-info">
                        <div className="App-card-title-mark-title">ELP</div>
                        <div className="App-card-title-mark-subtitle">ELP</div>
                      </div>
                      <div>
                        <AssetDropdown assetSymbol="ELP" />
                      </div>
                    </div>
                  </div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Price</Trans>
                      </div>
                      <div>${formatAmount(elpPrice, USD_DECIMALS, 3, true)}</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Supply</Trans>
                      </div>
                      <div>{formatAmount(elpSupply, ELP_DECIMALS, 0, true)} ELP</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Total Staked</Trans>
                      </div>
                      <div>${formatAmount(elpMarketCap, USD_DECIMALS, 0, true)}</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Market Cap</Trans>
                      </div>
                      <div>${formatAmount(elpMarketCap, USD_DECIMALS, 0, true)}</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Stablecoin Percentage</Trans>
                      </div>
                      <div>{stablePercentage}%</div>
                    </div>
                  </div>
                </div>
                <div className="stats-piechart" onMouseOut={onELPPoolChartLeave}>
                  {elpPool.length > 0 && (
                    <PieChart width={210} height={210}>
                      <Pie
                        data={elpPool}
                        cx={100}
                        cy={100}
                        innerRadius={73}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        onMouseEnter={onELPPoolChartEnter}
                        onMouseOut={onELPPoolChartLeave}
                        onMouseLeave={onELPPoolChartLeave}
                        paddingAngle={2}
                      >
                        {elpPool.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={ELP_POOL_COLORS[entry.name]}
                            style={{
                              filter:
                                elpActiveIndex === index
                                  ? `drop-shadow(0px 0px 6px ${hexToRgba(ELP_POOL_COLORS[entry.name], 0.7)})`
                                  : "none",
                              cursor: "pointer",
                            }}
                            stroke={ELP_POOL_COLORS[entry.name]}
                            strokeWidth={elpActiveIndex === index ? 1 : 1}
                          />
                        ))}
                      </Pie>
                      <text x={"50%"} y={"50%"} fill="white" textAnchor="middle" dominantBaseline="middle">
                        ELP Pool
                      </text>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  )}
                </div>
              </div>
            </div>
            <div className="token-table-wrapper App-card">
              <div className="App-card-title">
                <Trans>ELP Index Composition</Trans> <img src={currentIcons.network} width="16" alt="Network Icon" />
              </div>
              <div className="App-card-divider"></div>
              <table className="token-table">
                <thead>
                  <tr>
                    <th>
                      <Trans>TOKEN</Trans>
                    </th>
                    <th>
                      <Trans>PRICE</Trans>
                    </th>
                    <th>
                      <Trans>POOL</Trans>
                    </th>
                    <th>
                      <Trans>WEIGHT</Trans>
                    </th>
                    <th>
                      <Trans>UTILIZATION</Trans>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTokens.map((token) => {
                    const tokenInfo = infoTokens[token.address];
                    let utilization = bigNumberify(0);
                    if (tokenInfo && tokenInfo.reservedAmount && tokenInfo.poolAmount && tokenInfo.poolAmount.gt(0)) {
                      utilization = tokenInfo.reservedAmount.mul(BASIS_POINTS_DIVISOR).div(tokenInfo.poolAmount);
                    }
                    let maxUsdgAmount = DEFAULT_MAX_USDG_AMOUNT;
                    if (tokenInfo.maxUsdgAmount && tokenInfo.maxUsdgAmount.gt(0)) {
                      maxUsdgAmount = tokenInfo.maxUsdgAmount;
                    }
                    const tokenImage = importImage("ic_" + token.symbol.toLowerCase() + "_40.svg");

                    return (
                      <tr key={token.symbol}>
                        <td>
                          <div className="token-symbol-wrapper">
                            <div className="App-card-title-info">
                              <div className="App-card-title-info-icon">
                                <img src={tokenImage} alt={token.symbol} width="40" />
                              </div>
                              <div className="App-card-title-info-text">
                                <div className="App-card-info-title">{token.name}</div>
                                <div className="App-card-info-subtitle">{token.symbol}</div>
                              </div>
                              <div>
                                <AssetDropdown assetSymbol={token.symbol} assetInfo={token} />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>${formatKeyAmount(tokenInfo, "minPrice", USD_DECIMALS, 2, true)}</td>
                        <td>
                          <TooltipComponent
                            handle={`$${formatKeyAmount(tokenInfo, "managedUsd", USD_DECIMALS, 0, true)}`}
                            position="right-bottom"
                            className="nowrap"
                            renderContent={() => {
                              return (
                                <>
                                  <StatsTooltipRow
                                    label={t`Pool Amount`}
                                    value={`${formatKeyAmount(tokenInfo, "managedAmount", token.decimals, 0, true)} ${token.symbol
                                      }`}
                                    showDollar={false}
                                  />
                                  <StatsTooltipRow
                                    label={t`Target Min Amount`}
                                    value={`${formatKeyAmount(tokenInfo, "bufferAmount", token.decimals, 0, true)} ${token.symbol
                                      }`}
                                    showDollar={false}
                                  />
                                  <StatsTooltipRow
                                    label={t`Max ${tokenInfo.symbol} Capacity`}
                                    value={formatAmount(maxUsdgAmount, 18, 0, true)}
                                    showDollar={true}
                                  />
                                </>
                              );
                            }}
                          />
                        </td>
                        <td>{getWeightText(tokenInfo)}</td>
                        <td>{formatAmount(utilization, 2, 2, false)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {isMobile && (
              <>
                <div className="App-card-title-small">
                  <Trans>ELP Index Composition</Trans> <img src={currentIcons.network} width="16" alt="Network Icon" />
                </div>

                <div className="token-grid">
                  {visibleTokens.map((token) => {
                    const tokenInfo = infoTokens[token.address];
                    let utilization = bigNumberify(0);
                    if (tokenInfo && tokenInfo.reservedAmount && tokenInfo.poolAmount && tokenInfo.poolAmount.gt(0)) {
                      utilization = tokenInfo.reservedAmount.mul(BASIS_POINTS_DIVISOR).div(tokenInfo.poolAmount);
                    }
                    let maxUsdgAmount = DEFAULT_MAX_USDG_AMOUNT;
                    if (tokenInfo.maxUsdgAmount && tokenInfo.maxUsdgAmount.gt(0)) {
                      maxUsdgAmount = tokenInfo.maxUsdgAmount;
                    }

                    const tokenImage = importImage("ic_" + token.symbol.toLowerCase() + "_24.svg");
                    return (
                      <div className="App-card" key={token.symbol}>
                        <div className="App-card-title">
                          <div className="mobile-token-card">
                            <img src={tokenImage} alt={token.symbol} width="20px" />
                            <div className="token-symbol-text">{token.symbol}</div>
                            <div>
                              <AssetDropdown assetSymbol={token.symbol} assetInfo={token} />
                            </div>
                          </div>
                        </div>
                        <div className="App-card-divider"></div>
                        <div className="App-card-content">
                          <div className="App-card-row">
                            <div className="label">
                              <Trans>Price</Trans>
                            </div>
                            <div>${formatKeyAmount(tokenInfo, "minPrice", USD_DECIMALS, 2, true)}</div>
                          </div>
                          <div className="App-card-row">
                            <div className="label">
                              <Trans>Pool</Trans>
                            </div>
                            <div>
                              <TooltipComponent
                                handle={`$${formatKeyAmount(tokenInfo, "managedUsd", USD_DECIMALS, 0, true)}`}
                                position="right-bottom"
                                renderContent={() => {
                                  return (
                                    <>
                                      <StatsTooltipRow
                                        label={t`Pool Amount`}
                                        value={`${formatKeyAmount(
                                          tokenInfo,
                                          "managedAmount",
                                          token.decimals,
                                          0,
                                          true
                                        )} ${token.symbol}`}
                                        showDollar={false}
                                      />
                                      <StatsTooltipRow
                                        label={t`Target Min Amount`}
                                        value={`${formatKeyAmount(
                                          tokenInfo,
                                          "bufferAmount",
                                          token.decimals,
                                          0,
                                          true
                                        )} ${token.symbol}`}
                                        showDollar={false}
                                      />
                                      <StatsTooltipRow
                                        label={t`Max ${tokenInfo.symbol} Capacity`}
                                        value={formatAmount(maxUsdgAmount, 18, 0, true)}
                                      />
                                    </>
                                  );
                                }}
                              />
                            </div>
                          </div>
                          <div className="App-card-row">
                            <div className="label">
                              <Trans>Weight</Trans>
                            </div>
                            <div>{getWeightText(tokenInfo)}</div>
                          </div>
                          <div className="App-card-row">
                            <div className="label">
                              <Trans>Utilization</Trans>
                            </div>
                            <div>{formatAmount(utilization, 2, 2, false)}%</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            {getIsSyntheticsSupported(chainId) && <MarketsList />}
          </div>
        </div>
        <Footer />
      </div>
    </SEO>
  );
}
