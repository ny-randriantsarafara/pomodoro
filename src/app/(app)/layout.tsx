import { requireAuth } from "@/lib/auth-utils";
import { Sidebar } from "@/components/layout/sidebar";
import type { ReactNode } from "react";

interface Props {
  readonly children: ReactNode;
}

export default async function AppLayout({ children }: Props) {
  await requireAuth();

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
