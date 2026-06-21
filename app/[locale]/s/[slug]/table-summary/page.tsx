import { getTableStats } from "@/lib/server-queries";
import { TableSummaryClient } from "./TableSummaryClient";

// Server component: fetch the table stats during the server render (one round-trip),
// so the page arrives populated instead of showing a spinner and fetching after hydration.
export default async function TableSummaryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const stats = await getTableStats({ slug });
  return <TableSummaryClient slug={slug} stats={stats} />;
}
