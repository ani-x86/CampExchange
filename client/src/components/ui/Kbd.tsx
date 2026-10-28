import React from 'react';
import clsx from 'clsx';

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export const Kbd: React.FC<KbdProps> = ({ children, className, ...props }) => {
  return (
    <kbd
      className={clsx(
        'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-mono font-medium text-mute bg-surface border border-line rounded-sm shadow-none select-none',
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  );
};
