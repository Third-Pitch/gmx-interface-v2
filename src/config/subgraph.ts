import { BASE, BASE_GOERLI, AVALANCHE, AVALANCHE_FUJI, ETH_MAINNET } from "./chains";
import { isDevelopment } from "./env";
import { getSubgraphUrlKey } from "./localStorage";

const SUBGRAPH_URLS = {
  [BASE]: {
    stats: "https://api.studio.thegraph.com/query/45535/test-stats/version/latest",
    referrals: "https://api.studio.thegraph.com/query/45535/test-referrals/version/latest",
    // stats: "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-stats/api",
    // referrals: "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-base-referrals/api",
    nissohVault: "https://api.thegraph.com/subgraphs/name/nissoh/gmx-vault",
  },

  [BASE_GOERLI]: {
    stats: "https://api.thegraph.com/subgraphs/name/gmx-io/gmx-stats",
    referrals:
      "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-base-goerli-referrals/version/synts-stats-230624022207-71aabd6/api",
    syntheticsStats:
      "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/synthetics-goerli-stats/version/synts-stats-230624022250-71aabd6/api",
  },

  [AVALANCHE]: {
    stats: "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-avalanche-stats/api",
    referrals: "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-avalanche-referrals/api",
  },

  [AVALANCHE_FUJI]: {
    stats: "https://api.thegraph.com/subgraphs/name/gmx-io/gmx-avalanche-stats",
    referrals:
      "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-fuji-referrals/version/synts-stats-230624022118-71aabd6/api",
    syntheticsStats:
      "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/synthetics-fuji-stats/version/synts-stats-230624022232-71aabd6/api",
  },

  common: {
    [ETH_MAINNET]: {
      chainLink: "https://api.thegraph.com/subgraphs/name/deividask/chainlink",
    },
  },
};

export function getSubgraphUrl(chainId: number, subgraph: string) {
  if (isDevelopment()) {
    const localStorageKey = getSubgraphUrlKey(chainId, subgraph);
    const url = localStorage.getItem(localStorageKey);
    if (url) {
      // eslint-disable-next-line no-console
      console.warn("%s subgraph on chain %s url is overriden: %s", subgraph, chainId, url);
      return url;
    }
  }

  return SUBGRAPH_URLS?.[chainId]?.[subgraph];
}
