import { Entry, Bullet } from '@/types';

export const hasEntryContent = (entry: Entry) =>
  Boolean(
    entry.dream.trim() ||
    entry.bullets.length > 0 ||
    (entry.media?.length ?? 0) > 0 ||
    entry.location
  );

export const getChronologicalContentEntries = (entries: Entry[]) =>
  entries
    .filter(hasEntryContent)
    .sort((a, b) => a.date.localeCompare(b.date));

export const getEntryNumberByDate = (entries: Entry[]) => {
  const numberByDate = new Map<string, number>();
  getChronologicalContentEntries(entries).forEach((entry, index) => {
    numberByDate.set(entry.date, index + 1);
  });
  return numberByDate;
};

export const getEntryNumberForDate = (entries: Entry[], date: string) => {
  const chronologicalEntries = getChronologicalContentEntries(entries);
  const existingIndex = chronologicalEntries.findIndex(entry => entry.date === date);

  if (existingIndex >= 0) return existingIndex + 1;

  return chronologicalEntries.filter(entry => entry.date < date).length + 1;
};

export const sortBullets = <T extends { style: string; isCompleted?: boolean }>(bullets: T[]): T[] => {
  if (!bullets) return [];
  const active = bullets.filter(b => !(b.style === 'checklist' && b.isCompleted));
  const completed = bullets.filter(b => b.style === 'checklist' && b.isCompleted);
  return [...active, ...completed];
};

