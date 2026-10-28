import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ImageUploader } from '@/components/ImageUploader';
import { useListingDetail, useUpdateListing, useDeleteListing } from '@/hooks/useListings';
import { useToast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';

const editListingSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(3000),
  category: z.string().min(1),
  condition: z.enum(['NEW', 'LIKE_NEW', 'GOOD', 'FAIR']),
  price: z.coerce.number().int().min(1),
  negotiable: z.boolean(),
  status: z.enum(['ACTIVE', 'RESERVED', 'SOLD', 'REMOVED']),
});

type EditListingFormData = z.infer<typeof editListingSchema>;

export const EditListingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [images, setImages] = useState<string[]>([]);

  const { data: listing, isLoading } = useListingDetail(id || '');
  const updateListingMutation = useUpdateListing(id || '');
  const deleteListingMutation = useDeleteListing();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditListingFormData>({
    resolver: zodResolver(editListingSchema),
  });

  useEffect(() => {
    if (listing) {
      reset({
        title: listing.title,
        description: listing.description,
        category: listing.category,
        condition: listing.condition,
        price: listing.price,
        negotiable: listing.negotiable,
        status: listing.status,
      });
      setImages(listing.images);
    }
  }, [listing, reset]);

  const onSubmit = async (data: EditListingFormData) => {
    try {
      await updateListingMutation.mutateAsync({
        ...data,
        images,
      });
      toast({
        type: 'success',
        title: 'Listing updated',
        description: 'Your changes have been saved.',
      });
      navigate(`/listing/${id}`);
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Update failed',
        description: err.response?.data?.error?.message || 'Please check your inputs.',
      });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to remove this listing?')) return;
    try {
      await deleteListingMutation.mutateAsync(id || '');
      toast({ type: 'info', title: 'Listing removed', description: 'Item has been unlisted.' });
      navigate('/me');
    } catch {
      toast({ type: 'error', title: 'Delete failed', description: 'Could not remove listing.' });
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

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
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 text-left">
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div>
          <h1 className="text-20 font-semibold text-ink">Edit Listing</h1>
          <p className="text-13 text-mute">Update details or change listing status.</p>
        </div>
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={handleDelete}
          leftIcon={<Trash2 className="w-4 h-4" />}
        >
          Remove
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <ImageUploader images={images} onChange={setImages} />

        <Input label="Title" error={errors.title?.message} {...register('title')} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select label="Category" options={categoryOptions} error={errors.category?.message} {...register('category')} />
          <Select
            label="Condition"
            options={[
              { value: 'NEW', label: 'Brand New' },
              { value: 'LIKE_NEW', label: 'Like New' },
              { value: 'GOOD', label: 'Good' },
              { value: 'FAIR', label: 'Fair' },
            ]}
            error={errors.condition?.message}
            {...register('condition')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
          <Input label="Price (₹ INR)" type="number" error={errors.price?.message} {...register('price')} />
          <Select
            label="Status"
            options={[
              { value: 'ACTIVE', label: 'Active (Available)' },
              { value: 'RESERVED', label: 'Reserved' },
              { value: 'SOLD', label: 'Sold' },
            ]}
            {...register('status')}
          />
        </div>

        <div className="flex items-center gap-2 h-10 px-3 bg-surface border border-line rounded-sm">
          <input type="checkbox" id="edit-negotiable" className="w-4 h-4 text-accent" {...register('negotiable')} />
          <label htmlFor="edit-negotiable" className="text-13 font-medium text-ink cursor-pointer">
            Price is negotiable
          </label>
        </div>

        <Textarea label="Description" rows={4} error={errors.description?.message} {...register('description')} />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={updateListingMutation.isPending}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditListingPage;
