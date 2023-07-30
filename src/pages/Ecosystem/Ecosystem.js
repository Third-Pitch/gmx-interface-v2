import React from "react";
import { Trans } from "@lingui/macro";
import SEO from "components/Common/SEO";

import Footer from "components/Footer/Footer";
import { getPageTitle } from "lib/legacy";

import "./Ecosystem.css";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { BASE, AVALANCHE } from "config/chains";
import { t } from "@lingui/macro";
import { getIcon } from "config/icons";

const NETWORK_ICONS = {
  [BASE]: getIcon(BASE, "network"),
  [AVALANCHE]: getIcon(AVALANCHE, "network"),
};

const NETWORK_ICON_ALTS = {
  [BASE]: "Base Icon",
  [AVALANCHE]: "Avalanche Icon",
};

export default function Ecosystem() {
  const eddxPages = [
    {
      title: "EDDX Governance",
      link: "https://gov.eddx.io/",
      linkLabel: "gov.eddx.io",
      about: t`EDDX Governance Page`,
      chainIds: [BASE, AVALANCHE],
    },
    {
      title: "EDDX Stats",
      link: "https://stats.eddx.io/",
      linkLabel: "stats.eddx.io",
      about: t`EDDX Stats Page`,
      chainIds: [BASE, AVALANCHE],
    },
    {
      title: "EDDX Proposals",
      link: "https://snapshot.org/#/eddx.eth",
      linkLabel: "snapshot.org",
      about: t`EDDX Proposals Voting page`,
      chainIds: [BASE, AVALANCHE],
    },
    {
      title: "EDDX Announcements",
      link: "https://t.me/EDDX_Announcements",
      linkLabel: "t.me",
      about: t`EDDX Announcements and Updates`,
      chainIds: [BASE, AVALANCHE],
    },
  ];

  const communityProjects = [
    {
      title: "EDDX Blueberry Club",
      link: "https://www.blueberry.club/",
      linkLabel: "blueberry.club",
      about: t`EDDX Blueberry NFTs`,
      creatorLabel: "@xm92boi",
      creatorLink: "https://t.me/xm92boi",
      chainIds: [BASE],
    },
    {
      title: "EDDX Leaderboard",
      link: "https://www.eddx.house/",
      linkLabel: "eddx.house",
      about: t`Leaderboard for EDDX traders`,
      creatorLabel: "@Itburnz",
      creatorLink: "https://t.me/Itburnz",
      chainIds: [BASE, AVALANCHE],
    },
    {
      title: "EDDX Positions Bot",
      link: "https://t.me/EDDXPositions",
      linkLabel: "t.me",
      about: t`Telegram bot for EDDX position updates`,
      creatorLabel: "@zhongfu",
      creatorLink: "https://t.me/zhongfu",
      chainIds: [BASE, AVALANCHE],
    },
    {
      title: "Blueberry Pulse",
      link: "https://blueberrypulse.substack.com/",
      linkLabel: "substack.com",
      about: t`EDDX Weekly Updates`,
      creatorLabel: "@puroscohiba",
      creatorLink: "https://t.me/puroscohiba",
      chainIds: [BASE, AVALANCHE],
    },
    {
      title: "DegenClip",
      link: "https://degenclip.com/eddx",
      linkLabel: "degenclip.com",
      about: t`Community curated tweet collection`,
      creatorLabel: "@ox21l",
      creatorLink: "https://t.me/ox21l",
      chainIds: [BASE, AVALANCHE],
    },
    {
      title: "EDDX Yield Simulator",
      link: "https://eddx.defisims.com/",
      linkLabel: "defisims.com",
      about: t`Yield simulator for EDDX`,
      creatorLabel: "@kyzoeth",
      creatorLink: "https://twitter.com/kyzoeth",
      chainIds: [BASE, AVALANCHE],
    },
    {
      title: "EDDX Returns Calculator",
      link: "https://docs.google.com/spreadsheets/u/4/d/1mQZlztz_NpTg5qQiYIzc_Ls1OTLfMOUtmEQN-WW8jj4/copy",
      linkLabel: "docs.google.com",
      about: t`Returns calculator for EDDX and ELP`,
      creatorLabel: "@AStoicTrader1",
      creatorLink: "https://twitter.com/AStoicTrader1",
      chainIds: [BASE, AVALANCHE],
    },
    {
      title: "EDDX Trading Stats",
      link: "https://t.me/EDDXTradingStats",
      linkLabel: "t.me",
      about: t`Telegram bot for Open Interest on EDDX`,
      creatorLabel: "@SniperMonke01",
      creatorLink: "https://twitter.com/SniperMonke01",
      chainIds: [BASE, AVALANCHE],
    },
    {
      title: "EDDX Staking Bot",
      link: "https://t.me/EDDX_Staking_bot",
      linkLabel: "t.me",
      about: t`EDDX staking rewards updates and insights`,
      creatorLabel: "@EDDX_Staking_bot",
      creatorLink: "https://twitter.com/EDDX_Staking_bot",
      chainIds: [BASE, AVALANCHE],
    },
    {
      title: "EDDX Staking Calculator",
      link: "https://eddxstaking.com",
      linkLabel: "eddxstaking.com",
      about: t`EDDX staking calculator`,
      creatorLabel: "@n1njawtf",
      creatorLink: "https://t.me/n1njawtf",
      chainIds: [BASE, AVALANCHE],
    },
    {
      title: "EDDX Hedging Simulator",
      link: "https://www.eddxhedge.com/",
      linkLabel: "eddxhedge.com",
      about: t`Simulate your hedge strategy`,
      creatorLabel: "@kyzoeth",
      creatorLink: "https://twitter.com/kyzoeth",
      chainIds: [BASE],
    },
    {
      title: "EDDX Swaps",
      link: "https://t.me/EDDXSwaps",
      linkLabel: "t.me",
      about: t`Telegram bot for EDDX Swaps monitoring`,
      creatorLabel: "@snipermonke01",
      creatorLink: "https://twitter.com/snipermonke01",
      chainIds: [BASE, AVALANCHE],
    },
    {
      title: "EDDX Position Calculator",
      link: "https://docs.google.com/spreadsheets/d/1OKCeRGU7l-xGx33-siBw_l8x7vP97y4KKKjA2x5LqhQ/edit#gid=0",
      linkLabel: "docs.google.com",
      about: t`Spreadsheet for position calculations`,
      creatorLabel: "@barryfried1",
      creatorLink: "https://twitter.com/barryfried1",
      chainIds: [BASE, AVALANCHE],
    },
  ];

  const dashboardProjects = [
    {
      title: "EDDX Referrals Dashboard",
      link: "https://www.eddxreferrals.com/",
      linkLabel: "eddxreferrals.com",
      about: t`Dashboard for EDDX referral stats`,
      creatorLabel: "@kyzoeth",
      creatorLink: "https://twitter.com/kyzoeth",
      chainIds: [BASE, AVALANCHE],
    },
    {
      title: "EDDX Terminal",
      link: "https://eddxterminal.com",
      linkLabel: "eddxterminal.com",
      about: t`EDDX explorer for stats and traders`,
      creatorLabel: "@vipineth",
      creatorLink: "https://t.me/vipineth",
      chainIds: [BASE],
    },
    {
      title: "EDDX Analytics",
      link: "https://eddxstats.com/",
      linkLabel: "eddxstats.com",
      about: t`Financial reports and protocol analytics`,
      creatorLabel: "@CryptoMessiah",
      creatorLink: "https://t.me/LarpCapital",
      chainIds: [BASE, AVALANCHE],
    },
    {
      title: "TokenTerminal",
      link: "https://tokenterminal.com/terminal/projects/eddx",
      linkLabel: "tokenterminal.com",
      about: t`EDDX fundamentals`,
      creatorLabel: "@tokenterminal",
      creatorLink: "https://twitter.com/tokenterminal",
      chainIds: [BASE, AVALANCHE],
    },
    {
      title: "CryptoFees",
      link: "https://cryptofees.info",
      linkLabel: "cryptofees.info",
      about: t`Fees generated by EDDX`,
      creatorLabel: "@CryptoFeesInfo",
      creatorLink: "https://twitter.com/CryptoFeesInfo",
      chainIds: [BASE, AVALANCHE],
    },
    {
      title: "Shogun Dashboard (Dune Base)",
      link: "https://dune.com/shogun/eddx-analytics-base",
      linkLabel: "dune.com",
      about: t`Protocol analytics`,
      creatorLabel: "@JamesCliffyz",
      creatorLink: "https://twitter.com/JamesCliffyz",
      chainIds: [BASE],
    },
    {
      title: "Shogun Dashboard (Dune Avalanche)",
      link: "https://dune.com/shogun/eddx-analytics-avalanche",
      linkLabel: "dune.com",
      about: t`Protocol analytics`,
      creatorLabel: "@JamesCliffyz",
      creatorLink: "https://twitter.com/JamesCliffyz",
      chainIds: [AVALANCHE],
    },
    {
      title: "EDDX Perpetuals Data",
      link: "https://app.laevitas.ch/altsderivs/EDDX/perpetualswaps",
      linkLabel: "laevitas.ch",
      about: t`EDDX Perpetuals Data`,
      creatorLabel: "@laevitas1",
      creatorLink: "https://twitter.com/laevitas1",
      chainIds: [BASE],
    },
    {
      title: "EDDX Blueberry Leaderboard",
      link: "https://www.blueberryboard.com",
      linkLabel: "blueberryboard.com",
      about: t`GBC NFTs APR tracker and rewards`,
      creatorLabel: "@kyzoeth",
      creatorLink: "https://twitter.com/kyzoeth",
      chainIds: [BASE],
    },
    {
      title: "EDDX Open Trades Ranking and Stats",
      link: "https://dune.com/HanSolar/eddx-open-trade-ranking-and-stats",
      linkLabel: "dune.com",
      about: t`Open trades ranking and stats`,
      creatorLabel: "@hansolar21",
      creatorLink: "https://twitter.com/hansolar21",
      chainIds: [BASE, AVALANCHE],
    },
    {
      title: "EDDX Everything Dashboard",
      link: "https://dune.com/eddxtrader/eddx-dashboard-insights",
      linkLabel: "dune.com",
      about: t`Overall protocol analytics`,
      creatorLabel: "@eddxtrader",
      creatorLink: "https://twitter.com/eddxtrader",
      chainIds: [BASE, AVALANCHE],
    },
  ];

  const integrations = [
    {
      title: "DeBank",
      link: "debank.com",
      linkLabe: "debank.com",
      about: t`DeFi Portfolio Tracker`,
      announcementLabel: "twitter.com",
      announcementLink: "https://twitter.com/EDDX_IO/status/1439711532884152324",
      chainIds: [BASE, AVALANCHE],
    },
    {
      title: "Defi Llama",
      link: "https://defillama.com",
      linkLabel: "defillama.com",
      about: t`Decentralized Finance Dashboard`,
      announcementLabel: "twitter.com",
      announcementLink: "https://twitter.com/EDDX_IO/status/1438124768033660938",
      chainIds: [BASE, AVALANCHE],
    },
    {
      title: "Dopex",
      link: "https://dopex.io",
      linkLabel: "dopex.io",
      about: t`Decentralized Options Protocol`,
      announcementLabel: "twitter.com",
      announcementLink: "https://twitter.com/EDDX_IO/status/1482445801523716099",
      chainIds: [BASE, AVALANCHE],
    },
    {
      title: "Rook",
      link: "https://www.rook.fi/",
      linkLabel: "rook.fi",
      about: t`MEV Optimizer`,
      announcementLabel: "twitter.com",
      announcementLink: "https://twitter.com/Rook/status/1509613786600116251",
      chainIds: [BASE, AVALANCHE],
    },
    {
      title: "Jones DAO",
      link: "https://jonesdao.io",
      linkLabel: "jonesdao.io",
      about: t`Decentralized Options Strategies`,
      announcementLabel: "twitter.com",
      announcementLink: "https://twitter.com/EDDX_IO/status/1482788805635678212",
      chainIds: [BASE],
    },
    {
      title: "Yield Yak Optimizer",
      link: "https://yieldyak.com/",
      linkLabel: "yieldyak.com",
      about: t`Yield Optimizer on Avalanche`,
      announcementLabel: "twitter.com",
      announcementLink: "https://twitter.com/EDDX_IO/status/1484601407378378754",
      chainIds: [AVALANCHE],
    },
    {
      title: "Vovo Finance",
      link: "https://vovo.finance/",
      linkLabel: "vovo.finance",
      about: t`Structured Products`,
      announcementLabel: "twitter.com",
      announcementLink: "https://twitter.com/VovoFinance/status/1531517177790345217",
      chainIds: [BASE],
    },
    {
      title: "Stabilize Protocol",
      link: "https://www.stabilize.finance/",
      linkLabel: "stabilize.finance",
      about: t`Yield Vaults`,
      announcementLabel: "twitter.com",
      announcementLink: "https://twitter.com/StabilizePro/status/1532348674986082306",
      chainIds: [BASE],
    },
    {
      title: "DODO",
      link: "https://dodoex.io/",
      linkLabel: "dodoex.io",
      about: t`Decentralized Trading Protocol`,
      announcementLabel: "twitter.com",
      announcementLink: "https://twitter.com/EDDX_IO/status/1438899138549145605",
      chainIds: [BASE, AVALANCHE],
    },
    {
      title: "Open Ocean",
      link: "https://openocean.finance/",
      linkLabel: "openocean.finance",
      about: t`DEX Aggregator`,
      announcementLabel: "twitter.com",
      announcementLink: "https://twitter.com/EDDX_IO/status/1495780826016989191",
      chainIds: [BASE, AVALANCHE],
    },
    {
      title: "Paraswap",
      link: "https://www.paraswap.io/",
      linkLabel: "paraswap.io",
      about: t`DEX Aggregator`,
      announcementLabel: "twitter.com",
      announcementLink: "https://twitter.com/paraswap/status/1546869879336222728",
      chainIds: [BASE, AVALANCHE],
    },
    {
      title: "1inch",
      link: "https://1inch.io/",
      linkLabel: "1inch.io",
      about: t`DEX Aggregator`,
      announcementLabel: "twitter.com",
      announcementLink: "https://twitter.com/EDDX_IO/status/1522247451410845696",
      chainIds: [BASE, AVALANCHE],
    },
    {
      title: "Firebird Finance",
      link: "https://app.firebird.finance/swap",
      linkLabel: "firebird.finance",
      about: t`DEX Aggregator`,
      announcementLabel: "twitter.com",
      announcementLink: "https://twitter.com/financefirebird/status/1561767094064238595",
      chainIds: [AVALANCHE],
    },
    {
      title: "Yield Yak Swap",
      link: "https://yieldyak.com/swap",
      linkLabel: "yieldyak.com",
      about: t`DEX Aggregator`,
      announcementLabel: "twitter.com",
      announcementLink: "https://twitter.com/yieldyak_/status/1484458884827947008",
      chainIds: [AVALANCHE],
    },
    {
      title: "Plutus",
      link: "https://plutusdao.io/vaults",
      linkLabel: "plutusdao.io",
      about: t`ELP autocompounding vaults`,
      announcementLabel: "medium.com",
      announcementLink: "https://medium.com/@plutusdao.io/product-release-plutus-vaults-d0b0252cdf03",
      chainIds: [BASE],
    },
    {
      title: "Beefy.com",
      link: "https://app.beefy.com/",
      linkLabel: "beefy.com",
      about: t`ELP and EDDX autocompounding vaults`,
      announcementLabel: "beefy.com",
      announcementLink: "https://beefy.com/articles/earn-elp-with-beefy-s-new-elp-strategy-and-vaults/",
      chainIds: [BASE, AVALANCHE],
    },
  ];

  const telegramGroups = [
    {
      title: "EDDX",
      link: "https://t.me/EDDX_IO",
      linkLabel: "t.me",
      about: t`Telegram Group`,
    },
    {
      title: "EDDX (Chinese)",
      link: "https://t.me/eddxch",
      linkLabel: "t.me",
      about: t`Telegram Group (Chinese)`,
    },
    {
      title: "EDDX (Portuguese)",
      link: "https://t.me/EDDX_Portuguese",
      linkLabel: "t.me",
      about: t`Telegram Group (Portuguese)`,
    },
    {
      title: "EDDX Trading Chat",
      link: "https://t.me/gambittradingchat",
      linkLabel: "t.me",
      about: t`EDDX community discussion`,
    },
  ];

  return (
    <SEO title={getPageTitle(t`Ecosystem Projects`)}>
      <div className="default-container page-layout">
        <div>
          <div className="section-title-block">
            <div className="section-title-icon" />
            <div className="section-title-content">
              <div className="Page-title">
                <Trans>EDDX Pages</Trans>
              </div>
              <div className="Page-description">
                <Trans>EDDX ecosystem pages.</Trans>
              </div>
            </div>
          </div>
          <div className="DashboardV2-projects">
            {eddxPages.map((item) => {
              const linkLabel = item.linkLabel ? item.linkLabel : item.link;
              return (
                <div className="App-card" key={item.title}>
                  <div className="App-card-title">
                    {item.title}
                    <div className="App-card-title-icon">
                      {item.chainIds.map((network) => (
                        <img width="16" key={network} src={NETWORK_ICONS[network]} alt={NETWORK_ICON_ALTS[network]} />
                      ))}
                    </div>
                  </div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Link</Trans>
                      </div>
                      <div>
                        <ExternalLink href={item.link}>{linkLabel}</ExternalLink>
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>About</Trans>
                      </div>
                      <div>{item.about}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="Tab-title-section">
            <div className="Page-title">
              <Trans>Community Projects</Trans>
            </div>
            <div className="Page-description">
              <Trans>
                Projects developed by the EDDX community. <br />
                Please exercise caution when interacting with any app, apps are fully maintained by community
                developers.
              </Trans>
            </div>
          </div>
          <div className="DashboardV2-projects">
            {communityProjects.map((item) => {
              const linkLabel = item.linkLabel ? item.linkLabel : item.link;
              return (
                <div className="App-card" key={item.title}>
                  <div className="App-card-title">
                    {item.title}
                    <div className="App-card-title-icon">
                      {item.chainIds.map((network) => (
                        <img width="16" key={network} src={NETWORK_ICONS[network]} alt={NETWORK_ICON_ALTS[network]} />
                      ))}
                    </div>
                  </div>
                  <div className="App-card-divider" />
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Link</Trans>
                      </div>
                      <div>
                        <ExternalLink href={item.link}>{linkLabel}</ExternalLink>
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>About</Trans>
                      </div>
                      <div>{item.about}</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Creator</Trans>
                      </div>
                      <div>
                        <ExternalLink href={item.creatorLink}>{item.creatorLabel}</ExternalLink>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="Tab-title-section">
            <div className="Page-title">
              <Trans>Dashboards</Trans>
            </div>
            <div className="Page-description">
              <Trans>EDDX dashboards and analytics.</Trans>
            </div>
          </div>
          <div className="DashboardV2-projects">
            {dashboardProjects.map((item) => {
              const linkLabel = item.linkLabel ? item.linkLabel : item.link;
              return (
                <div className="App-card" key={item.title}>
                  <div className="App-card-title">
                    {item.title}
                    <div className="App-card-title-icon">
                      {item.chainIds.map((network) => (
                        <img width="16" key={network} src={NETWORK_ICONS[network]} alt={NETWORK_ICON_ALTS[network]} />
                      ))}
                    </div>
                  </div>

                  <div className="App-card-divider"></div>
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Link</Trans>
                      </div>
                      <div>
                        <ExternalLink href={item.link}>{linkLabel}</ExternalLink>
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>About</Trans>
                      </div>
                      <div>{item.about}</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Creator</Trans>
                      </div>
                      <div>
                        <ExternalLink href={item.creatorLink}>{item.creatorLabel}</ExternalLink>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="Tab-title-section">
            <div className="Page-title">
              <Trans>Partnerships and Integrations</Trans>
            </div>
            <div className="Page-description">
              <Trans>Projects integrated with EDDX.</Trans>
            </div>
          </div>
          <div className="DashboardV2-projects">
            {integrations.map((item) => {
              const linkLabel = item.linkLabel ? item.linkLabel : item.link;
              return (
                <div key={item.title} className="App-card">
                  <div className="App-card-title">
                    {item.title}
                    <div className="App-card-title-icon">
                      {item.chainIds.map((network) => (
                        <img width="16" key={network} src={NETWORK_ICONS[network]} alt={NETWORK_ICON_ALTS[network]} />
                      ))}
                    </div>
                  </div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Link</Trans>
                      </div>
                      <div>
                        <ExternalLink href={item.link}>{linkLabel}</ExternalLink>
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>About</Trans>
                      </div>
                      <div>{item.about}</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Announcement</Trans>
                      </div>
                      <div>
                        <ExternalLink href={item.announcementLink}>{item.announcementLabel}</ExternalLink>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="Tab-title-section">
            <div className="Page-title">
              <Trans>Telegram Groups</Trans>
            </div>
            <div className="Page-description">
              <Trans>Community-led Telegram groups.</Trans>
            </div>
          </div>
          <div className="DashboardV2-projects">
            {telegramGroups.map((item) => {
              const linkLabel = item.linkLabel ? item.linkLabel : item.link;
              return (
                <div className="App-card" key={item.title}>
                  <div className="App-card-title">{item.title}</div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Link</Trans>
                      </div>
                      <div>
                        <ExternalLink href={item.link}>{linkLabel}</ExternalLink>
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>About</Trans>
                      </div>
                      <div>{item.about}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <Footer />
      </div>
    </SEO>
  );
}
