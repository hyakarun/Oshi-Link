import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get('keyword');
  if (!keyword) {
    return Response.json({ error: 'keyword is required' }, { status: 400 });
  }

  const params = new URLSearchParams({
    applicationId: 'ec65ace1-9e87-4d23-83e4-b54103335b56',
    affiliateId: '535601d9.adf03288.535601da.eabb1e44',
    keyword: keyword,
    format: 'json',
    hits: '3',
    responseType: 'small',
  });

  try {
    const res = await fetch(
      `https://openapi.rakuten.co.jp/engine/api/Travel/KeywordHotelSearch/20170426?${params.toString()}`
    );
    const data = await res.json();
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: 'Failed to fetch hotels' }, { status: 500 });
  }
}
