"use client";
import React, { useEffect, useRef, useState } from "react";
import { PillButton } from "~/components/ui/PillButton";

export function BetModal({
  open,
  onClose,
  market,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  market?: { id: string; title: string };
  onSubmit: (payload: { amount: number; side: "yes" | "no"; notes?: string }) => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Focus trap and restore focus
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement;
      setTimeout(() => dialogRef.current?.focus(), 0);
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
        if (e.key === "Tab") {
          const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
            "input,button,textarea,[tabindex]:not([tabindex='-1'])"
          );
          if (focusable && focusable.length) {
            const first = focusable[0], last = focusable[focusable.length - 1];
            if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault(); first.focus();
            } else if (e.shiftKey && document.activeElement === first) {
              e.preventDefault(); last.focus();
            }
          }
        }
      };
      window.addEventListener("keydown", handleKey);
      return () => {
        window.removeEventListener("keydown", handleKey);
        triggerRef.current?.focus();
      };
    }
  }, [open, onClose]);

  useEffect(() => { if (!open) { setAmount(""); setNotes(""); setError(null); setSubmitting(false); } }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-40 transition-all"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="betmodal-title"
      ref={dialogRef}
    >
      <div className="bg-card rounded-lg shadow-xl border border-borderSubtle p-6 max-w-xs w-full transition-all duration-150 scale-100 opacity-100">
        <div className="flex justify-between items-center mb-2">
          <div className="text-lg font-bold" id="betmodal-title">
            Place Bet
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 text-textSecondary hover:text-accent focus:outline-none"
          >
            &times;
          </button>
        </div>
        <div className="mb-2">
          <div className="font-medium">{market?.title || "Market"}</div>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            const amt = Number(amount);
            if (!amt || amt < 1) {
              setError("Amount must be at least 1");
              return;
            }
            setSubmitting(true);
            try {
              await onSubmit({ amount: amt, side, notes });
              onClose();
            } catch (err: any) {
              setError(err.message || "Failed to place bet");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <label className="block mb-2">
            <span className="text-sm text-textSecondary">Amount</span>
            <input
              type="number"
              min={1}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full px-2 py-2 rounded-md bg-muted border border-borderSubtle text-textPrimary focus:ring-2 focus:ring-accent outline-none"
              disabled={submitting}
            />
          </label>
          <div className="flex items-center gap-4 mb-2">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="side"
                value="yes"
                checked={side === "yes"}
                onChange={() => setSide("yes")}
                className="accent-accent"
              />{" "}
              Yes
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="side"
                value="no"
                checked={side === "no"}
                onChange={() => setSide("no")}
                className="accent-accent"
              />{" "}
              No
            </label>
          </div>
          <label className="block mb-3">
            <span className="text-sm text-textSecondary">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full px-2 py-1 rounded-md bg-muted border border-borderSubtle text-textPrimary"
              rows={2}
              disabled={submitting}
            />
          </label>
          {error && <div className="text-danger text-sm mb-2">{error}</div>}
          <PillButton
            type="submit"
            className="w-full mt-1"
            disabled={submitting}
          >
            {submitting ? "Placing..." : "Place Bet"}
          </PillButton>
        </form>
      </div>
    </div>
  );
}