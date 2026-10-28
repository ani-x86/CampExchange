import React from 'react';
import clsx from 'clsx';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={clsx(
        'bg-surface border border-line/60 rounded-sm relative overflow-hidden animate-pulse',
        className
      )}
      {...props}
    />
  );
};
