import { NextRequest, NextResponse } from "next/server";

// Simple rate limiter: 1 req/sec globally (Nominatim policy)
let lastNominatimCall = 0;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  const lat = req.nextUrl.searchParams.get("lat");
  const lng = req.nextUrl.searchParams.get("lng");

  if (!q || q.trim().length < 2) return NextResponse.json({ results: [] });

  const params = new URLSearchParams({
    q: q.trim(),
    format: "json",
    limit: "8",
    layer: "poi",
    addressdetails: "1",
  });

  // Hard ±0.05° box (~5 km): the soft bias returned places worldwide. 2 decimals (~1 km) is
  // all Nominatim needs, and it keeps the fetch cache key stable.
  const userLat = Number(lat);
  const userLng = Number(lng);
  const geo = !!lat && !!lng && Number.isFinite(userLat) && Number.isFinite(userLng);
  if (geo) {
    const box = [userLng - 0.05, userLat + 0.05, userLng + 0.05, userLat - 0.05];
    params.set("viewbox", box.map((degrees) => degrees.toFixed(2)).join(","));
    params.set("bounded", "1");
  }
  const squaredDistance = (place: { lat: string; lon: string }) =>
    geo
      ? (+place.lat - userLat) ** 2 +
        ((+place.lon - userLng) * Math.cos((userLat * Math.PI) / 180)) ** 2
      : 0;

  try {
    const now = Date.now();
    if (now - lastNominatimCall < 1000) {
      return NextResponse.json({ results: [] });
    }
    lastNominatimCall = now;

    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { "User-Agent": "TipsyTap/1.0 (drinks-counter app)" },
      next: { revalidate: 3600 },
      // Nominatim down or slow: give up after 5 s; the catch below returns no results.
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return NextResponse.json({ results: [] });

    const data = await res.json();

    const results = data
      .filter(
        (place: { type?: string; class?: string }) =>
          place.class === "amenity" &&
          ["bar", "pub", "restaurant", "cafe", "nightclub", "biergarten"].includes(place.type ?? "")
      )
      .sort(
        (a: { lat: string; lon: string }, b: { lat: string; lon: string }) =>
          squaredDistance(a) - squaredDistance(b)
      )
      .slice(0, 5)
      .map(
        (place: {
          display_name: string;
          name?: string;
          lat: string;
          lon: string;
          address?: Record<string, string>;
        }) => ({
          name: place.name || place.display_name.split(",")[0],
          address: [
            place.address?.road,
            place.address?.city || place.address?.town || place.address?.village,
          ]
            .filter(Boolean)
            .join(", "),
          lat: place.lat,
          lng: place.lon,
        })
      );

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
