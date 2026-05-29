"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Input, Card, Modal, useOverlayState } from "@heroui/react";
import { useTranslations } from "next-intl";
import { QrCode } from "@/components/QrCode";
import { api } from "@/lib/api";

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
  const [localCode, setLocalCode] = useState<string | null>(null);
  const [nickname] = useState(initialNickname);
  const tableCode = localCode || initialCode;
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const modalState = useOverlayState({ isOpen: !!selectedMember });
  const t = useTranslations("table");

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRanking();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") fetchRanking();
    }, 30_000);
    return () => clearInterval(id);
  }, [tableCode, fetchRanking]);

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
    setShowJoin(false);
    fetchRanking(data.code);
  }

  if (tableCode) {
    const topScore = members.length > 0 ? members[0].total : 0;

    return (
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">{t("title")}</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              onPress={() => fetchRanking()}
              aria-label={t("refresh")}
            >
              🔄
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
                <Card key={member.nickname}>
                  <button
                    type="button"
                    className="w-full px-4 py-3 flex items-center justify-between cursor-pointer"
                    onClick={() => {
                      setSelectedMember(member.nickname);
                      modalState.open();
                    }}
                  >
                    <span className="text-base">
                      {isTied && "👑 "}
                      {isMe && "👉 "}
                      {member.nickname}
                    </span>
                    <span className="font-bold tabular-nums text-lg">{member.total}</span>
                  </button>
                </Card>
              );
            })}
          </div>
        )}
        <p className="text-xs text-default-500 text-center mt-3">
          {t("shareCode", { code: tableCode })}
        </p>
        {showQr ? (
          <div className="mt-3 text-center">
            <QrCode
              url={`${typeof window !== "undefined" ? window.location.origin : ""}/join/${tableCode}`}
              size={140}
            />
            <Button variant="ghost" size="sm" className="mt-2" onPress={() => setShowQr(false)}>
              {t("hideQr")}
            </Button>
          </div>
        ) : (
          <div className="text-center mt-2">
            <Button variant="ghost" size="sm" onPress={() => setShowQr(true)}>
              {t("showQr")}
            </Button>
          </div>
        )}

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
              <Modal.Dialog>
                <Modal.Header>
                  <Modal.Heading>
                    {selectedMember}
                    {selectedMember === nickname && ` (${t("you")})`}
                  </Modal.Heading>
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
          <Button variant="ghost" size="sm" isDisabled={loading} onPress={handleCreate}>
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
