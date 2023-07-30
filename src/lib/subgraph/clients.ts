import { createClient } from "./utils";
import { BASE, BASE_GOERLI, AVALANCHE, AVALANCHE_FUJI, ETH_MAINNET } from "config/chains";

export const chainlinkClient = createClient(ETH_MAINNET, "chainLink");

export const baseGraphClient = createClient(BASE, "stats");
export const baseReferralsGraphClient = createClient(BASE, "referrals");
export const baseGoerliReferralsGraphClient = createClient(BASE_GOERLI, "referrals");
export const nissohGraphClient = createClient(BASE, "nissohVault");

export const avalancheGraphClient = createClient(AVALANCHE, "stats");
export const avalancheReferralsGraphClient = createClient(AVALANCHE, "referrals");
export const avalancheFujiReferralsGraphClient = createClient(AVALANCHE_FUJI, "referrals");

export const avalancheFujiSyntheticsStatsClient = createClient(AVALANCHE_FUJI, "syntheticsStats");
export const baseGoerliSyntheticsStatsClient = createClient(BASE_GOERLI, "syntheticsStats");

export function getSyntheticsGraphClient(chainId: number) {
  if (chainId === AVALANCHE_FUJI) {
    return avalancheFujiSyntheticsStatsClient;
  }

  if (chainId === BASE_GOERLI) {
    return baseGoerliSyntheticsStatsClient;
  }

  return null;
}

export function getEddxGraphClient(chainId: number) {
  if (chainId === BASE) {
    return baseGraphClient;
  } else if (chainId === AVALANCHE) {
    return avalancheGraphClient;
  } else if (chainId === BASE_GOERLI) {
    return null;
  }

  throw new Error(`Unsupported chain ${chainId}`);
}

export function getReferralsGraphClient(chainId) {
  if (chainId === BASE) {
    return baseReferralsGraphClient;
  } else if (chainId === AVALANCHE) {
    return avalancheReferralsGraphClient;
  } else if (chainId === AVALANCHE_FUJI) {
    return avalancheFujiReferralsGraphClient;
  } else if (chainId === BASE_GOERLI) {
    return baseGoerliReferralsGraphClient;
  }
  throw new Error(`Unsupported chain ${chainId}`);
}
