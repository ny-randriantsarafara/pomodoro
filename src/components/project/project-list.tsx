"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { ProjectCard } from "./project-card";
import { ProjectForm } from "./project-form";
import { cn } from "@/lib/utils";

import type { Project } from "@/lib/db/schema";

interface ProjectListProps {
  readonly projects: ReadonlyArray<Project>;
}

export function ProjectList({ projects }: ProjectListProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className={cn(
          "flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-[#1F1F23] bg-[#141416]/50",
          "text-[var(--text-secondary)] hover:border-[var(--accent)]/50 hover:bg-[var(--border)]/20 hover:text-[var(--accent)]",
          "transition-colors duration-200"
        )}
      >
        <span className="flex items-center gap-2 font-medium">
          <Plus className="h-5 w-5" aria-hidden />
          New Project
        </span>
      </button>
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Project"
      >
        <ProjectForm
          onSuccess={() => {
            setCreateOpen(false);
            router.refresh();
          }}
        />
      </Dialog>
    </div>
  );
}
