import { Spinner } from "@heroui/react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
