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
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="block font-ui text-xs sm:text-sm font-bold tracking-wide uppercase text-[#141414]"
        >
          {label} {required && <span className="text-[#681822]">*</span>}
        </label>
        {isManualMode ? (
          <span className="font-mono text-[11px] text-[#681822] font-semibold">
            {ur ? 'دستی اندراج' : 'Custom Entry'}
          </span>
        ) : (
          <span className="font-mono text-[11px] text-[#666]">
            {ur ? 'علاقہ تلاش کریں' : 'Search by name or block'}
          </span>
        )}
      </div>

      {/* Input Box */}
      <div className="relative">
        <div className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'} pointer-events-none text-[#777]`}>
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
          className={`w-full rounded-md border bg-white py-2.5 font-sans text-sm text-[#141414] transition-all placeholder:text-[#888] outline-none ${
            isRTL ? 'pe-10 ps-10' : 'ps-10 pe-10'
          } ${
            error
              ? 'border-[#681822] ring-1 ring-[#681822]/20'
              : 'border-[#D8D6D2] focus:border-[#141414] focus:ring-1 focus:ring-[#141414]/15'
          }`}
        />

        {displayValue && (
          <button
            type="button"
            onClick={handleClear}
            className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-3' : 'right-3'} p-1 text-[#777] hover:text-[#141414] transition-colors`}
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
          className="absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-lg border border-[#D8D6D2] bg-white py-1.5 shadow-xl text-start divide-y divide-[#F0EFEB]"
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
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer text-xs font-ui transition-colors ${
                    isHighlighted ? 'bg-[#FAF9F6] text-[#681822] font-semibold' : 'text-[#333]'
                  }`}
                >
                  <PlusCircle className="w-4 h-4 text-[#681822] shrink-0" />
                  <div className="flex-1">
                    <span className="font-semibold block">{item.name}</span>
                    <span className="text-[11px] text-[#777] block">
                      {ur ? 'فہرست سے باہر علاقہ درج کریں' : 'Cannot find your area? Enter it as custom text'}
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
                className={`flex items-center justify-between gap-3 px-3.5 py-2 cursor-pointer font-ui text-xs sm:text-sm transition-colors ${
                  isHighlighted ? 'bg-[#FAF9F6] text-[#141414]' : 'text-[#222]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-[#681822] shrink-0" />
                  <div className="truncate">
                    <span className="font-semibold block truncate">
                      {item.name}
                      {ur && item.nameUrdu && (
                        <span className="ms-2 text-xs font-normal text-[#555]">
                          ({item.nameUrdu})
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] font-mono text-[#777] block">
                      {item.district}
                      {item.parentLocality ? ` • ${item.parentLocality}` : ''}
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
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
