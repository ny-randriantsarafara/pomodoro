"use server";

import { db } from "@/lib/db";
import { githubConnections } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth-utils";
import { validateGithubLabel } from "@/lib/validators";
import { fetchUserRepos } from "@/lib/github";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ActionResult, GitHubRepo } from "@/types";
import type { GithubConnection } from "@/lib/db/schema";

export async function getGithubConnections(): Promise<
  ReadonlyArray<GithubConnection>
> {
  const user = await requireAuth();
  return db
    .select()
    .from(githubConnections)
    .where(eq(githubConnections.userId, user.id));
}

export async function addGithubConnection(
  label: string,
  accessToken: string,
  githubUsername: string
): Promise<ActionResult<GithubConnection>> {
  const user = await requireAuth();
  const labelError = validateGithubLabel(label);
  if (labelError) {
    return { success: false, error: labelError };
  }
  const [connection] = await db
    .insert(githubConnections)
    .values({
      userId: user.id,
      label: label.trim(),
      githubUsername,
      accessToken,
    })
    .returning();
  revalidatePath("/settings");
  return { success: true, data: connection };
}

export async function removeGithubConnection(
  connectionId: string
): Promise<ActionResult> {
  const user = await requireAuth();
  const [deleted] = await db
    .delete(githubConnections)
    .where(
      and(
        eq(githubConnections.id, connectionId),
        eq(githubConnections.userId, user.id)
      )
    )
    .returning();
  if (!deleted) {
    return { success: false, error: "Connection not found" };
  }
  revalidatePath("/settings");
  return { success: true, data: undefined };
}

export async function fetchReposForConnection(
  connectionId: string
): Promise<ActionResult<ReadonlyArray<GitHubRepo>>> {
  const user = await requireAuth();
  const [connection] = await db
    .select()
    .from(githubConnections)
    .where(
      and(
        eq(githubConnections.id, connectionId),
        eq(githubConnections.userId, user.id)
      )
    );
  if (!connection) {
    return { success: false, error: "Connection not found" };
  }
  try {
    const repos = await fetchUserRepos(connection.accessToken);
    return { success: true, data: repos };
  } catch {
    return { success: false, error: "Failed to fetch repos. Token may be expired." };
  }
}
