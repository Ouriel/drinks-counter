"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Input, Card } from "@heroui/react";

type Member = { nickname: string; total: number };

export function TableView({
  slug,
  tableCode: initialCode,
  nickname: initialNickname,
}: {
  slug: string;
  tableCode: string | null;
  nickname: string | null;
}) {
  const [tableCode, setTableCode] = useState(initialCode);
  const [nickname] = useState(initialNickname);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchRanking = useCallback(async () => {
    if (!tableCode) return;
    const res = await fetch(`/api/tables?code=${tableCode}`);
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members);
    }
  }, [tableCode]);

  useEffect(() => {
    queueMicrotask(() => fetchRanking());
    if (!tableCode) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") fetchRanking();
    }, 60_000);
    return () => clearInterval(id);
  }, [tableCode, fetchRanking]);

  async function handleCreate() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setTableCode(data.code);
  }

  async function handleJoin() {
    if (!joinCode.trim()) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/tables", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, code: joinCode.trim() }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setTableCode(data.code);
    setShowJoin(false);
  }

  // Already in a table — show ranking
  if (tableCode) {
    return (
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">🍻 Table</h2>
          <span className="text-xs font-mono text-muted bg-surface px-2 py-1 rounded">
            {tableCode}
          </span>
        </div>
        {members.length === 0 ? (
          <p className="text-muted text-sm">Loading...</p>
        ) : (
          <div className="space-y-2">
            {members.map((m, i) => (
              <Card key={m.nickname}>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-base">
                    {i === 0 && members.length > 1 && "👑 "}
                    {m.nickname === nickname ? <strong>{m.nickname}</strong> : m.nickname}
                  </span>
                  <span className="font-bold tabular-nums text-lg">{m.total}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
        <p className="text-xs text-muted text-center mt-3">
          Share code <strong>{tableCode}</strong> with friends
        </p>
      </div>
    );
  }

  // Not in a table
  return (
    <div className="mt-6 text-center">
      {!showJoin ? (
        <div className="flex gap-2 justify-center">
          <Button variant="ghost" size="sm" isDisabled={loading} onPress={handleCreate}>
            {loading ? "..." : "🍻 Create table"}
          </Button>
          <Button variant="ghost" size="sm" onPress={() => setShowJoin(true)}>
            Join table
          </Button>
        </div>
      ) : (
        <div className="flex gap-2 justify-center items-center">
          <Input
            className="w-32"
            placeholder="Code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
            aria-label="Table code"
          />
          <Button
            variant="primary"
            size="sm"
            isDisabled={loading || !joinCode.trim()}
            onPress={handleJoin}
          >
            {loading ? "..." : "Join"}
          </Button>
          <Button variant="ghost" size="sm" onPress={() => setShowJoin(false)}>
            ×
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-danger mt-2">{error}</p>}
    </div>
  );
}
