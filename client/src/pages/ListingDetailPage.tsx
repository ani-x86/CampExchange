import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Bookmark,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  ShoppingBag,
  Edit,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';
import {
  useListingDetail,
  useToggleSaveListing,
  useUpdateListing,
} from '@/hooks/useListings';
import { formatCurrency, formatTimeAgo } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';

export const ListingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);

  const { data: listing, isLoading, isError } = useListingDetail(id || '');
  const toggleSaveMutation = useToggleSaveListing();
  const updateListingMutation = useUpdateListing(id || '');

  const isOwner = user && listing && user.id === listing.sellerId;

  // Keyboard navigation for image gallery (ArrowLeft, ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!listing || listing.images.length <= 1) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'ArrowRight') {
        setActiveImageIndex((prev) => (prev + 1) % listing.images.length);
      } else if (e.key === 'ArrowLeft') {
        setActiveImageIndex((prev) => (prev - 1 + listing.images.length) % listing.images.length);
      } else if (e.key === 'b' || e.key === 'B') {
        if (!isOwner && listing.status === 'ACTIVE') handleBuyClick();
      } else if (e.key === 'c' || e.key === 'C') {
        if (!isOwner) handleChatClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [listing, isOwner]);

  if (isLoading) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <Skeleton className="md:col-span-7 aspect-[4/3] w-full" />
          <div className="md:col-span-5 space-y-4">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !listing) {
    return (
      <div className="w-full max-w-lg mx-auto py-16 px-4 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-danger mx-auto" />
        <h1 className="text-18 font-semibold text-ink">Item not found</h1>
        <p className="text-13 text-mute">This listing might have been removed or does not exist.</p>
        <Link to="/">
          <Button variant="secondary" size="sm">
            Back to browse
          </Button>
        </Link>
      </div>
    );
  }

  const images = listing.images.length > 0
    ? listing.images
    : ['https://placehold.co/800x600/FAFAFA/6B6B6B?text=Camp-Exchange'];

  const handleSaveToggle = () => {
    if (!user) {
      toast({ type: 'warn', title: 'Sign in required', description: 'Sign in to save items.' });
      navigate('/login');
      return;
    }
    toggleSaveMutation.mutate({ id: listing.id, currentlySaved: listing.isSaved });
  };

  const handleBuyClick = async () => {
    if (!user) {
      toast({ type: 'warn', title: 'Sign in required', description: 'Sign in to buy this item.' });
      navigate('/login');
      return;
    }

    if (!listing.sellerHasUpi) {
      toast({
        type: 'warn',
        title: 'Payments not set up',
        description: 'Seller has not configured their UPI ID yet. Chat with them to arrange.',
      });
      return;
    }

    try {
      setIsCreatingOrder(true);
      const res = await api.post<{ order: { id: string } }>('/orders', {
        listingId: listing.id,
      });
      navigate(`/checkout/${res.data.order.id}`);
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Could not create order',
        description: err.response?.data?.error?.message || 'Item might already be reserved.',
      });
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleChatClick = async () => {
    if (!user) {
      toast({ type: 'warn', title: 'Sign in required', description: 'Sign in to chat with the seller.' });
      navigate('/login');
      return;
    }

    try {
      setIsStartingChat(true);
      const res = await api.post<{ conversation: { id: string } }>('/conversations', {
        listingId: listing.id,
      });
      navigate(`/inbox/${res.data.conversation.id}`);
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Chat failed',
        description: err.response?.data?.error?.message || 'Could not start conversation.',
      });
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleMarkSold = async () => {
    try {
      await updateListingMutation.mutateAsync({ status: 'SOLD' });
      toast({ type: 'success', title: 'Marked as Sold', description: 'Item updated.' });
    } catch {
      toast({ type: 'error', title: 'Update failed', description: 'Could not mark as sold.' });
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Back button */}
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-12 font-medium text-mute hover:text-ink cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Column: Image Gallery */}
        <div className="md:col-span-7 space-y-3">
          {/* Main Photo */}
          <div className="relative aspect-[4/3] w-full bg-surface border border-line rounded-sm overflow-hidden select-none">
            <img
              src={images[activeImageIndex]}
              alt={listing.title}
              className="w-full h-full object-cover"
            />

            {/* Prev / Next Arrows if multi-image */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length)
                  }
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 hover:bg-black text-white rounded-sm transition-colors cursor-pointer"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveImageIndex((prev) => (prev + 1) % images.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 hover:bg-black text-white rounded-sm transition-colors cursor-pointer"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Status Overlay */}
            {listing.status === 'SOLD' && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="bg-ink text-white text-14 font-semibold px-3 py-1.5 rounded-sm uppercase tracking-wider">
                  SOLD
                </span>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {images.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={clsx(
                    'relative w-16 h-12 bg-surface border rounded-sm overflow-hidden shrink-0 cursor-pointer transition-all',
                    idx === activeImageIndex
                      ? 'border-accent ring-2 ring-accent-soft'
                      : 'border-line opacity-70 hover:opacity-100'
                  )}
                >
                  <img src={url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Description Section */}
          <div className="border border-line rounded-sm p-4 sm:p-5 bg-bg space-y-3 text-left">
            <h2 className="text-14 font-semibold text-ink uppercase tracking-wider text-xs">
              Description
            </h2>
            <p className="text-14 text-ink leading-relaxed whitespace-pre-line">
              {listing.description}
            </p>

            {/* Tags */}
            {listing.tags && listing.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {listing.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-11 font-mono text-mute bg-surface border border-line px-2 py-0.5 rounded-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pricing, Seller & Actions */}
        <div className="md:col-span-5 space-y-5 text-left">
          {/* Price Box */}
          <div className="border border-line rounded-sm p-5 bg-bg space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-mono text-28 font-semibold text-ink">
                  {formatCurrency(listing.price)}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="default">{listing.condition.replace('_', ' ')}</Badge>
                  {listing.negotiable && (
                    <span className="text-12 font-medium text-mute">Price Negotiable</span>
                  )}
                </div>
              </div>
              <Badge variant="accent">{listing.category}</Badge>
            </div>

            <h1 className="text-18 font-semibold text-ink leading-snug">{listing.title}</h1>

            <div className="text-12 text-mute border-t border-line pt-3 flex items-center justify-between">
              <span>Listed {formatTimeAgo(listing.createdAt)}</span>
              <span>Camp-Exchange Verified</span>
            </div>

            {/* Actions */}
            <div className="space-y-2.5 pt-2">
              {isOwner ? (
                <div className="space-y-2">
                  <Link to={`/sell/${listing.id}/edit`}>
                    <Button variant="secondary" className="w-full" leftIcon={<Edit className="w-4 h-4" />}>
                      Edit Listing
                    </Button>
                  </Link>
                  {listing.status === 'ACTIVE' && (
                    <Button
                      variant="ghost"
                      onClick={handleMarkSold}
                      className="w-full"
                      leftIcon={<CheckCircle2 className="w-4 h-4 text-ok" />}
                    >
                      Mark as Sold
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleBuyClick}
                    isLoading={isCreatingOrder}
                    disabled={listing.status !== 'ACTIVE'}
                    leftIcon={<ShoppingBag className="w-4 h-4" />}
                    className="w-full"
                  >
                    {listing.status === 'ACTIVE'
                      ? 'Buy Now (B)'
                      : listing.status === 'RESERVED'
                      ? 'Currently Reserved'
                      : 'Sold Out'}
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="secondary"
                      onClick={handleChatClick}
                      isLoading={isStartingChat}
                      leftIcon={<MessageSquare className="w-4 h-4" />}
                    >
                      Chat (C)
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={handleSaveToggle}
                      leftIcon={
                        <Bookmark
                          className={clsx('w-4 h-4', listing.isSaved && 'fill-accent text-accent')}
                        />
                      }
                    >
                      {listing.isSaved ? 'Saved' : 'Save'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Seller Card */}
          <div className="border border-line rounded-sm p-4 bg-surface space-y-3">
            <h3 className="text-12 font-semibold text-mute uppercase tracking-wider">
              Seller Information
            </h3>
            <div className="flex items-center gap-3">
              {listing.seller.avatarUrl ? (
                <img
                  src={listing.seller.avatarUrl}
                  alt={listing.seller.name}
                  className="w-10 h-10 rounded-full object-cover border border-line"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-bg border border-line text-ink font-semibold flex items-center justify-center text-14">
                  {listing.seller.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-14 font-semibold text-ink">{listing.seller.name}</p>
                <p className="text-12 text-mute">
                  {[listing.seller.branch, listing.seller.year ? `Year ${listing.seller.year}` : null]
                    .filter(Boolean)
                    .join(' • ') || 'Student'}
                </p>
                {listing.seller.hostel && (
                  <p className="text-11 text-faint">{listing.seller.hostel}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-12 text-mute pt-2 border-t border-line/60">
              <ShieldCheck className="w-4 h-4 text-ok shrink-0" />
              <span>Campus peer-to-peer handover. Pay only after verifying item.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingDetailPage;
