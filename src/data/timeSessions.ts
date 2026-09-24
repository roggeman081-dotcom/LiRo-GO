import { getDb } from "./db";
import { generateId } from "@/lib/id";
import { enqueueSync } from "@/sync/queue";
import { TimeSession } from "./types";

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

type SessionRow = {
  id: string;
  date: string;
  started_at: string;
  ended_at: string | null;
  created_at: string;
};

function fromRow(row: SessionRow): TimeSession {
  return {
    id: row.id,
    date: row.date,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    createdAt: row.created_at,
  };
}

export async function getTodaysSessions(): Promise<TimeSession[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SessionRow>(
    `SELECT * FROM time_sessions WHERE date = ? ORDER BY started_at ASC`,
    [todayKey()]
  );
  return rows.map(fromRow);
}

export async function getActiveSession(): Promise<TimeSession | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<SessionRow>(
    `SELECT * FROM time_sessions WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1`
  );
  return row ? fromRow(row) : null;
}

export async function startSession(): Promise<TimeSession> {
  const db = await getDb();
  const now = new Date().toISOString();
  const session: TimeSession = {
    id: generateId(),
    date: todayKey(),
    startedAt: now,
    endedAt: null,
    createdAt: now,
  };
  await db.runAsync(
    `INSERT INTO time_sessions (id, date, started_at, ended_at, created_at) VALUES (?, ?, ?, ?, ?)`,
    [session.id, session.date, session.startedAt, session.endedAt, session.createdAt]
  );
  await enqueueSync("time_session", session.id, "create", session);
  return session;
}

export async function stopSession(id: string): Promise<void> {
  const db = await getDb();
  const endedAt = new Date().toISOString();
  await db.runAsync(`UPDATE time_sessions SET ended_at = ? WHERE id = ?`, [endedAt, id]);
  await enqueueSync("time_session", id, "update", { id, endedAt });
}

export function sumSecondsSoFar(sessions: TimeSession[]): number {
  const now = Date.now();
  return sessions.reduce((total, s) => {
    const start = new Date(s.startedAt).getTime();
    const end = s.endedAt ? new Date(s.endedAt).getTime() : now;
    return total + Math.max(0, end - start) / 1000;
  }, 0);
}
