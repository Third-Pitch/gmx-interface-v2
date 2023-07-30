import { BASE, AVALANCHE } from "config/chains";
import { BigNumber } from "ethers";

export type VolumeInfo = {
  totalVolume: BigNumber;
  [AVALANCHE]: { totalVolume: BigNumber };
  [BASE]: { totalVolume: BigNumber };
};

export type VolumeStat = {
  swap: string;
  margin: string;
  liquidation: string;
  mint: string;
  burn: string;
};
