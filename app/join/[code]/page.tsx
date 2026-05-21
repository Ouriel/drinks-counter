"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Spinner, Button } from "@heroui/react";
import { api } from "@/lib/api";

export default function JoinTablePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    async function join() {
      // Check if user already has a session
      let slug: string | null = null;
      try {
        const recent = JSON.parse(localStorage.getItem("tipsytap_recent") || "[]");
        if (recent.length > 0) slug = recent[0].slug;
      } catch {}

      // No existing session → create one
      if (!slug) {
        const session = await api.createSession({});
        if (!session) {
          setError("Could not create session");
          return;
        }
        slug = session.slug;
        // Save to recent
        try {
          const recent = JSON.parse(localStorage.getItem("tipsytap_recent") || "[]");
          const entry = { slug, barName: slug, date: new Date().toISOString() };
          localStorage.setItem("tipsytap_recent", JSON.stringify([entry, ...recent].slice(0, 10)));
        } catch {}
      }

      // Join the table
      const result = await api.joinTable(slug, code);
      if (!result) {
        // Maybe already in a table — just redirect
        router.replace(`/s/${slug}`);
        return;
      }

      router.replace(`/s/${slug}`);
    }

    join();
  }, [code, router]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-4xl">😕</p>
        <p className="text-lg font-bold">Could not join table</p>
        <p className="text-muted text-sm">{error}</p>
        <Button variant="primary" onPress={() => router.push("/")}>
          Start fresh
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <Spinner size="lg" />
      <p className="text-muted">Joining table…</p>
    </div>
  );
}
