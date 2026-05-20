"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
      <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
      <p className="text-muted mb-6">The page encountered an error.</p>
      <button
        onClick={reset}
        className="bg-amber-500 text-black font-bold rounded-xl px-6 py-3 active:bg-amber-400"
      >
        Try again
      </button>
    </div>
  );
}
