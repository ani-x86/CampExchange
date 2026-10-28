import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ListingItem {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  category: string;
  condition: 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR';
  price: number;
  negotiable: boolean;
  images: string[];
  tags: string[];
  status: 'ACTIVE' | 'RESERVED' | 'SOLD' | 'REMOVED';
  createdAt: string;
  updatedAt: string;
  isSaved?: boolean;
  sellerHasUpi?: boolean;
  seller: {
    id: string;
    name: string;
    branch?: string | null;
    year?: string | null;
    hostel?: string | null;
    avatarUrl?: string | null;
    upiId?: string | null;
  };
}

export interface ListingFilters {
  q?: string;
  category?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'new' | 'price_asc' | 'price_desc';
}

export const useListings = (filters: ListingFilters = {}, enabled = true) => {
  return useInfiniteQuery({
    queryKey: ['listings', filters],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      if (filters.category && filters.category !== 'All') params.set('category', filters.category);
      if (filters.condition && filters.condition !== 'All') params.set('condition', filters.condition);
      if (filters.minPrice !== undefined) params.set('minPrice', filters.minPrice.toString());
      if (filters.maxPrice !== undefined) params.set('maxPrice', filters.maxPrice.toString());
      if (filters.sort) params.set('sort', filters.sort);
      if (pageParam) params.set('cursor', pageParam);
      params.set('limit', '12');

      const res = await api.get<{ items: ListingItem[]; nextCursor: string | null }>(
        `/listings?${params.toString()}`
      );
      return res.data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled,
  });
};

export const useListingDetail = (id: string) => {
  return useQuery({
    queryKey: ['listing', id],
    queryFn: async () => {
      const res = await api.get<{ listing: ListingItem }>(`/listings/${id}`);
      return res.data.listing;
    },
    enabled: !!id,
  });
};

export const useCreateListing = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      title: string;
      description: string;
      category: string;
      condition: string;
      price: number;
      negotiable: boolean;
      images: string[];
      tags?: string[];
    }) => {
      const res = await api.post<{ listing: ListingItem; warnMissingUpi: boolean }>(
        '/listings',
        data
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'listings'] });
    },
  });
};

export const useUpdateListing = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<ListingItem>) => {
      const res = await api.patch<{ listing: ListingItem }>(`/listings/${id}`, data);
      return res.data.listing;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['listing', id], updated);
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'listings'] });
    },
  });
};

export const useDeleteListing = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/listings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'listings'] });
    },
  });
};

export const useToggleSaveListing = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; currentlySaved?: boolean }) => {
      const res = await api.post<{ isSaved: boolean }>(`/listings/${id}/save`);
      return res.data;
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['listing', id] });
      queryClient.invalidateQueries({ queryKey: ['me', 'saved'] });
    },
  });
};

export const useMyListings = () => {
  return useQuery({
    queryKey: ['me', 'listings'],
    queryFn: async () => {
      const res = await api.get<{ listings: ListingItem[] }>('/me/listings');
      return res.data.listings;
    },
  });
};

export const useMySaved = () => {
  return useQuery({
    queryKey: ['me', 'saved'],
    queryFn: async () => {
      const res = await api.get<{ listings: ListingItem[] }>('/me/saved');
      return res.data.listings;
    },
  });
};
