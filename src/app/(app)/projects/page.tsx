import { getProjects } from "@/actions/project-actions";
import { ProjectList } from "@/components/project/project-list";

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-10">
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-[var(--text-primary)]">
        Projects
      </h1>
      <ProjectList projects={projects} />
    </div>
  );
}
