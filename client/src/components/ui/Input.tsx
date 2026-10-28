import React from 'react';
import clsx from 'clsx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftAddon, rightAddon, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="text-12 font-medium text-mute select-none">
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {leftAddon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-mute">
              {leftAddon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={clsx(
              'w-full h-10 px-3 bg-bg text-ink text-14 rounded-sm border transition-colors outline-none placeholder:text-faint',
              'focus:border-accent focus:ring-2 focus:ring-accent-soft',
              error ? 'border-danger focus:border-danger focus:ring-red-100' : 'border-line hover:border-lineStrong',
              leftAddon && 'pl-9',
              rightAddon && 'pr-9',
              className
            )}
            {...props}
          />
          {rightAddon && (
            <div className="absolute right-3 flex items-center text-mute">{rightAddon}</div>
          )}
        </div>
        {error && <p className="text-12 text-danger mt-0.5">{error}</p>}
        {hint && !error && <p className="text-12 text-mute mt-0.5">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, rows = 4, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={textareaId} className="text-12 font-medium text-mute select-none">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          className={clsx(
            'w-full p-3 bg-bg text-ink text-14 rounded-sm border transition-colors outline-none placeholder:text-faint resize-y',
            'focus:border-accent focus:ring-2 focus:ring-accent-soft',
            error ? 'border-danger focus:border-danger focus:ring-red-100' : 'border-line hover:border-lineStrong',
            className
          )}
          {...props}
        />
        {error && <p className="text-12 text-danger mt-0.5">{error}</p>}
        {hint && !error && <p className="text-12 text-mute mt-0.5">{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
