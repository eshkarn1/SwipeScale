/**
 * Demo data. BUILD_SPEC §7 M1: "two demo workspaces with realistic data
 * (≈60 companies, 150 contacts, 80 deals across stages)."
 *
 * Read literally that's one number for two workspaces; taken that way the
 * second workspace (the one whose entire job is proving the vertical seam
 * works — see the docstring on VERTICAL_PRESETS) would ship looking like an
 * afterthought next to the first. Applied ~60/~150/~80 to EACH workspace
 * instead, so both get a full, independently browsable dataset. Flagged
 * here rather than silently assumed — see the M1 report.
 *
 * Deliberately reuses `createWorkspaceForUser`, the exact function real
 * onboarding calls, rather than re-deriving the pipeline/stage/option setup
 * here. That is also why this file never branches on `"real_estate"` or
 * `"general_b2b"` — the preset registry in `workspace-presets.ts` is the
 * only thing that knows the difference, per DECISIONS §8.6.
 */
import { faker } from "@faker-js/faker";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";

loadEnv({ quiet: true });

import { minorUnitsToDecimalString } from "../src/lib/money";
import { PrismaClient } from "../src/generated/prisma/client";
import type { Role } from "../src/generated/prisma/enums";
import { createWorkspaceForUser } from "../src/server/services/workspace";
import type { VerticalKey } from "../src/server/services/workspace-presets";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set — see docs/local-database.md.");
}
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const COMPANIES_PER_WORKSPACE = 60;
const CONTACTS_PER_WORKSPACE = 150;
const DEALS_PER_WORKSPACE = 80;

interface DemoWorkspaceConfig {
  name: string;
  vertical: VerticalKey;
  owner: { email: string; name: string };
  extraMembers: { email: string; name: string; role: Role }[];
  companyIndustry: () => string;
  companyName: () => string;
  dealTitle: (companyName: string) => string;
  dealAmountRange: [number, number]; // minor units (cents)
}

const WORKSPACES: DemoWorkspaceConfig[] = [
  {
    name: "Vertex Realty Group",
    vertical: "real_estate",
    owner: { email: "owner@vertex-realty.test", name: "Dana Whitfield" },
    extraMembers: [
      { email: "admin@vertex-realty.test", name: "Marcus Cole", role: "ADMIN" },
      { email: "agent@vertex-realty.test", name: "Priya Nair", role: "MEMBER" },
    ],
    companyIndustry: () =>
      faker.helpers.arrayElement([
        "Residential Brokerage",
        "Property Management",
        "Title & Escrow",
        "Home Inspection",
        "Mortgage Lending",
      ]),
    companyName: () =>
      `${faker.person.lastName()} ${faker.helpers.arrayElement(["Realty", "Properties", "Homes", "Group", "Estates"])}`,
    dealTitle: () =>
      `${faker.location.streetAddress()}, ${faker.location.city()}`,
    dealAmountRange: [150_000_00, 1_850_000_00],
  },
  {
    name: "Northwind B2B Solutions",
    vertical: "general_b2b",
    owner: { email: "owner@northwind.test", name: "Jordan Ellis" },
    extraMembers: [
      { email: "admin@northwind.test", name: "Casey Brooks", role: "ADMIN" },
      { email: "rep@northwind.test", name: "Sam Okafor", role: "MEMBER" },
    ],
    companyIndustry: () =>
      faker.helpers.arrayElement([
        "SaaS",
        "Logistics",
        "Manufacturing",
        "Professional Services",
        "Healthcare IT",
      ]),
    companyName: () => faker.company.name(),
    dealTitle: (companyName) =>
      `${companyName} — ${faker.helpers.arrayElement(["Annual contract", "Platform migration", "Expansion", "Renewal", "Pilot"])}`,
    dealAmountRange: [5_000_00, 120_000_00],
  },
];

async function resetDemoWorkspaces(): Promise<void> {
  // Cascades to memberships, options, pipelines, stages, deals, contacts,
  // companies, invites — every tenant relation in the schema — so this is
  // the entire cleanup step.
  await db.workspace.deleteMany({
    where: { name: { in: WORKSPACES.map((w) => w.name) } },
  });
}

async function upsertUser(email: string, name: string) {
  return db.user.upsert({
    where: { email },
    create: { email, name, emailVerified: new Date() },
    update: { name },
  });
}

function randomDateWithinPastMonths(months: number): Date {
  return faker.date.recent({ days: months * 30 });
}

async function seedWorkspace(config: DemoWorkspaceConfig) {
  const owner = await upsertUser(config.owner.email, config.owner.name);

  const workspace = await createWorkspaceForUser({
    userId: owner.id,
    name: config.name,
    vertical: config.vertical,
  });

  const extraMemberships = await Promise.all(
    config.extraMembers.map(async (member) => {
      const user = await upsertUser(member.email, member.name);
      return db.membership.create({
        data: { userId: user.id, workspaceId: workspace.id, role: member.role },
      });
    }),
  );

  const ownerMembership = await db.membership.findFirstOrThrow({
    where: { workspaceId: workspace.id, userId: owner.id },
  });
  const allMembershipIds = [
    ownerMembership.id,
    ...extraMemberships.map((m) => m.id),
  ];

  const pipeline = await db.pipeline.findFirstOrThrow({
    where: { workspaceId: workspace.id, isDefault: true },
  });
  const stages = await db.stage.findMany({
    where: { workspaceId: workspace.id, pipelineId: pipeline.id },
    orderBy: { position: "asc" },
  });
  const dealSideOptions = await db.workspaceOption.findMany({
    where: { workspaceId: workspace.id, kind: "deal_side" },
  });
  const dealContactRoleOptions = await db.workspaceOption.findMany({
    where: { workspaceId: workspace.id, kind: "deal_contact_role" },
  });

  // ---- Companies ----
  const companies = await db.company.createManyAndReturn({
    data: Array.from({ length: COMPANIES_PER_WORKSPACE }, () => ({
      workspaceId: workspace.id,
      name: config.companyName(),
      domain: faker.internet.domainName(),
      industry: config.companyIndustry(),
      employees: faker.number.int({ min: 1, max: 500 }),
      annualRevenue: minorUnitsToDecimalString(
        faker.number.int({ min: 500_000_00, max: 50_000_000_00 }),
      ),
      addressCity: faker.location.city(),
      addressCountry: "US",
      ownerId: faker.helpers.arrayElement(allMembershipIds),
    })),
  });

  // ---- Contacts ----
  const contacts = await db.contact.createManyAndReturn({
    data: Array.from({ length: CONTACTS_PER_WORKSPACE }, () => {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const linkedToCompany = faker.datatype.boolean({ probability: 0.8 });
      return {
        workspaceId: workspace.id,
        companyId: linkedToCompany
          ? faker.helpers.arrayElement(companies).id
          : null,
        firstName,
        lastName,
        email: faker.internet.email({ firstName, lastName }).toLowerCase(),
        phone: faker.phone.number({ style: "national" }),
        jobTitle: faker.person.jobTitle(),
        ownerId: faker.helpers.arrayElement(allMembershipIds),
      };
    }),
  });

  // ---- Deals + DealContact + one DealStageEvent each ----
  let dealsCreated = 0;
  const stagePositionCounters = new Map<string, number>();

  for (let i = 0; i < DEALS_PER_WORKSPACE; i += 1) {
    const stage = faker.helpers.arrayElement(stages);
    const company = faker.helpers.arrayElement(companies);
    const isWon = stage.type === "WON";
    const [minAmount, maxAmount] = config.dealAmountRange;
    const amountMinorUnits = faker.number.int({ min: minAmount, max: maxAmount });

    const nextPosition = stagePositionCounters.get(stage.id) ?? 0;
    stagePositionCounters.set(stage.id, nextPosition + 1);

    const createdAt = randomDateWithinPastMonths(6);

    const deal = await db.deal.create({
      data: {
        workspaceId: workspace.id,
        pipelineId: pipeline.id,
        stageId: stage.id,
        companyId: company.id,
        ownerId: faker.helpers.arrayElement(allMembershipIds),
        title: config.dealTitle(company.name),
        side:
          dealSideOptions.length > 0
            ? faker.helpers.arrayElement(dealSideOptions).value
            : null,
        amount: minorUnitsToDecimalString(amountMinorUnits),
        expectedCloseDate: faker.date.soon({ days: 90, refDate: createdAt }),
        closedAt: isWon
          ? faker.date.recent({ days: 30, refDate: new Date() })
          : null,
        source: faker.helpers.arrayElement([
          "Referral",
          "Website",
          "Cold outreach",
          "Event",
          "Repeat client",
        ]),
        position: nextPosition,
        createdAt,
      },
    });

    await db.dealStageEvent.create({
      data: {
        workspaceId: workspace.id,
        dealId: deal.id,
        fromStageId: null,
        toStageId: stage.id,
        amount: minorUnitsToDecimalString(amountMinorUnits),
        changedById: faker.helpers.arrayElement(allMembershipIds),
        createdAt,
      },
    });

    if (dealContactRoleOptions.length > 0) {
      const dealContacts = faker.helpers.arrayElements(contacts, {
        min: 1,
        max: 2,
      });
      await db.dealContact.createMany({
        data: dealContacts.map((contact, index) => ({
          dealId: deal.id,
          contactId: contact.id,
          role: faker.helpers.arrayElement(dealContactRoleOptions).value,
          isPrimary: index === 0,
        })),
      });
    }

    dealsCreated += 1;
  }

  return {
    workspace,
    ownerEmail: config.owner.email,
    companies: companies.length,
    contacts: contacts.length,
    deals: dealsCreated,
  };
}

async function main() {
  await resetDemoWorkspaces();

  const results = [];
  for (const config of WORKSPACES) {
    results.push(await seedWorkspace(config));
  }

  console.log("\nSeed complete:\n");
  for (const result of results) {
    console.log(
      `  ${result.workspace.name}  (/${result.workspace.slug}, vertical=${result.workspace.vertical})\n` +
        `    owner: ${result.ownerEmail}\n` +
        `    companies=${result.companies} contacts=${result.contacts} deals=${result.deals}\n`,
    );
  }
  console.log(
    "No RESEND_API_KEY is set, so signing in as any of the above emails writes\n" +
      "the magic link to .local/dev-inbox/ instead of sending it — see\n" +
      "src/server/email.tsx.",
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void db.$disconnect();
  });
