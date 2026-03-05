"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Github } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { ProjectCard } from "./project-card";
import { ProjectForm } from "./project-form";
import { RepoImportDialog } from "./repo-import-dialog";
import { cn } from "@/lib/utils";

import type { Project, GithubConnection } from "@/lib/db/schema";

interface ProjectListProps {
  readonly projects: ReadonlyArray<Project>;
  readonly connections: ReadonlyArray<GithubConnection>;
}

export function ProjectList({ projects, connections }: ProjectListProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const router = useRouter();

  const existingRepoUrls = useMemo(() => {
    const urls = new Set<string>();
    for (const project of projects) {
      if (project.githubRepoUrl) {
        urls.add(project.githubRepoUrl);
      }
    }
    return urls;
  }, [projects]);

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
      {connections.length > 0 && (
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          className={cn(
            "flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-[#1F1F23] bg-[#141416]/50",
            "text-[var(--text-secondary)] hover:border-[var(--accent)]/50 hover:bg-[var(--border)]/20 hover:text-[var(--accent)]",
            "transition-colors duration-200"
          )}
        >
          <span className="flex items-center gap-2 font-medium">
            <Github className="h-5 w-5" aria-hidden />
            Import from GitHub
          </span>
        </button>
      )}
      {projects.map((project, index) => (
        <div
          key={project.id}
          className="animate-[fadeIn_0.3s_ease-out_both]"
          style={{ animationDelay: `${index * 80}ms` }}
        >
          <ProjectCard project={project} />
        </div>
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
      <RepoImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        connections={connections}
        existingRepoUrls={existingRepoUrls}
        onImported={() => setImportOpen(false)}
      />
    </div>
  );
}
