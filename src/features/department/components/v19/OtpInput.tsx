import React, { useState, useRef, useEffect } from 'react';

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  onComplete?: (code: string) => void;
  error?: boolean;
}

/**
 * Exact NameThatUI-inspired 6-Slot OTP Input Component
 * URL reference: https://namethatui.com/web/otp-input
 * Features:
 * - 6 visually discrete rounded slot boxes with active lime glow
 * - Single underlying native accessible input supporting mobile autofill & paste
 * - Smooth caret indicator and slot transitions
 */
export const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChange,
  length = 6,
  disabled = false,
  autoFocus = true,
  onComplete,
  error = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, '').slice(0, length);
    onChange(rawVal);
    if (rawVal.length === length && onComplete) {
      onComplete(rawVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && value.length > 0) {
      // Natural backspace
    }
  };

  const activeIndex = Math.min(value.length, length - 1);

  return (
    <div
      className={`v19-otp-container ${error ? 'has-error' : ''}`}
      onClick={() => inputRef.current?.focus()}
      role="group"
      aria-label="One-Time Passcode Input"
    >
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={length}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
        className="v19-otp-hidden-input"
        aria-label="6-digit verification code"
      />

      {Array.from({ length }).map((_, idx) => {
        const char = value[idx] || '';
        const isCurrent = isFocused && idx === activeIndex && value.length < length;
        const isFilled = Boolean(char);

        return (
          <div
            key={idx}
            className={`v19-otp-slot ${isCurrent ? 'is-active' : ''} ${isFilled ? 'has-value' : ''}`}
            aria-hidden="true"
          >
            {char}
          </div>
        );
      })}
    </div>
  );
};
