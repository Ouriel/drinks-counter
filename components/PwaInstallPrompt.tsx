"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@heroui/react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<NodeJS.Timeout>(null);

  // beforeinstallprompt is a one-shot browser event — useEffect is the only way to capture it
  useEffect(() => {
    if (isStandalone()) return;
    if (sessionStorage.getItem("pwa-dismissed")) return;

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      // Auto-dismiss after 8 seconds
      timerRef.current = setTimeout(() => setVisible(false), 8000);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!deferredPrompt || !visible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-surface border border-border rounded-xl p-4 shadow-xl z-40 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
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
          setVisible(false);
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
