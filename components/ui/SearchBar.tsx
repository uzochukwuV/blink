"use client";
import React from "react";
export function SearchBar({
  placeholder = "Search...",
  value,
  onChange,
}: {
  placeholder?: string;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}) {
  return (
    <div className="flex items-center bg-muted rounded-md px-3 py-2 my-4 border border-borderSubtle">
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className="text-textSecondary mr-2">
        <circle cx="9" cy="9" r="7"/><path d="M16 16l-3-3"/>
      </svg>
      <input
        type="text"
        className="bg-transparent outline-none flex-1 text-textPrimary"
        placeholder={placeholder}
        aria-label={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}