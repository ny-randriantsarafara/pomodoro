"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { removeGithubConnection } from "@/actions/github-actions";
import type { GithubConnection } from "@/lib/db/schema";

interface Props {
  readonly connections: ReadonlyArray<GithubConnection>;
}

function formatConnectedDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function GitHubConnectionsList({ connections }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [connectionToRemove, setConnectionToRemove] = useState<
    GithubConnection | null
  >(null);

  function handleConfirmDisconnect() {
    if (!connectionToRemove) return;
    startTransition(async () => {
      const result = await removeGithubConnection(connectionToRemove.id);
      setConnectionToRemove(null);
      if (result.success) {
        router.refresh();
      }
    });
  }

  if (connections.length === 0) {
    return (
      <p className="text-[var(--text-secondary)]">No GitHub accounts connected.</p>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-4">
        {connections.map((connection) => (
          <li key={connection.id}>
            <Card padding="md" className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-[var(--text-primary)]">
                  {connection.label}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  @{connection.githubUsername}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Connected {formatConnectedDate(connection.createdAt)}
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                disabled={isPending}
                onClick={() => setConnectionToRemove(connection)}
              >
                Disconnect
              </Button>
            </Card>
          </li>
        ))}
      </ul>

      <Dialog
        open={connectionToRemove !== null}
        onClose={() => setConnectionToRemove(null)}
        title="Disconnect GitHub account?"
      >
        <div className="flex flex-col gap-4">
          <p className="text-[var(--text-secondary)]">
            {connectionToRemove
              ? `Are you sure you want to disconnect @${connectionToRemove.githubUsername} (${connectionToRemove.label})? You can reconnect it later.`
              : ""}
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConnectionToRemove(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmDisconnect}
              disabled={isPending}
            >
              Disconnect
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
