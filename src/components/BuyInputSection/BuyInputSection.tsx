import "./BuyInputSection.scss";
import React, { useRef, ReactNode, ChangeEvent } from "react";
import cx from "classnames";
import { Trans } from "@lingui/macro";
import Select from 'react-select';

type Props = {
  topLeftLabel: string;
  topLeftValue?: string;
  topRightLabel?: string;
  topRightValue?: string;
  onClickTopRightLabel?: () => void;
  inputValue?: number | string;
  onInputValueChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onClickMax?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  showMaxButton?: boolean;
  staticInput?: boolean;
  children?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  onSelect?: (e: number) => void;
};

export default function BuyInputSection(props: Props) {
  const {
    topLeftLabel,
    topLeftValue,
    topRightLabel,
    topRightValue,
    onClickTopRightLabel,
    inputValue,
    onInputValueChange,
    onClickMax,
    onFocus,
    onBlur,
    showMaxButton,
    staticInput,
    children,
    placeholder,
    disabled,
    onSelect
  } = props;

  const inputRef = useRef<HTMLInputElement>(null);

  function handleBoxClick() {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }

  return (
    <div className="Exchange-swap-section buy-input" onClick={handleBoxClick}>
      <div className="buy-input-top-row">
        <div className="text-gray">
          {topLeftLabel}
          {topLeftValue && `: ${topLeftValue}`}
        </div>
        <div className={cx("align-right", { clickable: onClickTopRightLabel })} onClick={onClickTopRightLabel}>
          <span className="text-gray">{topRightLabel}</span>
          {topRightValue && <span className="Exchange-swap-label">:&nbsp;{topRightValue}</span>}
        </div>
      </div>
      <div className="Exchange-swap-section-bottom">
        <div className="Exchange-swap-input-container">
          {!staticInput && (
            <input
              disabled={disabled}
              type="number"
              min="0"
              placeholder={placeholder || "0.0"}
              step="any"
              className="Exchange-swap-input"
              value={inputValue}
              onChange={onInputValueChange}
              ref={inputRef}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          )}
          {staticInput && <div className="InputSection-static-input">{inputValue}</div>}
          {showMaxButton && (
            <button type="button" className="Exchange-swap-max" onClick={onClickMax}>
              <Trans>MAX</Trans>
            </button>
          )}
        </div>
        <div className="PositionEditor-token-symbol">{children}</div>
      </div>
      {
        onSelect &&
        <div className="Exchange-swap-section-model" >
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(p => (
            <div key={p} onClick={() => {
              // setMonth(p);
              onSelect(p);
            }} className="Exchange-swap-section-model-item" >
              <label style={{ width: 20 }} >{p}</label>
              <label><Trans>Month</Trans></label>
            </div>
          ))}
        </div>
      }
    </div>
  );
}
