import { useCallback, useEffect, useState } from "react";
import {
  getActiveSession,
  getTodaysSessions,
  sumSecondsSoFar,
  startSession,
  stopSession,
} from "@/data/timeSessions";
import { TimeSession } from "@/data/types";

const DAILY_GOAL_SECONDS = 8 * 60 * 60;

export function useTimeTracking() {
  const [sessions, setSessions] = useState<TimeSession[]>([]);
  const [active, setActive] = useState<TimeSession | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const reload = useCallback(async () => {
    const [todays, activeSession] = await Promise.all([getTodaysSessions(), getActiveSession()]);
    setSessions(todays);
    setActive(activeSession);
    setElapsedSeconds(sumSecondsSoFar(todays));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial async data load
    reload();
  }, [reload]);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setElapsedSeconds(sumSecondsSoFar(sessions));
    }, 1000);
    return () => clearInterval(interval);
  }, [active, sessions]);

  const toggle = useCallback(async () => {
    if (active) {
      await stopSession(active.id);
    } else {
      await startSession();
    }
    await reload();
  }, [active, reload]);

  return {
    isRunning: !!active,
    elapsedSeconds,
    goalSeconds: DAILY_GOAL_SECONDS,
    progress: Math.min(1, elapsedSeconds / DAILY_GOAL_SECONDS),
    toggle,
  };
}
