"use client";

import { useEffect, useState } from "react";
import { Button, Input, Card } from "@heroui/react";

type BarMenu = { id: string; barName: string; items: string[]; createdAt: string };
type Stats = { totalBarMenus: number; totalSessions: number; totalDrinks: number };

export default function AdminPage() {
  const [secret, setSecret] = useState(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("admin-secret") || "";
    return "";
  });
  const [authed, setAuthed] = useState(false);
  const [menus, setMenus] = useState<BarMenu[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editItems, setEditItems] = useState("");

  useEffect(() => {
    if (secret) fetchAdmin(secret);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchAdmin(s: string) {
    const res = await fetch("/api/admin", {
      headers: { Authorization: `Bearer ${s}` },
    });
    if (!res.ok) {
      setAuthed(false);
      return;
    }
    const data = await res.json();
    setMenus(data.menus);
    setStats(data.stats);
    setAuthed(true);
    sessionStorage.setItem("admin-secret", s);
  }

  async function load() {
    fetchAdmin(secret);
  }

  async function deleteMenu(id: string) {
    if (!confirm("Delete this bar menu?")) return;
    await fetch("/api/admin", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ id }),
    });
    load();
  }

  async function saveItems(id: string) {
    const items = editItems
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ id, items }),
    });
    setEditing(null);
    load();
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
        <h1 className="text-2xl font-bold mb-6">Admin</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
          className="w-full max-w-xs space-y-3"
        >
          <Input
            type="password"
            placeholder="Admin secret…"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="w-full"
          />
          <Button variant="primary" size="lg" className="w-full" onPress={() => load()}>
            Login
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <h1 className="text-2xl font-bold mb-6">Admin</h1>

      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-surface rounded-xl p-4 text-center">
            <p className="text-3xl font-bold">{stats.totalBarMenus}</p>
            <p className="text-sm text-muted mt-1">Bars</p>
          </div>
          <div className="bg-surface rounded-xl p-4 text-center">
            <p className="text-3xl font-bold">{stats.totalSessions}</p>
            <p className="text-sm text-muted mt-1">Sessions</p>
          </div>
          <div className="bg-surface rounded-xl p-4 text-center">
            <p className="text-3xl font-bold">{stats.totalDrinks}</p>
            <p className="text-sm text-muted mt-1">Drinks</p>
          </div>
        </div>
      )}

      <h2 className="text-lg font-bold mb-3">Bar Menus</h2>
      <div className="space-y-3">
        {menus.map((menu) => (
          <Card key={menu.id}>
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-base">{menu.barName}</p>
                  <p className="text-sm text-muted">{menu.items.length} items</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => {
                      setEditing(menu.id);
                      setEditItems(menu.items.join("\n"));
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger"
                    onPress={() => deleteMenu(menu.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {editing === menu.id ? (
                <div className="mt-2">
                  <textarea
                    value={editItems}
                    onChange={(e) => setEditItems(e.target.value)}
                    rows={8}
                    className="w-full bg-surface-secondary rounded-lg px-3 py-2 text-sm text-foreground outline-none resize-y"
                  />
                  <div className="flex gap-2 mt-2">
                    <Button variant="primary" size="sm" onPress={() => saveItems(menu.id)}>
                      Save
                    </Button>
                    <Button variant="ghost" size="sm" onPress={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted truncate">{menu.items.join(", ")}</p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
