import React from 'react';
import clsx from 'clsx';

export type BadgeVariant = 'default' | 'ok' | 'warn' | 'danger' | 'accent' | 'muted';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', children, className, ...props }) => {
  const variants = {
    default: 'bg-surface text-ink border-line',
    ok: 'bg-emerald-50 text-ok border-emerald-200',
    warn: 'bg-amber-50 text-warn border-amber-200',
    danger: 'bg-red-50 text-danger border-red-200',
    accent: 'bg-accent-soft text-accent border-blue-200',
    muted: 'bg-surface text-mute border-line',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium tracking-wide uppercase rounded-sm border select-none',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
