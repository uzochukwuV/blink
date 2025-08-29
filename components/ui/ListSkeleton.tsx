"use client";
import React from "react";

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center py-3 border-b border-muted animate-pulse last:border-b-0"
        >
          <div className="rounded-full bg-muted" style={{ width: 40, height: 40, marginRight: 14 }} />
          <div className="flex-1 min-w-0">
            <div className="h-4 bg-muted rounded w-2/3 mb-2" />
            <div className="h-3 bg-muted rounded w-1/3" />
          </div>
          <div className="ml-3 w-16 h-8 bg-muted rounded-md" />
        </div>
      ))}
    </div>
  );
}