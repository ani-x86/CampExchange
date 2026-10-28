import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShoppingBag, Loader2, Plus } from 'lucide-react';
import { useListings, ListingFilters } from '@/hooks/useListings';
import { FilterBar } from '@/components/FilterBar';
import { ListingGrid } from '@/components/ListingGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { useToggleSaveListing } from '@/hooks/useListings';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';

export const DashboardPage: React.FC = () => {
  const [filters, setFilters] = useState<ListingFilters>({});
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useListings(filters, true);

  const toggleSaveMutation = useToggleSaveListing();

  const allListings = data?.pages.flatMap((page) => page.items) || [];

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchNextPage();
      },
      { threshold: 0.2 }
    );
    const el = loadMoreRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      if (allListings.length === 0) return;
      if (e.key === 'ArrowRight' || e.key === 'j') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1 < allListings.length ? prev + 1 : prev));
      } else if (e.key === 'ArrowLeft' || e.key === 'k') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < allListings.length) {
        navigate(`/listing/${allListings[focusedIndex].id}`);
      } else if ((e.key === 's' || e.key === 'S') && focusedIndex >= 0 && focusedIndex < allListings.length) {
        const item = allListings[focusedIndex];
        handleSaveToggle(item.id, item.isSaved || false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allListings, focusedIndex, navigate]);

  const handleSaveToggle = (id: string, currentlySaved: boolean) => {
    if (!user) {
      toast({ type: 'warn', title: 'Sign in required', description: 'Please sign in to save items.' });
      navigate('/login');
      return;
    }
    toggleSaveMutation.mutate(
      { id, currentlySaved },
      {
        onSuccess: (res) => {
          toast({ type: 'info', title: res.isSaved ? 'Item saved' : 'Item removed from saved' });
        },
      }
    );
  };

  return (
    <div className="w-full max-w-[2200px] mx-auto px-4 sm:px-6 3xl:px-8 py-4 space-y-6">
      <FilterBar filters={filters} onChange={setFilters} />
      {isError ? (
        <EmptyState title="Could not load items" description="Failed to fetch marketplace listings." />
      ) : !isLoading && allListings.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="w-6 h-6" />}
          title="No items match your filters"
          description="Try broadening your search."
          action={
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setFilters({})}>Clear filters</Button>
              <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/sell')}>List the first item</Button>
            </div>
          }
        />
      ) : (
        <>
          <ListingGrid listings={allListings} isLoading={isLoading} onSaveToggle={handleSaveToggle} focusedIndex={focusedIndex} />
          <div ref={loadMoreRef} className="py-6 flex justify-center">
            {isFetchingNextPage && (
              <div className="flex items-center gap-2 text-mute text-13">
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
                <span>Loading more items...</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;