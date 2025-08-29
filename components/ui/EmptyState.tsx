"use client";
import React from "react";

export function EmptyState({
  icon,
  label,
}: {
  icon?: React.ReactNode;
  label: string;
}) {
  return (
    <div className="w-full flex flex-col items-center justify-center py-16 text-textSecondary">
      <div className="mb-2">{icon || (
        <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
          <circle cx="16" cy="16" r="14" /><path d="M10 16l4 4 8-8"/>
        </svg>
      )}</div>
      <div className="text-base">{label}</div>
    </div>
  );
}