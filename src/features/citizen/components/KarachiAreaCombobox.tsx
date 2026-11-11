import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, MapPin, Check, PlusCircle, X } from 'lucide-react';
import { KarachiDistrict } from '../../../types';
import { searchKarachiLocalities, SearchLocalityResult } from '../../../data/karachi/locationSearch';
import { useLanguage } from '../../../context/LanguageContext';

export interface KarachiAreaComboboxProps {
  id?: string;
  label: string;
  value: string;
  onChange: (localityName: string, matchedDistrict?: KarachiDistrict) => void;
  selectedDistrict?: KarachiDistrict | '';
  error?: string;
  required?: boolean;
  placeholder?: string;
  variant?: 'light' | 'glass';
}

export const KarachiAreaCombobox: React.FC<KarachiAreaComboboxProps> = ({
  id = 'locality',
  label,
  value,
  onChange,
  selectedDistrict,
  error,
  required = true,
  placeholder,
  variant = 'light',
}) => {
  const { language, isRTL } = useLanguage();
  const ur = language === 'ur';

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isManualMode, setIsManualMode] = useState(false);
  const [query, setQuery] = useState<string | null>(null);
  const [prevPropValue, setPrevPropValue] = useState(value);

  // If parent resets or externally changes prop value, sync internal query state
  if (value !== prevPropPropValueSafe(prevPropValue)) {
    setPrevPropValue(value);
    setQuery(null);
  }

  function prevPropPropValueSafe(val: string) {
    return val;
  }

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Display value is user's active query while typing, or the parent-controlled value
  const displayValue = query !== null ? query : value;

  // Compute matched results based on active query/value and district filter
  const results: SearchLocalityResult[] = searchKarachiLocalities(displayValue, selectedDistrict);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (item: SearchLocalityResult) => {
      if (item.isManual) {
        setIsManualMode(true);
        setIsOpen(false);
        inputRef.current?.focus();
        return;
      }

      setIsManualMode(false);
      setQuery(null);
      setIsOpen(false);
      setHighlightedIndex(-1);
      onChange(item.name, item.district !== 'Unresolved' ? item.district : undefined);
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < results.length) {
          handleSelect(results[highlightedIndex]);
        } else if (results.length > 0) {
          handleSelect(results[0]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const handleClear = () => {
    setQuery(null);
    onChange('');
    setIsManualMode(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative space-y-1.5 text-start">
      {/* Field Label */}
      <div className="flex items-center justify-between mb-1.5">
        <label
          htmlFor={id}
          className={`block text-xs sm:text-sm font-medium select-none font-ui ${
            variant === 'glass' ? 'text-white/90' : 'text-[#141414]'
          }`}
        >
          {label} {required && <span className={variant === 'glass' ? 'text-[#E89BA4] ms-1' : 'text-[#681822] ms-1'} aria-hidden="true">*</span>}
        </label>
        {isManualMode ? (
          <span className={`font-mono text-[11px] font-semibold ${variant === 'glass' ? 'text-[#E89BA4]' : 'text-[#681822]'}`}>
            {ur ? 'دستی اندراج' : 'Custom Entry'}
          </span>
        ) : (
          <span className={`font-mono text-[11px] ${variant === 'glass' ? 'text-white/60' : 'text-[#666]'}`}>
            {ur ? 'علاقہ تلاش کریں' : 'Search by name or block'}
          </span>
        )}
      </div>

      {/* Input Box */}
      <div className="relative">
        <div className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3.5' : 'left-3.5'} pointer-events-none ${
          variant === 'glass' ? 'text-white/60' : 'text-[#77716E]'
        }`}>
          <Search className="w-4 h-4" />
        </div>

        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={`${id}-listbox`}
          aria-activedescendant={
            highlightedIndex >= 0 ? `${id}-option-${highlightedIndex}` : undefined
          }
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          autoComplete="off"
          value={displayValue}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            onChange(next);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => {
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            placeholder ||
            (ur
              ? 'علاقہ منتخب کریں (مثلاً: گلشن، جوہر، کلفٹن، نارتھ ناظم آباد...)'
              : 'Type area, block or scheme (e.g., Gulshan, Johar, DHA, Clifton...)')
          }
          className={`w-full ${
            variant === 'glass' ? 'min-h-[52px] sm:min-h-14 rounded-[16px] border-[1.5px] py-3' : 'min-h-[48px] rounded-xl border py-2.5 shadow-2xs'
          } font-sans text-sm sm:text-base transition-all outline-none ${
            isRTL ? 'pe-10 ps-10' : 'ps-10 pe-10'
          } ${
            variant === 'glass'
              ? error
                ? 'border-rose-400 bg-rose-950/30 text-white placeholder:text-white/40 focus:ring-1 focus:ring-rose-400'
                : 'border-white/14 bg-white/[0.07] text-white placeholder:text-white/40 hover:border-white/25 hover:bg-white/[0.09] focus:border-[#E89BA4] focus:bg-white/[0.11] focus:ring-2 focus:ring-[#681822]/40 focus:shadow-[0_0_16px_rgba(104,24,34,0.35)]'
              : error
                ? 'border-rose-500 focus:border-rose-600 focus:ring-1 focus:ring-rose-500 bg-rose-50/20 text-[#141414] placeholder:text-[#888]'
                : 'border-[#E8E5E1] hover:border-[#323232] focus:border-[#141414] focus:ring-1 focus:ring-[#141414] bg-white text-[#141414] placeholder:text-[#888]'
          }`}
        />

        {displayValue && (
          <button
            type="button"
            onClick={handleClear}
            className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-3' : 'right-3'} p-1.5 transition-colors ${
              variant === 'glass' ? 'text-white/60 hover:text-white' : 'text-[#77716E] hover:text-[#141414]'
            }`}
            aria-label={ur ? 'صاف کریں' : 'Clear locality input'}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Combobox Dropdown Suggestions */}
      {isOpen && results.length > 0 && (
        <ul
          ref={listRef}
          id={`${id}-listbox`}
          role="listbox"
          aria-label={label}
          className={`absolute z-50 left-0 right-0 mt-2 max-h-72 overflow-y-auto border p-2 text-start transition-all ${
            variant === 'glass'
              ? 'rounded-[20px] border-white/18 bg-[rgba(22,20,24,0.80)] backdrop-blur-2xl text-white divide-y divide-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.15)]'
              : 'rounded-xl border-[#E8E5E1] bg-white text-start divide-y divide-[#F4F3F0] shadow-xl shadow-black/8'
          }`}
        >
          {results.map((item, index) => {
            const isHighlighted = index === highlightedIndex;
            const isSelected = item.name.toLowerCase() === displayValue.trim().toLowerCase();

            if (item.isManual) {
              return (
                <li
                  key={item.id}
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-[12px] cursor-pointer text-xs font-ui transition-colors ${
                    variant === 'glass'
                      ? isHighlighted
                        ? 'bg-[#681822]/45 text-white'
                        : 'text-white/90 hover:bg-white/10'
                      : isHighlighted
                        ? 'bg-[#F7EFF0] text-[#681822]'
                        : 'text-[#141414] hover:bg-[#FAF9F7]'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    variant === 'glass' ? 'bg-[#681822] text-white' : 'bg-[#F7EFF0] text-[#681822]'
                  }`}>
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold block text-sm">{item.name}</span>
                    <span className={`text-xs block pt-0.5 ${variant === 'glass' ? 'text-white/60' : 'text-[#77716E]'}`}>
                      {ur ? 'فہرست میں نہیں ملا؟ دستی اندراج منتخب کریں' : 'Area not found. Select to enter area manually'}
                    </span>
                  </div>
                </li>
              );
            }

            return (
              <li
                key={item.id}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-[12px] cursor-pointer font-ui text-xs sm:text-sm transition-colors ${
                  variant === 'glass'
                    ? isHighlighted
                      ? 'bg-[#681822]/45 text-white'
                      : 'text-white/90 hover:bg-white/10'
                    : isHighlighted
                      ? 'bg-[#F7EFF0] text-[#681822]'
                      : 'text-[#141414] hover:bg-[#FAF9F7]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    variant === 'glass'
                      ? isHighlighted
                        ? 'bg-[#681822] text-white'
                        : 'bg-white/10 text-white/70'
                      : isHighlighted
                        ? 'bg-white text-[#681822]'
                        : 'bg-[#FAF9F7] text-[#77716E]'
                  }`}>
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <span className="font-semibold block truncate text-sm">
                      {item.name}
                      {ur && item.nameUrdu && (
                        <span className={`ms-2 text-xs font-normal ${variant === 'glass' ? 'text-white/60' : 'text-[#77716E]'}`}>
                          ({item.nameUrdu})
                        </span>
                      )}
                    </span>
                    <span className={`text-xs block pt-0.5 ${variant === 'glass' ? 'text-white/60' : 'text-[#77716E]'}`}>
                      {item.district}
                      {item.parentLocality ? ` • ${item.parentLocality}` : ''}
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <Check className={`w-4 h-4 shrink-0 ${variant === 'glass' ? 'text-[#FFCCD2]' : 'text-[#681822]'}`} />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Validation Error Message */}
      {error && (
        <p id={`${id}-error`} className="font-ui text-xs font-semibold text-[#681822] pt-0.5" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
