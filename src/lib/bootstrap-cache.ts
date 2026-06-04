import type { Group, Event } from '@/lib/types';
import type { NewsItem } from '@/lib/api/calendar-data';

export type BootstrapPayload = {
  user: import('@/lib/types').User;
  dispute_warning?: boolean;
  groups: Group[];
  events: Event[];
  news?: { items: NewsItem[] };
};

let cache: BootstrapPayload | null = null;

export function setBootstrapCache(data: BootstrapPayload) {
  cache = data;
}

export function takeBootstrapCache(): BootstrapPayload | null {
  const data = cache;
  cache = null;
  return data;
}
