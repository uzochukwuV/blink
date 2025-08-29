"use client";
import React from "react";

export function PillButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={
        "bg-accent text-white rounded-md px-5 py-2 font-medium shadow-sm active:bg-accent/80 disabled:opacity-60 " +
        (props.className || "")
      }
    >
      {children}
    </button>
  );
}