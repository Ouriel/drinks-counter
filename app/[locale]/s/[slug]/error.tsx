"use client";

import { Button } from "@heroui/react";
import { useTranslations } from "next-intl";

export default function SessionError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("error");
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
      <p className="text-4xl">😵</p>
      <h1 className="text-xl font-bold">{t("title")}</h1>
      <p className="text-muted text-sm text-center">{t("message")}</p>
      <Button variant="primary" onPress={reset}>
        {t("tryAgain")}
      </Button>
    </div>
  );
}
