import { getDb } from "./db";
import { createCustomer } from "./customers";
import { createJob } from "./jobs";

/**
 * Demo data so the home screen has cards to test/swipe before the "nytt
 * uppdrag"-flow (step 3) exists. Only runs once, when the jobs table is
 * empty — real jobs created through the app are never touched by this.
 */
export async function seedDemoDataIfEmpty() {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM jobs`);
  if ((row?.count ?? 0) > 0) return;

  const customer = await createCustomer({
    name: "Karlssons Fastigheter AB",
    phone: "070-123 45 67",
    address: "Industrivägen 12",
    postalCode: "123 45",
    city: "Göteborg",
    saveAsContact: true,
  });

  const today = new Date();
  today.setHours(7, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  await createJob({
    customerId: customer.id,
    kind: "customer_job",
    title: "Felsökning elcentral",
    workType: "switchboard",
    description: null,
    plannedAt: today.toISOString(),
    priority: "high",
  });

  await createJob({
    customerId: customer.id,
    kind: "customer_job",
    title: "Installation laddbox",
    workType: "charging",
    description: null,
    plannedAt: tomorrow.toISOString(),
    priority: "normal",
  });
}
