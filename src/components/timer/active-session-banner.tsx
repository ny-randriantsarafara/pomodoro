"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { loadTimer } from "@/hooks/use-timer-persistence";
import { cn } from "@/lib/utils";

function formatRemainingTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function computeRemainingSeconds(
  startedAt: number,
  durationSeconds: number,
  isPaused: boolean,
  pausedAt: number | null,
  totalPausedSeconds: number
): number {
  const now = Date.now();
  const elapsedSec = isPaused && pausedAt !== null
    ? (pausedAt - startedAt) / 1000 - totalPausedSeconds
    : (now - startedAt) / 1000 - totalPausedSeconds;
  return Math.max(0, Math.ceil(durationSeconds - elapsedSec));
}

export function ActiveSessionBanner() {
  const pathname = usePathname();
  const [timer, setTimer] = useState<ReturnType<typeof loadTimer>>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    const tick = () => {
      const stored = loadTimer();
      setTimer(stored);
      if (!stored) return;
      const remaining = computeRemainingSeconds(
        stored.startedAt,
        stored.durationSeconds,
        stored.isPaused,
        stored.pausedAt,
        stored.totalPausedSeconds
      );
      setRemainingSeconds(remaining);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  if (pathname === "/timer" || !timer) return null;

  const task = timer.task.trim() !== "" ? timer.task : "Untitled task";

  return (
    <Link
      href="/timer"
      className={cn(
        "sticky top-0 z-10 flex w-full items-center justify-center gap-2 border-b px-4 py-1.5 text-sm",
        "bg-[var(--surface)] text-[var(--text-secondary)]",
        "animate-[fadeIn_0.3s_ease-out]"
      )}
      style={{ borderBottomWidth: 1, borderBottomColor: "var(--accent)" }}
    >
      <span>Focus session in progress:</span>
      <span className="truncate font-medium text-[var(--text-primary)]">
        {task}
      </span>
      <span>—</span>
      <span className="font-mono tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
        {formatRemainingTime(remainingSeconds)}
      </span>
    </Link>
  );
}
