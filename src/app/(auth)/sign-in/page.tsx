import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";

async function signInWithGitHub() {
  "use server";
  await signIn("github", { redirectTo: "/timer" });
}

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center gap-12 px-6">
      <div className="flex flex-col items-center gap-3">
        <h1 className="font-[family-name:var(--font-display)] text-5xl font-normal text-[var(--text-primary)]">
          Pomodoro
        </h1>
        <p className="text-[var(--text-secondary)]">Focus. Build. Ship.</p>
      </div>

      <form action={signInWithGitHub}>
        <Button type="submit" variant="primary" size="lg" className="gap-2">
          <Github className="size-5" aria-hidden />
          Sign in with GitHub
        </Button>
      </form>
    </div>
  );
}
