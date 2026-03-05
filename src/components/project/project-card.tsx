import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/db/schema";

interface ProjectCardProps {
  readonly project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const description = project.description?.trim() ?? "";

  return (
    <Link href={`/projects/${project.id}`}>
      <Card
        className={cn(
          "h-full transition-colors duration-200",
          "hover:border-[var(--accent)]/50 cursor-pointer"
        )}
        padding="md"
      >
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: project.color }}
              aria-hidden
            />
            <h3 className="font-medium text-[var(--text-primary)] truncate">
              {project.name}
            </h3>
          </div>
          {description ? (
            <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
              {description}
            </p>
          ) : null}
          {project.githubRepoUrl ? (
            <a
              href={project.githubRepoUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              GitHub
            </a>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}
