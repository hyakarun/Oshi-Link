import { clsx, type ClassValue } from "clsx"
import { format, parseISO } from "date-fns"
import { twMerge } from "tailwind-merge"
import type { Event } from "@/lib/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 外部リンク用に絶対URLへ正規化（プロトコルなしだと同一サイト内リンクになる） */
export function normalizeExternalUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('//')) return `https:${trimmed}`
  return `https://${trimmed.replace(/^\/+/, '')}`
}

function parseEventDate(dateStr: string): Date {
  const normalized = dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`
  return parseISO(normalized.replace(' ', 'T'))
}

function isMidnight(date: Date): boolean {
  return date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0
}

/** 終日予定かどうか（DBフラグ優先、旧データは 00:00 + 終了時刻なし で推定） */
export function isAllDayEvent(event: Pick<Event, 'date' | 'end_time' | 'is_all_day'>): boolean {
  if (event.is_all_day) return true
  if (event.end_time) return false
  return isMidnight(parseEventDate(event.date))
}

/** 予定日時の表示（終日は日付のみ） */
export function formatEventDateTime(dateStr: string, isAllDay: boolean): string {
  const d = parseEventDate(dateStr)
  return isAllDay ? format(d, 'yyyy年MM月dd日') : format(d, 'yyyy年MM月dd日 HH:mm')
}

/** 予定の時刻部分のみ（終日は空文字） */
export function formatEventTime(dateStr: string, isAllDay: boolean): string {
  if (isAllDay) return ''
  return format(parseEventDate(dateStr), 'HH:mm')
}
