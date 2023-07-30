import { BASE, BASE_GOERLI, AVALANCHE, AVALANCHE_FUJI } from "config/chains";
import base from "img/ic_base_24.svg";
import avalanche from "img/ic_avalanche_24.svg";
import avalancheTestnet from "img/ic_avalanche_testnet_24.svg";
import baseGoerli from "img/ic_base_goerli_24.svg";

import eddxIcon from "img/ic_eddx_40.svg";
import eddxOutlineIcon from "img/ic_eddxv1flat.svg";
import elpIcon from "img/ic_elp_40.svg";
import emIcon from "img/em_icon.svg";
import emBase from "img/ic_em_base.svg";
import emAvax from "img/ic_em_avax.svg";
import eddxBase from "img/ic_eddx_base.svg";
import eddxAvax from "img/ic_eddx_avax.svg";
import elpBase from "img/ic_elp_base.svg";
import elpAvax from "img/ic_elp_avax.svg";

const ICONS = {
  [BASE]: {
    network: base,
    eddx: eddxBase,
    elp: elpBase,
    em: emBase,
  },
  [AVALANCHE]: {
    network: avalanche,
    eddx: eddxAvax,
    elp: elpAvax,
    em: emAvax,
  },
  [BASE_GOERLI]: {
    network: baseGoerli,
    eddx: eddxBase,
    elp: elpBase,
    em: emBase,
  },
  [AVALANCHE_FUJI]: {
    network: avalancheTestnet,
    em: emAvax,
    eddx: eddxAvax,
    elp: elpAvax,
  },
  common: {
    eddx: eddxIcon,
    eddxOutline: eddxOutlineIcon,
    elp: elpIcon,
    em: emIcon,
  },
};

export function getIcon(chainId: number | "common", label: string) {
  if (chainId in ICONS) {
    if (label in ICONS[chainId]) {
      return ICONS[chainId][label];
    }
  }
}
export function getIcons(chainId: number | "common") {
  if (!chainId) return;
  if (chainId in ICONS) {
    return ICONS[chainId];
  }
}
