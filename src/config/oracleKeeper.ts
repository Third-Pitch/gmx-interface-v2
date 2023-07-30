import { BASE, BASE_GOERLI, AVALANCHE, AVALANCHE_FUJI } from "./chains";
import queryString from "query-string";

const ORACLE_KEEPER_URLS = {
  [BASE]: "https://seashell-app-zdvwo.ondigitalocean.app",

  [AVALANCHE]: "https://seashell-app-zdvwo.ondigitalocean.app",

  [BASE_GOERLI]: "https://oracle-api-arb-goerli-xyguy.ondigitalocean.app",

  [AVALANCHE_FUJI]: "https://eddx-oracle-keeper-ro-avax-fuji-d4il9.ondigitalocean.app",

  default: "https://eddx-oracle-keeper-ro-avax-fuji-d4il9.ondigitalocean.app",
};

export function getOracleKeeperBaseUrl(chainId: number) {
  const url = ORACLE_KEEPER_URLS[chainId] || ORACLE_KEEPER_URLS.default;

  return url;
}

export function getOracleKeeperUrl(chainId: number, path: string, query?: any) {
  const qs = query ? `?${queryString.stringify(query)}` : "";

  return `${getOracleKeeperBaseUrl(chainId)}${path}${qs}`;
}
