"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createProject, updateProject } from "@/actions/project-actions";
import { validateProjectName, validateColor } from "@/lib/validators";
import { PROJECT_NAME_MAX_LENGTH } from "@/lib/constants";
import type { Project } from "@/lib/db/schema";

const PRESET_COLORS = [
  "#A0A0FF",
  "#FF6B6B",
  "#4ADE80",
  "#FBBF24",
  "#A78BFA",
  "#F472B6",
  "#22D3EE",
  "#FB923C",
] as const;

interface ProjectFormProps {
  readonly onSuccess?: () => void;
  readonly initialData?: Project;
}

export function ProjectForm({ onSuccess, initialData }: ProjectFormProps) {
  const initialColor = initialData?.color ?? "#A0A0FF";
  const isPreset = PRESET_COLORS.includes(initialColor as (typeof PRESET_COLORS)[number]);

  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [color, setColor] = useState(initialColor);
  const [customColor, setCustomColor] = useState(isPreset ? "" : initialColor);
  const [isPending, startTransition] = useTransition();

  const isEdit = Boolean(initialData);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const nameError = validateProjectName(name);
    if (nameError) {
      setError(nameError);
      return;
    }

    const resolvedColor = customColor.trim() || color;
    const colorError = validateColor(resolvedColor);
    if (colorError) {
      setError(colorError);
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", name.trim());
      formData.set("description", description.trim());
      formData.set("color", resolvedColor);

      if (isEdit && initialData) {
        const result = await updateProject(initialData.id, formData);
        if (result.success) {
          onSuccess?.();
        } else {
          setError(result.error);
        }
      } else {
        const result = await createProject(formData);
        if (result.success) {
          onSuccess?.();
        } else {
          setError(result.error);
        }
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Name"
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={PROJECT_NAME_MAX_LENGTH}
        required
        placeholder="Project name"
        autoFocus
      />
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="description"
          className="text-sm font-medium text-[var(--text-primary)]"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          rows={3}
          className="w-full rounded-lg border border-[#1F1F23] bg-[#141416] px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
        />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          Color
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {PRESET_COLORS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setColor(preset);
                setCustomColor("");
              }}
              className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                color === preset && !customColor
                  ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30"
                  : "border-transparent hover:border-[var(--border)]"
              }`}
              style={{ backgroundColor: preset }}
              aria-label={`Select ${preset}`}
            />
          ))}
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={customColor}
              onChange={(e) => {
                setCustomColor(e.target.value);
                if (e.target.value && /^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                  setColor(e.target.value);
                }
              }}
              placeholder="#hex"
              className="h-7 w-20 rounded border border-[#1F1F23] bg-[#141416] px-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
            />
            {customColor && /^#[0-9A-Fa-f]{6}$/.test(customColor) ? (
              <span
                className="h-5 w-5 rounded-full border border-[#1F1F23]"
                style={{ backgroundColor: customColor }}
                aria-hidden
              />
            ) : null}
          </div>
        </div>
      </div>
      {error ? (
        <p className="text-sm text-[var(--danger)]">{error}</p>
      ) : null}
      <Button
        type="submit"
        variant="primary"
        size="md"
        disabled={isPending}
        className="w-full"
      >
        {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Project"}
      </Button>
    </form>
  );
}
