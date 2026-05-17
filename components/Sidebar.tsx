"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const mainMenuItems = [
  { label: "Overview", href: "/overview", icon: "OV" },
  { label: "Charts", href: "/charts", icon: "CH" },
  { label: "Trading", href: "/trading", icon: "TR" },
  { label: "Analysis", href: "/analysis", icon: "AN" },
  { label: "Fundamental Analysis", href: "/fundamental-analysis", icon: "FA" },
  { label: "Portfolio", href: "/portfolio", icon: "PF" },
  { label: "Sentiment Analysis", href: "/sentiment-analysis", icon: "SA" },
  { label: "Markets", href: "/markets", icon: "MK" },
];

const menuItems = [
  { label: "News", href: "/news", icon: "NW" },
  { label: "Calendar", href: "/calendar", icon: "CA" },
  { label: "Activities", href: "/activities", icon: "AC" },
];

const configMenuItems = [
  { label: "Settings", href: "/settings", icon: "ST" },
];

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

type SidebarProps = {
  onClose: () => void;
};

export default function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userName = session?.user?.name || "Account";
  const userEmail = session?.user?.email || "Signed in";
  const initials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const renderNavGroup = (
    title: string,
    items: { label: string; href: string; icon: string }[],
    isFirst = false,
  ) => (
    <div className="space-y-1">
      <p
        className={`px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] ${
          isFirst ? "pt-0" : "pt-5"
        }`}
      >
        {title}
      </p>
      {items.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
              isActive
                ? "bg-[var(--accent-soft)] text-[var(--accent)] font-medium"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold ${
                isActive
                  ? "bg-[var(--surface)] text-[var(--accent)]"
                  : "bg-[var(--surface-muted)] text-[var(--text-muted)]"
              }`}
            >
              {item.icon}
            </span>
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <aside className="fixed left-0 top-0 flex h-screen w-72 flex-col border-r border-[var(--border-soft)] bg-[var(--surface)]">
      {/* Logo */}
      <div className="flex items-start justify-between gap-4 p-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">
            Forex<span className="text-[var(--accent)]">Pro</span>
          </h1>
          <p className="text-xs mt-1 text-[var(--text-muted)]">
            Trading Dashboard
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sidebar"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {renderNavGroup("Main Menu", mainMenuItems, true)}
        {renderNavGroup("Menu", menuItems)}
        {renderNavGroup("Config Menu", configMenuItems)}
      </nav>

      {/* Bottom */}
      <div className="p-4">
        <div className="flex items-center gap-2 rounded-lg bg-[var(--surface-muted)] p-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-[var(--surface)]">
            {initials || "AC"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-[var(--foreground)]">
              {userName}
            </p>
            <p className="truncate text-[11px] text-[var(--text-muted)]">
              {userEmail}
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-[var(--accent)]">
              Trader
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
