export async function adminFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data;
}

export const STATUS_OPTIONS = [
  { value: 'active', label: '有効' },
  { value: 'frozen', label: '凍結' },
  { value: 'banned', label: 'BAN' },
] as const;

export function statusBadgeClass(status: string | null | undefined) {
  switch (status || 'active') {
    case 'frozen':
      return 'bg-sky-500/20 text-sky-200 border-sky-500/40';
    case 'banned':
      return 'bg-red-500/20 text-red-200 border-red-500/40';
    default:
      return 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40';
  }
}
