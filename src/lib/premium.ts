// Whop が付与する Discord の課金者ロールを「会員状態の真実」として扱い、
// Oshi-Link の premium_status を同期する。

export interface PremiumEnv {
  DISCORD_BOT_TOKEN?: string;
  DISCORD_GUILD_ID?: string;
  MEMBER_ROLE_ID?: string;
}

/** 同期の最小間隔（ミリ秒）。解約反映の遅延上限でもある */
export const PREMIUM_SYNC_TTL_MS = 30 * 60 * 1000;

/**
 * 指定の Discord ユーザーが課金者ロールを持つか判定する。
 * 判定できない場合（未設定・APIエラー）は null を返し、呼び出し側で現状維持にする。
 */
export async function userHasMemberRole(
  env: PremiumEnv,
  discordId: string,
): Promise<boolean | null> {
  if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_GUILD_ID || !env.MEMBER_ROLE_ID) {
    return null;
  }

  const res = await fetch(
    `https://discord.com/api/v10/guilds/${env.DISCORD_GUILD_ID}/members/${discordId}`,
    { headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` } },
  );

  if (res.status === 404) {
    // サーバーに居ない＝非会員扱い
    return false;
  }
  if (!res.ok) {
    return null;
  }

  const member = (await res.json()) as { roles?: string[] };
  return (member.roles ?? []).includes(env.MEMBER_ROLE_ID);
}

/**
 * ロール判定の結果を premium_status に反映する。
 * 判定不能時は DB を変更しない。
 */
export async function syncPremiumStatus(
  db: D1Database,
  env: PremiumEnv,
  userId: string,
  discordId: string,
): Promise<'pro' | 'free' | null> {
  const hasRole = await userHasMemberRole(env, discordId);
  if (hasRole === null) {
    return null;
  }

  const status = hasRole ? 'pro' : 'free';
  await db
    .prepare('UPDATE users SET premium_status = ?, premium_synced_at = ? WHERE id = ?')
    .bind(status, new Date().toISOString(), userId)
    .run();
  return status;
}

/** premium_synced_at が古い（または未同期）かどうか */
export function isPremiumStale(syncedAt: string | null | undefined): boolean {
  if (!syncedAt) {
    return true;
  }
  return Date.now() - new Date(syncedAt).getTime() > PREMIUM_SYNC_TTL_MS;
}
