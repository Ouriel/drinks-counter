import { getSessionView, getSessionDrinks } from "@/lib/server-queries";
import { SummaryClient } from "./SummaryClient";

// Server component: fetch session + drinks during the server render (parallel), so the
// summary arrives populated instead of spinner-then-fetch after hydration.
export default async function SummaryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [view, drinks] = await Promise.all([getSessionView(slug), getSessionDrinks(slug)]);
  return (
    <SummaryClient
      slug={slug}
      expired={!view}
      barName={view?.session.barName ?? ""}
      drinks={drinks}
    />
  );
}
