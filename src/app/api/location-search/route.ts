import { NextRequest } from 'next/server';

export const runtime = 'edge';

// OpenStreetMap Nominatim を使った場所検索（無料・APIキー不要）
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  if (!query || query.length < 2) {
    return Response.json([]);
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&accept-language=ja&countrycodes=jp`,
      { headers: { 'User-Agent': 'OshiLink/1.0 (https://oshi-link.pages.dev)' } }
    );
    const data: any[] = await res.json();

    const results = data.map(item => ({
      name: item.display_name,
      shortName: item.name || item.display_name.split(',')[0],
      address: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    }));

    return Response.json(results);
  } catch {
    return Response.json([]);
  }
}
