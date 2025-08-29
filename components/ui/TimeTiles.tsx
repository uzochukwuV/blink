"use client";
import React from "react";

export function TimeTiles({
  tiles,
}: {
  tiles: { label: string; value: string | number }[];
}) {
  return (
    <div className="grid grid-cols-5 gap-2 my-5">
      {tiles.map((t, i) => (
        <div
          key={i}
          className="bg-card border border-muted rounded-md text-center py-2"
        >
          <div className="text-lg font-bold">{t.value}</div>
          <div className="text-xs text-textSecondary">{t.label}</div>
        </div>
      ))}
    </div>
  );
}