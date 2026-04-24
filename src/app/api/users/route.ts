import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

// Get or Create User
export async function POST(request: Request) {
  try {
    const { env } = getRequestContext();
    const db = (env as any).DB;
    
    const { id, name, email } = await request.json() as any;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and Email are required' }, { status: 400 });
    }

    // IDがない場合は新規生成（登録）、ある場合は更新
    const userId = id || crypto.randomUUID();

    await db.prepare(`
      INSERT INTO users (id, name, email)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        email = excluded.email
    `).bind(userId, name, email).run();

    return NextResponse.json({ id: userId, name, email }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Get User Detail
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    
    if (!userId) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const { env } = getRequestContext();
    const db = (env as any).DB;

    const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
