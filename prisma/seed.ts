/**
 * One-command demo data seed: `npm run db:seed`.
 * Uses relative imports (not the `@/*` alias) so it runs standalone under
 * `tsx`, independent of Next.js's module resolution.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { OVERDUE_THRESHOLD_SETTING_KEY, DEFAULT_OVERDUE_THRESHOLD_DAYS } from "../src/lib/utils/constants";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database…");

  await prisma.systemSetting.upsert({
    where: { key: OVERDUE_THRESHOLD_SETTING_KEY },
    create: {
      key: OVERDUE_THRESHOLD_SETTING_KEY,
      value: String(process.env.DEFAULT_OVERDUE_THRESHOLD_DAYS ?? DEFAULT_OVERDUE_THRESHOLD_DAYS),
    },
    update: {},
  });

  const adminPasswordHash = await hashPassword("Admin@12345");
  const admin = await prisma.user.upsert({
    where: { email: "admin@society.test" },
    create: {
      email: "admin@society.test",
      name: "Society Admin",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
    update: {},
  });

  const residentPasswordHash = await hashPassword("Resident@123");
  const residentSeeds = [
    { email: "asha.rao@society.test", name: "Asha Rao", flatNumber: "A-204", phone: "+919876500001" },
    { email: "vikram.shah@society.test", name: "Vikram Shah", flatNumber: "B-101", phone: "+919876500002" },
  ];

  const residents = [];
  for (const seed of residentSeeds) {
    residents.push(
      await prisma.user.upsert({
        where: { email: seed.email },
        create: { ...seed, passwordHash: residentPasswordHash, role: "RESIDENT" },
        update: {},
      })
    );
  }

  const existingComplaints = await prisma.complaint.count();
  if (existingComplaints === 0) {
    const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

    const seedComplaints: Array<{
      residentId: string;
      category: "PLUMBING" | "ELECTRICAL" | "SECURITY" | "COMMON_AREA";
      description: string;
      status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
      priority: "LOW" | "MEDIUM" | "HIGH";
      createdAt: Date;
    }> = [
      {
        residentId: residents[0]!.id,
        category: "PLUMBING",
        description: "Kitchen tap has been leaking continuously since yesterday morning.",
        status: "OPEN",
        priority: "HIGH",
        createdAt: daysAgo(6),
      },
      {
        residentId: residents[1]!.id,
        category: "ELECTRICAL",
        description: "Living room fan makes a loud grinding noise on medium/high speed.",
        status: "IN_PROGRESS",
        priority: "MEDIUM",
        createdAt: daysAgo(2),
      },
      {
        residentId: residents[0]!.id,
        category: "SECURITY",
        description: "The gate to the parking area does not lock automatically at night.",
        status: "RESOLVED",
        priority: "HIGH",
        createdAt: daysAgo(10),
      },
      {
        residentId: residents[1]!.id,
        category: "COMMON_AREA",
        description: "Lobby light on the 2nd floor has been flickering for a few days.",
        status: "OPEN",
        priority: "LOW",
        createdAt: daysAgo(1),
      },
    ];

    for (const seed of seedComplaints) {
      const complaint = await prisma.complaint.create({
        data: {
          residentId: seed.residentId,
          category: seed.category,
          description: seed.description,
          priority: seed.priority,
          status: seed.status === "OPEN" ? "OPEN" : seed.status,
          createdAt: seed.createdAt,
          resolvedAt: seed.status === "RESOLVED" ? new Date() : null,
        },
      });

      await prisma.complaintStatusHistory.create({
        data: {
          complaintId: complaint.id,
          actorId: seed.residentId,
          previousStatus: null,
          newStatus: "OPEN",
          note: "Complaint raised",
          createdAt: seed.createdAt,
        },
      });

      if (seed.status !== "OPEN") {
        await prisma.complaintStatusHistory.create({
          data: {
            complaintId: complaint.id,
            actorId: admin.id,
            previousStatus: "OPEN",
            newStatus: seed.status === "RESOLVED" ? "IN_PROGRESS" : seed.status,
            note: "Assigned to maintenance staff",
          },
        });
      }

      if (seed.status === "RESOLVED") {
        await prisma.complaintStatusHistory.create({
          data: {
            complaintId: complaint.id,
            actorId: admin.id,
            previousStatus: "IN_PROGRESS",
            newStatus: "RESOLVED",
            note: "Fixed and verified",
          },
        });
      }
    }
  }

  await prisma.notice.upsert({
    where: { id: "seed-notice-welcome" },
    create: {
      id: "seed-notice-welcome",
      title: "Welcome to the new Maintenance Tracker",
      body: "You can now raise maintenance complaints, attach a photo, and track their full status history from this portal.",
      isImportant: false,
      authorId: admin.id,
    },
    update: {},
  });

  await prisma.notice.upsert({
    where: { id: "seed-notice-water" },
    create: {
      id: "seed-notice-water",
      title: "Scheduled water supply interruption — Saturday 10am–2pm",
      body: "The main water line will be shut for tank cleaning this Saturday from 10am to 2pm. Please store water in advance.",
      isImportant: true,
      authorId: admin.id,
    },
    update: {},
  });

  console.log("Seed complete.");
  console.log("Admin login:    admin@society.test / Admin@12345");
  console.log("Resident login: asha.rao@society.test / Resident@123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
