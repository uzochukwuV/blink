"use client";
import React from "react";
import { MobileShell } from "~/components/ui/MobileShell";
import { TopBar } from "~/components/ui/TopBar";
// removed mock imports

const ArrowLeft = (
  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </svg>
);

export default function ProfilePage() {
  const stats = {
    bets: 120,
    wins: 85,
    losses: 35
  };

  const winRate = Math.round((stats.wins / stats.bets) * 100);

  return (
    <MobileShell
      activeTab="profile"
      topBar={
        <TopBar
          title="Profile"
          backSlot={ArrowLeft}
        />
      }
    >
      <div className="p-4 pb-24">
        {/* Profile Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">EC</span>
          </div>
          <h1 className="text-2xl font-bold text-textPrimary mb-1">Ethan Carter</h1>
          <p className="text-textSecondary">@ethan_carter</p>
          <p className="text-textSecondary text-sm">Joined 2023</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-card rounded-lg p-4 border border-borderSubtle text-center">
            <div className="text-2xl font-bold text-textPrimary mb-1">{stats.bets}</div>
            <div className="text-textSecondary text-sm">Bets</div>
          </div>
          <div className="bg-card rounded-lg p-4 border border-borderSubtle text-center">
            <div className="text-2xl font-bold text-success mb-1">{stats.wins}</div>
            <div className="text-textSecondary text-sm">Wins</div>
          </div>
          <div className="bg-card rounded-lg p-4 border border-borderSubtle text-center">
            <div className="text-2xl font-bold text-danger mb-1">{stats.losses}</div>
            <div className="text-textSecondary text-sm">Losses</div>
          </div>
        </div>

        {/* Betting History */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-textPrimary mb-4">Betting History</h2>
          <div className="space-y-3">
            <div className="text-textSecondary text-sm">No history yet.</div>
          </div>
        </div>
      </div>
    </MobileShell>
  );
}