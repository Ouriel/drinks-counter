"use client";

import { useEffect, useState } from "react";
import { Button, Input, Card } from "@heroui/react";
import { CATEGORIES } from "@/lib/constants";
import type { MenuItem } from "@/lib/types";

type BarMenu = { id: string; barName: string; items: MenuItem[]; createdAt: string };
type Session = {
  id: string;
  slug: string;
  nickname: string | null;
  drinkCount: number;
  createdAt: string;
  expiresAt: string;
};
type Table = { id: string; code: string; memberCount: number; createdAt: string };
type Tab = "bars" | "sessions" | "tables";

export default function AdminPage() {
  const [secret, setSecret] = useState(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("admin-secret") || "";
    return "";
  });
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<Tab>("bars");
  const [menus, setMenus] = useState<BarMenu[]>([]);
  const [sessionsList, setSessionsList] = useState<Session[]>([]);
  const [tablesList, setTablesList] = useState<Table[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editBarName, setEditBarName] = useState("");
  const [editRows, setEditRows] = useState<MenuItem[]>([]);

  const headers = { Authorization: `Bearer ${secret}` };

  useEffect(() => {
    if (secret) login(secret);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function login(s: string) {
    const res = await fetch("/api/admin?tab=bars", { headers: { Authorization: `Bearer ${s}` } });
    if (!res.ok) {
      setAuthed(false);
      return;
    }
    const data = await res.json();
    setMenus(data.menus);
    setAuthed(true);
    sessionStorage.setItem("admin-secret", s);
  }

  async function loadTab(t: Tab) {
    setTab(t);
    const res = await fetch(`/api/admin?tab=${t}`, { headers });
    if (!res.ok) return;
    const data = await res.json();
    if (t === "bars") setMenus(data.menus);
    if (t === "sessions") setSessionsList(data.sessions);
    if (t === "tables") setTablesList(data.tables);
  }

  async function deleteItem(type: string, id: string) {
    if (!confirm(`Delete this ${type}?`)) return;
    await fetch("/api/admin", {
      method: "DELETE",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ type, id }),
    });
    loadTab(tab);
  }

  async function saveItems(id: string) {
    const items = editRows.filter((row) => row.name.trim());
    await fetch("/api/admin", {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ id, items, barName: editBarName.trim() }),
    });
    setEditing(null);
    loadTab("bars");
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
        <h1 className="text-2xl font-bold mb-6">Admin</h1>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            login(secret);
          }}
          className="w-full max-w-xs space-y-3"
        >
          <Input
            type="password"
            placeholder="Admin secret…"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
          />
          <Button variant="primary" size="lg" className="w-full" onPress={() => login(secret)}>
            Login
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <h1 className="text-2xl font-bold mb-4">Admin</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["bars", "sessions", "tables"] as Tab[]).map((t) => (
          <Button
            key={t}
            variant={tab === t ? "primary" : "ghost"}
            size="sm"
            onPress={() => loadTab(t)}
          >
            {t === "bars" ? "🍸 Bars" : t === "sessions" ? "📋 Sessions" : "🍻 Tables"}
          </Button>
        ))}
      </div>

      {/* Bars tab */}
      {tab === "bars" && (
        <div className="space-y-3">
          {menus.map((menu) => (
            <Card key={menu.id}>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-base">{menu.barName}</p>
                    <p className="text-sm text-default-500">{menu.items.length} items</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => {
                        setEditing(menu.id);
                        setEditBarName(menu.barName);
                        setEditRows([...menu.items]);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger"
                      onPress={() => deleteItem("bar", menu.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                {editing === menu.id ? (
                  <div className="mt-2 space-y-2">
                    <Input
                      placeholder="Bar name"
                      value={editBarName}
                      onChange={(event) => setEditBarName(event.target.value)}
                    />
                    <div className="space-y-1">
                      {editRows.map((row, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <Input
                            placeholder="Drink name"
                            value={row.name}
                            onChange={(event) => {
                              const next = [...editRows];
                              next[i] = { ...next[i], name: event.target.value };
                              setEditRows(next);
                            }}
                            className="flex-1"
                          />
                          <select
                            aria-label="Category"
                            value={row.category}
                            onChange={(event) => {
                              const next = [...editRows];
                              next[i] = { ...next[i], category: event.target.value };
                              setEditRows(next);
                            }}
                            className="w-32 bg-default-100 rounded-lg px-2 py-2 text-sm text-foreground outline-none"
                          >
                            {CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                          <Button
                            variant="ghost"
                            isIconOnly
                            onPress={() => setEditRows(editRows.filter((_, j) => j !== i))}
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => setEditRows([...editRows, { name: "", category: "other" }])}
                    >
                      + Add item
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="primary" size="sm" onPress={() => saveItems(menu.id)}>
                        Save
                      </Button>
                      <Button variant="ghost" size="sm" onPress={() => setEditing(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-default-500 truncate">
                    {menu.items.map((item) => item.name).join(", ")}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Sessions tab */}
      {tab === "sessions" && (
        <div className="space-y-2">
          {sessionsList.map((session) => {
            const expired = new Date(session.expiresAt) < new Date();
            return (
              <Card key={session.id}>
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm">
                      {session.slug}
                      {session.nickname && (
                        <span className="text-default-500 ml-2">({session.nickname})</span>
                      )}
                    </p>
                    <p className="text-xs text-default-500">
                      {session.drinkCount} drinks ·{" "}
                      {expired ? <span className="text-danger">expired</span> : "active"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger"
                    onPress={() => deleteItem("session", session.id)}
                  >
                    ✕
                  </Button>
                </div>
              </Card>
            );
          })}
          {sessionsList.length === 0 && <p className="text-default-500 text-sm">No sessions</p>}
        </div>
      )}

      {/* Tables tab */}
      {tab === "tables" && (
        <div className="space-y-2">
          {tablesList.map((table) => (
            <Card key={table.id}>
              <div className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-mono text-base font-bold">{table.code}</p>
                  <p className="text-xs text-default-500">
                    {table.memberCount} members · {new Date(table.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger"
                  onPress={() => deleteItem("table", table.id)}
                >
                  ✕
                </Button>
              </div>
            </Card>
          ))}
          {tablesList.length === 0 && <p className="text-default-500 text-sm">No tables</p>}
        </div>
      )}
    </div>
  );
}
