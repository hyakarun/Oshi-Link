import { addYears, format, parseISO } from 'date-fns';

/** 繰り返しの最長期間（開始日の1年後・同日） */
export function getRepeatEndLimitDate(startDatePart: string): string {
  const start = parseISO(`${startDatePart}T12:00:00`);
  return format(addYears(start, 1), 'yyyy-MM-dd');
}

export type RepeatOccurrence = { date: string; end_time: string | null };

type BuildParams = {
  startDatePart: string;
  startDateTime: string;
  endTime: string | null;
  repeatPeriod: boolean;
  repeatWeekdaysEnabled: boolean;
  repeatUntil: string | null;
  weekdayValues: number[];
};

function composeDateTime(
  dateObj: Date,
  isoDateTime: string | null,
  toDateStr: (d: Date) => string
): string | null {
  if (!isoDateTime) return null;
  const time = isoDateTime.split('T')[1];
  return `${toDateStr(dateObj)}${time ? `T${time}` : ''}`;
}

function normalizeWeekdays(values: number[]): number[] {
  return Array.from(
    new Set(values.filter((v) => Number.isInteger(v) && v >= 0 && v <= 6))
  );
}

function resolveEffectiveUntil(
  startDatePart: string,
  repeatPeriod: boolean,
  repeatUntil: string | null
): string {
  const limit = getRepeatEndLimitDate(startDatePart);
  if (!repeatPeriod) return limit;
  if (!repeatUntil || repeatUntil > limit) return limit;
  return repeatUntil;
}

/** 繰り返し登録の日付リストを生成 */
export function buildRepeatOccurrences(
  params: BuildParams
): { ok: true; occurrences: RepeatOccurrence[] } | { ok: false; error: string } {
  const {
    startDatePart,
    startDateTime,
    endTime,
    repeatPeriod,
    repeatWeekdaysEnabled,
    repeatUntil,
    weekdayValues,
  } = params;

  if (!repeatPeriod && !repeatWeekdaysEnabled) {
    return {
      ok: true,
      occurrences: [{ date: startDateTime, end_time: endTime }],
    };
  }

  const selectedWeekdays = normalizeWeekdays(weekdayValues);

  if (repeatWeekdaysEnabled && selectedWeekdays.length === 0) {
    return { ok: false, error: '繰り返す曜日を1つ以上選択してください' };
  }

  if (repeatPeriod) {
    if (!repeatUntil) {
      return { ok: false, error: '繰り返し終了日を指定してください' };
    }
    if (repeatUntil < startDatePart) {
      return { ok: false, error: '繰り返し終了日は開始日以降を指定してください' };
    }
  }

  const effectiveUntil = resolveEffectiveUntil(
    startDatePart,
    repeatPeriod,
    repeatUntil
  );

  const toDateStr = (d: Date) => {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };

  const occurrences: RepeatOccurrence[] = [];
  const start = new Date(`${startDatePart}T00:00:00`);
  const until = new Date(`${effectiveUntil}T23:59:59`);
  const cursor = new Date(start);

  while (cursor <= until) {
    const include =
      !repeatWeekdaysEnabled || selectedWeekdays.includes(cursor.getDay());

    if (include) {
      occurrences.push({
        date: composeDateTime(cursor, startDateTime, toDateStr)!,
        end_time: composeDateTime(cursor, endTime, toDateStr),
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  if (occurrences.length === 0) {
    return { ok: false, error: '条件に一致する日付がありません' };
  }

  return { ok: true, occurrences };
}
