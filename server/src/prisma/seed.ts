import 'dotenv/config';
import path from 'node:path';
import { prisma } from './client.js';
import { importStudents } from '../scripts/import-students.js';

type DemoListing = {
  title: string;
  description: string;
  category: string;
  condition: 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR';
  price: number;
  negotiable: boolean;
  images: string[];
  tags: string[];
};

const demoListings: DemoListing[] = [
  {
    title: 'Hero Sprint Pro 21 Speed Cycle',
    description: 'Hero Sprint 21-speed mountain bike in great working condition. Shimano gears shift smoothly, dual disc brakes with fresh pads, and tires replaced last semester. Minor scratches on the frame from campus cycle stands.',
    category: 'Vehicles',
    condition: 'GOOD',
    price: 3500,
    negotiable: true,
    images: ['https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80'],
    tags: ['cycle', 'hero', 'gears', 'shimano', 'campus'],
  },
  {
    title: 'Casio FX-991EX ClassWiz Scientific Calculator',
    description: 'Genuine Casio FX-991EX non-programmable scientific calculator. The screen is scratch-free, solar cell and battery work, and the original hard case is included.',
    category: 'Electronics',
    condition: 'LIKE_NEW',
    price: 850,
    negotiable: false,
    images: ['https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=800&q=80'],
    tags: ['casio', 'calculator', 'scientific', 'exam'],
  },
  {
    title: 'Higher Engineering Mathematics - B.S. Grewal',
    description: 'Engineering mathematics textbook with clean pages and intact binding. No highlighter marks or torn leaves.',
    category: 'Books',
    condition: 'GOOD',
    price: 450,
    negotiable: true,
    images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80'],
    tags: ['books', 'maths', 'grewal', 'textbook'],
  },
  {
    title: 'Prestige Stainless Steel Electric Kettle',
    description: 'Prestige electric kettle with automatic cutoff and swivel base. Clean interior and working condition.',
    category: 'Hostel & Kitchen',
    condition: 'LIKE_NEW',
    price: 600,
    negotiable: false,
    images: ['https://images.unsplash.com/photo-1585695084931-92576b2e361d?auto=format&fit=crop&w=800&q=80'],
    tags: ['kettle', 'prestige', 'hostel', 'kitchen'],
  },
  {
    title: 'Cotton White Chemistry Lab Coat (Size L)',
    description: 'White cotton lab coat with three pockets. Clean, ironed, and without stains. Size large.',
    category: 'Lab & Stationery',
    condition: 'LIKE_NEW',
    price: 250,
    negotiable: false,
    images: ['https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&w=800&q=80'],
    tags: ['labcoat', 'chemistry', 'workshop', 'cotton'],
  },
  {
    title: 'Yonex Nanoray Light Badminton Racket',
    description: 'Lightweight graphite frame, strung with Yonex BG65 at 24 lbs. Grip recently replaced.',
    category: 'Sports',
    condition: 'GOOD',
    price: 1200,
    negotiable: true,
    images: ['https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80'],
    tags: ['yonex', 'badminton', 'racket', 'sports'],
  },
  {
    title: 'Compact Foldable Study Table',
    description: 'Foldable wooden study table with metal legs and a cup holder. Folds flat for storage in a hostel room.',
    category: 'Hostel & Kitchen',
    condition: 'GOOD',
    price: 550,
    negotiable: false,
    images: ['https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=800&q=80'],
    tags: ['table', 'study', 'furniture', 'hostel'],
  },
  {
    title: 'Sony Wireless Bluetooth Headphones',
    description: 'Sony wireless headphones with multipoint connection, original charging cable, and working microphone.',
    category: 'Electronics',
    condition: 'NEW',
    price: 2400,
    negotiable: true,
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'],
    tags: ['sony', 'headphones', 'bluetooth', 'wireless'],
  },
];

const seedDemoData = async (students: Array<{ id: string; prn: string; name: string }>) => {
  if (students.length < 2) throw new Error('Demo data requires at least two imported students.');

  const firstStudent = students[0];
  const secondStudent = students[1];
  const listings: Array<{ id: string; sellerId: string }> = [];
  let createdListings = 0;

  for (const [index, item] of demoListings.entries()) {
    const sellerId = index % 2 === 0 ? firstStudent.id : secondStudent.id;
    const existing = await prisma.listing.findFirst({
      where: { sellerId, title: item.title },
      select: { id: true, sellerId: true },
    });
    const listing = existing ?? await prisma.listing.create({
      data: { ...item, sellerId, status: 'ACTIVE' },
      select: { id: true, sellerId: true },
    });
    if (!existing) createdListings += 1;
    listings.push(listing);
  }

  const demoListing = listings[0];
  const existingConversation = await prisma.conversation.findUnique({
    where: {
      listingId_buyerId_sellerId: {
        listingId: demoListing.id,
        buyerId: secondStudent.id,
        sellerId: firstStudent.id,
      },
    },
    select: { id: true },
  });
  if (!existingConversation) {
    const conversation = await prisma.conversation.create({
      data: {
        listingId: demoListing.id,
        buyerId: secondStudent.id,
        sellerId: firstStudent.id,
        lastMessageAt: new Date(),
      },
    });
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: secondStudent.id,
        type: 'TEXT',
        body: 'Hi, is this listing available?',
      },
    });
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: firstStudent.id,
        type: 'TEXT',
        body: 'Yes, it is available.',
      },
    });
  }

  console.log(`Demo data: listings created ${createdListings}, conversations created ${existingConversation ? 0 : 1}`);
};

const runSeed = async (): Promise<void> => {
  try {
    const args = process.argv.slice(2);
    const allowedArgs = new Set(['--demo', '--reset-passwords']);
    if (args.some((arg) => !allowedArgs.has(arg))) {
      console.error('Unsupported seed option.');
      process.exitCode = 2;
      return;
    }

    const includeDemo = args.includes('--demo');
    if (includeDemo && process.env.NODE_ENV === 'production') {
      console.error('Demo data is disabled in production.');
      process.exitCode = 1;
      return;
    }

    const summary = await importStudents({ resetPasswords: args.includes('--reset-passwords') });
    if (summary.errors > 0) {
      process.exitCode = 1;
      return;
    }
    if (includeDemo) await seedDemoData(summary.students);
  } catch {
    console.error('Seed failed. No credentials were written to logs.');
    process.exitCode = 1;
  } finally {
    console.log('Delete student.csv after seeding.');
    await prisma.$disconnect();
  }
};

if (path.basename(process.argv[1] ?? '') === 'seed.ts') {
  void runSeed();
}
