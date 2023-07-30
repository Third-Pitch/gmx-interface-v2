import { t, Trans } from "@lingui/macro";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { BigNumber } from "ethers";
import { formatKeyAmount } from "lib/numbers";

type Props = {
  processedData: {
    eddxAprForEsEddx: BigNumber;
    eddxAprForNativeToken: BigNumber;
    eddxAprForNativeTokenWithBoost: BigNumber;
    eddxBoostAprForNativeToken?: BigNumber;
  };
  nativeTokenSymbol: string;
};

function renderEscrowedEDDXApr(processedData) {
  if (!processedData?.eddxAprForEsEddx?.gt(0)) return;
  return (
    <StatsTooltipRow
      label={t`Escrowed EDDX APR`}
      showDollar={false}
      value={`${formatKeyAmount(processedData, "eddxAprForEsEddx", 2, 2, true)}%`}
    />
  );
}

export default function EDDXAprTooltip({ processedData, nativeTokenSymbol }: Props) {
  return (
    <>
      {(!processedData.eddxBoostAprForNativeToken || processedData.eddxBoostAprForNativeToken.eq(0)) && (
        <StatsTooltipRow
          label={t`${nativeTokenSymbol} APR`}
          showDollar={false}
          value={`${formatKeyAmount(processedData, "eddxAprForNativeToken", 2, 2, true)}%`}
        />
      )}
      {processedData?.eddxBoostAprForNativeToken?.gt(0) ? (
        <div>
          <StatsTooltipRow
            label={t`${nativeTokenSymbol} Base APR`}
            showDollar={false}
            value={`${formatKeyAmount(processedData, "eddxAprForNativeToken", 2, 2, true)}%`}
          />
          <StatsTooltipRow
            label={t`${nativeTokenSymbol} Boosted APR`}
            showDollar={false}
            value={`${formatKeyAmount(processedData, "eddxBoostAprForNativeToken", 2, 2, true)}%`}
          />
          <div className="Tooltip-divider" />
          <StatsTooltipRow
            label={t`${nativeTokenSymbol} Total APR`}
            showDollar={false}
            value={`${formatKeyAmount(processedData, "eddxAprForNativeTokenWithBoost", 2, 2, true)}%`}
          />
          <br />
          {renderEscrowedEDDXApr(processedData)}
          <br />
          <Trans>The Boosted APR is from your staked Multiplier Points.</Trans>
        </div>
      ) : (
        renderEscrowedEDDXApr(processedData)
      )}
      <div>
        <br />
        <Trans>APRs are updated weekly on Wednesday and will depend on the fees collected for the week.</Trans>
      </div>
    </>
  );
}
