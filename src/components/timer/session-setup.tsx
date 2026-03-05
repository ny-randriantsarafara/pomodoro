"use client";

import { useState } from "react";
import { startSession } from "@/actions/session-actions";
import { FOCUS_MODES, TASK_MAX_LENGTH } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ModeSelector } from "./mode-selector";
import type { Project } from "@/lib/db/schema";
import type { FocusMode } from "@/lib/db/schema";
import type { StartTimerParams } from "@/types";

export interface SessionSetupProps {
  readonly projects: ReadonlyArray<Project>;
  readonly onStart: (params: StartTimerParams) => void;
}

export function SessionSetup({ projects, onStart }: SessionSetupProps) {
  const [projectId, setProjectId] = useState("");
  const [task, setTask] = useState("");
  const [focusMode, setFocusMode] = useState<FocusMode>("short");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canStart =
    projectId.trim() !== "" && task.trim() !== "" && !isSubmitting;

  const handleSubmit = async () => {
    setError(null);
    if (!canStart) return;

    const trimmedTask = task.trim();
    setIsSubmitting(true);

    const result = await startSession(projectId, trimmedTask, focusMode);

    if (result.success) {
      const project = projects.find((p) => p.id === projectId);
      if (!project) {
        setError("Project not found");
        setIsSubmitting(false);
        return;
      }
      const durationSeconds = FOCUS_MODES[focusMode].workMinutes * 60;
      onStart({
        sessionId: result.data.id,
        projectId: project.id,
        projectName: project.name,
        projectColor: project.color,
        task: trimmedTask,
        focusMode,
        durationSeconds,
      });
    } else {
      setError(result.error);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <Select
        label="Project"
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
        disabled={isSubmitting}
        required
      >
        <option value="">Select a project</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>

      <Input
        label="Task"
        placeholder="What are you working on?"
        value={task}
        onChange={(e) => setTask(e.target.value)}
        maxLength={TASK_MAX_LENGTH}
        disabled={isSubmitting}
        required
      />

      {error && (
        <p className="text-sm text-[var(--danger)]">{error}</p>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-[var(--text-primary)]">
          Focus mode
        </label>
        <ModeSelector
          selectedMode={focusMode}
          onSelect={setFocusMode}
          disabled={isSubmitting}
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!canStart}
        size="lg"
        className="w-full"
      >
        Start
      </Button>
    </div>
  );
}
