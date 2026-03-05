"use client";

import { useState } from "react";
import { Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";

interface Props {
  readonly clientId: string;
}

const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";

export function AddConnectionButton({ clientId }: Props) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;
    const url = new URL(GITHUB_AUTH_URL);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("scope", "repo");
    url.searchParams.set("state", trimmed);
    window.location.href = url.toString();
  }

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Github className="size-4" aria-hidden />
        Connect GitHub Account
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Add GitHub connection">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            placeholder="e.g., personal, work"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!label.trim()}>
              Connect
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
