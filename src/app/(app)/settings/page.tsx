import { getGithubConnections } from "@/actions/github-actions";
import { GitHubConnectionsList } from "@/components/settings/github-connections-list";
import { AddConnectionButton } from "@/components/settings/add-connection-button";

interface SettingsPageProps {
  readonly searchParams: Promise<{ error?: string }>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  const connections = await getGithubConnections();
  const clientId = process.env.GITHUB_CONNECTIONS_CLIENT_ID ?? "";

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-8 p-6 lg:p-10">
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-[var(--text-primary)]">
        Settings
      </h1>

      {params.error && (
        <div
          role="alert"
          className="rounded-lg border border-[var(--danger)] bg-[var(--danger)]/10 px-4 py-3 text-[var(--danger)]"
        >
          {params.error === "github_auth_failed"
            ? "GitHub authorization failed. Please try again."
            : "Something went wrong. Please try again."}
        </div>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-medium text-[var(--text-primary)]">
          GitHub Connections
        </h2>
        <GitHubConnectionsList connections={connections} />
        <AddConnectionButton clientId={clientId} />
      </section>
    </div>
  );
}
