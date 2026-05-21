"use client";

import { Button } from "@heroui/react";

export default function SessionError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
      <p className="text-4xl">😵</p>
      <h1 className="text-xl font-bold">Something went wrong</h1>
      <p className="text-muted text-sm text-center">The session page crashed. Try reloading.</p>
      <Button variant="primary" onPress={reset}>
        Try again
      </Button>
    </div>
  );
}
