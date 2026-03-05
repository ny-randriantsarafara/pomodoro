"use client";

import { TIMER_STORAGE_KEY } from "@/lib/constants";
import type { ActiveTimer } from "@/types";

export function saveTimer(timer: ActiveTimer): void {
  try {
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timer));
  } catch {
    // localStorage may be unavailable
  }
}

export function loadTimer(): ActiveTimer | null {
  try {
    const stored = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function clearTimer(): void {
  try {
    localStorage.removeItem(TIMER_STORAGE_KEY);
  } catch {
    // localStorage may be unavailable
  }
}
