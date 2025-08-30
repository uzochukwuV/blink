'use client';

import dynamic from "next/dynamic";
const LegacyApp = dynamic(() => import("../app"), { ssr: false });

export default function LegacyPage() {
  return <LegacyApp />;
}