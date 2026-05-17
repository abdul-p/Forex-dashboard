"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const mainMenuItems = [
  { label: "Overview", href: "/overview", icon: "overview" },
  { label: "Charts", href: "/charts", icon: "charts" },
  { label: "Trading", href: "/trading", icon: "trading" },
  { label: "Analysis", href: "/analysis", icon: "analysis" },
  {
    label: "Fundamental Analysis",
    href: "/fundamental-analysis",
    icon: "fundamentals",
  },
  { label: "Portfolio", href: "/portfolio", icon: "portfolio" },
  {
    label: "Sentiment Analysis",
    href: "/sentiment-analysis",
    icon: "sentiment",
  },
  { label: "Markets", href: "/markets", icon: "markets" },
];

const menuItems = [
  { label: "News", href: "/news", icon: "news" },
  { label: "Calendar", href: "/calendar", icon: "calendar" },
  { label: "Activities", href: "/activities", icon: "activities" },
];

const configMenuItems = [
  { label: "Settings", href: "/settings", icon: "settings" },
];

type IconName =
  | "overview"
  | "charts"
  | "trading"
  | "analysis"
  | "fundamentals"
  | "portfolio"
  | "sentiment"
  | "markets"
  | "news"
  | "calendar"
  | "activities"
  | "settings";

type IconProps = {
  className?: string;
};

function IconBase({ children, className = "h-4 w-4" }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      {children}
    </svg>
  );
}

function NavIcon({ name }: { name: IconName }) {
  switch (name) {
    case "overview":
      return (
        <IconBase>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 13h6V4H4v9ZM14 20h6V4h-6v16ZM4 20h6v-3H4v3Z" />
        </IconBase>
      );
    case "charts":
      return (
        <IconBase>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5M4 19h16M8 15l3-4 3 2 5-7" />
        </IconBase>
      );
    case "trading":
      return (
        <IconBase>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10M7 7l3-3M7 7l3 3M17 17H7M17 17l-3-3M17 17l-3 3" />
        </IconBase>
      );
    case "analysis":
      return (
        <IconBase>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 19l4.5-4.5M13 11l6-6M15 5h4v4M4 6h6M4 10h4M4 14h2" />
        </IconBase>
      );
    case "fundamentals":
      return (
        <IconBase>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 20V5a1 1 0 0 1 1-1h8l3 3v13M9 9h6M9 13h6M9 17h3" />
        </IconBase>
      );
    case "portfolio":
      return (
        <IconBase>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 7V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1M5 8h14v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8ZM5 12h14" />
        </IconBase>
      );
    case "sentiment":
      return (
        <IconBase>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 13a8 8 0 1 0 16 0 8 8 0 0 0-16 0ZM9 11h.01M15 11h.01M9 15c1.6 1.3 4.4 1.3 6 0" />
        </IconBase>
      );
    case "markets":
      return (
        <IconBase>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2 2.4 3 5.4 3 9s-1 6.6-3 9M12 3c-2 2.4-3 5.4-3 9s1 6.6 3 9" />
        </IconBase>
      );
    case "news":
      return (
        <IconBase>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 5h11a2 2 0 0 1 2 2v12H7a2 2 0 0 1-2-2V5ZM8 9h7M8 13h7M8 17h4M18 8h1a1 1 0 0 1 1 1v8a2 2 0 0 1-2 2" />
        </IconBase>
      );
    case "calendar":
      return (
        <IconBase>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v4M17 3v4M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
        </IconBase>
      );
    case "activities":
      return (
        <IconBase>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 13h4l2-7 4 13 2-6h4" />
        </IconBase>
      );
    case "settings":
      return (
        <IconBase>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04-2.78 2.78-.04-.04A1.8 1.8 0 0 0 15 19.4a1.8 1.8 0 0 0-1 .6l-.03.04h-3.94L10 20a1.8 1.8 0 0 0-1-.6 1.8 1.8 0 0 0-1.98.36l-.04.04-2.78-2.78.04-.04A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-.6-1l-.04-.03v-3.94L4 10a1.8 1.8 0 0 0 .6-1 1.8 1.8 0 0 0-.36-1.98l-.04-.04L6.98 4.2l.04.04A1.8 1.8 0 0 0 9 4.6a1.8 1.8 0 0 0 1-.6l.03-.04h3.94L14 4a1.8 1.8 0 0 0 1 .6 1.8 1.8 0 0 0 1.98-.36l.04-.04 2.78 2.78-.04.04A1.8 1.8 0 0 0 19.4 9c.1.36.3.7.6 1l.04.03v3.94L20 14c-.3.3-.5.64-.6 1Z" />
        </IconBase>
      );
  }
}

function CloseSidebarIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16v14H4V5ZM9 5v14M15 9l-3 3 3 3" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20a8 8 0 0 1 16 0" />
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

  const renderNavGroup = (
    title: string,
    items: { label: string; href: string; icon: IconName }[],
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
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                isActive
                  ? "bg-[var(--surface)] text-[var(--accent)]"
                  : "bg-[var(--surface-muted)] text-[var(--text-muted)]"
              }`}
            >
              <NavIcon name={item.icon} />
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
          <CloseSidebarIcon />
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
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--surface)]">
            <UserIcon />
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
