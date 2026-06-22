import React from 'react';
import { Bell, BellOff, Loader2, LogIn } from 'lucide-react';

const SOKU_URL = process.env.NEXT_PUBLIC_SOKU_URL || 'https://oshi-soku.hikahikarun.workers.dev';
const DISCORD_INVITE_URL = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL;

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('oshi_session');
}

// notify-state を sessionStorage に短時間キャッシュし、Worker/Discord 呼び出しを節約
const CACHE_KEY = 'oshi_discord_notify_state';
const CACHE_TTL_MS = 5 * 60 * 1000;
type CachedState = { ts: number; inGuild: boolean; followed: string[]; guildId: string | null };

function readCache(): CachedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as CachedState;
    if (Date.now() - data.ts > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(data: Omit<CachedState, 'ts'>) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, ts: Date.now() }));
  } catch {
    /* ignore */
  }
}

type NotifyState = {
  loaded: boolean;
  inGuild: boolean;
  following: Set<string>;
  guildId: string | null;
};

/** Discord ロゴ（枠線のみ）。lucide にブランドアイコンが無いため自前で用意 */
export function DiscordMarkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M18.9 5.3A16.3 16.3 0 0 0 14.9 4l-.5 1.1a14.6 14.6 0 0 0-4.8 0L9.1 4a16.3 16.3 0 0 0-4 1.3C2.3 9.3 1.6 13.2 2 17a16.5 16.5 0 0 0 5 2.5l.6-1a10.7 10.7 0 0 1-1.6-.8l.4-.3a11.5 11.5 0 0 0 9.8 0l.4.3a10.7 10.7 0 0 1-1.6.8l.6 1a16.5 16.5 0 0 0 5-2.5c.5-4.4-.7-8.3-3.3-11.7Z" />
      <ellipse cx="8.8" cy="13" rx="1.4" ry="1.6" />
      <ellipse cx="15.2" cy="13" rx="1.4" ry="1.6" />
    </svg>
  );
}

/** Discord スレッドへのジャンプ URL（guild_id と channel_id が揃う場合のみ） */
export function discordChannelUrl(guildId: string | null, channelId?: string | null): string | null {
  if (!guildId || !channelId) return null;
  return `https://discord.com/channels/${guildId}/${channelId}`;
}

/** Discord 通知ロールの ON/OFF 状態を Soku から取得し、グループ単位でトグルする */
export function useDiscordNotify(enabled: boolean) {
  const [state, setState] = React.useState<NotifyState>({
    loaded: false,
    inGuild: false,
    following: new Set(),
    guildId: null,
  });
  const [pending, setPending] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!enabled) return;
    const token = getToken();
    if (!token) return;

    const cached = readCache();
    if (cached) {
      setState({
        loaded: true,
        inGuild: cached.inGuild,
        following: new Set(cached.followed),
        guildId: cached.guildId,
      });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${SOKU_URL}/api/link/notify-state`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { in_guild: boolean; followed: string[]; guild_id?: string };
        if (cancelled) return;
        const followed = data.followed || [];
        const guildId = data.guild_id || null;
        setState({ loaded: true, inGuild: data.in_guild, following: new Set(followed), guildId });
        writeCache({ inGuild: data.in_guild, followed, guildId });
      } catch {
        /* 取得失敗時はボタン非表示のまま */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const toggle = React.useCallback(async (groupId: string) => {
    const token = getToken();
    if (!token) return;
    setPending((prev) => new Set(prev).add(groupId));
    try {
      const res = await fetch(`${SOKU_URL}/api/link/notify-toggle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId }),
      });
      const data = (await res.json().catch(() => ({}))) as { state?: string; error?: string };
      if (data.error === 'not_in_guild') {
        setState((prev) => ({ ...prev, inGuild: false }));
        return;
      }
      if (data.state === 'on' || data.state === 'off') {
        setState((prev) => {
          const next = new Set(prev.following);
          if (data.state === 'on') next.add(groupId);
          else next.delete(groupId);
          const updated = { ...prev, loaded: true, inGuild: true, following: next };
          writeCache({ inGuild: true, followed: [...next], guildId: updated.guildId });
          return updated;
        });
      }
    } catch {
      /* ignore */
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(groupId);
        return next;
      });
    }
  }, []);

  return { state, pending, toggle };
}

interface DiscordNotifyButtonProps {
  groupId: string;
  state: NotifyState;
  pending: boolean;
  onToggle: (groupId: string) => void;
}

export function DiscordNotifyButton({ groupId, state, pending, onToggle }: DiscordNotifyButtonProps) {
  if (!state.loaded) return null;

  if (!state.inGuild) {
    if (!DISCORD_INVITE_URL) return null;
    return (
      <a
        href={DISCORD_INVITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(ev) => ev.stopPropagation()}
        className="inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 rounded-full bg-[#5865F2]/10 text-[#5865F2] dark:text-indigo-300 text-[8px] font-black hover:bg-[#5865F2]/20 transition-colors"
      >
        <LogIn className="w-2.5 h-2.5" /> Discordに参加
      </a>
    );
  }

  const following = state.following.has(groupId);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={(ev) => {
        ev.stopPropagation();
        onToggle(groupId);
      }}
      className={`inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black transition-colors disabled:opacity-60 ${
        following
          ? 'bg-[#5865F2] text-white hover:bg-[#4752c4]'
          : 'bg-gray-100 dark:bg-secondary text-gray-400 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-accent'
      }`}
      title={following ? 'Discord通知をOFFにする' : 'Discord通知をONにする'}
    >
      {pending ? (
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
      ) : following ? (
        <Bell className="w-2.5 h-2.5" />
      ) : (
        <BellOff className="w-2.5 h-2.5" />
      )}
      Discord通知{following ? 'ON' : 'OFF'}
    </button>
  );
}
