import { Trans } from "@lingui/macro";
import { BigNumber } from "ethers";
import { USD_DECIMALS } from "lib/legacy";
import "./StatsTooltip.css";
import { formatAmount } from "lib/numbers";

type Props = {
  title: string;
  total: BigNumber;
  avaxValue: BigNumber;
  baseValue: BigNumber;
  showDollar?: boolean;
  decimalsForConversion?: number;
  symbol?: string;
  shouldFormat?: boolean;
};

export default function ChainsStatsTooltipRow({
  title,
  total,
  avaxValue,
  baseValue,
  showDollar = true,
  decimalsForConversion = USD_DECIMALS,
  symbol,
  shouldFormat = true,
}: Props) {
  return (
    <>
      <p className="Tooltip-row">
        <span className="label">
          <Trans>{title} on Base:</Trans>
        </span>
        <span className="amount">
          {showDollar && "$"}
          {formatAmount(baseValue, shouldFormat ? decimalsForConversion : 0, 0, true)}
          {!showDollar && symbol && " " + symbol}
        </span>
      </p>
      <p className="Tooltip-row">
        <span className="label">
          <Trans>{title} on Avalanche:</Trans>
        </span>
        <span className="amount">
          {showDollar && "$"}
          {formatAmount(avaxValue, shouldFormat ? decimalsForConversion : 0, 0, true)}
          {!showDollar && symbol && " " + symbol}
        </span>
      </p>
      <div className="Tooltip-divider" />
      <p className="Tooltip-row">
        <span className="label">
          <Trans>Total:</Trans>
        </span>
        <span className="amount">
          {showDollar && "$"}
          {formatAmount(total, shouldFormat ? decimalsForConversion : 0, 0, true)}
          {!showDollar && symbol && " " + symbol}
        </span>
      </p>
    </>
  );
}
