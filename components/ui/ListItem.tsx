"use client";
import Image from "next/image";
import React from "react";
import { Avatar } from "./Avatar";

export function ListItem({
  avatar,
  title,
  subtitle,
  right,
}: {
  avatar?: { src?: string; initials?: string };
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center py-3 border-b border-muted last:border-b-0">
      {avatar && (
        <Avatar src={avatar.src} initials={avatar.initials} size={40} />
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{title}</div>
        {subtitle && (
          <div className="text-textSecondary text-sm truncate">{subtitle}</div>
        )}
      </div>
      {right && <div className="ml-3 flex items-center">{right}</div>}
    </div>
  );
}