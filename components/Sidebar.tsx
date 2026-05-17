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

export default function Sidebar() {
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
        className={`px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 ${
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
                ? "bg-green-400/10 text-green-300 font-medium"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold ${
                isActive
                  ? "bg-green-400/15 text-green-300"
                  : "bg-gray-800 text-gray-500"
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
    <aside className="fixed left-0 top-0 flex h-screen w-72 flex-col border-r border-gray-800 bg-gray-950">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white">
          Forex<span className="text-green-400">Pro</span>
        </h1>
        <p className="text-gray-500 text-xs mt-1">Trading Dashboard</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {renderNavGroup("Main Menu", mainMenuItems, true)}
        {renderNavGroup("Menu", menuItems)}
        {renderNavGroup("Config Menu", configMenuItems)}
      </nav>

      {/* Bottom */}
      <div className="border-t border-gray-800 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-gray-900 p-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-400 text-sm font-bold text-gray-950">
            {initials || "AC"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {userName}
            </p>
            <p className="truncate text-xs text-gray-500">{userEmail}</p>
            <p className="mt-1 text-xs font-medium text-green-300">Trader</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
