import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  const lat = req.nextUrl.searchParams.get("lat");
  const lng = req.nextUrl.searchParams.get("lng");

  if (!q || q.trim().length < 2) return NextResponse.json({ results: [] });

  const params = new URLSearchParams({
    q: q.trim(),
    format: "json",
    limit: "8",
    addressdetails: "1",
    extratags: "1",
  });

  // Bias results near user location if provided
  if (lat && lng) {
    params.set("viewbox", `${+lng - 0.05},${+lat + 0.05},${+lng + 0.05},${+lat - 0.05}`);
    params.set("bounded", "0");
  }

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { "User-Agent": "TipsyTap/1.0 (drinks-counter app)" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return NextResponse.json({ results: [] });

    const data = await res.json();

    const results = data
      .filter((place: { type?: string; class?: string; extratags?: Record<string, string> }) => {
        const amenity = place.extratags?.amenity || place.type || "";
        return (
          ["bar", "pub", "restaurant", "cafe", "nightclub", "biergarten"].includes(amenity) ||
          place.class === "amenity"
        );
      })
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
          address: [place.address?.road, place.address?.city || place.address?.town]
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
