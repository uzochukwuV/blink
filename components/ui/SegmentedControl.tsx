"use client";
import React from "react";

export function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: number;
  onChange: (i: number) => void;
}) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      onChange(Math.max(0, value - 1));
    } else if (e.key === "ArrowRight") {
      onChange(Math.min(options.length - 1, value + 1));
    } else if (e.key === "Home") {
      onChange(0);
    } else if (e.key === "End") {
      onChange(options.length - 1);
    }
  };
  return (
    <div
      className="flex bg-card rounded-md border border-muted my-4 overflow-hidden"
      role="tablist"
      aria-label="Segmented control"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {options.map((opt, i) => (
        <button
          key={opt}
          role="tab"
          aria-selected={value === i}
          tabIndex={value === i ? 0 : -1}
          onClick={() => onChange(i)}
          className={
            "flex-1 py-2 font-medium text-sm transition-colors " +
            (value === i
              ? "text-accent border-b-2 border-accent bg-accent/10"
              : "text-textSecondary border-b-2 border-transparent")
          }
        >
          {opt}
        </button>
      ))}
    </div>
  );
}