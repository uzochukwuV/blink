"use client";
import React from "react";

export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="w-full h-2 bg-muted rounded-md mt-2 mb-2 overflow-hidden">
      <div
        className="h-full bg-accent transition-all rounded-md"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}