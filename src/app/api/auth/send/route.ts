import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

interface Env {
  DB: D1Database;
  RESEND_API_KEY: string;
  SITE_URL: string;
}

// POST /api/auth/send  → Magic Link をメール送信
export async function POST(request: NextRequest) {
  const { env } = getRequestContext();
  const db = (env as unknown as Env).DB;
  const resendKey = (env as unknown as Env).RESEND_API_KEY;
  const siteUrl = (env as unknown as Env).SITE_URL || 'https://oshi-link.pages.dev';

  const { email, name } = await request.json() as { email: string; name?: string };

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: '有効なメールアドレスを入力してください' }, { status: 400 });
  }

  // 1. ユーザーが存在しなければ作成（名前はあれば使用）
  let user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first() as {
    id: string; name: string; email: string;
  } | null;

  if (!user) {
    const userId = crypto.randomUUID();
    const userName = name || email.split('@')[0];
    await db.prepare('INSERT INTO users (id, name, email) VALUES (?, ?, ?)').bind(userId, userName, email).run();
    user = { id: userId, name: userName, email };
  }

  // 2. 有効な Magic Link を生成（15分で失効）
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  await db.prepare('INSERT INTO magic_links (token, email, expires_at) VALUES (?, ?, ?)').bind(token, email, expiresAt).run();

  // 3. Resend でメール送信
  const loginUrl = `${siteUrl}?token=${token}`;

  if (!resendKey) {
    // 開発環境: ログにURLを出力
    console.log('[DEV] Magic Link:', loginUrl);
    return NextResponse.json({ ok: true, devUrl: loginUrl });
  }

  const emailRes = await fetch('https:\u002f\u002fapi.resend.com\u002femails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application\u002fjson',
    },
    body: JSON.stringify({
      from: 'Oshi-Link <noreply@oshi-link.com>',
      to: [email],
      subject: 'ログインリンク - Oshi-Link',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
          <h1 style="font-size:24px;font-weight:900;color:#222222;margin-bottom:8px;">Oshi-Link</h1>
          <p style="color:#6a6a6a;margin-bottom:32px;">こんにちは、${user.name}さん。以下のボタンをクリックしてログインしてください。</p>
          <a href="${loginUrl}"
             style="background:#ff385c;color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:900;font-size:16px;display:inline-block;">
            ログインする
          </a>
          <p style="color:#aaa;font-size:12px;margin-top:24px;">このリンクは15分間有効です。身に覚えのない場合は無視してください。</p>
        </div>
      `,
    }),
  });

  if (!emailRes.ok) {
    const err = await emailRes.text();
    console.error('Resend error:', err);
    return NextResponse.json({ error: 'メール送信に失敗しました' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
