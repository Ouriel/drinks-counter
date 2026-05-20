"use client";

import { useEffect, useState } from "react";
import { Button } from "@heroui/react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Don't show if already dismissed this session
    if (sessionStorage.getItem("pwa-dismissed")) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-surface border border-border rounded-xl p-4 shadow-xl z-40 flex items-center gap-3">
      <div className="flex-1">
        <p className="font-medium text-sm">Install TipsyTap</p>
        <p className="text-xs text-muted">Add to home screen for quick access</p>
      </div>
      <Button
        variant="primary"
        size="sm"
        onPress={async () => {
          await deferredPrompt.prompt();
          setDeferredPrompt(null);
        }}
      >
        Install
      </Button>
      <button
        onClick={() => {
          setDismissed(true);
          sessionStorage.setItem("pwa-dismissed", "1");
        }}
        className="text-muted text-lg"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
