import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get('keyword');
  const lat = request.nextUrl.searchParams.get('lat');
  const lng = request.nextUrl.searchParams.get('lng');

  if (!keyword && (!lat || !lng)) {
    return Response.json({ hotels: [] });
  }

  try {
    let url: string;

    if (lat && lng) {
      // 座標ベースの検索（より正確）
      const params = new URLSearchParams({
        applicationId: process.env.RAKUTEN_APPLICATION_ID || 'ec65ace1-9e87-4d23-83e4-b54103335b56',
        affiliateId: process.env.RAKUTEN_AFFILIATE_ID || '535601d9.adf03288.535601da.eabb1e44',
        latitude: lat,
        longitude: lng,
        searchRadius: '3',
        format: 'json',
        hits: '3',
      });
      url = `https://app.rakuten.co.jp/services/api/Travel/SimpleHotelSearch/20170426?${params}`;
    } else {
      // キーワードベースのフォールバック
      const params = new URLSearchParams({
        applicationId: process.env.RAKUTEN_APPLICATION_ID || 'ec65ace1-9e87-4d23-83e4-b54103335b56',
        affiliateId: process.env.RAKUTEN_AFFILIATE_ID || '535601d9.adf03288.535601da.eabb1e44',
        keyword: keyword!,
        format: 'json',
        hits: '3',
      });
      url = `https://app.rakuten.co.jp/services/api/Travel/KeywordHotelSearch/20170426?${params}`;
    }

    const res = await fetch(url);
    const data: any = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ hotels: [] });
  }
}
