"use client";

import { Button, Card, Chip } from "@heroui/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { CategoryIcon } from "@/lib/category-icon";
import { Logo } from "@/components/Logo";
import { Users, Beer, Share2 } from "lucide-react";
import { formatNickname } from "@/lib/nicknames";
import type { TableStats } from "@/lib/server-queries";
import { getSessionHue, type TableAwardKey } from "@/lib/gamification";
import { cardFile, downloadFile, shareFile } from "@/lib/share-card";

const AWARDS: Record<TableAwardKey, { emoji: string; label: string }> = {
  explorer: { emoji: "🧭", label: "awardExplorer" },
  hydration: { emoji: "💧", label: "awardHydration" },
  pace: { emoji: "⚡", label: "awardPace" },
  nightOwl: { emoji: "🌙", label: "awardNightOwl" },
  firstSip: { emoji: "🐣", label: "awardFirstSip" },
};

export function TableSummaryClient({ slug, stats }: { slug: string; stats: TableStats | null }) {
  const router = useRouter();
  const t = useTranslations();
  const tCat = useTranslations("categories");
  const tAnimals = useTranslations("animals");

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
        <Card className="w-full max-w-sm">
          <div className="p-6 text-center">
            <Users className="w-12 h-12 mx-auto mb-4" />
            <p className="text-default-500">{t("tableSummary.notInTable")}</p>
            <Button variant="primary" className="mt-6" onPress={() => router.push(`/s/${slug}`)}>
              {t("summary.back")}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const topScore = stats.members.length > 0 ? stats.members[0].total : 0;
  const awardTitle = (key: TableAwardKey) =>
    t(`tableSummary.${AWARDS[key].label}`).split(/\s[—–]\s/);

  function shareTable() {
    if (!stats) return;
    // Nicknames only: never a session slug, nor the table's join code.
    const ranking = stats.members
      .slice(0, 3)
      .map(
        (member, index) =>
          `${index === 0 && topScore > 0 ? "👑" : `${index + 1}.`} ${formatNickname(member.nickname, tAnimals)} · ${member.total}`
      );
    const awards = stats.awards.map(
      (award) =>
        `${AWARDS[award.key].emoji} ${awardTitle(award.key)[0]} · ${formatNickname(award.nickname, tAnimals)}`
    );
    const file = cardFile(
      {
        title: t("tableSummary.title"),
        subtitle: t("tableSummary.people", { count: stats.members.length }),
        total: stats.total,
        totalLabel: t("tableSummary.drinksTotal", { count: stats.total }),
        detail: "",
        lines: [...ranking, ...awards],
        emojis: [],
        tint: getSessionHue(stats.total),
      },
      "tipsytap-table.png"
    );
    if (file && !shareFile(file, t("app.title"))) downloadFile(file);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
      <Card className="w-full max-w-sm">
        <div className="p-6">
          <Button
            variant="ghost"
            size="sm"
            onPress={() => router.push(`/s/${slug}`)}
            className="mb-4"
          >
            ← {t("summary.back")}
          </Button>

          {/* Header */}
          <div className="text-center mb-6">
            <Logo size={48} className="mx-auto mb-2" />
            <h1 className="text-2xl font-bold">{t("tableSummary.title")}</h1>
            <p className="text-sm text-default-500 mt-1 font-mono">{stats.code}</p>
          </div>

          {/* Total */}
          <div className="text-center mb-6">
            <p className="text-6xl font-bold">{stats.total}</p>
            <p className="text-default-500">
              {t("tableSummary.drinksTotal", { count: stats.total })}
            </p>
            <p className="text-sm text-default-500 mt-1">
              {t("tableSummary.people", { count: stats.members.length })}
            </p>
          </div>

          {/* By category */}
          {stats.byCategory.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {[...stats.byCategory]
                .sort((a, b) => b.count - a.count)
                .map((row) => (
                  <Chip key={row.category} size="md">
                    <span className="flex items-center gap-1">
                      <CategoryIcon category={row.category} className="w-3.5 h-3.5" />
                      {tCat(row.category)} ×{row.count}
                    </span>
                  </Chip>
                ))}
            </div>
          )}

          {/* Ranking */}
          <h3 className="text-sm font-bold mb-2">{t("tableSummary.ranking")}</h3>
          <div className="space-y-1 mb-6">
            {stats.members.map((member, index) => (
              <div
                key={member.nickname}
                className="flex justify-between items-center text-sm px-2 py-1"
              >
                <span>
                  {index === 0 && topScore > 0 ? "👑 " : `${index + 1}. `}
                  {formatNickname(member.nickname, tAnimals)}
                </span>
                <span className="font-bold tabular-nums">{member.total}</span>
              </div>
            ))}
          </div>

          {/* Awards */}
          {stats.awards.length > 0 && (
            <>
              <h3 className="text-sm font-bold mb-2">{t("tableSummary.awards")}</h3>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {stats.awards.map((award) => {
                  // "Explorer — most different drinks": title, then what it's for.
                  const [title, detail] = awardTitle(award.key);
                  return (
                    <div key={award.key} className="bg-default-100 rounded-xl p-3 text-center">
                      <p className="text-3xl leading-none mb-1">{AWARDS[award.key].emoji}</p>
                      <p className="text-sm font-semibold">{title}</p>
                      {detail && <p className="text-xs text-default-500">{detail}</p>}
                      <p className="text-sm font-medium mt-1">
                        {formatNickname(award.nickname, tAnimals)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Top drinks */}
          {stats.topDrinks.length > 0 && (
            <>
              <h3 className="text-sm font-bold mb-2 flex items-center gap-1">
                <Beer className="w-4 h-4" />
                {t("tableSummary.topDrinks")}
              </h3>
              <div className="space-y-1">
                {stats.topDrinks.map((drink) => (
                  <div
                    key={`${drink.name}-${drink.category}`}
                    className="flex justify-between text-sm px-2 py-1"
                  >
                    <span className="flex items-center gap-2">
                      <CategoryIcon category={drink.category} className="w-4 h-4 shrink-0" />
                      {drink.name}
                    </span>
                    <span className="font-bold">×{drink.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="text-center mt-6">
            <Button variant="primary" className="gap-1" onPress={shareTable}>
              <Share2 className="w-4 h-4" />
              {t("summary.share")}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
