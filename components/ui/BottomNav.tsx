"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const tabs = [
  {
    key: "home",
    href: "/",
    label: "Home",
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 12L12 5l8 7"/><path d="M19 10v7a2 2 0 0 1-2 2h-2m-6 0H7a2 2 0 0 1-2-2v-7"/>
      </svg>
    ),
  },
  {
    key: "markets",
    href: "/markets",
    label: "Markets",
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="12" width="6" height="8"/><rect x="9" y="8" width="6" height="12"/><rect x="15" y="4" width="6" height="16"/>
      </svg>
    ),
  },
  {
    key: "bets",
    href: "/bets",
    label: "Bets",
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3v18M17 7H9a4 4 0 0 0 0 8h6a4 4 0 0 1 0 8H7"/>
      </svg>
    ),
  },
  {
    key: "profile",
    href: "/profile",
    label: "Profile",
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4"/><path d="M4 20v-1a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v1"/>
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="tabbar fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-card border-t border-muted flex justify-around items-center h-[60px] z-30"
      role="tablist"
    >
      {tabs.map((tab) => {
        // Active if pathname starts with tab.href (special-case home)
        const active =
          tab.href === "/"
            ? pathname === "/"
            : pathname === tab.href ||
              (tab.href !== "/" && pathname.startsWith(tab.href + "/"));
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-label={tab.label}
            aria-current={active ? "page" : undefined}
            className={
              "tab flex flex-col items-center flex-1 py-1 text-xs font-medium transition-colors " +
              (active ? "text-accent" : "text-textSecondary")
            }
          >
            <span className="icon w-6 h-6 mb-0.5 flex items-center justify-center">
              {tab.icon}
            </span>
            <span>{tab.label}</span>
            {active && <span className="dot mt-0.5" />}
          </Link>
        );
      })}
    </nav>
  );
}