import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { LocationInput } from '@/components/ui/LocationInput';
import { Event } from '@/lib/types';
import { isAllDayEvent } from '@/lib/utils';

type LocationResult = {
  name: string;
  shortName: string;
  address: string;
  latitude: number;
  longitude: number;
};

type EventCreatorEditFormProps = {
  event: Event;
  groups: { id: string; name: string }[];
  loading: boolean;
  isOfficialManager?: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

function extractDatePart(iso: string): string {
  return iso.split('T')[0];
}

function extractTimePart(iso: string | undefined): string {
  if (!iso || !iso.includes('T')) return '';
  const time = iso.split('T')[1];
  return time.slice(0, 5);
}

export function EventCreatorEditForm({
  event,
  groups,
  loading,
  isOfficialManager = false,
  onSubmit,
  onCancel,
}: EventCreatorEditFormProps) {
  const allDay = isAllDayEvent(event);
  const initialDate = extractDatePart(event.date);
  const [isAllDay, setIsAllDay] = useState(allDay);
  const [dateValue, setDateValue] = useState(initialDate);
  const [eventCategory, setEventCategory] = useState(event.category || 'オフライン系');
  const [eventSubCategory, setEventSubCategory] = useState(
    event.sub_category || (event.category === 'オンライン系' ? 'YouTube生配信' : 'ライブ・コンサート')
  );
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(
    event.latitude != null && event.longitude != null
      ? {
          name: event.location || event.address || '',
          shortName: event.location || '',
          address: event.address || event.location || '',
          latitude: event.latitude,
          longitude: event.longitude,
        }
      : null
  );
  const [locationText, setLocationText] = useState(event.location || '');

  useEffect(() => {
    setIsAllDay(isAllDayEvent(event));
    setDateValue(extractDatePart(event.date));
    setEventCategory(event.category || 'オフライン系');
    setEventSubCategory(
      event.sub_category || (event.category === 'オンライン系' ? 'YouTube生配信' : 'ライブ・コンサート')
    );
    setLocationText(event.location || '');
    setSelectedLocation(
      event.latitude != null && event.longitude != null
        ? {
            name: event.location || event.address || '',
            shortName: event.location || '',
            address: event.address || event.location || '',
            latitude: event.latitude,
            longitude: event.longitude,
          }
        : null
    );
  }, [event]);

  return (
    <form onSubmit={onSubmit} className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
      <div>
        <h2 className="text-2xl font-black text-[#222222] dark:text-zinc-100">予定を修正</h2>
        <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-1">
          {isOfficialManager
            ? '公式カレンダー担当者として、いつでも編集できます。'
            : '投稿から1時間以内に1回だけ、すべての項目を修正できます。'}
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
          カレンダー
        </label>
        <div className="relative">
          <select
            name="group_id"
            defaultValue={event.group_id}
            className="w-full h-12 bg-gray-50 dark:bg-secondary rounded-xl px-4 font-bold outline-none border-none focus:ring-2 focus:ring-[#6366f1] appearance-none pr-10"
            required
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
          イベント名
        </label>
        <input
          name="title"
          defaultValue={event.title}
          className="w-full h-12 bg-gray-50 dark:bg-secondary rounded-xl px-4 font-bold outline-none border-none focus:ring-2 focus:ring-[#6366f1]"
          required
          maxLength={100}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
          日付
        </label>
        <input
          type="date"
          name="date"
          value={dateValue}
          onChange={(e) => setDateValue(e.target.value)}
          className="w-full h-12 bg-gray-50 dark:bg-secondary rounded-xl px-4 font-bold outline-none border-none focus:ring-2 focus:ring-[#6366f1]"
          required
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsAllDay((v) => !v)}
          className={`relative w-11 h-6 rounded-full transition-colors ${isAllDay ? 'bg-[#6366f1]' : 'bg-gray-200 dark:bg-accent'}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              isAllDay ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
        <span className="text-sm font-bold text-gray-600 dark:text-zinc-300">終日</span>
        <input type="hidden" name="isAllDay" value={isAllDay ? '1' : '0'} />
      </div>

      {!isAllDay && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
              開始時間
            </label>
            <input
              type="time"
              name="startTime"
              defaultValue={extractTimePart(event.date) || '19:00'}
              className="w-full h-12 bg-gray-50 dark:bg-secondary rounded-xl px-3 font-bold outline-none border-none focus:ring-2 focus:ring-[#6366f1]"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
              終了時間
            </label>
            <input
              type="time"
              name="endTime"
              defaultValue={extractTimePart(event.end_time)}
              className="w-full h-12 bg-gray-50 dark:bg-secondary rounded-xl px-3 font-bold outline-none border-none focus:ring-2 focus:ring-[#6366f1]"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
            カテゴリ
          </label>
          <select
            value={eventCategory}
            onChange={(e) => {
              const next = e.target.value;
              setEventCategory(next);
              setEventSubCategory(next === 'オフライン系' ? 'ライブ・コンサート' : 'YouTube生配信');
            }}
            className="w-full h-12 bg-gray-50 dark:bg-secondary rounded-xl px-4 font-bold outline-none border-none focus:ring-2 focus:ring-[#6366f1]"
          >
            <option value="オフライン系">オフライン系</option>
            <option value="オンライン系">オンライン系</option>
          </select>
          <input type="hidden" name="category" value={eventCategory} />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
            サブカテゴリ
          </label>
          <select
            value={eventSubCategory}
            onChange={(e) => setEventSubCategory(e.target.value)}
            className="w-full h-12 bg-gray-50 dark:bg-secondary rounded-xl px-4 font-bold outline-none border-none focus:ring-2 focus:ring-[#6366f1]"
          >
            {eventCategory === 'オフライン系' ? (
              <>
                <option value="ライブ・コンサート">ライブ・コンサート</option>
                <option value="リリースイベント">リリースイベント</option>
                <option value="サイン会・お渡し会">サイン会・お渡し会</option>
                <option value="コラボカフェ・展示">コラボカフェ・展示</option>
                <option value="聖地・ロケ地">聖地・ロケ地</option>
                <option value="記念日">記念日</option>
                <option value="店休日">店休日</option>
                <option value="その他">その他</option>
              </>
            ) : (
              <>
                <option value="YouTube生配信">YouTube生配信</option>
                <option value="テレビ出演">テレビ出演</option>
                <option value="ラジオ出演">ラジオ出演</option>
                <option value="雑誌発売">雑誌発売</option>
                <option value="グッズ発売">グッズ発売</option>
                <option value="その他">その他</option>
              </>
            )}
          </select>
          <input type="hidden" name="sub_category" value={eventSubCategory} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
          場所
        </label>
        <LocationInput
          onSelect={(loc) => {
            setSelectedLocation(loc);
            setLocationText(loc.shortName || loc.name);
          }}
          onInputChange={(value) => {
            setLocationText(value);
            if (!value.trim()) setSelectedLocation(null);
          }}
          placeholder="会場名を入力..."
        />
        <input type="hidden" name="location" value={selectedLocation?.name || locationText} />
        <input type="hidden" name="address" value={selectedLocation?.address || locationText} />
        <input type="hidden" name="latitude" value={selectedLocation?.latitude ?? ''} />
        <input type="hidden" name="longitude" value={selectedLocation?.longitude ?? ''} />
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
          詳細説明
        </label>
        <textarea
          name="description"
          defaultValue={event.description || ''}
          className="w-full h-28 bg-gray-50 dark:bg-secondary rounded-xl p-4 font-medium outline-none border-none focus:ring-2 focus:ring-[#6366f1] resize-none"
          maxLength={2000}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
          ソースURL
        </label>
        <input
          name="source_url"
          type="url"
          defaultValue={event.source_url || ''}
          className="w-full h-12 bg-gray-50 dark:bg-secondary rounded-xl px-4 font-bold outline-none border-none focus:ring-2 focus:ring-[#6366f1]"
          required
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 bg-[#6366f1] text-white h-12 rounded-2xl font-black"
        >
          修正を保存
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          variant="ghost"
          className="flex-1 h-12 rounded-2xl font-black text-gray-500"
        >
          キャンセル
        </Button>
      </div>
    </form>
  );
}
