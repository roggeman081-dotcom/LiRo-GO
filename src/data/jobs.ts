import { getDb } from "./db";
import { generateId } from "@/lib/id";
import { enqueueSync } from "@/sync/queue";
import { Job, JobKind, JobWithCustomer, Priority, WorkType } from "./types";

type JobRow = {
  id: string;
  customer_id: string;
  kind: string;
  title: string;
  work_type: string | null;
  description: string | null;
  planned_at: string | null;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  customer_name: string;
  customer_address: string | null;
};

function fromRow(row: JobRow): JobWithCustomer {
  return {
    id: row.id,
    customerId: row.customer_id,
    kind: row.kind as JobKind,
    title: row.title,
    workType: row.work_type as WorkType | null,
    description: row.description,
    plannedAt: row.planned_at,
    priority: row.priority as Priority,
    status: row.status as Job["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customerName: row.customer_name,
    customerAddress: row.customer_address,
  };
}

const SELECT_WITH_CUSTOMER = `
  SELECT jobs.*, customers.name as customer_name, customers.address as customer_address
  FROM jobs
  JOIN customers ON customers.id = jobs.customer_id
`;

export async function getTodaysJobs(): Promise<JobWithCustomer[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<JobRow>(
    `${SELECT_WITH_CUSTOMER} WHERE jobs.status != 'done' ORDER BY jobs.planned_at ASC`
  );
  return rows.map(fromRow);
}

export type NewJobInput = {
  customerId: string;
  kind: JobKind;
  title: string;
  workType: WorkType | null;
  description: string | null;
  plannedAt: string | null;
  priority: Priority;
};

export async function createJob(input: NewJobInput): Promise<Job> {
  const db = await getDb();
  const now = new Date().toISOString();
  const job: Job = {
    id: generateId(),
    customerId: input.customerId,
    kind: input.kind,
    title: input.title,
    workType: input.workType,
    description: input.description,
    plannedAt: input.plannedAt,
    priority: input.priority,
    status: deriveInitialStatus(input.plannedAt),
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO jobs (id, customer_id, kind, title, work_type, description, planned_at, priority, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      job.id,
      job.customerId,
      job.kind,
      job.title,
      job.workType,
      job.description,
      job.plannedAt,
      job.priority,
      job.status,
      job.createdAt,
      job.updatedAt,
    ]
  );

  await enqueueSync("job", job.id, "create", job);
  return job;
}

function deriveInitialStatus(plannedAt: string | null): Job["status"] {
  if (!plannedAt) return "later";
  const planned = new Date(plannedAt);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfPlanned = new Date(planned.getFullYear(), planned.getMonth(), planned.getDate());
  const dayDiff = Math.round((startOfPlanned.getTime() - startOfToday.getTime()) / 86_400_000);

  if (dayDiff === 0) return "ongoing";
  if (dayDiff === 1) return "tomorrow";
  return "later";
}
