"use client";
import { MobileShell } from "~/components/ui/MobileShell";
import { TopBar } from "~/components/ui/TopBar";
import { ProgressBar } from "~/components/ui/ProgressBar";
import { PillButton } from "~/components/ui/PillButton";
// removed mock imports

export default function BetsPollsPage() {
  return (
    <MobileShell
      activeTab="bets"
      topBar={<TopBar title="Bets" backHref="/bets" />}
    >
      <div className="p-4 pb-24 flex flex-col gap-4">
        <div className="text-textSecondary text-sm">No polls available.</div>
      </div>
    </MobileShell>
  );
}