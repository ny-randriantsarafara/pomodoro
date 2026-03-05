import type { GitHubRepo } from "@/types";

const GITHUB_API_BASE = "https://api.github.com";

function getProperty(obj: object, key: string): unknown {
  const desc = Object.getOwnPropertyDescriptor(obj, key);
  return desc?.value;
}

function parseRepo(item: unknown): GitHubRepo {
  if (typeof item !== "object" || item === null) {
    throw new Error("Invalid repo object");
  }
  const obj = item;
  const idVal = getProperty(obj, "id");
  const nameVal = getProperty(obj, "name");
  const fullNameVal = getProperty(obj, "full_name");
  const htmlUrlVal = getProperty(obj, "html_url");
  const ownerVal = getProperty(obj, "owner");
  const descriptionVal = getProperty(obj, "description");

  if (typeof idVal !== "number") {
    throw new Error("Invalid repo: missing or invalid id");
  }
  if (typeof nameVal !== "string") {
    throw new Error("Invalid repo: missing or invalid name");
  }
  if (typeof fullNameVal !== "string") {
    throw new Error("Invalid repo: missing or invalid full_name");
  }
  if (typeof htmlUrlVal !== "string") {
    throw new Error("Invalid repo: missing or invalid html_url");
  }

  let owner = "";
  if (typeof ownerVal === "object" && ownerVal !== null) {
    const ownerLogin = getProperty(ownerVal, "login");
    if (typeof ownerLogin === "string") {
      owner = ownerLogin;
    }
  }

  const description =
    descriptionVal === null || descriptionVal === undefined
      ? null
      : typeof descriptionVal === "string"
        ? descriptionVal
        : null;

  return {
    id: idVal,
    name: nameVal,
    fullName: fullNameVal,
    htmlUrl: htmlUrlVal,
    owner,
    description,
  };
}

function parseUserLogin(item: unknown): string {
  if (typeof item !== "object" || item === null) {
    throw new Error("Invalid user object");
  }
  const loginVal = getProperty(item, "login");
  if (typeof loginVal !== "string") {
    throw new Error("Invalid user: missing or invalid login");
  }
  return loginVal;
}

export async function fetchUserRepos(
  accessToken: string
): Promise<ReadonlyArray<GitHubRepo>> {
  const response = await fetch(
    `${GITHUB_API_BASE}/user/repos?sort=updated&per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const raw: unknown = await response.json();
  if (!Array.isArray(raw)) {
    throw new Error("GitHub API returned non-array");
  }

  return raw.map((item) => parseRepo(item));
}

export async function fetchGitHubUsername(accessToken: string): Promise<string> {
  const response = await fetch(`${GITHUB_API_BASE}/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const raw: unknown = await response.json();
  return parseUserLogin(raw);
}
