"use client";
import React from "react";

export function StatCard({
  value,
  label,
}: {
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex-1 bg-card rounded-md p-3 text-center border border-muted">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-textSecondary mt-1">{label}</div>
    </div>
  );
}