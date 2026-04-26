import React from 'react';
import { Group } from '@/lib/types';

export const FALLBACK_IMG = 'https://images.unsplash.com/photo-1540039155732-d67414bc5c4a?w=800&q=80';

export const GROUP_COLORS = [
  'from-[#ff385c] to-[#e00b41]',
  'from-purple-500 to-purple-700',
  'from-blue-500 to-blue-700',
  'from-emerald-500 to-emerald-700',
  'from-orange-500 to-orange-700',
  'from-pink-500 to-pink-700',
  'from-cyan-500 to-cyan-700',
];

export function groupColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length];
}

export function GroupAvatar({ group, size = 'md' }: { group: Group; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-14 h-14 text-lg' : 'w-10 h-10 text-sm';
  if (group.avatar_url) {
    return <img src={group.avatar_url} alt={group.name} className={`${sizeClass} rounded-xl object-cover`} />;
  }
  return (
    <div className={`${sizeClass} rounded-xl bg-gradient-to-br ${groupColor(group.id)} flex items-center justify-center text-white font-black shrink-0`}>
      {group.name[0]}
    </div>
  );
}
