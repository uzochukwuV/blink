"use client";
import Image from "next/image";
import React from "react";

const colorList = [
  "#2E7CF6",
  "#8CA0B3",
  "#34D399",
  "#F87171",
  "#F59E42",
  "#A78BFA",
];

export function Avatar({
  src,
  initials,
  size = 40,
}: {
  src?: string;
  initials?: string;
  size?: number;
}) {
  if (src) {
    return (
      <Image
        src={src.startsWith("/") ? src : `/avatars/${src}`}
        alt="Avatar"
        width={size}
        height={size}
        className="rounded-full object-cover bg-card"
        style={{ width: size, height: size }}
      />
    );
  }
  const bg =
    colorList[
      initials
        ? initials.charCodeAt(0) % colorList.length
        : Math.floor(Math.random() * colorList.length)
    ];
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white"
      style={{
        width: size,
        height: size,
        background: bg,
        fontSize: size / 2,
      }}
    >
      {initials ? initials.slice(0, 2).toUpperCase() : "?"}
    </div>
  );
}