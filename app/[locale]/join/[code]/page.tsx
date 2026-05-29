"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Spinner, Button } from "@heroui/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";

export default function JoinTablePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const t = useTranslations("join");
  const [error, setError] = useState("");

  useEffect(() => {
    async function join() {
      let slug: string | null = null;
      try {
        const recent = JSON.parse(localStorage.getItem("tipsytap_recent") || "[]");
        if (recent.length > 0) slug = recent[0].slug;
      } catch {}

      if (!slug) {
        const session = await api.createSession({});
        if (!session) {
          setError(t("failed"));
          return;
        }
        slug = session.slug;
        try {
          const recent = JSON.parse(localStorage.getItem("tipsytap_recent") || "[]");
          const entry = { slug, barName: slug, date: new Date().toISOString() };
          localStorage.setItem("tipsytap_recent", JSON.stringify([entry, ...recent].slice(0, 10)));
        } catch {}
      }

      const result = await api.joinTable(slug, code);
      if (!result) {
        router.replace(`/s/${slug}`);
        return;
      }

      router.replace(`/s/${slug}`);
    }

    join();
  }, [code, router, t]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-4xl">😕</p>
        <p className="text-lg font-bold">{t("failed")}</p>
        <p className="text-default-500 text-sm">{error}</p>
        <Button variant="primary" onPress={() => router.push("/")}>
          {t("startFresh")}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <Spinner size="lg" />
      <p className="text-default-500">{t("joining")}</p>
    </div>
  );
}
