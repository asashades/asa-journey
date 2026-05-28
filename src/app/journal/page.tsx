'use client';

import { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useRouter } from 'next/navigation';
import { format, addDays, subDays, startOfWeek, parseISO, differenceInDays } from 'date-fns';
import {
  MoonIcon,
  BookOpenIcon,
  SparklesIcon,
  BookIcon,
  LightBulbIcon,
  StarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

export default function JournalPage() {
  const router = useRouter();
  const {
    entries,
    getEntriesForDateRange,
    wisdoms,
    notes,
    ideas,
    getWisdomOfTheDay,
    getIdeaOfTheDay,
    currentDate,
  } = useData();

  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [weeklyEntries, setWeeklyEntries] = useState<Record<string, { entries: number; bullets: number; hasDream: boolean; hasWisdom: boolean; hasNote: boolean; hasIdea: boolean }>>({});

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    const loadWeeklyData = async () => {
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(addDays(weekStart, 6), 'yyyy-MM-dd');
      const weekEntries = await getEntriesForDateRange(startDate, endDate);

      const data: Record<string, { entries: number; bullets: number; hasDream: boolean; hasWisdom: boolean; hasNote: boolean; hasIdea: boolean }> = {};

      weekDays.forEach((day, index) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const entry = weekEntries.find(e => e.date === dateStr);
        data[dateStr] = {
          entries: entry ? 1 : 0,
          bullets: entry?.bullets.length || 0,
          hasDream: !!entry?.dream,
          hasWisdom: wisdoms.some(w => format(w.createdAt, 'yyyy-MM-dd') === dateStr),
          hasNote: notes.some(n => format(n.createdAt, 'yyyy-MM-dd') === dateStr),
          hasIdea: ideas.some(i => format(i.createdAt, 'yyyy-MM-dd') === dateStr),
        };
      });

      setWeeklyEntries(data);
    };

    loadWeeklyData();
  }, [weekStart, entries, wisdoms, notes, ideas]);

  const goToPreviousWeek = () => setWeekStart(subDays(weekStart, 7));
  const goToNextWeek = () => {
    const nextWeek = addDays(weekStart, 7);
    if (nextWeek <= new Date()) setWeekStart(nextWeek);
  };

  const goToDate = (date: string) => {
    router.push(`/write?date=${date}`);
  };

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="max-w-lg mx-auto px-4 py-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goToPreviousWeek}
          className="p-2 hover:bg-[#2F2B3A] rounded-lg transition-colors"
        >
          <ChevronLeftIcon className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-xl font-bold">Weekly Orbit</h1>
        <button
          onClick={goToNextWeek}
          className="p-2 hover:bg-[#2F2B3A] rounded-lg transition-colors"
          disabled={format(addDays(weekStart, 7), 'yyyy-MM-dd') > today}
        >
          <ChevronRightIcon className={`w-5 h-5 ${format(addDays(weekStart, 7), 'yyyy-MM-dd') > today ? 'text-[#4A4560]' : 'text-white'}`} />
        </button>
      </div>

      {/* Week Navigation */}
      <div className="text-center mb-4">
        <p className="text-sm text-[#8B8AA0]">
          {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </p>
      </div>

      {/* Weekly Orbit - Planet Metaphor */}
      <div className="relative py-8">
        {/* Planet rings and satellites */}
        <div className="flex justify-center gap-4 sm:gap-6">
          {weekDays.map((day, index) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const data = weeklyEntries[dateStr] || { entries: 0, bullets: 0, hasDream: false, hasWisdom: false, hasNote: false, hasIdea: false };
            const isToday = dateStr === today;
            const isPast = day < new Date() && !isToday;
            const hasContent = data.entries > 0 || data.hasDream || data.hasWisdom || data.hasNote || data.hasIdea;

            return (
              <div key={dateStr} className="flex flex-col items-center">
                <button
                  onClick={() => goToDate(dateStr)}
                  className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all ${
                    isToday
                      ? 'gradient-brand glow-brand scale-110'
                      : isPast
                      ? hasContent
                        ? 'bg-[#2F2B3A] border-2 border-[#4A4560]'
                        : 'bg-[#1E1A2B] border border-dashed border-[#4A4560]'
                      : 'bg-[#1E1A2B] border border-dashed border-[#2F2B3A] opacity-50'
                  }`}
                >
                  <span className="text-sm sm:text-base font-medium">{dayLabels[index]}</span>

                  {/* Journal Ring Indicator */}
                  {data.bullets > 0 && (
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle
                        cx="50%"
                        cy="50%"
                        r="45%"
                        fill="none"
                        stroke="#8B8AA0"
                        strokeWidth="2"
                        strokeDasharray={`${Math.min(data.bullets * 8, 50)} ${100 - Math.min(data.bullets * 8, 50)}`}
                      />
                    </svg>
                  )}

                  {/* Date label */}
                  <span className="absolute -bottom-6 text-xs text-[#8B8AA0]">{format(day, 'd')}</span>
                </button>

                {/* Satellites */}
                <div className="flex gap-1 mt-2">
                  {data.hasDream && <MoonIcon className="w-3 h-3 text-[#F59E0B]" />}
                  {data.hasWisdom && <SparklesIcon className="w-3 h-3 text-[#3B82F6]" />}
                  {data.hasNote && <BookIcon className="w-3 h-3 text-[#22C55E]" />}
                  {data.hasIdea && <LightBulbIcon className="w-3 h-3 text-[#F97316]" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mb-8 text-xs">
        <div className="flex items-center gap-1">
          <MoonIcon className="w-4 h-4 text-[#F59E0B]" />
          <span className="text-[#8B8AA0]">dream</span>
        </div>
        <div className="flex items-center gap-1">
          <SparklesIcon className="w-4 h-4 text-[#3B82F6]" />
          <span className="text-[#8B8AA0]">wisdom</span>
        </div>
        <div className="flex items-center gap-1">
          <BookIcon className="w-4 h-4 text-[#22C55E]" />
          <span className="text-[#8B8AA0]">note</span>
        </div>
        <div className="flex items-center gap-1">
          <LightBulbIcon className="w-4 h-4 text-[#F97316]" />
          <span className="text-[#8B8AA0]">idea</span>
        </div>
      </div>

      {/* Compact History Feed */}
      <div className="mt-12">
        <h2 className="text-lg font-semibold mb-4">past entries</h2>
        <div className="space-y-4">
          {entries.slice(0, 20).map((entry) => (
            <button
              key={entry.id}
              onClick={() => goToDate(entry.date)}
              className="w-full text-left bg-[#1E1A2B] rounded-lg p-4 border border-[#4A4560] hover:border-[#C049FF] transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-medium">{format(parseISO(entry.date), 'MMM d, yyyy')}</span>
                  <span className="text-[#8B8AA0] text-sm ml-2">
                    {format(parseISO(entry.date), 'EEEE')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {entry.dream && <MoonIcon className="w-4 h-4 text-[#F59E0B]" />}
                  {entry.bullets.length > 0 && (
                    <span className="text-xs text-[#8B8AA0]">{entry.bullets.length} bullets</span>
                  )}
                </div>
              </div>
              {entry.bullets.length > 0 && (
                <p className="text-sm text-[#8B8AA0] line-clamp-2">
                  {entry.bullets[0].text.slice(0, 100)}
                  {entry.bullets[0].text.length > 100 ? '...' : ''}
                </p>
              )}
              {entry.dream && (
                <p className="text-xs text-[#F59E0B] mt-1 italic line-clamp-1">
                  "{entry.dream.slice(0, 50)}..."
                </p>
              )}
            </button>
          ))}

          {entries.length === 0 && (
            <div className="text-center py-8">
              <BookOpenIcon className="w-12 h-12 text-[#4A4560] mx-auto mb-3" />
              <p className="text-[#8B8AA0]">no entries yet, time to start journaling</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
