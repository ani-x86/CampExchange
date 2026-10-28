/**
 * Seed demo/admin accounts for Camp-Exchange.
 * Run: npx tsx src/prisma/seed-demo-accounts.ts
 *
 * These accounts are tagged batch='DEMO' so they are hidden from
 * public-facing student lists, but can log in normally and have ADMIN role
 * to monitor all user activity through the admin panel.
 *
 * NEVER commit actual passwords – this file only stores the plaintext
 * during the seeding process; bcrypt hashes are what gets stored in the DB.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from './client.js';

const DEMO_ACCOUNTS = [
  { prn: 'DEMO000001', rollNo: 90001, name: 'Demo Admin Alpha',   password: 'CampEx@Demo1' },
  { prn: 'DEMO000002', rollNo: 90002, name: 'Demo Admin Beta',    password: 'CampEx@Demo2' },
  { prn: 'DEMO000003', rollNo: 90003, name: 'Demo Admin Gamma',   password: 'CampEx@Demo3' },
  { prn: 'DEMO000004', rollNo: 90004, name: 'Demo Admin Delta',   password: 'CampEx@Demo4' },
  { prn: 'DEMO000005', rollNo: 90005, name: 'Demo Admin Epsilon', password: 'CampEx@Demo5' },
] as const;

async function seedDemoAccounts() {
  console.log('Seeding demo admin accounts…\n');

  const results: { prn: string; password: string; name: string }[] = [];

  for (const acct of DEMO_ACCOUNTS) {
    const passwordHash = await bcrypt.hash(acct.password, 12);

    const user = await prisma.user.upsert({
      where: { prn: acct.prn },
      create: {
        prn:               acct.prn,
        rollNo:            acct.rollNo,
        name:              acct.name,
        batch:             'DEMO',          // hidden from public student lists
        branch:            'ADMIN',
        role:              'ADMIN',
        passwordHash,
        mustChangePassword: false,          // no forced reset – these are operational
        emailVerified:     true,
        isActive:          true,
      },
      update: {
        // Re-hash on re-run in case password definition changed above
        passwordHash,
        role:              'ADMIN',
        isActive:          true,
        mustChangePassword: false,
      },
      select: { prn: true, name: true, role: true },
    });

    console.log(`  ✅ ${user.name} (${user.prn}) — role: ${user.role}`);
    results.push({ prn: acct.prn, password: acct.password, name: acct.name });
  }

  console.log('\nDemo accounts ready. Credentials:\n');
  console.table(results.map(r => ({ PRN: r.prn, Password: r.password, Name: r.name })));
  console.log('\nShare the PRN + Password with testers. Passwords are bcrypt-hashed in the DB.');
}

seedDemoAccounts()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
