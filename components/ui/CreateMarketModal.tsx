"use client";
import React, { useEffect, useRef, useState } from "react";
import { PillButton } from "~/components/ui/PillButton";
import { blinkContract, PredictionType } from "~/lib/contracts";
import { useAccount, useWalletClient } from "wagmi";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: (txHash: string) => void;
};

export function CreateMarketModal({ open, onClose, onCreated }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [type, setType] = useState<PredictionType>(PredictionType.VIRAL_CAST);
  const [title, setTitle] = useState("");
  const [targetId, setTargetId] = useState("");
  const [threshold, setThreshold] = useState<number>(100);
  const [duration, setDuration] = useState<number>(24);
  const [creatorStake, setCreatorStake] = useState<string>("10");
  const [limits, setLimits] = useState<{ min: number; max: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Focus handling
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement;
      setTimeout(() => dialogRef.current?.focus(), 0);
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleKey);
      return () => {
        window.removeEventListener("keydown", handleKey);
        triggerRef.current?.focus();
      };
    }
  }, [open, onClose]);

  // Load creator stake limits
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const { minStake, maxStake } = await blinkContract.getCreatorStakeLimits();
        setLimits({ min: Number(minStake) / 1e6, max: Number(maxStake) / 1e6 });
      } catch (e) {
        console.error("Failed to load stake limits", e);
        setLimits(null);
      }
    })();
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!address) {
      setErr("Connect a wallet or Base Account");
      return;
    }
    const stake = Number(creatorStake);
    if (!Number.isFinite(stake) || stake <= 0) {
      setErr("Invalid creator stake");
      return;
    }
    if (limits) {
      if (stake < limits.min) return setErr(`Stake must be >= ${limits.min}`);
      if (stake > limits.max) return setErr(`Stake must be <= ${limits.max}`);
    }
    if (!title || title.length < 10) {
      setErr("Title must be at least 10 characters");
      return;
    }
    if (!targetId) {
      setErr("Target ID is required");
      return;
    }
    if (!Number.isFinite(threshold) || threshold <= 0) {
      setErr("Threshold must be positive");
      return;
    }
    if (!Number.isFinite(duration) || duration < 1) {
      setErr("Duration must be at least 1 hour");
      return;
    }

    setLoading(true);
    try {
      const hash = await blinkContract.createMarket({
        walletClient,
        userAddress: address,
        type,
        title,
        targetId,
        threshold: Math.floor(threshold),
        durationHours: Math.floor(duration),
        creatorStakeUSDC: stake,
      });
      onCreated?.(hash);
      onClose();
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Failed to create market");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      ref={dialogRef}
    >
      <div className="bg-card rounded-lg shadow-xl border border-borderSubtle p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-3">
          <div className="text-lg font-bold">Create Market</div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 text-textSecondary hover:text-accent focus:outline-none"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="text-sm text-textSecondary">Type</span>
            <select
              className="mt-1 w-full px-2 py-2 rounded-md bg-muted border border-borderSubtle text-textPrimary"
              value={type}
              onChange={(e) => setType(Number(e.target.value) as PredictionType)}
              disabled={loading}
            >
              <option value={PredictionType.VIRAL_CAST}>Viral Cast</option>
              <option value={PredictionType.POLL_OUTCOME}>Poll Outcome</option>
              <option value={PredictionType.CHANNEL_GROWTH}>Channel Growth</option>
              <option value={PredictionType.CREATOR_MILESTONE}>Creator Milestone</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm text-textSecondary">Title</span>
            <input
              type="text"
              className="mt-1 w-full px-2 py-2 rounded-md bg-muted border border-borderSubtle text-textPrimary"
              placeholder='e.g. "Will cast 0x... reach 500 likes in 24h?"'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              required
              minLength={10}
              maxLength={200}
            />
          </label>

          <label className="block">
            <span className="text-sm text-textSecondary">Target ID</span>
            <input
              type="text"
              className="mt-1 w-full px-2 py-2 rounded-md bg-muted border border-borderSubtle text-textPrimary"
              placeholder="Cast hash (0x...), Channel ID, or FID"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              disabled={loading}
              required
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-textSecondary">Threshold</span>
              <input
                type="number"
                className="mt-1 w-full px-2 py-2 rounded-md bg-muted border border-borderSubtle text-textPrimary"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                disabled={loading}
                min={1}
                required
              />
            </label>

            <label className="block">
              <span className="text-sm text-textSecondary">Duration (hours)</span>
              <input
                type="number"
                className="mt-1 w-full px-2 py-2 rounded-md bg-muted border border-borderSubtle text-textPrimary"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                disabled={loading}
                min={1}
                max={168}
                required
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm text-textSecondary">Creator Stake (USDC)</span>
            <input
              type="number"
              className="mt-1 w-full px-2 py-2 rounded-md bg-muted border border-borderSubtle text-textPrimary"
              value={creatorStake}
              onChange={(e) => setCreatorStake(e.target.value)}
              disabled={loading}
              step="0.01"
              min={limits?.min ?? 0}
              max={limits?.max ?? undefined}
              required
            />
            {limits && (
              <div className="text-xs text-textSecondary mt-1">
                Min {limits.min} USDC • Max {limits.max} USDC
              </div>
            )}
          </label>

          {err && <div className="text-danger text-sm">{err}</div>}

          <PillButton type="submit" className="w-full mt-1" disabled={loading}>
            {loading ? "Creating..." : "Create Market"}
          </PillButton>
        </form>
      </div>
    </div>
  );
}