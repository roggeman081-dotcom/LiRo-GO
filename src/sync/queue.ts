import { getDb } from "@/data/db";
import { generateId } from "@/lib/id";

export type SyncOperation = "create" | "update" | "delete";
export type SyncEntityType = "customer" | "job" | "time_session";

export async function enqueueSync(
  entityType: SyncEntityType,
  entityId: string,
  operation: SyncOperation,
  payload: unknown
) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, status, attempts, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', 0, ?)`,
    [generateId(), entityType, entityId, operation, JSON.stringify(payload), new Date().toISOString()]
  );
}

export async function getPendingCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'`
  );
  return row?.count ?? 0;
}

type QueueRow = {
  id: string;
  entity_type: SyncEntityType;
  entity_id: string;
  operation: SyncOperation;
  payload: string;
  attempts: number;
};

/**
 * Sends queued changes to the backend. No real API exists yet, so this is a
 * stub: it "succeeds" every item so the queue drains and the UI can show a
 * synced state. Replace `pushToBackend` with a real request when the API is
 * ready — the queue shape (entity/operation/payload) is already what most
 * REST/GraphQL backends expect.
 */
export async function runSync(): Promise<{ synced: number; failed: number }> {
  const db = await getDb();
  const rows = await db.getAllAsync<QueueRow>(
    `SELECT id, entity_type, entity_id, operation, payload, attempts FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC`
  );

  let synced = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      await pushToBackend(row);
      await db.runAsync(`UPDATE sync_queue SET status = 'synced' WHERE id = ?`, [row.id]);
      synced += 1;
    } catch {
      await db.runAsync(`UPDATE sync_queue SET attempts = attempts + 1 WHERE id = ?`, [row.id]);
      failed += 1;
    }
  }

  return { synced, failed };
}

async function pushToBackend(_row: QueueRow): Promise<void> {
  // TODO: replace with a real API call once a backend exists.
  return Promise.resolve();
}
