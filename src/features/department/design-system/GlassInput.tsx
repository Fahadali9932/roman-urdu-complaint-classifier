import React, { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  leadingIcon?: React.ReactNode;
  accentColor?: string;
  error?: string | null;
  hint?: string;
}

export const GlassInput: React.FC<GlassInputProps> = ({
  label,
  id,
  type = 'text',
  leadingIcon,
  accentColor = '#D4AF37',
  error,
  hint,
  className = '',
  disabled,
  ...rest
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="space-y-1.5 w-full">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300"
        >
          {label}
        </label>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>

      <div className="relative rounded-xl overflow-hidden group">
        {leadingIcon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 group-focus-within:text-white transition-colors">
            {leadingIcon}
          </div>
        )}

        <input
          id={id}
          type={effectiveType}
          disabled={disabled}
          className={`w-full bg-[#0A0D11]/70 border border-white/12 text-white placeholder-slate-500 text-sm rounded-xl py-3.5 transition-all duration-200 outline-none ${
            leadingIcon ? 'pl-10' : 'pl-4'
          } ${isPassword ? 'pr-11' : 'pr-4'} ${
            error
              ? 'border-red-500/80 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'focus:border-white/40 focus:ring-2'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
          style={{
            ['--tw-ring-color' as string]: error ? undefined : `${accentColor}33`,
            borderColor: error ? undefined : undefined,
          }}
          {...rest}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white focus:outline-none cursor-pointer transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1.5 mt-1" role="alert">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};

