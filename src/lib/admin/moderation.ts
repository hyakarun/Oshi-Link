export type ModerationStatus = 'active' | 'frozen' | 'banned';

export function parseStatus(value: unknown): ModerationStatus | null {
  if (value === 'active' || value === 'frozen' || value === 'banned') return value;
  return null;
}
