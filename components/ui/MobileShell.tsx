"use client";
import React from "react";
import { BottomNav } from "./BottomNav";

export function MobileShell({
  activeTab,
  topBar,
  children,
}: {
  activeTab: "home" | "markets" | "bets" | "profile";
  topBar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-bg max-w-[430px] mx-auto flex flex-col">
      {topBar}
      <main className="flex-1 px-4 pb-24 pt-2">{children}</main>
      <BottomNav />
    </div>
  );
}