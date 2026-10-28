import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ImageUploader } from '@/components/ImageUploader';
import { ListingCard } from '@/components/ListingCard';
import { useCreateListing, ListingItem } from '@/hooks/useListings';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';

const newListingSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters').max(3000),
  category: z.string().min(1, 'Category is required'),
  condition: z.enum(['NEW', 'LIKE_NEW', 'GOOD', 'FAIR']),
  price: z.coerce.number().int().min(1, 'Price must be at least ₹1'),
  negotiable: z.boolean().default(false),
});

type NewListingFormData = z.infer<typeof newListingSchema>;

const DRAFT_KEY = 'cx_listing_draft_v1';

export const NewListingPage: React.FC = () => {
  const [images, setImages] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isNlpLoading, setIsNlpLoading] = useState(false);
  const [nlpSuggestion, setNlpSuggestion] = useState<any | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const createListingMutation = useCreateListing();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<NewListingFormData>({
    resolver: zodResolver(newListingSchema),
    defaultValues: {
      condition: 'GOOD',
      negotiable: false,
      category: 'Books',
    },
  });

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.form) reset(parsed.form);
        if (parsed.images) setImages(parsed.images);
        if (parsed.tags) setTags(parsed.tags);
      }
    } catch {
      // ignore
    }
  }, [reset]);

  // Auto-save draft on changes
  const watchedValues = watch();
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            form: watchedValues,
            images,
            tags,
          })
        );
      } catch {
        // storage full
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [watchedValues, images, tags]);

  // Handle NLP description polish
  const handleImproveDescription = async () => {
    const rawText = watchedValues.description;
    if (!rawText || rawText.trim().length < 5) {
      toast({
        type: 'warn',
        title: 'Add some details first',
        description: 'Type a few words about your item condition, age, or brand.',
      });
      return;
    }

    try {
      setIsNlpLoading(true);
      const res = await api.post('/nlp/describe', {
        text: rawText,
        title: watchedValues.title,
        category: watchedValues.category,
        price: watchedValues.price,
      });
      setNlpSuggestion(res.data);
    } catch {
      toast({
        type: 'error',
        title: 'NLP service unavailable',
        description: 'You can proceed with your original description.',
      });
    } finally {
      setIsNlpLoading(false);
    }
  };

  const applyNlpSuggestion = () => {
    if (!nlpSuggestion) return;
    if (nlpSuggestion.description) setValue('description', nlpSuggestion.description);
    if (nlpSuggestion.title && !watchedValues.title) setValue('title', nlpSuggestion.title);
    if (nlpSuggestion.category) setValue('category', nlpSuggestion.category);
    if (nlpSuggestion.condition) setValue('condition', nlpSuggestion.condition);
    if (nlpSuggestion.tags) setTags(nlpSuggestion.tags);
    setNlpSuggestion(null);
    toast({
      type: 'success',
      title: 'Suggestion applied',
      description: 'Your listing fields have been updated.',
    });
  };

  const onSubmit = async (data: NewListingFormData) => {
    if (images.length === 0) {
      toast({
        type: 'warn',
        title: 'Photo required',
        description: 'Please upload at least 1 image of your item.',
      });
      return;
    }

    try {
      const res = await createListingMutation.mutateAsync({
        ...data,
        images,
        tags,
      });

      localStorage.removeItem(DRAFT_KEY);

      if (res.warnMissingUpi) {
        toast({
          type: 'warn',
          title: 'Item listed (Payment missing)',
          description: 'Set your UPI ID in Profile so buyers can pay you directly.',
        });
      } else {
        toast({
          type: 'success',
          title: 'Item listed',
          description: 'Your item is live in the campus marketplace.',
        });
      }

      navigate(`/listing/${res.listing.id}`);
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Could not create listing',
        description: err.response?.data?.error?.message || 'Please check your inputs.',
      });
    }
  };

  // Construct mock listing for live preview card
  const previewListing: ListingItem = {
    id: 'preview',
    sellerId: user?.id || 'me',
    title: watchedValues.title || 'Untitled Campus Item',
    description: watchedValues.description || 'Item description will appear here...',
    category: watchedValues.category || 'Books',
    condition: watchedValues.condition || 'GOOD',
    price: watchedValues.price || 0,
    negotiable: watchedValues.negotiable || false,
    images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80'],
    tags,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seller: {
      id: user?.id || 'me',
      name: user?.name || 'You',
      branch: user?.branch || 'Campus',
      year: user?.year,
    },
  };

  const categoryOptions = [
    { value: 'Books', label: 'Books & Reference Material' },
    { value: 'Electronics', label: 'Electronics & Gadgets' },
    { value: 'Vehicles', label: 'Cycles & Vehicles' },
    { value: 'Hostel & Kitchen', label: 'Hostel & Kitchen' },
    { value: 'Lab & Stationery', label: 'Lab & Stationery' },
    { value: 'Sports', label: 'Sports & Fitness' },
    { value: 'Clothing', label: 'Clothing & Uniforms' },
    { value: 'Other', label: 'Other' },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-20 sm:text-24 font-semibold text-ink">List an Item for Sale</h1>
        <p className="text-13 text-mute mt-1">Takes less than 60 seconds. College students buy directly via UPI.</p>
      </div>

      {/* Warning banner if UPI is not configured */}
      {user && !user.upiId && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-sm flex items-start gap-3 text-left">
          <AlertTriangle className="w-4 h-4 text-warn shrink-0 mt-0.5" />
          <div className="flex-1 text-13">
            <p className="font-semibold text-warn">You haven't set up your UPI payment details yet.</p>
            <p className="text-mute mt-0.5">
              Buyers won't be able to pay until you add your UPI ID in your Profile settings.
            </p>
          </div>
          <Link to="/profile">
            <Button size="sm" variant="secondary" className="border-amber-300 text-warn">
              Set UPI Now
            </Button>
          </Link>
        </div>
      )}

      {/* Main Grid: Form Left, Live Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Left */}
        <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-7 space-y-5 text-left">
          {/* Images */}
          <div className="border border-line rounded-sm p-4 bg-bg">
            <ImageUploader images={images} onChange={setImages} />
          </div>

          {/* Core Info */}
          <div className="border border-line rounded-sm p-4 bg-bg space-y-4">
            <Input
              label="Item Title"
              placeholder="e.g. Hero Sprint Pro 21 Speed Cycle"
              error={errors.title?.message}
              {...register('title')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Category"
                options={categoryOptions}
                error={errors.category?.message}
                {...register('category')}
              />

              <Select
                label="Condition"
                options={[
                  { value: 'NEW', label: 'Brand New (Unused)' },
                  { value: 'LIKE_NEW', label: 'Like New (Barely Used)' },
                  { value: 'GOOD', label: 'Good (Normal Wear, Fully Functional)' },
                  { value: 'FAIR', label: 'Fair (Has Defects/Scratches)' },
                ]}
                error={errors.condition?.message}
                {...register('condition')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <Input
                label="Price (₹ INR)"
                type="number"
                placeholder="₹ Amount"
                error={errors.price?.message}
                {...register('price')}
              />

              <div className="flex items-center gap-2 h-10 px-3 bg-surface border border-line rounded-sm">
                <input
                  type="checkbox"
                  id="negotiable"
                  className="w-4 h-4 text-accent rounded-sm focus:ring-accent"
                  {...register('negotiable')}
                />
                <label htmlFor="negotiable" className="text-13 font-medium text-ink cursor-pointer select-none">
                  Price is negotiable
                </label>
              </div>
            </div>

            {/* Description & NLP Improve */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-12 font-medium text-mute select-none">
                  Description
                </label>
                <button
                  type="button"
                  onClick={handleImproveDescription}
                  disabled={isNlpLoading}
                  className="inline-flex items-center gap-1.5 text-12 font-medium text-accent hover:text-accent-hover cursor-pointer"
                >
                  {isNlpLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>✦ Improve (Ctrl+J)</span>
                </button>
              </div>

              <Textarea
                rows={4}
                placeholder="Mention age, defects, working condition, accessories included..."
                error={errors.description?.message}
                {...register('description')}
              />

              {/* NLP Suggestion Diff / Panel */}
              {nlpSuggestion && (
                <div className="p-3.5 bg-accent-soft/60 border border-blue-200 rounded-sm space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-12 font-semibold text-accent flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        Polished Description
                      </span>
                      {nlpSuggestion.source && (
                        <Badge
                          variant={nlpSuggestion.source === 'gemini' ? 'accent' : 'muted'}
                          className="text-[10px] lowercase"
                        >
                          {nlpSuggestion.source === 'gemini' ? '✦ gemini' : 'rules'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setNlpSuggestion(null)}
                        className="text-11 text-mute hover:text-ink px-2 py-0.5 rounded-sm bg-white border border-line cursor-pointer"
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        onClick={applyNlpSuggestion}
                        className="text-11 text-white px-2 py-0.5 rounded-sm bg-accent font-medium cursor-pointer"
                      >
                        Accept Suggestion
                      </button>
                    </div>
                  </div>

                  <p className="text-13 text-ink leading-relaxed">
                    {nlpSuggestion.description}
                  </p>

                  {nlpSuggestion.missing && nlpSuggestion.missing.length > 0 && (
                    <div className="pt-1.5 border-t border-blue-100 flex items-center gap-1.5 flex-wrap">
                      <span className="text-11 text-mute font-medium">Recommended details to add:</span>
                      {nlpSuggestion.missing.map((item: string) => (
                        <span
                          key={item}
                          className="text-11 px-1.5 py-0.5 bg-white text-ink border border-line rounded-sm"
                        >
                          + {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={createListingMutation.isPending}
            className="w-full"
          >
            Publish Listing
          </Button>
        </form>

        {/* Live Preview Card Right (Desktop >= 1024) */}
        <div className="hidden lg:flex flex-col space-y-3 lg:col-span-5 sticky top-20">
          <div className="flex items-center justify-between">
            <span className="text-12 font-semibold uppercase tracking-wider text-mute">
              Live Preview
            </span>
            <span className="text-11 text-faint">How buyers see it</span>
          </div>

          <div className="max-w-sm w-full mx-auto">
            <ListingCard listing={previewListing} />
          </div>

          <p className="text-12 text-mute text-center pt-2">
            Card updates live as you type and add photos.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NewListingPage;
