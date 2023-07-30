import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { ExecutionFee, FeeItem } from "domain/synthetics/fees";
import { formatDeltaUsd, formatTokenAmountWithUsd } from "lib/numbers";
import "./EmFees.scss";

type Props = {
  totalFees?: FeeItem;
  swapFee?: FeeItem;
  swapPriceImpact?: FeeItem;
  executionFee?: ExecutionFee;
};

export function EmFees(p: Props) {
  const totalFeesUsd = p.totalFees?.deltaUsd.sub(p.executionFee?.feeUsd || 0);

  return (
    <ExchangeInfoRow
      label={<Trans>Fees and Price Impact</Trans>}
      value={
        <>
          {!p.totalFees?.deltaUsd && "-"}
          {p.totalFees?.deltaUsd && (
            <Tooltip
              className="EmFees-tooltip"
              handle={<span className={cx({ positive: totalFeesUsd?.gt(0) })}>{formatDeltaUsd(totalFeesUsd)}</span>}
              position="right-top"
              renderContent={() => (
                <div>
                  {p.swapPriceImpact?.deltaUsd.abs().gt(0) && (
                    <StatsTooltipRow
                      label={t`Swap Price Impact`}
                      value={formatDeltaUsd(p.swapPriceImpact.deltaUsd, p.swapPriceImpact.bps)!}
                      showDollar={false}
                    />
                  )}

                  {p.swapFee && (
                    <>
                      <StatsTooltipRow
                        label={t`Swap Fee`}
                        value={formatDeltaUsd(p.swapFee.deltaUsd, p.swapFee.bps)!}
                        showDollar={false}
                      />
                    </>
                  )}

                  {p.executionFee && (
                    <StatsTooltipRow
                      label={t`Execution Fee`}
                      value={formatTokenAmountWithUsd(
                        p.executionFee.feeTokenAmount.mul(-1),
                        p.executionFee.feeUsd.mul(-1),
                        p.executionFee.feeToken.symbol,
                        p.executionFee.feeToken.decimals
                      )}
                      showDollar={false}
                    />
                  )}
                </div>
              )}
            />
          )}
        </>
      }
    />
  );
}
