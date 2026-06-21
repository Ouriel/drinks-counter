import { getSessionView, getSessionDrinks } from "@/lib/server-queries";
import { SessionClient } from "./SessionClient";

// Server component: fetch session view + drinks during the server render (parallel), so the
// counter arrives populated instead of showing a spinner and fetching after hydration.
export default async function SessionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [view, drinks] = await Promise.all([getSessionView(slug), getSessionDrinks(slug)]);
  return (
    <SessionClient
      slug={slug}
      notFound={!view}
      initialDrinks={drinks}
      initialMenuItems={view?.menuItems ?? []}
      initialBarName={view?.session.barName ?? ""}
      initialTableCode={view?.session.tableCode ?? null}
      initialNickname={view?.session.nickname ?? null}
    />
  );
}
