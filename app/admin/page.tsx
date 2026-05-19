"use client";

import { useEffect, useState } from "react";

type BarMenu = { id: string; barName: string; items: string[]; createdAt: string };
type Stats = { totalBarMenus: number; totalSessions: number; totalDrinks: number };

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [menus, setMenus] = useState<BarMenu[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editItems, setEditItems] = useState("");

  async function load() {
    const res = await fetch("/api/admin", {
      headers: { Authorization: `Bearer ${secret}` },
    });
    if (!res.ok) {
      setAuthed(false);
      return;
    }
    const data = await res.json();
    setMenus(data.menus);
    setStats(data.stats);
    setAuthed(true);
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
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
        <h1 className="text-2xl font-bold mb-6">Admin</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
          className="w-full max-w-xs space-y-3"
        >
          <input
            type="password"
            placeholder="Admin secret…"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="w-full bg-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 outline-none"
          />
          <button className="w-full bg-amber-500 text-black font-bold rounded-xl py-3">
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <h1 className="text-2xl font-bold mb-6">Admin</h1>

      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold">{stats.totalBarMenus}</p>
            <p className="text-xs text-gray-400">Bars</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold">{stats.totalSessions}</p>
            <p className="text-xs text-gray-400">Sessions</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold">{stats.totalDrinks}</p>
            <p className="text-xs text-gray-400">Drinks</p>
          </div>
        </div>
      )}

      <h2 className="text-lg font-bold mb-3">Bar Menus</h2>
      <div className="space-y-3">
        {menus.map((menu) => (
          <div key={menu.id} className="bg-gray-800 rounded-xl p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-medium">{menu.barName}</p>
                <p className="text-xs text-gray-400">{menu.items.length} items</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditing(menu.id);
                    setEditItems(menu.items.join("\n"));
                  }}
                  className="text-xs bg-gray-700 px-3 py-1 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteMenu(menu.id)}
                  className="text-xs bg-red-900 px-3 py-1 rounded"
                >
                  Delete
                </button>
              </div>
            </div>

            {editing === menu.id ? (
              <div className="mt-2">
                <textarea
                  value={editItems}
                  onChange={(e) => setEditItems(e.target.value)}
                  rows={8}
                  className="w-full bg-gray-900 rounded-lg px-3 py-2 text-sm text-white outline-none"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => saveItems(menu.id)}
                    className="text-xs bg-amber-500 text-black px-3 py-1 rounded font-bold"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="text-xs bg-gray-700 px-3 py-1 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 truncate">{menu.items.join(", ")}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
