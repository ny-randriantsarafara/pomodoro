import Link from "next/link";
import { cn } from "@/lib/utils";

export default function ProjectNotFound() {
  return (
    <div className="flex flex-col items-center gap-6 p-6 lg:p-10">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-normal text-[var(--text-primary)]">
        Project not found
      </h1>
      <Link
        href="/projects"
        className={cn(
          "inline-flex h-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[#141416] px-4 text-sm font-medium text-[var(--text-primary)]",
          "hover:bg-[var(--border)]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        )}
      >
        Back to Projects
      </Link>
    </div>
  );
}
