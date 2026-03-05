import { describe, it, expect } from "vitest";
import {
  users,
  projects,
  focusSessions,
  githubConnections,
  focusModeEnum,
  sessionStatusEnum,
} from "./schema";

describe("database schema", () => {
  it("defines focus mode enum with correct values", () => {
    expect(focusModeEnum.enumValues).toEqual(["short", "average", "deep"]);
  });

  it("defines session status enum with correct values", () => {
    expect(sessionStatusEnum.enumValues).toEqual([
      "completed",
      "interrupted",
      "abandoned",
    ]);
  });

  it("defines users table with expected columns", () => {
    const columns = Object.keys(users);
    expect(columns).toContain("id");
    expect(columns).toContain("name");
    expect(columns).toContain("email");
    expect(columns).toContain("createdAt");
  });

  it("defines projects table with expected columns", () => {
    const columns = Object.keys(projects);
    expect(columns).toContain("id");
    expect(columns).toContain("userId");
    expect(columns).toContain("name");
    expect(columns).toContain("color");
    expect(columns).toContain("githubRepoUrl");
  });

  it("defines focus_sessions table with expected columns", () => {
    const columns = Object.keys(focusSessions);
    expect(columns).toContain("id");
    expect(columns).toContain("userId");
    expect(columns).toContain("projectId");
    expect(columns).toContain("focusMode");
    expect(columns).toContain("task");
    expect(columns).toContain("startedAt");
    expect(columns).toContain("status");
  });

  it("defines github_connections table with expected columns", () => {
    const columns = Object.keys(githubConnections);
    expect(columns).toContain("id");
    expect(columns).toContain("userId");
    expect(columns).toContain("label");
    expect(columns).toContain("githubUsername");
    expect(columns).toContain("accessToken");
  });
});
