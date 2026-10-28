import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import clsx from 'clsx';
import { ListingItem } from '@/hooks/useListings';
import { formatCurrency, formatTimeAgo } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';

export interface ListingCardProps {
  listing: ListingItem;
  onSaveToggle?: (id: string, currentlySaved: boolean) => void;
  className?: string;
  isFocused?: boolean;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  onSaveToggle,
  className,
  isFocused = false,
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [optimisticSaved, setOptimisticSaved] = useState(listing.isSaved || false);

  useEffect(() => {
    setOptimisticSaved(listing.isSaved || false);
  }, [listing.isSaved]);

  const images = listing.images.length > 0
    ? listing.images
    : ['https://placehold.co/400x300/FAFAFA/6B6B6B?text=Camp-Exchange'];

  // Image cycle peek on desktop hover (first 3 images)
  useEffect(() => {
    if (!isHovered || images.length <= 1) {
      setActiveImageIndex(0);
      return;
    }

    const maxImages = Math.min(images.length, 3);
    const interval = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % maxImages);
    }, 750);

    return () => clearInterval(interval);
  }, [isHovered, images.length]);

  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newSaved = !optimisticSaved;
    setOptimisticSaved(newSaved);
    onSaveToggle?.(listing.id, optimisticSaved);
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={clsx(
        'group relative bg-bg border rounded-sm overflow-hidden flex flex-col transition-all duration-200 text-left select-none',
        isFocused ? 'border-accent ring-2 ring-accent-soft' : 'border-line hover:border-lineStrong',
        className
      )}
    >
      {/* Clickable Card Link */}
      <Link to={`/listing/${listing.id}`} className="flex flex-col flex-1">
        {/* Image Container with 4:3 Aspect Ratio */}
        <div className="relative aspect-[4/3] w-full bg-surface overflow-hidden">
          <img
            src={images[activeImageIndex]}
            alt={listing.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />

          {/* Dots Indicator for Multi-Image Peek */}
          {images.length > 1 && isHovered && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-10">
              {images.slice(0, 3).map((_, idx) => (
                <div
                  key={idx}
                  className={clsx(
                    'h-1 rounded-sm transition-all',
                    idx === activeImageIndex ? 'w-3 bg-white' : 'w-1 bg-white/60'
                  )}
                />
              ))}
            </div>
          )}

          {/* Status Overlay if not active */}
          {listing.status === 'SOLD' && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="bg-ink text-white text-12 font-semibold px-2.5 py-1 rounded-sm uppercase tracking-wider">
                SOLD
              </span>
            </div>
          )}
          {listing.status === 'RESERVED' && (
            <div className="absolute top-2 left-2">
              <Badge variant="warn">RESERVED</Badge>
            </div>
          )}

          {/* Bookmark Button */}
          <button
            type="button"
            onClick={handleSaveClick}
            aria-label={optimisticSaved ? 'Unsave listing' : 'Save listing'}
            className={clsx(
              'absolute top-2 right-2 p-1.5 rounded-sm transition-colors z-10 cursor-pointer shadow-sm',
              optimisticSaved
                ? 'bg-accent text-white'
                : 'bg-white/90 text-mute hover:text-ink hover:bg-white'
            )}
          >
            <Bookmark
              className={clsx('w-3.5 h-3.5', optimisticSaved && 'fill-white')}
            />
          </button>
        </div>

        {/* Content Box */}
        <div className="p-3 flex flex-col flex-1 justify-between gap-1.5">
          <div>
            {/* Price & Negotiable */}
            <div className="flex items-baseline justify-between gap-1">
              <span className="font-mono text-16 font-semibold text-ink">
                {formatCurrency(listing.price)}
              </span>
              {listing.negotiable && (
                <span className="text-[11px] text-mute font-medium">Negotiable</span>
              )}
            </div>

            {/* Title (1 line truncate) */}
            <h3 className="text-14 font-medium text-ink truncate mt-0.5 group-hover:text-accent transition-colors">
              {listing.title}
            </h3>
          </div>

          {/* Metadata Footer */}
          <div className="flex items-center justify-between text-12 text-mute pt-1 border-t border-line/60">
            <span className="text-[11px] uppercase tracking-wider font-medium text-mute">
              {listing.condition.replace('_', ' ')}
            </span>
            <span className="text-11">{formatTimeAgo(listing.createdAt)}</span>
          </div>
        </div>
      </Link>
    </div>
  );
};
