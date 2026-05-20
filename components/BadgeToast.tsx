"use client";

import { useEffect, useState } from "react";
import { Confetti } from "./Confetti";
import type { Badge } from "@/lib/gamification";

export function BadgeToast({ badge, onDone }: { badge: Badge; onDone: () => void }) {
  const [visible, setVisible] = useState(true);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300);
    }, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <>
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}
      <div
        role="status"
        aria-live="polite"
        className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-surface border border-border rounded-2xl px-5 py-3 shadow-xl text-center transition-all duration-300 ${visible ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}
      >
        <p className="text-3xl">{badge.emoji}</p>
        <p className="font-bold text-sm mt-1">{badge.title}</p>
        <p className="text-xs text-muted">{badge.subtitle}</p>
      </div>
    </>
  );
}
