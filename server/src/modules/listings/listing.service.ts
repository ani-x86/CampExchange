import { prisma } from '../../prisma/client.js';
import { CreateListingInput, UpdateListingInput, ListingQueryInput } from './listing.schema.js';

export const getListings = async (query: ListingQueryInput, currentUserId?: string) => {
  const { q, category, condition, minPrice, maxPrice, sort, cursor, limit } = query;

  const where: any = {
    status: 'ACTIVE',
  };

  if (category && category !== 'All') {
    where.category = category;
  }

  if (condition) {
    where.condition = condition;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined) where.price.gte = minPrice;
    if (maxPrice !== undefined) where.price.lte = maxPrice;
  }

  if (q && q.trim()) {
    const term = q.trim();
    where.OR = [
      { title: { contains: term } },
      { description: { contains: term } },
      { tags: { has: term } },
    ];
  }

  const orderBy: any[] = [];
  if (sort === 'price_asc') {
    orderBy.push({ price: 'asc' });
  } else if (sort === 'price_desc') {
    orderBy.push({ price: 'desc' });
  } else {
    orderBy.push({ createdAt: 'desc' });
  }

  const numericLimit = Number(limit) || 12;

  const items = await prisma.listing.findMany({
    where,
    take: numericLimit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    orderBy,
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          branch: true,
          year: true,
          avatarUrl: true,
          upiId: true,
        },
      },
      ...(currentUserId
        ? {
            savedBy: {
              where: { userId: currentUserId },
              select: { userId: true },
            },
          }
        : {}),
    },
  });

  let nextCursor: string | null = null;
  if (items.length > numericLimit) {
    const nextItem = items.pop();
    nextCursor = nextItem?.id || null;
  }

  const formattedItems = items.map((item: (typeof items)[number]) => ({
    ...item,
    isSaved: currentUserId ? item.savedBy && item.savedBy.length > 0 : false,
    savedBy: undefined,
  }));

  return {
    items: formattedItems,
    nextCursor,
  };
};

export const getListingById = async (id: string, currentUserId?: string) => {
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          branch: true,
          year: true,
          hostel: true,
          avatarUrl: true,
          upiId: true,
        },
      },
      ...(currentUserId
        ? {
            savedBy: {
              where: { userId: currentUserId },
              select: { userId: true },
            },
          }
        : {}),
    },
  });

  if (!listing) {
    throw {
      status: 404,
      code: 'NOT_FOUND',
      message: 'Listing not found',
    };
  }

  return {
    ...listing,
    isSaved: currentUserId ? listing.savedBy && listing.savedBy.length > 0 : false,
    savedBy: undefined,
    sellerHasUpi: !!listing.seller.upiId,
  };
};

export const createListing = async (sellerId: string, input: CreateListingInput) => {
  const seller = await prisma.user.findUnique({
    where: { id: sellerId },
    select: { id: true, upiId: true },
  });

  if (!seller) {
    throw { status: 404, code: 'NOT_FOUND', message: 'Seller not found' };
  }

  const listing = await prisma.listing.create({
    data: {
      sellerId,
      title: input.title,
      description: input.description,
      category: input.category,
      condition: input.condition,
      price: input.price,
      negotiable: input.negotiable ?? false,
      images: input.images,
      tags: input.tags ?? [],
      status: 'ACTIVE',
    },
  });

  return {
    listing,
    warnMissingUpi: !seller.upiId,
  };
};

export const updateListing = async (
  id: string,
  userId: string,
  input: UpdateListingInput
) => {
  const listing = await prisma.listing.findUnique({ where: { id } });

  if (!listing) {
    throw { status: 404, code: 'NOT_FOUND', message: 'Listing not found' };
  }

  if (listing.sellerId !== userId) {
    throw { status: 403, code: 'FORBIDDEN', message: 'Not authorized to edit this listing' };
  }

  const updateData: any = {};
  if (input.title) updateData.title = input.title;
  if (input.description) updateData.description = input.description;
  if (input.category) updateData.category = input.category;
  if (input.condition) updateData.condition = input.condition;
  if (input.price !== undefined) updateData.price = input.price;
  if (input.negotiable !== undefined) updateData.negotiable = input.negotiable;
  if (input.images) updateData.images = input.images;
  if (input.tags) updateData.tags = input.tags;
  if (input.status) updateData.status = input.status;

  const updated = await prisma.listing.update({
    where: { id },
    data: updateData,
  });

  return updated;
};

export const deleteListing = async (id: string, userId: string) => {
  const listing = await prisma.listing.findUnique({ where: { id } });

  if (!listing) {
    throw { status: 404, code: 'NOT_FOUND', message: 'Listing not found' };
  }

  if (listing.sellerId !== userId) {
    throw { status: 403, code: 'FORBIDDEN', message: 'Not authorized to delete this listing' };
  }

  await prisma.listing.update({
    where: { id },
    data: { status: 'REMOVED' },
  });

  return { ok: true, message: 'Listing marked as removed' };
};

export const toggleSaveListing = async (listingId: string, userId: string) => {
  const existing = await prisma.savedListing.findUnique({
    where: {
      userId_listingId: {
        userId,
        listingId,
      },
    },
  });

  if (existing) {
    await prisma.savedListing.delete({
      where: {
        userId_listingId: {
          userId,
          listingId,
        },
      },
    });
    return { isSaved: false };
  } else {
    await prisma.savedListing.create({
      data: {
        userId,
        listingId,
      },
    });
    return { isSaved: true };
  }
};

export const getMyListings = async (userId: string) => {
  const listings = await prisma.listing.findMany({
    where: {
      sellerId: userId,
      status: { not: 'REMOVED' },
    },
    orderBy: { createdAt: 'desc' },
  });

  return listings;
};

export const getMySavedListings = async (userId: string) => {
  const saved = await prisma.savedListing.findMany({
    where: { userId },
    include: {
      listing: {
        include: {
          seller: {
            select: { id: true, name: true, branch: true, year: true, avatarUrl: true },
          },
        },
      },
    },
    orderBy: { listing: { createdAt: 'desc' } },
  });

  return saved.map((s: (typeof saved)[number]) => ({ ...s.listing, isSaved: true }));
};
