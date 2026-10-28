import React from 'react';
import clsx from 'clsx';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-dashed border-line rounded-sm bg-surface/50 w-full',
        className
      )}
    >
      {icon && <div className="mb-3 text-mute p-3 bg-bg border border-line rounded-sm">{icon}</div>}
      <h3 className="text-14 sm:text-16 font-semibold text-ink">{title}</h3>
      {description && <p className="text-13 text-mute max-w-sm mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
