import { BASE_GOERLI, AVALANCHE_FUJI, BASE } from "./chains";
import { isDevelopment } from "./env";

export function getIsSyntheticsSupported(chainId: number) {
  if (isDevelopment()) {
    return [AVALANCHE_FUJI, BASE_GOERLI, BASE].includes(chainId);
  }

  return false;
}
