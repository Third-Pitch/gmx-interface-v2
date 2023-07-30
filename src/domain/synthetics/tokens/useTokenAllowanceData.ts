import { useWeb3React } from "@web3-react/core";
import Token from "abis/Token.json";
import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { useMulticall } from "lib/multicall";
import { TokensAllowanceData } from "./types";

type TokenAllowanceResult = {
  tokensAllowanceData?: TokensAllowanceData;
};

const defaultValue = {};

export function useTokensAllowanceData(
  chainId: number,
  p: { spenderAddress?: string; tokenAddresses: string[] }
): TokenAllowanceResult {
  const { spenderAddress, tokenAddresses } = p;
  const { account } = useWeb3React();

  const isNativeToken = tokenAddresses.length === 1 && tokenAddresses[0] === NATIVE_TOKEN_ADDRESS;

  const { data } = useMulticall(chainId, "useTokenAllowance", {
    key:
      account && spenderAddress && tokenAddresses.length > 0 && !isNativeToken
        ? [account, spenderAddress, tokenAddresses.join("-")]
        : null,

    request: () =>
      tokenAddresses
        .filter((address) => address !== NATIVE_TOKEN_ADDRESS)
        .reduce((contracts, address) => {
          contracts[address] = {
            contractAddress: address,
            abi: Token.abi,
            calls: {
              allowance: {
                methodName: "allowance",
                params: [account, spenderAddress],
              },
            },
          };

          return contracts;
        }, {}),

    parseResponse: (res) =>
      Object.keys(res.data).reduce((tokenAllowance: TokensAllowanceData, address) => {
        tokenAllowance[address] = res.data[address].allowance.returnValues[0];

        return tokenAllowance;
      }, {} as TokensAllowanceData),
  });

  return {
    tokensAllowanceData: isNativeToken ? defaultValue : data,
  };
}
