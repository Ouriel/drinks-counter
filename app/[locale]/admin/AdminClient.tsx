"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Input, Card } from "@heroui/react";
import { useTranslations } from "next-intl";
import { CATEGORIES } from "@/lib/constants";
import { formatNickname } from "@/lib/nicknames";
import { CategoryIcon } from "@/lib/category-icon";
import { Camera, Wine, ClipboardList, Users, BookOpen, Beer } from "lucide-react";
import { MILESTONES, PACE_LEVELS, getSessionHue, getIconColor } from "@/lib/gamification";
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
type DrinkRow = { name: string; count: number; category: string | null };
type MemberRow = { nickname: string; slug: string; total: number };
type Tab = "bars" | "sessions" | "tables" | "guide";

// Reference for the admin Guide tab (admin UI is English-only by convention).
const ACHIEVEMENTS_GUIDE: { emoji: string; name: string; how: string }[] = [
  { emoji: "🌈", name: "Tasted the rainbow", how: "Drinks from 4+ categories" },
  { emoji: "🏆", name: "Menu destroyer", how: "Drinks from 7+ categories" },
  { emoji: "🧭", name: "Commitment issues", how: "5+ different drinks" },
  { emoji: "🗺️", name: "Can't sit still", how: "10+ different drinks" },
  { emoji: "🧃", name: "Designated hero", how: "3+ drinks, all alcohol-free" },
  { emoji: "💧", name: "Sponsored by water", how: "Had alcohol + 3 or more non-alcoholic drinks" },
  { emoji: "⭐", name: "Your usual", how: "One drink ordered 4+ times" },
  { emoji: "💎", name: "In a relationship", how: "One drink ordered 7+ times" },
  { emoji: "🎲", name: "Chaos mode", how: "4+ drinks, never the same one twice" },
  {
    emoji: "📈",
    name: "Started soft, ended questionable",
    how: "Began with beer/soft, ended on spirit/cocktail/shot",
  },
  { emoji: "🌙", name: "Past midnight and proud", how: "Last drink between midnight and 5am" },
  { emoji: "🐌", name: "Marathon, not a sprint", how: "Session lasted 4+ hours" },
  { emoji: "⚡", name: "Speedrun any%", how: "3+ drinks within 30 minutes" },
  { emoji: "🕔", name: "Happy hour hero", how: "First drink between 4pm and 7pm" },
  { emoji: "🫁", name: "Liver complaint", how: "Reached 20+ drinks" },
];

export default function AdminPage() {
  const tAnimals = useTranslations("animals");
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
  const [openId, setOpenId] = useState<string | null>(null);
  const [openDrinks, setOpenDrinks] = useState<DrinkRow[]>([]);
  const [openMembers, setOpenMembers] = useState<MemberRow[]>([]);
  const [rescanning, setRescanning] = useState(false);
  const rescanRef = useRef<HTMLInputElement>(null);

  const headers = { Authorization: `Bearer ${secret}` };

  async function handleRescan(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setRescanning(true);
    try {
      const { default: imageCompression } = await import("browser-image-compression");
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
      });
      const formData = new FormData();
      formData.append("photo", compressed);
      const res = await fetch("/api/parse-menu", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        const seen = new Set(editRows.map((row) => row.name.toLowerCase()));
        const merged = [...editRows];
        for (const item of (data.items || []) as MenuItem[]) {
          if (!seen.has(item.name.toLowerCase())) {
            merged.push({ name: item.name, category: item.category });
            seen.add(item.name.toLowerCase());
          }
        }
        setEditRows(merged);
      }
    } finally {
      setRescanning(false);
      event.target.value = "";
    }
  }

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
    setOpenId(null);
    if (t === "guide") return; // reference content, no data to fetch
    const res = await fetch(`/api/admin?tab=${t}`, { headers });
    if (!res.ok) return;
    const data = await res.json();
    if (t === "bars") setMenus(data.menus);
    if (t === "sessions") setSessionsList(data.sessions);
    if (t === "tables") setTablesList(data.tables);
  }

  async function toggleSession(id: string) {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    const res = await fetch(`/api/admin?tab=session-detail&id=${id}`, { headers });
    if (!res.ok) return;
    const data = await res.json();
    setOpenDrinks(data.drinks);
    setOpenId(id);
  }

  async function toggleTable(id: string) {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    const res = await fetch(`/api/admin?tab=table-detail&id=${id}`, { headers });
    if (!res.ok) return;
    const data = await res.json();
    setOpenMembers(data.members);
    setOpenId(id);
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
            className="w-full"
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
      <div className="flex flex-wrap gap-2 mb-6">
        {(
          [
            { key: "bars", label: "Bars", Icon: Wine },
            { key: "sessions", label: "Sessions", Icon: ClipboardList },
            { key: "tables", label: "Tables", Icon: Users },
            { key: "guide", label: "Guide", Icon: BookOpen },
          ] as { key: Tab; label: string; Icon: typeof Wine }[]
        ).map(({ key, label, Icon }) => (
          <Button
            key={key}
            variant={tab === key ? "primary" : "ghost"}
            size="sm"
            className="gap-1"
            onPress={() => loadTab(key)}
          >
            <Icon className="w-4 h-4" />
            {label}
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
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => setEditRows([...editRows, { name: "", category: "other" }])}
                      >
                        + Add item
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        isDisabled={rescanning}
                        className="gap-1"
                        onPress={() => rescanRef.current?.click()}
                      >
                        <Camera className="w-4 h-4" />
                        {rescanning ? "Scanning…" : "Re-scan menu"}
                      </Button>
                    </div>
                    <input
                      ref={rescanRef}
                      type="file"
                      accept="image/*"
                      onChange={handleRescan}
                      className="hidden"
                    />
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
                  <button
                    type="button"
                    className="text-left flex-1 cursor-pointer"
                    onClick={() => toggleSession(session.id)}
                  >
                    <p className="font-mono text-sm">
                      {session.slug}
                      {session.nickname && (
                        <span className="text-default-500 ml-2">
                          ({formatNickname(session.nickname, tAnimals)})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-default-500">
                      {session.drinkCount} drinks ·{" "}
                      {expired ? <span className="text-danger">expired</span> : "active"} ·{" "}
                      {openId === session.id ? "▲" : "▼"}
                    </p>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger"
                    onPress={() => deleteItem("session", session.id)}
                  >
                    ✕
                  </Button>
                </div>
                {openId === session.id && (
                  <div className="px-3 pb-3 space-y-1">
                    {openDrinks.length === 0 ? (
                      <p className="text-xs text-default-500">No drinks</p>
                    ) : (
                      openDrinks.map((drink) => (
                        <div
                          key={drink.name}
                          className="flex justify-between text-sm border-t border-default-100 pt-1"
                        >
                          <span className="flex items-center gap-2">
                            <CategoryIcon category={drink.category} className="w-4 h-4 shrink-0" />
                            {drink.name}
                          </span>
                          <span className="font-bold tabular-nums">×{drink.count}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
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
                <button
                  type="button"
                  className="text-left flex-1 cursor-pointer"
                  onClick={() => toggleTable(table.id)}
                >
                  <p className="font-mono text-base font-bold">{table.code}</p>
                  <p className="text-xs text-default-500">
                    {table.memberCount} members · {new Date(table.createdAt).toLocaleDateString()} ·{" "}
                    {openId === table.id ? "▲" : "▼"}
                  </p>
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger"
                  onPress={() => deleteItem("table", table.id)}
                >
                  ✕
                </Button>
              </div>
              {openId === table.id && (
                <div className="px-3 pb-3 space-y-1">
                  {openMembers.length === 0 ? (
                    <p className="text-xs text-default-500">No members</p>
                  ) : (
                    openMembers.map((member) => (
                      <div
                        key={member.slug}
                        className="flex justify-between text-sm border-t border-default-100 pt-1"
                      >
                        <span>
                          {formatNickname(member.nickname, tAnimals)}{" "}
                          <span className="text-default-400 font-mono text-xs">{member.slug}</span>
                        </span>
                        <span className="font-bold tabular-nums">{member.total}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </Card>
          ))}
          {tablesList.length === 0 && <p className="text-default-500 text-sm">No tables</p>}
        </div>
      )}

      {/* Guide tab */}
      {tab === "guide" && (
        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-bold mb-3">Badges (by total drinks)</h2>
            <div className="space-y-2">
              {MILESTONES.map(([threshold, badge]) => (
                <div
                  key={threshold}
                  className="flex items-center gap-3 bg-default-100 rounded-lg px-3 py-2"
                >
                  <span className="text-2xl">{badge.emoji}</span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{badge.title}</p>
                    <p className="text-xs text-default-500">{badge.subtitle}</p>
                  </div>
                  <span className="text-sm text-default-500 shrink-0">Reach {threshold}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">Pace levels (drinks per hour)</h2>
            <div className="space-y-2">
              {PACE_LEVELS.map((level, index) => {
                const prev = index === 0 ? 0 : PACE_LEVELS[index - 1].maxDph;
                const range =
                  level.maxDph === Infinity
                    ? `> ${prev}/h`
                    : index === 0
                      ? `≤ ${level.maxDph}/h`
                      : `${prev}–${level.maxDph}/h`;
                return (
                  <div
                    key={level.label}
                    className="flex items-center gap-3 bg-default-100 rounded-lg px-3 py-2"
                  >
                    <span className="text-2xl">{level.emoji}</span>
                    <span className="flex-1 text-sm font-medium">{level.label}</span>
                    <span className="text-sm text-default-500 shrink-0">
                      {range}
                      {level.label === "Social Pace" ? " · ~1 every 30 min" : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">Achievements</h2>
            <div className="space-y-2">
              {ACHIEVEMENTS_GUIDE.map((achievement) => (
                <div
                  key={achievement.name}
                  className="flex items-center gap-3 bg-default-100 rounded-lg px-3 py-2"
                >
                  <span className="text-2xl">{achievement.emoji}</span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{achievement.name}</p>
                    <p className="text-xs text-default-500">{achievement.how}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">Color &amp; motion (by total drinks)</h2>
            <p className="text-xs text-default-500 mb-3">
              The session screen reacts to how many drinks have been logged: the background and icon
              tint shift from cool/amber to warm, and the page tilts more as the count climbs (all
              capped at 20 drinks).
            </p>
            <div className="flex gap-2 mb-4">
              {[0, 5, 10, 15, 20].map((n) => (
                <div key={n} className="flex-1 text-center">
                  <div
                    className="h-12 rounded-lg flex items-center justify-center border border-default-200"
                    style={{ backgroundColor: getSessionHue(n, true) }}
                  >
                    <Beer className="w-5 h-5" style={{ color: getIconColor(n, true) }} />
                  </div>
                  <p className="text-xs text-default-500 mt-1">{n === 20 ? "20+" : n}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {[
                {
                  name: "Background hue",
                  how: "Cool blue → warm amber as drinks go from 0 to 20.",
                },
                {
                  name: "Icon tint",
                  how: "Amber, shifting toward deep orange as the count rises.",
                },
                {
                  name: "Tilt & shadow",
                  how: "Page starts tilting at 3 drinks; drop shadow grows from 7+.",
                },
                {
                  name: "Title wobble",
                  how: "The drink counter wobbles on each tap from 10+.",
                },
                {
                  name: "Vignette",
                  how: "A pulsing dark vignette frames the screen at 15+.",
                },
              ].map((effect) => (
                <div
                  key={effect.name}
                  className="flex items-center gap-3 bg-default-100 rounded-lg px-3 py-2"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{effect.name}</p>
                    <p className="text-xs text-default-500">{effect.how}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
