import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Nominatimのaddressオブジェクトから日本語住所を構築する
function formatJapaneseAddress(addr: any, facilityName: string): string {
  const parts: string[] = [];

  // 〒郵便番号
  const postcode = addr.postcode ? `〒${addr.postcode} ` : '';

  // 都道府県
  const pref = addr.state || addr.province || '';
  // 市区町村
  const city = addr.city || addr.town || addr.county || addr.municipality || '';
  // 区（政令市など）
  const ward = addr.city_district || addr.district || '';
  // 町・丁目
  const suburb = addr.suburb || addr.neighbourhood || addr.quarter || '';
  // 番地・号
  const road = addr.road || '';
  const houseNumber = addr.house_number || '';

  parts.push(pref, city, ward, suburb, road, houseNumber);
  const addressBody = parts.filter(Boolean).join('');

  // 施設名（最後に付ける）
  const name = addr.amenity || addr.tourism || addr.building || addr.leisure || addr.shop || '';
  const finalName = name && name !== facilityName ? ` ${name}` : '';

  return `${postcode}${addressBody}${finalName}`.trim();
}

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

    const results = data.map(item => {
      const shortName = item.name || item.display_name.split(',')[0];
      const jaAddress = item.address ? formatJapaneseAddress(item.address, shortName) : item.display_name;
      return {
        name: shortName,
        shortName,
        address: jaAddress,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
      };
    });

    return Response.json(results);
  } catch {
    return Response.json([]);
  }
}
