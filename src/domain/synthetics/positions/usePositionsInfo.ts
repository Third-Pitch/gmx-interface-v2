import { useWeb3React } from "@web3-react/core";
import { useUserReferralInfo } from "domain/referrals";
import { BigNumber } from "ethers";
import { MAX_ALLOWED_LEVERAGE } from "lib/legacy";
import { getBasisPoints } from "lib/numbers";
import { getByKey } from "lib/objects";
import { useMemo } from "react";
import { getPositionFee } from "../fees";
import { MarketsInfoData } from "../markets";
import { TokensData, convertToTokenAmount, convertToUsd } from "../tokens";
import { getMarkPrice } from "../trade";
import { PositionsInfoData } from "./types";
import { useOptimisticPositions } from "./useOptimisticPositions";
import { usePositionsConstants } from "./usePositionsConstants";
import {
  getEntryPrice,
  getLeverage,
  getLiquidationPrice,
  getPositionNetValue,
  getPositionPendingFeesUsd,
  getPositionPnlUsd,
} from "./utils";

type PositionsInfoResult = {
  positionsInfoData?: PositionsInfoData;
  isLoading: boolean;
};

export function usePositionsInfo(
  chainId: number,
  p: {
    marketsInfoData?: MarketsInfoData;
    tokensData?: TokensData;
    pricesUpdatedAt?: number;
    showPnlInLeverage: boolean;
  }
): PositionsInfoResult {
  const { showPnlInLeverage, marketsInfoData, tokensData } = p;

  const { account, library } = useWeb3React();
  const { optimisticPositionsData } = useOptimisticPositions(chainId, p);
  const { minCollateralUsd } = usePositionsConstants(chainId);
  const userReferralInfo = useUserReferralInfo(library, chainId, account);

  return useMemo(() => {
    if (!marketsInfoData || !tokensData || !optimisticPositionsData || !minCollateralUsd) {
      return {
        isLoading: true,
      };
    }

    const positionsInfoData = Object.keys(optimisticPositionsData).reduce(
      (acc: PositionsInfoData, positionKey: string) => {
        const position = getByKey(optimisticPositionsData, positionKey)!;

        const marketInfo = getByKey(marketsInfoData, position.marketAddress);
        const indexToken = marketInfo?.indexToken;
        const pnlToken = position.isLong ? marketInfo?.longToken : marketInfo?.shortToken;
        const collateralToken = getByKey(tokensData, position.collateralTokenAddress);

        if (!marketInfo || !indexToken || !pnlToken || !collateralToken) {
          return acc;
        }

        const markPrice = getMarkPrice({ prices: indexToken.prices, isLong: position.isLong, isIncrease: false });
        const collateralMinPrice = collateralToken.prices.minPrice;

        const entryPrice = getEntryPrice({
          sizeInTokens: position.sizeInTokens,
          sizeInUsd: position.sizeInUsd,
          indexToken,
        });

        const pendingFundingFeesUsd = convertToUsd(
          position.fundingFeeAmount,
          collateralToken.decimals,
          collateralToken.prices.minPrice
        )!;

        const pendingClaimableFundingFeesLongUsd = convertToUsd(
          position.claimableLongTokenAmount,
          marketInfo.longToken.decimals,
          marketInfo.longToken.prices.minPrice
        )!;
        const pendingClaimableFundingFeesShortUsd = convertToUsd(
          position.claimableShortTokenAmount,
          marketInfo.shortToken.decimals,
          marketInfo.shortToken.prices.minPrice
        )!;

        const pendingClaimableFundingFeesUsd = pendingClaimableFundingFeesLongUsd?.add(
          pendingClaimableFundingFeesShortUsd
        );

        const totalPendingFeesUsd = getPositionPendingFeesUsd({
          pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
          pendingFundingFeesUsd,
        });

        const positionFeeInfo = getPositionFee(marketInfo, position.sizeInUsd, userReferralInfo);
        const closingFeeUsd = positionFeeInfo.positionFeeUsd;

        const collateralUsd = convertToUsd(position.collateralAmount, collateralToken.decimals, collateralMinPrice)!;

        const remainingCollateralUsd = collateralUsd.sub(totalPendingFeesUsd);

        const remainingCollateralAmount = convertToTokenAmount(
          remainingCollateralUsd,
          collateralToken.decimals,
          collateralMinPrice
        )!;

        const pnl = getPositionPnlUsd({
          marketInfo: marketInfo,
          sizeInUsd: position.sizeInUsd,
          sizeInTokens: position.sizeInTokens,
          markPrice,
          isLong: position.isLong,
        });

        const pnlPercentage =
          collateralUsd && !collateralUsd.eq(0) ? getBasisPoints(pnl, collateralUsd) : BigNumber.from(0);

        const netValue = getPositionNetValue({
          collateralUsd: collateralUsd,
          pnl,
          pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
          pendingFundingFeesUsd: pendingFundingFeesUsd,
          closingFeeUsd,
        });

        const pnlAfterFees = pnl.sub(totalPendingFeesUsd).sub(closingFeeUsd);
        const pnlAfterFeesPercentage = !collateralUsd.eq(0)
          ? getBasisPoints(pnlAfterFees, collateralUsd.add(closingFeeUsd))
          : BigNumber.from(0);

        const leverage = getLeverage({
          sizeInUsd: position.sizeInUsd,
          collateralUsd: collateralUsd,
          pnl: showPnlInLeverage ? pnl : undefined,
          pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
          pendingFundingFeesUsd: pendingFundingFeesUsd,
        });

        const hasLowCollateral = leverage?.gt(MAX_ALLOWED_LEVERAGE) || false;

        const liquidationPrice = getLiquidationPrice({
          marketInfo,
          collateralToken,
          sizeInUsd: position.sizeInUsd,
          sizeInTokens: position.sizeInTokens,
          collateralUsd,
          collateralAmount: position.collateralAmount,
          markPrice,
          userReferralInfo,
          minCollateralUsd,
          pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
          pendingFundingFeesUsd,
          isLong: position.isLong,
        });

        acc[positionKey] = {
          ...position,
          marketInfo,
          indexToken,
          collateralToken,
          pnlToken,
          markPrice,
          entryPrice,
          liquidationPrice,
          collateralUsd,
          remainingCollateralUsd,
          remainingCollateralAmount,
          hasLowCollateral,
          leverage,
          pnl,
          pnlPercentage,
          pnlAfterFees,
          pnlAfterFeesPercentage,
          netValue,
          closingFeeUsd,
          pendingFundingFeesUsd,
          pendingClaimableFundingFeesUsd,
        };

        return acc;
      },
      {} as PositionsInfoData
    );

    return {
      positionsInfoData,
      isLoading: false,
    };
  }, [marketsInfoData, minCollateralUsd, optimisticPositionsData, showPnlInLeverage, tokensData, userReferralInfo]);
}
