import React from 'react';
import { Search, X, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import clsx from 'clsx';
import { ListingFilters } from '@/hooks/useListings';

export interface FilterBarProps {
  filters: ListingFilters;
  onChange: (updated: ListingFilters) => void;
  className?: string;
}

export const CATEGORIES = [
  'All',
  'Books',
  'Electronics',
  'Vehicles',
  'Hostel & Kitchen',
  'Lab & Stationery',
  'Sports',
  'Clothing',
  'Other',
];

export const FilterBar: React.FC<FilterBarProps> = ({ filters, onChange, className }) => {
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const activeCategory = filters.category || 'All';

  const handleCategoryClick = (cat: string) => {
    onChange({ ...filters, category: cat === 'All' ? undefined : cat });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, q: e.target.value || undefined });
  };

  const clearSearch = () => {
    onChange({ ...filters, q: undefined });
  };

  return (
    <div className={clsx('w-full bg-bg border-b border-line sticky top-14 z-10 py-2.5 space-y-2.5', className)}>
      {/* Top Row: Search & Category Chips */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        {/* Search Input */}
        <div className="relative flex items-center min-w-[200px] sm:w-64 shrink-0">
          <Search className="w-4 h-4 absolute left-3 text-mute pointer-events-none" />
          <input
            type="text"
            value={filters.q || ''}
            onChange={handleSearchChange}
            placeholder="Search listings..."
            className="w-full h-8 pl-8 pr-8 text-13 bg-surface border border-line rounded-sm focus:border-accent focus:outline-none"
          />
          {filters.q && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2 text-mute hover:text-ink p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Chips (Horizontal Scrollable) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1">
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryClick(cat)}
                className={clsx(
                  'h-7 px-2.5 text-12 font-medium rounded-sm border whitespace-nowrap transition-colors cursor-pointer select-none',
                  isSelected
                    ? 'bg-accent text-white border-accent'
                    : 'bg-surface text-mute hover:text-ink border-line hover:border-lineStrong'
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Filter Toggle and Sort */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={clsx(
              'h-8 px-2.5 flex items-center gap-1.5 text-12 font-medium rounded-sm border transition-colors cursor-pointer',
              showAdvanced || filters.condition || filters.minPrice || filters.maxPrice
                ? 'bg-accent-soft text-accent border-accent'
                : 'bg-surface text-mute hover:text-ink border-line'
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
          </button>

          <div className="relative flex items-center">
            <select
              value={filters.sort || 'new'}
              onChange={(e) => onChange({ ...filters, sort: e.target.value as any })}
              className="h-8 pl-7 pr-4 text-12 bg-surface text-ink border border-line rounded-sm appearance-none outline-none cursor-pointer"
            >
              <option value="new">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 absolute left-2 text-mute pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Advanced Filter Drawer */}
      {showAdvanced && (
        <div className="pt-2 pb-1 border-t border-line/60 flex flex-wrap items-center gap-4 text-12 text-ink">
          {/* Condition Filter */}
          <div className="flex items-center gap-2">
            <span className="text-mute font-medium">Condition:</span>
            {['All', 'NEW', 'LIKE_NEW', 'GOOD', 'FAIR'].map((cond) => {
              const isSelected = (filters.condition || 'All') === cond;
              return (
                <button
                  key={cond}
                  type="button"
                  onClick={() =>
                    onChange({ ...filters, condition: cond === 'All' ? undefined : cond })
                  }
                  className={clsx(
                    'px-2 py-0.5 rounded-sm border transition-colors cursor-pointer text-11 uppercase font-medium',
                    isSelected
                      ? 'bg-ink text-white border-ink'
                      : 'bg-surface text-mute hover:text-ink border-line'
                  )}
                >
                  {cond.replace('_', ' ')}
                </button>
              );
            })}
          </div>

          {/* Price Range */}
          <div className="flex items-center gap-2">
            <span className="text-mute font-medium">Price:</span>
            <input
              type="number"
              placeholder="Min ₹"
              value={filters.minPrice || ''}
              onChange={(e) =>
                onChange({ ...filters, minPrice: e.target.value ? Number(e.target.value) : undefined })
              }
              className="w-20 h-7 px-2 bg-surface text-12 border border-line rounded-sm outline-none"
            />
            <span className="text-mute">-</span>
            <input
              type="number"
              placeholder="Max ₹"
              value={filters.maxPrice || ''}
              onChange={(e) =>
                onChange({ ...filters, maxPrice: e.target.value ? Number(e.target.value) : undefined })
              }
              className="w-20 h-7 px-2 bg-surface text-12 border border-line rounded-sm outline-none"
            />
          </div>

          {/* Clear Filters */}
          <button
            type="button"
            onClick={() => onChange({})}
            className="text-12 text-accent hover:underline ml-auto cursor-pointer"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
};
