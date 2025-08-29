"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";

export function TopBar({
  title,
  backHref,
  backSlot,
  actionSlot,
}: {
  title: string;
  backHref?: string;
  backSlot?: React.ReactNode;
  actionSlot?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="h-14 flex items-center border-b border-muted bg-bg px-3 sticky top-0 z-10">
      {backHref || backSlot ? (
        <button
          aria-label="Back"
          className="mr-2 p-2 text-textSecondary hover:text-accent"
          onClick={() => (backHref ? router.push(backHref) : router.back())}
        >
          {backSlot || <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7"/></svg>}
        </button>
      ) : (
        <span style={{ width: 40, display: "inline-block" }} />
      )}
      <div className="flex-1 text-center font-medium text-lg">{title}</div>
      <div className="ml-auto">{actionSlot || <span style={{ width: 40, display: "inline-block" }} />}</div>
    </div>
  );
}