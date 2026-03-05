import {
  type ButtonHTMLAttributes,
  forwardRef,
} from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const variantStyles = {
  primary:
    "bg-[#A0A0FF] text-[#0A0A0B] hover:bg-[var(--accent-hover)] focus-visible:ring-[var(--accent)]",
  secondary:
    "bg-[#141416] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--border)]/50 focus-visible:ring-[var(--accent)]",
  ghost:
    "bg-transparent text-[var(--text-primary)] hover:bg-[var(--border)]/50 focus-visible:ring-[var(--accent)]",
  danger:
    "bg-[var(--danger)] text-[#0A0A0B] hover:opacity-90 focus-visible:ring-[var(--danger)]",
} as const;

const sizeStyles = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
} as const;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = "primary",
      size = "md",
      disabled,
      ...props
    },
    ref
  ) {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
          "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      />
    );
  }
);
