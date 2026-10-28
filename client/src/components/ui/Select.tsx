import React from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={selectId} className="text-12 font-medium text-mute select-none">
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          <select
            id={selectId}
            ref={ref}
            className={clsx(
              'w-full h-10 pl-3 pr-9 bg-bg text-ink text-14 rounded-sm border appearance-none outline-none transition-colors cursor-pointer',
              'focus:border-accent focus:ring-2 focus:ring-accent-soft',
              error ? 'border-danger' : 'border-line hover:border-lineStrong',
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 pointer-events-none text-mute">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && <p className="text-12 text-danger mt-0.5">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
