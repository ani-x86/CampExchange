import React from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium text-13 tracking-tight transition-transform duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none active:translate-y-px select-none cursor-pointer';

    const variants = {
      primary: 'bg-accent text-white hover:bg-accent-hover border border-accent rounded-sm shadow-none',
      secondary: 'bg-bg text-ink border border-line hover:border-lineStrong hover:bg-surface rounded-sm',
      ghost: 'bg-transparent text-ink hover:bg-surface rounded-sm',
      danger: 'bg-danger text-white hover:bg-red-700 border border-danger rounded-sm',
    };

    const sizes = {
      sm: 'h-8 px-2.5 text-12 gap-1.5',
      md: 'h-9 px-3.5 text-13 gap-2 sm:h-9 touch-manipulation min-h-[36px]',
      lg: 'h-10 px-4 text-14 gap-2.5 min-h-[40px]',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : leftIcon}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
