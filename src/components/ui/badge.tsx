import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "default"
  | "short"
  | "average"
  | "deep"
  | "completed"
  | "interrupted"
  | "abandoned";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]",
  short:
    "bg-blue-500/15 text-blue-300 border border-blue-500/30",
  average:
    "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  deep:
    "bg-purple-500/15 text-purple-300 border border-purple-500/30",
  completed:
    "bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/30",
  interrupted:
    "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  abandoned:
    "bg-[var(--danger)]/15 text-[var(--danger)] border border-[var(--danger)]/30",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
