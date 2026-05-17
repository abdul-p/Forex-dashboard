"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
    <div className="min-h-screen bg-gray-950 flex">
      {isSidebarOpen ? (
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Open sidebar"
          className="fixed left-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900 text-sm font-semibold text-gray-400 transition hover:bg-gray-800 hover:text-white"
        >
          =
        </button>
      )}
      <main
        className={`flex-1 overflow-y-auto p-8 transition-[margin] ${
          isSidebarOpen ? "ml-72" : "ml-0"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
