"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Button, Card, Chip, Spinner } from "@heroui/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { isAlcoholic } from "@/lib/constants";
import { CategoryIcon } from "@/lib/category-icon";
import { Users, Beer, Wine, CupSoda, Utensils } from "lucide-react";
import { formatNickname } from "@/lib/nicknames";
import { api } from "@/lib/api";

type Stats = {
  code: string;
  total: number;
  members: { nickname: string; total: number }[];
  byCategory: { category: string; count: number }[];
  topDrinks: { name: string; category: string | null; count: number }[];
};

export default function TableSummaryPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const t = useTranslations();
  const tCat = useTranslations("categories");
  const tAnimals = useTranslations("animals");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const session = await api.getSession(slug);
      if (session?.session.tableCode) {
        const data = await api.getTableStats(session.session.tableCode);
        if (data) setStats(data);
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

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
  const alcoholicTotal = stats.byCategory.reduce(
    (sum, row) => sum + (isAlcoholic(row.category) ? row.count : 0),
    0
  );
  const foodTotal = stats.byCategory.reduce(
    (sum, row) => sum + (row.category === "food" ? row.count : 0),
    0
  );
  const nonAlcoholicTotal = stats.total - alcoholicTotal - foodTotal;

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
            <Image src="/icon.svg" alt="" width={48} height={48} className="mx-auto mb-2" />
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
            {[alcoholicTotal > 0, nonAlcoholicTotal > 0, foodTotal > 0].filter(Boolean).length >=
              2 && (
              <p className="text-sm text-default-500 mt-2 flex items-center justify-center gap-1 flex-wrap">
                {alcoholicTotal > 0 && (
                  <>
                    <Wine className="w-4 h-4" />
                    {t("summary.withAlcohol", { count: alcoholicTotal })}
                  </>
                )}
                {alcoholicTotal > 0 && nonAlcoholicTotal > 0 && <span className="mx-1">·</span>}
                {nonAlcoholicTotal > 0 && (
                  <>
                    <CupSoda className="w-4 h-4" />
                    {t("summary.alcoholFree", { count: nonAlcoholicTotal })}
                  </>
                )}
                {(alcoholicTotal > 0 || nonAlcoholicTotal > 0) && foodTotal > 0 && (
                  <span className="mx-1">·</span>
                )}
                {foodTotal > 0 && (
                  <>
                    <Utensils className="w-4 h-4" />
                    {t("summary.foodCount", { count: foodTotal })}
                  </>
                )}
              </p>
            )}
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
        </div>
      </Card>
    </div>
  );
}
