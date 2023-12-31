import { ethers } from "ethers";
import { getContract } from "./contracts";
import { BASE, BASE_GOERLI, AVALANCHE, AVALANCHE_FUJI, MAINNET, TESTNET } from "./chains";
import { Token } from "domain/tokens";

export const NATIVE_TOKEN_ADDRESS = ethers.constants.AddressZero;

export const TOKENS: { [chainId: number]: Token[] } = {
  [MAINNET]: [
    {
      name: "Bitcoin (BTCB)",
      symbol: "BTC",
      decimals: 18,
      address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
      coingeckoUrl: "https://www.coingecko.com/en/coins/binance-bitcoin",
      imageUrl: "https://assets.coingecko.com/coins/images/14108/small/Binance-bitcoin.png",
    },
    {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
      coingeckoUrl: "https://www.coingecko.com/en/coins/ethereum",
      imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
    },
    {
      name: "Binance Coin",
      symbol: "BNB",
      decimals: 18,
      address: ethers.constants.AddressZero,
      coingeckoUrl: "https://www.coingecko.com/en/coins/binance-coin",
      imageUrl: "https://assets.coingecko.com/coins/images/825/small/binance-coin-logo.png",
      isNative: true,
    },
    {
      name: "Wrapped Binance Coin",
      symbol: "WBNB",
      decimals: 18,
      address: getContract(MAINNET, "NATIVE_TOKEN"),
      isWrapped: true,
      coingeckoUrl: "https://www.coingecko.com/en/coins/binance-coin",
      imageUrl: "https://assets.coingecko.com/coins/images/825/small/binance-coin-logo.png",
      baseSymbol: "BNB",
    },
    {
      name: "USD Gambit",
      symbol: "USDG",
      decimals: 18,
      address: getContract(MAINNET, "USDG"),
      isUsdg: true,
      coingeckoUrl: "https://www.coingecko.com/en/coins/usd-gambit",
      imageUrl: "https://assets.coingecko.com/coins/images/15886/small/usdg-02.png",
    },
    {
      name: "Binance USD",
      symbol: "BUSD",
      decimals: 18,
      address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
      isStable: true,
      coingeckoUrl: "https://www.coingecko.com/en/coins/binance-usd",
      imageUrl: "https://assets.coingecko.com/coins/images/9576/small/BUSD.png",
    },
    {
      name: "USD Coin",
      symbol: "USDC",
      decimals: 18,
      address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      isStable: true,
      coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
      imageUrl: "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png",
    },
    {
      name: "Tether",
      symbol: "USDT",
      decimals: 18,
      address: "0x55d398326f99059fF775485246999027B3197955",
      isStable: true,
      coingeckoUrl: "https://www.coingecko.com/en/coins/tether",
      imageUrl: "https://assets.coingecko.com/coins/images/325/small/Tether-logo.png",
    },
  ],
  [TESTNET]: [
    {
      name: "Bitcoin (BTCB)",
      symbol: "BTC",
      decimals: 8,
      address: "0xb19C12715134bee7c4b1Ca593ee9E430dABe7b56",
      imageUrl: "https://assets.coingecko.com/coins/images/26115/thumb/btcb.png?1655921693",
    },
    {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      address: "0x1958f7C067226c7C8Ac310Dc994D0cebAbfb2B02",
      imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
    },
    {
      name: "Binance Coin",
      symbol: "BNB",
      decimals: 18,
      address: ethers.constants.AddressZero,
      isNative: true,
      imageUrl: "https://assets.coingecko.com/coins/images/825/small/binance-coin-logo.png",
    },
    {
      name: "Wrapped Binance Coin",
      symbol: "WBNB",
      decimals: 18,
      address: "0x612777Eea37a44F7a95E3B101C39e1E2695fa6C2",
      isWrapped: true,
      baseSymbol: "BNB",
      imageUrl: "https://assets.coingecko.com/coins/images/825/small/binance-coin-logo.png",
    },
    {
      name: "USD Gambit",
      symbol: "USDG",
      decimals: 18,
      address: getContract(TESTNET, "USDG"),
      isUsdg: true,
      imageUrl: "https://assets.coingecko.com/coins/images/15886/small/usdg-02.png",
    },
    {
      name: "Binance USD",
      symbol: "BUSD",
      decimals: 18,
      address: "0x3F223C4E5ac67099CB695834b20cCd5E5D5AA9Ef",
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/9576/small/BUSD.png",
    },
  ],
  [BASE]: [
    {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      address: ethers.constants.AddressZero,
      isNative: true,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
    },
    {
      name: "Wrapped Ethereum",
      symbol: "WETH",
      decimals: 18,
      address: "0x4200000000000000000000000000000000000006",
      isWrapped: true,
      baseSymbol: "ETH",
      imageUrl: "https://assets.coingecko.com/coins/images/2518/thumb/weth.png?1628852295",
    },
    {
      name: "Bitcoin (WBTC)",
      symbol: "BTC",
      decimals: 18,
      address: "0x1AcF131de5Bbc72aE96eE5EC7b59dA2f38b19DBd",
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/7598/thumb/wrapped_bitcoin_wbtc.png?1548822744",
    },
    {
      name: "Chainlink",
      symbol: "LINK",
      decimals: 18,
      address: "0x63bA205dA17003AB46CE0dd78bE8ba8EE3952e5F",
      isStable: false,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/877/thumb/chainlink-new-logo.png?1547034700",
    },
    {
      name: "USD Coin",
      symbol: "USDC",
      decimals: 18,
      address: "0xEcb03BBCF83E863B9053A926932DbB07D837eBbE",
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    },
    {
      name: "Tether",
      symbol: "USDT",
      decimals: 18,
      address: "0x8654F060EB1e5533C259cDcBBe39834Bb8141cF4",
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/325/thumb/Tether-logo.png?1598003707",
    },
    {
      name: "Dai",
      symbol: "DAI",
      decimals: 18,
      address: "0xFE9cdCC77fb826B380D49F53c8cE298B600cB7F0",
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/9956/thumb/4943.png?1636636734",
    },
  ],
  [AVALANCHE]: [
    {
      name: "Avalanche",
      symbol: "AVAX",
      decimals: 18,
      address: ethers.constants.AddressZero,
      isNative: true,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png?1604021818",
    },
    {
      name: "Wrapped AVAX",
      symbol: "WAVAX",
      decimals: 18,
      address: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
      isWrapped: true,
      baseSymbol: "AVAX",
      imageUrl: "https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png?1604021818",
    },
    {
      name: "Ethereum (WETH.e)",
      symbol: "ETH",
      address: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB",
      decimals: 18,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
    },
    {
      name: "Bitcoin (BTC.b)",
      symbol: "BTC",
      address: "0x152b9d0FdC40C096757F570A51E494bd4b943E50",
      decimals: 8,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/26115/thumb/btcb.png?1655921693",
    },
    {
      name: "Bitcoin (WBTC.e)",
      symbol: "WBTC",
      address: "0x50b7545627a5162F82A992c33b87aDc75187B218",
      decimals: 8,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/7598/thumb/wrapped_bitcoin_wbtc.png?1548822744",
    },
    {
      name: "USD Coin",
      symbol: "USDC",
      address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
      decimals: 6,
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    },
    {
      name: "USD Coin (USDC.e)",
      symbol: "USDC.e",
      address: "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664",
      decimals: 6,
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    },
    {
      name: "Magic Internet Money",
      symbol: "MIM",
      address: "0x130966628846BFd36ff31a822705796e8cb8C18D",
      decimals: 18,
      isStable: true,
      isTempHidden: true,
      imageUrl: "https://assets.coingecko.com/coins/images/16786/small/mimlogopng.png",
    },
  ],
  [BASE_GOERLI]: [
    {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      address: ethers.constants.AddressZero,
      isNative: true,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
    },
    {
      name: "Wrapped Ethereum",
      symbol: "WETH",
      decimals: 18,
      address: "0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3",
      isWrapped: true,
      baseSymbol: "ETH",
      imageUrl: "https://assets.coingecko.com/coins/images/2518/thumb/weth.png?1628852295",
    },
    {
      name: "Bitcoin",
      symbol: "BTC",
      decimals: 8,
      address: "0xCcF73F4Dcbbb573296BFA656b754Fe94BB957d62",
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/7598/thumb/wrapped_bitcoin_wbtc.png?1548822744",
    },
    {
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      address: "0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5",
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    },
    {
      name: "Tether",
      symbol: "USDT",
      decimals: 6,
      address: "0xBFcBcdCbcc1b765843dCe4DF044B92FE68182a62",
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/325/small/Tether-logo.png",
    },
    {
      name: "Dai",
      symbol: "DAI",
      address: "0x7b7c6c49fA99b37270077FBFA398748c27046984",
      decimals: 18,
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/9956/thumb/4943.png?1636636734",
    },
  ],
  [AVALANCHE_FUJI]: [
    {
      name: "Avalanche",
      symbol: "AVAX",
      decimals: 18,
      address: ethers.constants.AddressZero,
      isNative: true,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png?1604021818",
    },
    {
      name: "Wrapped AVAX",
      symbol: "WAVAX",
      decimals: 18,
      address: "0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3",
      isWrapped: true,
      baseSymbol: "AVAX",
      imageUrl: "https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png?1604021818",
    },
    {
      name: "Ethereum (WETH.e)",
      symbol: "ETH",
      address: "0x82F0b3695Ed2324e55bbD9A9554cB4192EC3a514",
      decimals: 18,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
    },
    {
      name: "USD Coin",
      symbol: "USDC",
      address: "0x3eBDeaA0DB3FfDe96E7a0DBBAFEC961FC50F725F",
      decimals: 6,
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    },
    {
      name: "Tether",
      symbol: "USDT",
      decimals: 6,
      address: "0x50df4892Bd13f01E4e1Cd077ff394A8fa1A3fD7c",
      isStable: true,
      coingeckoUrl: "https://www.coingecko.com/en/coins/dai",
      imageUrl: "https://assets.coingecko.com/coins/images/325/small/Tether-logo.png",
    },
    {
      name: "Dai",
      symbol: "DAI",
      address: "0x51290cb93bE5062A6497f16D9cd3376Adf54F920",
      decimals: 6,
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/9956/thumb/4943.png?1636636734",
    },
    {
      name: "Bitcoin",
      symbol: "BTC",
      address: "0x3Bd8e00c25B12E6E60fc8B6f1E1E2236102073Ca",
      decimals: 8,
    },
  ],
};

export const ADDITIONAL_TOKENS: { [chainId: number]: Token[] } = {
  [BASE]: [
    {
      name: "EDDX",
      symbol: "EDDX",
      address: getContract(BASE, "EDDX"),
      decimals: 18,
      imageUrl: "https://assets.coingecko.com/coins/images/18323/small/arbit.png?1631532468",
    },
    {
      name: "Escrowed EDDX",
      symbol: "esEDDX",
      address: getContract(BASE, "ES_EDDX"),
      decimals: 18,
    },
    {
      name: "EDDX LP",
      symbol: "ELP",
      address: getContract(BASE, "ELP"),
      decimals: 18,
      imageUrl: "https://github.com/eddx-io/eddx-assets/blob/main/EDDX-Assets/PNG/ELP_LOGO%20ONLY.png?raw=true",
    },
    {
      name: "EDDX Market tokens",
      symbol: "EM",
      address: "<market-token-address>",
      decimals: 18,
      imageUrl: "https://github.com/eddx-io/eddx-assets/blob/main/EDDX-Assets/PNG/ELP_LOGO%20ONLY.png?raw=true",
    },
  ],
  [AVALANCHE]: [
    {
      name: "EDDX",
      symbol: "EDDX",
      address: getContract(AVALANCHE, "EDDX"),
      decimals: 18,
      imageUrl: "https://assets.coingecko.com/coins/images/18323/small/arbit.png?1631532468",
    },
    {
      name: "Escrowed EDDX",
      symbol: "esEDDX",
      address: getContract(AVALANCHE, "ES_EDDX"),
      decimals: 18,
    },
    {
      name: "EDDX LP",
      symbol: "ELP",
      address: getContract(BASE, "ELP"),
      decimals: 18,
      imageUrl: "https://github.com/eddx-io/eddx-assets/blob/main/EDDX-Assets/PNG/ELP_LOGO%20ONLY.png?raw=true",
    },
    {
      name: "EDDX Market tokens",
      symbol: "EM",
      address: "<market-token-address>",
      decimals: 18,
      imageUrl: "https://github.com/eddx-io/eddx-assets/blob/main/EDDX-Assets/PNG/ELP_LOGO%20ONLY.png?raw=true",
    },
  ],
  [BASE_GOERLI]: [
    {
      name: "EDDX",
      symbol: "EDDX",
      address: getContract(BASE, "EDDX"),
      decimals: 18,
      imageUrl: "https://assets.coingecko.com/coins/images/18323/small/arbit.png?1631532468",
    },
    {
      name: "Escrowed EDDX",
      symbol: "esEDDX",
      address: getContract(BASE, "ES_EDDX"),
      decimals: 18,
    },
    {
      name: "EDDX LP",
      symbol: "ELP",
      address: getContract(BASE, "ELP"),
      decimals: 18,
      imageUrl: "https://github.com/eddx-io/eddx-assets/blob/main/EDDX-Assets/PNG/ELP_LOGO%20ONLY.png?raw=true",
    },
    {
      name: "EDDX Market tokens",
      symbol: "EM",
      address: "<market-token-address>",
      decimals: 18,
      imageUrl: "https://github.com/eddx-io/eddx-assets/blob/main/EDDX-Assets/PNG/ELP_LOGO%20ONLY.png?raw=true",
    },
  ],
  [AVALANCHE_FUJI]: [
    {
      name: "EDDX",
      symbol: "EDDX",
      address: getContract(AVALANCHE, "EDDX"),
      decimals: 18,
      imageUrl: "https://assets.coingecko.com/coins/images/18323/small/arbit.png?1631532468",
    },
    {
      name: "Escrowed EDDX",
      symbol: "esEDDX",
      address: getContract(AVALANCHE, "ES_EDDX"),
      decimals: 18,
    },
    {
      name: "EDDX LP",
      symbol: "ELP",
      address: getContract(BASE, "ELP"),
      decimals: 18,
      imageUrl: "https://github.com/eddx-io/eddx-assets/blob/main/EDDX-Assets/PNG/ELP_LOGO%20ONLY.png?raw=true",
    },
    {
      name: "EDDX Market tokens",
      symbol: "EM",
      address: "<market-token-address>",
      decimals: 18,
      imageUrl: "https://github.com/eddx-io/eddx-assets/blob/main/EDDX-Assets/PNG/ELP_LOGO%20ONLY.png?raw=true",
    },
  ],
};

const AVAILABLE_CHART_TOKENS = {
  [BASE]: ["ETH", "BTC", "LINK", "UNI"],
  [AVALANCHE]: ["AVAX", "ETH", "BTC"],
  [BASE_GOERLI]: ["ETH", "BTC", "SOL", "TEST", "DOGE", "LINK", "BNB", "DOT", "UNI", "ADA", "TRX", "MATIC"],
  [AVALANCHE_FUJI]: ["AVAX", "ETH", "BTC", "SOL", "TEST", "DOGE", "LINK", "BNB", "DOT", "UNI", "ADA", "TRX", "MATIC"],
};

export const SYNTHETIC_TOKENS = {
  [AVALANCHE]: [],
  [BASE]: [],
  [BASE_GOERLI]: [
    {
      name: "Solana",
      symbol: "SOL",
      decimals: 18,
      address: "0x9A98a11279FaeB0fF695dFEC3C4B8a29138d0a2f",
      isSynthetic: true,
      imageUrl: "https://assets.coingecko.com/coins/images/4128/small/solana.png?1640133422",
    },
    {
      name: "Test token",
      symbol: "TEST",
      decimals: 18,
      address: "0x13C52ccB49fE3228356D0C355641961646A0D9B2",
      isSynthetic: true,
      coingeckoUrl: "https://www.coingecko.com/en/coins/tether",
    },
    {
      name: "BNB",
      symbol: "BNB",
      isSynthetic: true,
      decimals: 18,
      address: "0xa076E6db62f61bd1A4fC283F84739D2b0c80e2a3",
    },
    {
      name: "Cardano",
      symbol: "ADA",
      isSynthetic: true,
      decimals: 18,
      priceDecimals: 4,
      address: "0x5F8a8f06da2848f846A2b5e3e42A4A2eEC5f337B",
    },
    {
      name: "TRON",
      symbol: "TRX",
      isSynthetic: true,
      decimals: 18,
      priceDecimals: 4,
      address: "0x7a9Ba06548D0499f6Debf97809CC351c1e85795D",
    },
    {
      name: "Polygon",
      symbol: "MATIC",
      isSynthetic: true,
      decimals: 18,
      priceDecimals: 4,
      address: "0xd98D28787F5598749331052f952196428F61e3aD",
    },
    {
      name: "Polkadot",
      symbol: "DOT",
      isSynthetic: true,
      decimals: 18,
      address: "0x7361D58cBc6495B6419397dFd5ebE2e2017F23E9",
    },
    {
      name: "Uniswap",
      symbol: "UNI",
      isSynthetic: true,
      decimals: 18,
      address: "0x6DEbb9cC48819941F797a2F0c63f9168C19fD057",
    },
    {
      name: "Dogecoin",
      symbol: "DOGE",
      isSynthetic: true,
      isShortable: true,
      decimals: 8,
      address: "0x3e2fA75b78edF836299127FBAA776304B4712972",
      priceDecimals: 4,
    },
    {
      name: "Chainlink",
      symbol: "LINK",
      isSynthetic: true,
      isShortable: true,
      decimals: 18,
      address: "0x55602A94239a7926D92da5C53Fb96E80372382aa",
    },
  ],
  [AVALANCHE_FUJI]: [
    {
      name: "Solana",
      symbol: "SOL",
      decimals: 18,
      address: "0x137f4a7336df4f3f11894718528516edaaD0B082",
      isSynthetic: true,
      imageUrl: "https://assets.coingecko.com/coins/images/4128/small/solana.png?1640133422",
    },
    {
      name: "Test token",
      symbol: "TEST",
      decimals: 18,
      address: "0x42DD131E1086FFCc59bAE9498D71E20E0C889B14",
      isSynthetic: true,
      coingeckoUrl: "https://www.coingecko.com/en/coins/tether",
    },
    {
      name: "BNB",
      symbol: "BNB",
      isSynthetic: true,
      decimals: 18,
      address: "0x110892Dd5fa73bE430c0ade694febD9a4CAc68Be",
    },
    {
      name: "Cardano",
      symbol: "ADA",
      isSynthetic: true,
      decimals: 18,
      priceDecimals: 4,
      address: "0xE64dfFF37Fa6Fe969b792B4146cEe2774Ef6e1a1",
    },
    {
      name: "TRON",
      symbol: "TRX",
      isSynthetic: true,
      decimals: 18,
      priceDecimals: 4,
      address: "0x0D1495527C255068F2f6feE31C85d326D0A76FE8",
    },
    {
      name: "Polygon",
      symbol: "MATIC",
      isSynthetic: true,
      decimals: 18,
      priceDecimals: 4,
      address: "0xadc4698B257F78187Fd675FBf591a09f4c975240",
    },
    {
      name: "Polkadot",
      symbol: "DOT",
      isSynthetic: true,
      decimals: 18,
      address: "0x65FFb5664a7B3377A5a27D9e59C72Fb1A5E94962",
    },
    {
      name: "Uniswap",
      symbol: "UNI",
      isSynthetic: true,
      decimals: 18,
      address: "0xF62dC1d2452d0893735D22945Af53C290b158eAF",
    },
    {
      name: "Dogecoin",
      symbol: "DOGE",
      isSynthetic: true,
      isShortable: true,
      decimals: 8,
      address: "0x2265F317eA5f47A684E5B26c50948617c945d986",
      priceDecimals: 4,
    },
    {
      name: "Chainlink",
      symbol: "LINK",
      isSynthetic: true,
      isShortable: true,
      decimals: 18,
      address: "0x6BD09E8D65AD5cc761DF62454452d4EC1545e647",
    },
  ],
};

export const PLATFORM_TOKENS: { [chainId: number]: { [symbol: string]: Token } } = {
  [BASE]: {
    // base
    EDDX: {
      name: "EDDX",
      symbol: "EDDX",
      decimals: 18,
      address: getContract(BASE, "EDDX"),
      imageUrl: "https://assets.coingecko.com/coins/images/18323/small/arbit.png?1631532468",
    },
    ELP: {
      name: "EDDX LP",
      symbol: "ELP",
      decimals: 18,
      address: getContract(BASE, "StakedElpTracker"), // address of fsELP token because user only holds fsELP
      imageUrl: "https://github.com/eddx-io/eddx-assets/blob/main/EDDX-Assets/PNG/ELP_LOGO%20ONLY.png?raw=true",
    },
  },
  [AVALANCHE]: {
    // avalanche
    EDDX: {
      name: "EDDX",
      symbol: "EDDX",
      decimals: 18,
      address: getContract(AVALANCHE, "EDDX"),
      imageUrl: "https://assets.coingecko.com/coins/images/18323/small/arbit.png?1631532468",
    },
    ELP: {
      name: "EDDX LP",
      symbol: "ELP",
      decimals: 18,
      address: getContract(AVALANCHE, "StakedElpTracker"), // address of fsELP token because user only holds fsELP
      imageUrl: "https://github.com/eddx-io/eddx-assets/blob/main/EDDX-Assets/PNG/ELP_LOGO%20ONLY.png?raw=true",
    },
  },
};

export const EXPLORER_LINKS = {
  [BASE]: {
    EDDX: {
      coingecko: "https://www.coingecko.com/en/coins/eddx",
      base: "https://arbiscan.io/address/0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a",
    },
    ELP: {
      base: "https://arbiscan.io/token/0x1aDDD80E6039594eE970E5872D247bf0414C8903",
      reserves: "https://portfolio.nansen.ai/dashboard/eddx?chain=BASE",
    },
    ETH: {
      coingecko: "https://www.coingecko.com/en/coins/ethereum",
    },
    BTC: {
      coingecko: "https://www.coingecko.com/en/coins/wrapped-bitcoin",
      base: "https://arbiscan.io/address/0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f",
    },
    LINK: {
      coingecko: "https://www.coingecko.com/en/coins/chainlink",
      base: "https://arbiscan.io/address/0xf97f4df75117a78c1a5a0dbb814af92458539fb4",
    },
    UNI: {
      coingecko: "https://www.coingecko.com/en/coins/uniswap",
      base: "https://arbiscan.io/address/0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0",
    },
    USDC: {
      coingecko: "https://www.coingecko.com/en/coins/usd-coin",
      base: "https://arbiscan.io/address/0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
    },
    "USDC.e": {
      coingecko: "https://www.coingecko.com/en/coins/usd-coin",
      base: "https://arbiscan.io/address/0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
    },
    USDT: {
      coingecko: "https://www.coingecko.com/en/coins/tether",
      base: "https://arbiscan.io/address/0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
    },
    DAI: {
      coingecko: "https://www.coingecko.com/en/coins/dai",
      base: "https://arbiscan.io/address/0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
    },
    MIM: {
      coingecko: "https://www.coingecko.com/en/coins/magic-internet-money",
      base: "https://arbiscan.io/address/0xfea7a6a0b346362bf88a9e4a88416b77a57d6c2a",
    },
    FRAX: {
      coingecko: "https://www.coingecko.com/en/coins/frax",
      base: "https://arbiscan.io/address/0x17fc002b466eec40dae837fc4be5c67993ddbd6f",
    },
  },
  [AVALANCHE]: {
    EDDX: {
      coingecko: "https://www.coingecko.com/en/coins/eddx",
      avalanche: "https://snowtrace.io/address/0x62edc0692bd897d2295872a9ffcac5425011c661",
    },
    ELP: {
      avalanche: "https://snowtrace.io/address/0x9e295B5B976a184B14aD8cd72413aD846C299660",
      reserves: "https://portfolio.nansen.ai/dashboard/eddx?chain=AVAX",
    },
    AVAX: {
      coingecko: "https://www.coingecko.com/en/coins/avalanche",
    },
    ETH: {
      coingecko: "https://www.coingecko.com/en/coins/weth",
      avalanche: "https://snowtrace.io/address/0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab",
    },
    WBTC: {
      coingecko: "https://www.coingecko.com/en/coins/wrapped-bitcoin",
      avalanche: "https://snowtrace.io/address/0x50b7545627a5162f82a992c33b87adc75187b218",
    },
    BTC: {
      coingecko: "https://www.coingecko.com/en/coins/bitcoin-avalanche-bridged-btc-b",
      avalanche: "https://snowtrace.io/address/0x152b9d0FdC40C096757F570A51E494bd4b943E50",
    },
    MIM: {
      coingecko: "https://www.coingecko.com/en/coins/magic-internet-money",
      avalanche: "https://snowtrace.io/address/0x130966628846bfd36ff31a822705796e8cb8c18d",
    },
    USDC: {
      coingecko: "https://www.coingecko.com/en/coins/usd-coin",
      avalanche: "https://snowtrace.io/address/0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e",
    },
    "USDC.e": {
      coingecko: "https://www.coingecko.com/en/coins/usd-coin-avalanche-bridged-usdc-e",
      avalanche: "https://snowtrace.io/address/0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
    },
  },
  [BASE_GOERLI]: {
    ETH: {
      coingecko: "https://www.coingecko.com/en/coins/weth",
      base: "https://goerli.basescan.org/0xEe01c0CD76354C383B8c7B4e65EA88D00B06f36f",
    },
    BTC: {
      coingecko: "https://www.coingecko.com/en/coins/bitcoin-avalanche-bridged-btc-b",
      base: "https://goerli.basescan.org/0xCcF73F4Dcbbb573296BFA656b754Fe94BB957d62",
    },
    USDC: {
      coingecko: "https://www.coingecko.com/en/coins/usd-coin",
      base: "https://goerli.basescan.org/0x3eBDeaA0DB3FfDe96E7a0DBBAFEC961FC50F725F",
    },
    USDT: {
      coingecko: "https://www.coingecko.com/en/coins/tether",
      base: "https://goerli.basescan.org/0x50df4892Bd13f01E4e1Cd077ff394A8fa1A3fD7c",
    },
    DAI: {
      coingecko: "https://www.coingecko.com/en/coins/dai",
      base: "https://goerli.basescan.org/0x51290cb93bE5062A6497f16D9cd3376Adf54F920",
    },
    SOL: {
      coingecko: "https://www.coingecko.com/en/coins/solana",
    },
    DOGE: {
      coingecko: "https://www.coingecko.com/en/coins/dogecoin",
    },
    BNB: {
      coingecko: "https://www.coingecko.com/en/coins/bnb",
    },
    LINK: {
      coingecko: "https://www.coingecko.com/en/coins/chainlink",
    },
    ADA: {
      coingecko: "https://www.coingecko.com/en/coins/cardano",
    },
    TRX: {
      coingecko: "https://www.coingecko.com/en/coins/tron",
    },
    MATIC: {
      coingecko: "https://www.coingecko.com/en/coins/polygon",
    },
    DOT: {
      coingecko: "https://www.coingecko.com/en/coins/polkadot",
    },
    UNI: {
      coingecko: "https://www.coingecko.com/en/coins/uniswap",
    },
  },
  [AVALANCHE_FUJI]: {
    AVAX: {
      coingecko: "https://www.coingecko.com/en/coins/avalanche",
    },
    ETH: {
      coingecko: "https://www.coingecko.com/en/coins/weth",
      avalanche: "https://testnet.snowtrace.io/address/0x82F0b3695Ed2324e55bbD9A9554cB4192EC3a514",
    },
    BTC: {
      coingecko: "https://www.coingecko.com/en/coins/bitcoin-avalanche-bridged-btc-b",
      avalanche: "https://snowtrace.io/address/0x3Bd8e00c25B12E6E60fc8B6f1E1E2236102073Ca",
    },
    USDC: {
      coingecko: "https://www.coingecko.com/en/coins/usd-coin",
      avalanche: "https://testnet.snowtrace.io/address/0x3eBDeaA0DB3FfDe96E7a0DBBAFEC961FC50F725F",
    },
    USDT: {
      coingecko: "https://www.coingecko.com/en/coins/tether",
      avalanche: "https://testnet.snowtrace.io/address/0x6931eC3E364245E6d093aFA1F2e96cCe3F17538b",
    },
    DAI: {
      coingecko: "https://www.coingecko.com/en/coins/dai",
      avalanche: "https://testnet.snowtrace.io/address/0x51290cb93bE5062A6497f16D9cd3376Adf54F920",
    },
    SOL: {
      coingecko: "https://www.coingecko.com/en/coins/solana",
    },
    DOGE: {
      coingecko: "https://www.coingecko.com/en/coins/dogecoin",
    },
    BNB: {
      coingecko: "https://www.coingecko.com/en/coins/bnb",
    },
    LINK: {
      coingecko: "https://www.coingecko.com/en/coins/chainlink",
    },
    ADA: {
      coingecko: "https://www.coingecko.com/en/coins/cardano",
    },
    TRX: {
      coingecko: "https://www.coingecko.com/en/coins/tron",
    },
    MATIC: {
      coingecko: "https://www.coingecko.com/en/coins/polygon",
    },
    DOT: {
      coingecko: "https://www.coingecko.com/en/coins/polkadot",
    },
    UNI: {
      coingecko: "https://www.coingecko.com/en/coins/uniswap",
    },
  },
};

export const ELP_POOL_COLORS = {
  ETH: "#6062a6",
  BTC: "#F7931A",
  WBTC: "#F7931A",
  USDC: "#2775CA",
  "USDC.e": "#2A5ADA",
  USDT: "#67B18A",
  MIM: "#9695F8",
  FRAX: "#000",
  DAI: "#FAC044",
  UNI: "#E9167C",
  AVAX: "#E84142",
  LINK: "#3256D6",
};

export const TOKENS_MAP: { [chainId: number]: { [address: string]: Token } } = {};
export const TOKENS_BY_SYMBOL_MAP: { [chainId: number]: { [symbol: string]: Token } } = {};
export const WRAPPED_TOKENS_MAP: { [chainId: number]: Token } = {};
export const NATIVE_TOKENS_MAP: { [chainId: number]: Token } = {};

const CHAIN_IDS = [MAINNET, TESTNET, BASE, BASE_GOERLI, AVALANCHE, AVALANCHE_FUJI];

for (let j = 0; j < CHAIN_IDS.length; j++) {
  const chainId = CHAIN_IDS[j];

  TOKENS_MAP[chainId] = {};
  TOKENS_BY_SYMBOL_MAP[chainId] = {};

  let tokens = TOKENS[chainId];

  if (ADDITIONAL_TOKENS[chainId]) {
    tokens = tokens.concat(ADDITIONAL_TOKENS[chainId]);
  }

  if (SYNTHETIC_TOKENS[chainId]) {
    tokens = tokens.concat(SYNTHETIC_TOKENS[chainId]);
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    TOKENS_MAP[chainId][token.address] = token;
    TOKENS_BY_SYMBOL_MAP[chainId][token.symbol] = token;
  }
}

for (const chainId of CHAIN_IDS) {
  for (const token of TOKENS[chainId]) {
    if (token.isWrapped) {
      WRAPPED_TOKENS_MAP[chainId] = token;
    } else if (token.isNative) {
      NATIVE_TOKENS_MAP[chainId] = token;
    }
  }
}

for (const chainId of CHAIN_IDS) {
  NATIVE_TOKENS_MAP[chainId].wrappedAddress = WRAPPED_TOKENS_MAP[chainId].address;
}

export function getWrappedToken(chainId: number) {
  return WRAPPED_TOKENS_MAP[chainId];
}

export function getNativeToken(chainId: number) {
  return NATIVE_TOKENS_MAP[chainId];
}

export function getTokens(chainId: number) {
  return TOKENS[chainId];
}

export function getTokensMap(chainId: number) {
  return TOKENS_MAP[chainId];
}

export function isValidToken(chainId: number, address: string) {
  if (!TOKENS_MAP[chainId]) {
    throw new Error(`Incorrect chainId ${chainId}`);
  }
  return address in TOKENS_MAP[chainId];
}

export function getToken(chainId: number, address: string) {
  if (!TOKENS_MAP[chainId]) {
    throw new Error(`Incorrect chainId ${chainId}`);
  }
  if (!TOKENS_MAP[chainId][address]) {
    throw new Error(`Incorrect address "${address}" for chainId ${chainId}`);
  }

  return TOKENS_MAP[chainId][address];
}

export function getTokenBySymbol(chainId: number, symbol: string) {
  const token = TOKENS_BY_SYMBOL_MAP[chainId][symbol];
  if (!token) {
    throw new Error(`Incorrect symbol "${symbol}" for chainId ${chainId}`);
  }
  return token;
}

export function convertTokenAddress(chainId: number, address: string, convertTo?: "wrapped" | "native") {
  const wrappedToken = getWrappedToken(chainId);

  if (convertTo === "wrapped" && address === NATIVE_TOKEN_ADDRESS) {
    return wrappedToken.address;
  }

  if (convertTo === "native" && address === wrappedToken.address) {
    return NATIVE_TOKEN_ADDRESS;
  }

  return address;
}

export function getWhitelistedTokens(chainId: number) {
  return TOKENS[chainId].filter((token) => token.symbol !== "USDG");
}

export function getAvailableTradeTokens(chainId: number, p: { includeSynthetic?: boolean } = {}) {
  const tokens = getWhitelistedTokens(chainId).filter((token) => !token.isTempHidden);

  if (p.includeSynthetic && SYNTHETIC_TOKENS[chainId]) {
    return tokens.concat(SYNTHETIC_TOKENS[chainId]);
  }

  return tokens;
}

export function getVisibleTokens(chainId: number) {
  return getWhitelistedTokens(chainId).filter((token) => !token.isWrapped && !token.isTempHidden);
}

export function getNormalizedTokenSymbol(tokenSymbol) {
  if (["WBTC", "WETH", "WAVAX"].includes(tokenSymbol)) {
    return tokenSymbol.substr(1);
  } else if (tokenSymbol === "BTC.b") {
    return "BTC";
  }
  return tokenSymbol;
}

export function isChartAvailabeForToken(chainId: number, tokenSymbol: string) {
  const token = getTokenBySymbol(chainId, tokenSymbol);
  if (!token) return false;
  return (token.isStable || AVAILABLE_CHART_TOKENS[chainId]?.includes(getNormalizedTokenSymbol(tokenSymbol))) ?? false;
}

export function getPriceDecimals(chainId: number, tokenSymbol: string) {
  const token = getTokenBySymbol(chainId, tokenSymbol);
  if (!token) return 2;
  return token.priceDecimals ?? 2;
}
