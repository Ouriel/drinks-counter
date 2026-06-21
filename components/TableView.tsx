"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button, Input, Card, Modal, useOverlayState, toast } from "@heroui/react";
import { useTranslations } from "next-intl";
import { QrCode } from "@/components/QrCode";
import { api } from "@/lib/api";
import { formatNickname } from "@/lib/nicknames";
import { RefreshCw, QrCode as QrCodeIcon, Copy, MessageCircle, Dices, Users } from "lucide-react";

type Member = { nickname: string; total: number };

export function TableView({
  slug,
  tableCode: initialCode,
  nickname: initialNickname,
  drinkTotal,
}: {
  slug: string;
  tableCode: string | null;
  nickname: string | null;
  drinkTotal: number;
}) {
  const [localCode, setLocalCode] = useState<string | null>(null);
  const [nickname, setNickname] = useState(initialNickname);
  const tableCode = localCode || initialCode;
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [rerollsUsed, setRerollsUsed] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem(`tipsytap_rerolls_${slug}`) || "0", 10) || 0;
  });
  const modalState = useOverlayState({ isOpen: !!selectedMember });
  const t = useTranslations("table");
  const tAnimals = useTranslations("animals");

  const MAX_REROLLS = 3;
  const joinUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/join/${tableCode}`;

  async function handleReroll() {
    if (rerollsUsed >= MAX_REROLLS) return;
    const data = await api.rerollNickname(slug);
    if (!data) return;
    setNickname(data.nickname);
    const used = rerollsUsed + 1;
    setRerollsUsed(used);
    localStorage.setItem(`tipsytap_rerolls_${slug}`, String(used));
    fetchRanking();
  }

  function copyJoinLink() {
    navigator.clipboard.writeText(joinUrl);
    toast(t("linkCopied"), { timeout: 15000 });
  }

  function shareWhatsApp() {
    const text = `Join my table on TipsyTap 🍻 ${joinUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  const fetchRanking = useCallback(
    async (code?: string) => {
      const c = code || tableCode;
      if (!c) return;
      const data = await api.getTableRanking(c);
      if (data) setMembers(data.members);
    },
    [tableCode]
  );

  useEffect(() => {
    if (!tableCode) return;
    fetchRanking();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") fetchRanking();
    }, 30_000);
    return () => clearInterval(id);
  }, [tableCode, fetchRanking]);

  // Refresh leaderboard when own drink count changes
  const prevTotal = useRef(drinkTotal);
  useEffect(() => {
    if (drinkTotal !== prevTotal.current && tableCode) {
      prevTotal.current = drinkTotal;
      const timeout = setTimeout(() => fetchRanking(), 500);
      return () => clearTimeout(timeout);
    }
  }, [drinkTotal, tableCode, fetchRanking]);

  async function handleCreate() {
    setLoading(true);
    setError("");
    const data = await api.createTable(slug);
    setLoading(false);
    if (!data) {
      setError(t("couldNotCreate"));
      return;
    }
    setLocalCode(data.code);
    setNickname(data.nickname);
    fetchRanking(data.code);
  }

  async function handleJoin() {
    if (!joinCode.trim()) return;
    setLoading(true);
    setError("");
    const data = await api.joinTable(slug, joinCode.trim());
    setLoading(false);
    if (!data) {
      setError(t("notFound"));
      return;
    }
    setLocalCode(data.code);
    setNickname(data.nickname);
    setShowJoin(false);
    fetchRanking(data.code);
  }

  if (tableCode) {
    const topScore = members.length > 0 ? members[0].total : 0;

    return (
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t("title")}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              onPress={() => fetchRanking()}
              aria-label={t("refresh")}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <span className="text-xs font-mono text-default-500 bg-default-100 px-2 py-1 rounded">
              {tableCode}
            </span>
          </div>
        </div>
        {members.length === 0 ? (
          <p className="text-default-500 text-sm">{t("loading")}</p>
        ) : (
          <div className="space-y-2">
            {members.map((member) => {
              const isMe = member.nickname === nickname;
              const isTied = member.total === topScore && topScore > 0 && members.length > 1;
              return (
                <Card
                  key={member.nickname}
                  className={isMe ? "ring-2 ring-primary bg-primary/10" : undefined}
                >
                  <button
                    type="button"
                    className="w-full px-4 py-3 flex items-center justify-between cursor-pointer"
                    onClick={() => {
                      setSelectedMember(member.nickname);
                      modalState.open();
                    }}
                  >
                    <span className={`text-base ${isMe ? "font-bold text-primary" : ""}`}>
                      {isTied && "👑 "}
                      {isMe && "👉 "}
                      {formatNickname(member.nickname, tAnimals)}
                    </span>
                    <span
                      className={`tabular-nums text-lg ${isMe ? "font-bold text-primary" : "font-bold"}`}
                    >
                      {member.total}
                    </span>
                  </button>
                </Card>
              );
            })}
          </div>
        )}
        <p className="text-xs text-default-500 text-center mt-3">
          {t("shareCode", { code: tableCode })}
        </p>
        {nickname && (
          <p className="text-sm text-center mt-2 text-default-500">
            {t("youAre", { name: formatNickname(nickname, tAnimals) })}
            {rerollsUsed < MAX_REROLLS && (
              <Button variant="ghost" size="sm" className="ml-1 gap-1" onPress={handleReroll}>
                <Dices className="w-3.5 h-3.5" />
                {t("reroll")} ({MAX_REROLLS - rerollsUsed})
              </Button>
            )}
          </p>
        )}
        {showQr ? (
          <div className="mt-3 text-center">
            <QrCode url={joinUrl} size={140} />
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              <Button variant="ghost" size="sm" className="gap-1" onPress={copyJoinLink}>
                <Copy className="w-4 h-4" />
                {t("copyLink")}
              </Button>
              <Button variant="ghost" size="sm" className="gap-1" onPress={shareWhatsApp}>
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </Button>
              <Button variant="ghost" size="sm" onPress={() => setShowQr(false)}>
                {t("hideQr")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            <Button variant="ghost" size="sm" className="gap-1" onPress={() => setShowQr(true)}>
              <QrCodeIcon className="w-4 h-4" />
              {t("showQr")}
            </Button>
            <Button variant="ghost" size="sm" className="gap-1" onPress={copyJoinLink}>
              <Copy className="w-4 h-4" />
              {t("copyLink")}
            </Button>
            <Button variant="ghost" size="sm" className="gap-1" onPress={shareWhatsApp}>
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </Button>
          </div>
        )}

        <div className="text-center mt-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-danger"
            onPress={async () => {
              const result = await api.leaveTable(slug);
              if (result) window.location.reload();
            }}
          >
            {t("leave")}
          </Button>
        </div>

        {/* Member drinks modal */}
        <Modal state={modalState}>
          <Modal.Backdrop
            isDismissable
            onClick={() => {
              setSelectedMember(null);
              modalState.close();
            }}
          >
            <Modal.Container size="sm">
              <Modal.Dialog
                onClick={() => {
                  setSelectedMember(null);
                  modalState.close();
                }}
              >
                <Modal.Header>
                  <Modal.Heading>{formatNickname(selectedMember, tAnimals)}</Modal.Heading>
                </Modal.Header>
                <Modal.Body className="pb-6">
                  {selectedMember && tableCode && (
                    <MemberDrinks tableCode={tableCode} nickname={selectedMember} />
                  )}
                </Modal.Body>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      </div>
    );
  }

  return (
    <div className="mt-6 text-center">
      {!showJoin ? (
        <div className="flex gap-2 justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            isDisabled={loading}
            onPress={handleCreate}
          >
            <Users className="w-4 h-4" />
            {loading ? "..." : t("createTable")}
          </Button>
          <Button variant="ghost" size="sm" onPress={() => setShowJoin(true)}>
            {t("joinTable")}
          </Button>
        </div>
      ) : (
        <div className="flex gap-2 justify-center items-center">
          <Input
            className="w-32"
            placeholder={t("code")}
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase().slice(0, 6))}
            aria-label={t("code")}
          />
          <Button
            variant="primary"
            size="sm"
            isDisabled={loading || !joinCode.trim()}
            onPress={handleJoin}
          >
            {loading ? "..." : t("join")}
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

function MemberDrinks({ tableCode, nickname }: { tableCode: string; nickname: string }) {
  const [drinks, setDrinks] = useState<{ name: string; count: number; category: string | null }[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const t = useTranslations("table");

  useEffect(() => {
    async function load() {
      const data = await api.getMemberDrinks(tableCode, nickname);
      if (data) setDrinks(data.drinks);
      setLoading(false);
    }
    load();
  }, [tableCode, nickname]);

  if (loading) return <p className="text-default-500 text-sm">{t("loading")}</p>;
  if (drinks.length === 0) return <p className="text-default-500 text-sm">{t("noDrinks")}</p>;

  return (
    <div className="space-y-1">
      {drinks.map((drink) => (
        <div key={drink.name} className="flex justify-between text-sm px-1 py-1">
          <span>{drink.name}</span>
          <span className="font-bold tabular-nums">×{drink.count}</span>
        </div>
      ))}
    </div>
  );
}
