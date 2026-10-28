import React from 'react';
import clsx from 'clsx';
import { ListingItem } from '@/hooks/useListings';
import { ListingCard } from './ListingCard';
import { Skeleton } from './ui/Skeleton';

export interface ListingGridProps {
  listings?: ListingItem[];
  isLoading?: boolean;
  onSaveToggle?: (id: string, currentlySaved: boolean) => void;
  focusedIndex?: number;
  className?: string;
}

export const ListingGrid: React.FC<ListingGridProps> = ({
  listings = [],
  isLoading = false,
  onSaveToggle,
  focusedIndex = -1,
  className,
}) => {
  return (
    <div
      className={clsx(
        'w-full grid gap-4 3xl:gap-6',
        'grid-cols-[repeat(auto-fill,minmax(clamp(160px,18vw,260px),1fr))]',
        className
      )}
    >
      {isLoading
        ? Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="border border-line rounded-sm overflow-hidden flex flex-col">
              <Skeleton className="aspect-[4/3] w-full" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-full" />
                <div className="flex justify-between pt-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            </div>
          ))
        : listings.map((item, index) => (
            <ListingCard
              key={item.id}
              listing={item}
              onSaveToggle={onSaveToggle}
              isFocused={focusedIndex === index}
            />
          ))}
    </div>
  );
};
