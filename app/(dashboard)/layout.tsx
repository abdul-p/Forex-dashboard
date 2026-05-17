"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PanelLeftOpen } from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [router, status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {isSidebarOpen ? (
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Open sidebar"
          className="fixed left-8 top-8 z-20 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--text-muted)] shadow-sm ring-1 ring-[var(--border-soft)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
      )}
      <main
        className={`flex-1 overflow-y-auto p-8 transition-[margin,padding] ${
          isSidebarOpen ? "ml-72" : "ml-0 pl-24"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
