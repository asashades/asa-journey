'use client';

import { Fragment, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/contexts/DataContext';
import { HighlightedText } from '@/components/ui/HighlightedText';
import { getEntryNumberByDate, hasEntryContent, sortBullets } from '@/lib/entryUtils';
import { Entry } from '@/types';
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  getDay,
  parseISO,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBook,
  faCalendarDays,
  faCheck,
  faChevronLeft,
  faChevronRight,
  faLightbulb,
  faMagnifyingGlass,
  faMoon,
  faPlus,
  faSquare,
  faStar,
  faTree,
  faImage,
  faLocationDot,
} from '@fortawesome/free-solid-svg-icons';

type WeeklyEntryData = {
  entries: number;
  bullets: number;
  hasDream: boolean;
  hasWisdom: boolean;
  hasNote: boolean;
  hasIdea: boolean;
};

const calendarDayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const matchesSearch = (entry: Entry, query: string) => {
  if (!query) return true;
  const entryDate = parseISO(entry.date);
  const readableDate = format(entryDate, 'EEE, MMM d yyyy').toLowerCase();

  return (
    entry.date.includes(query) ||
    readableDate.includes(query) ||
    entry.dream.toLowerCase().includes(query) ||
    entry.bullets.some(bullet => bullet.text.toLowerCase().includes(query))
  );
};

export default function JournalPage() {
  const router = useRouter();
  const {
    entries,
    wisdoms,
    notes,
    ideas,
  } = useData();

  const todayDate = new Date();
  const today = format(todayDate, 'yyyy-MM-dd');
  const [weekStart, setWeekStart] = useState(subDays(todayDate, 6));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(todayDate);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | '30days' | 'month' | 'year'>('30days'); // default to 30 days for maximum speed!

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const contentEntries = useMemo(
    () => entries.filter(hasEntryContent).sort((a, b) => a.date.localeCompare(b.date)),
    [entries]
  );
  const entryNumberByDate = useMemo(() => getEntryNumberByDate(entries), [entries]);
  const searchTerm = searchQuery.trim().toLowerCase();
  const timelineEntries = useMemo(() => {
    let filtered = [...contentEntries].reverse();

    // 1. Filter by Search Query
    if (searchTerm) {
      filtered = filtered.filter(entry => matchesSearch(entry, searchTerm));
    }

    // 2. Filter by Time Filter presets (prevents DOM lag by paging render count!)
    const now = new Date();
    if (timeFilter === '30days') {
      const limit = subDays(now, 30);
      filtered = filtered.filter(entry => parseISO(entry.date) >= limit);
    } else if (timeFilter === 'month') {
      const monthStart = startOfMonth(now);
      filtered = filtered.filter(entry => parseISO(entry.date) >= monthStart);
    } else if (timeFilter === 'year') {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      filtered = filtered.filter(entry => parseISO(entry.date) >= yearStart);
    }

    return filtered;
  }, [contentEntries, searchTerm, timeFilter]);

  const yesterday = format(subDays(todayDate, 1), 'yyyy-MM-dd');
  const shouldShowAddYesterday = !searchTerm && !contentEntries.some(entry => entry.date === yesterday);

  const weeklyEntries = useMemo<Record<string, WeeklyEntryData>>(() => {
    const data: Record<string, WeeklyEntryData> = {};

    weekDays.forEach((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const entry = entries.find(item => item.date === dateStr);
      const hasEntry = entry ? hasEntryContent(entry) : false;

      data[dateStr] = {
        entries: hasEntry ? 1 : 0,
        bullets: entry?.bullets.length || 0,
        hasDream: !!entry?.dream.trim(),
        hasWisdom: wisdoms.some(wisdom => (wisdom.linkedEntryId || format(wisdom.createdAt, 'yyyy-MM-dd')) === dateStr),
        hasNote: notes.some(note => (note.linkedDate || note.linkedEntryId || format(note.createdAt, 'yyyy-MM-dd')) === dateStr),
        hasIdea: ideas.some(idea => idea.linkedEntries?.includes(dateStr) || format(idea.createdAt, 'yyyy-MM-dd') === dateStr),
      };
    });

    return data;
  }, [entries, ideas, notes, weekDays, wisdoms]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const startDay = getDay(monthStart);
    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    for (let i = 0; i < startDay; i++) {
      days.push({ date: subDays(monthStart, startDay - i), isCurrentMonth: false });
    }

    let currentDay = monthStart;
    while (currentDay <= monthEnd) {
      days.push({ date: currentDay, isCurrentMonth: true });
      currentDay = addDays(currentDay, 1);
    }

    let trailingOffset = 1;
    while (days.length % 7 !== 0) {
      days.push({ date: addDays(monthEnd, trailingOffset), isCurrentMonth: false });
      trailingOffset += 1;
    }

    return days;
  }, [calendarMonth]);

  const canGoToNextRange = format(addDays(weekStart, 7), 'yyyy-MM-dd') <= today;

  const goToPreviousWeek = () => setWeekStart(subDays(weekStart, 7));
  const goToNextWeek = () => {
    if (canGoToNextRange) setWeekStart(addDays(weekStart, 7));
  };

  const goToDate = (date: string) => {
    router.push(`/write?date=${date}`);
  };

  const getDateIndicators = (dateStr: string) => {
    const entry = entries.find(item => item.date === dateStr);
    const hasJournal = entry ? entry.bullets.length > 0 : false;
    const hasDream = !!entry?.dream.trim();
    const hasWisdom = wisdoms.some(wisdom => (wisdom.linkedEntryId || format(wisdom.createdAt, 'yyyy-MM-dd')) === dateStr);
    const hasNote = notes.some(note => (note.linkedDate || note.linkedEntryId || format(note.createdAt, 'yyyy-MM-dd')) === dateStr);
    const hasIdea = ideas.some(idea => idea.linkedEntries?.includes(dateStr) || format(idea.createdAt, 'yyyy-MM-dd') === dateStr);

    return { hasJournal, hasDream, hasExtra: hasWisdom || hasNote || hasIdea };
  };

  const renderItemIndicators = (entry: Entry) => {
    const hasWisdom = wisdoms.some(wisdom => (wisdom.linkedEntryId || format(wisdom.createdAt, 'yyyy-MM-dd')) === entry.date);
    const hasNote = notes.some(note => (note.linkedDate || note.linkedEntryId || format(note.createdAt, 'yyyy-MM-dd')) === entry.date);
    const hasIdea = ideas.some(idea => idea.linkedEntries?.includes(entry.date) || format(idea.createdAt, 'yyyy-MM-dd') === entry.date);
    const hasMedia = (entry.media?.length ?? 0) > 0;
    const hasLocation = !!entry.location;

    if (!hasWisdom && !hasNote && !hasIdea && !hasMedia && !hasLocation) return null;

    return (
      <div className="mt-3 flex items-center gap-1.5 select-none" onClick={(e) => e.stopPropagation()}>
        {hasWisdom && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F0D6FF] text-[#8B00D4]" title="Wisdom inside log">
            <FontAwesomeIcon icon={faTree} className="h-2.5 w-2.5" />
          </span>
        )}
        {hasNote && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#C8F7E4] text-[#00875A]" title="Note inside log">
            <FontAwesomeIcon icon={faBook} className="h-2.5 w-2.5" />
          </span>
        )}
        {hasIdea && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FFE4B5] text-[#B45309]" title="Idea inside log">
            <FontAwesomeIcon icon={faLightbulb} className="h-2.5 w-2.5" />
          </span>
        )}
        {hasMedia && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F2F2F3] text-[#6F7476]" title="Media inside log">
            <FontAwesomeIcon icon={faImage} className="h-2.5 w-2.5" />
          </span>
        )}
        {hasLocation && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FFE2E2] text-[#FF453A]" title={`Location: ${entry.location?.district}`}>
            <FontAwesomeIcon icon={faLocationDot} className="h-2.5 w-2.5" />
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white pb-24 font-sans">
      <style jsx>{`
        @keyframes orbit-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        .orbit-dot {
          animation: orbit-float 3s ease-in-out infinite;
        }
        .orbit-dot:nth-child(2) {
          animation-delay: 0.25s;
        }
        .orbit-dot:nth-child(3) {
          animation-delay: 0.5s;
        }
        .orbit-dot:nth-child(4) {
          animation-delay: 0.75s;
        }
      `}</style>

      <header className="mx-auto max-w-[680px] px-6 pt-8">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-sans text-4xl font-bold leading-none tracking-normal text-primary sm:text-5xl">
            Journal
          </h1>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => setShowSearch(current => !current)}
              className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${showSearch ? 'bg-[#F2F2F3]' : 'hover:bg-[#F2F2F3]'}`}
              title="search entries"
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} className="h-5 w-5 text-primary" />
            </button>
            <button
              onClick={() => setShowDatePicker(current => !current)}
              className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${showDatePicker ? 'bg-[#F2F2F3]' : 'hover:bg-[#F2F2F3]'}`}
              title="open calendar"
            >
              <FontAwesomeIcon icon={faCalendarDays} className="h-5 w-5 text-primary" />
            </button>
          </div>
        </div>

        <div className="mt-6 border-t border-[#D7DBDA]" />

        {showSearch && (
          <div className="mt-5">
            <input
              type="text"
              placeholder="search your entries..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-lg border border-[#CCD0CF] bg-white px-4 py-3 text-base text-[#2F3331] placeholder-[#A3A7A8] transition-colors focus:border-[#00DC7D] focus:outline-none"
              autoFocus
            />
          </div>
        )}

        {showDatePicker && (
          <div className="mt-5 overflow-hidden rounded-lg border border-[#CCD0CF] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#F2F2F3] p-4">
              <button onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))} className="rounded-lg p-2 hover:bg-[#F2F2F3]">
                <FontAwesomeIcon icon={faChevronLeft} className="h-4 w-4 text-[#2F3331]" />
              </button>
              <span className="font-bold text-[#2F3331]">{format(calendarMonth, 'MMMM yyyy')}</span>
              <button onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} className="rounded-lg p-2 hover:bg-[#F2F2F3]">
                <FontAwesomeIcon icon={faChevronRight} className="h-4 w-4 text-[#2F3331]" />
              </button>
            </div>

            <div className="grid grid-cols-7 px-3 pt-3">
              {calendarDayLabels.map((label, index) => (
                <div key={`${label}-${index}`} className="pb-2 text-center text-xs font-semibold text-[#A3A7A8]">
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 px-3 pb-3">
              {calendarDays.map(({ date, isCurrentMonth }, index) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const isFuture = dateStr > today;
                const isToday = dateStr === today;
                const { hasJournal, hasDream, hasExtra } = getDateIndicators(dateStr);

                return (
                  <button
                    key={`${dateStr}-${index}`}
                    disabled={isFuture || !isCurrentMonth}
                    onClick={() => {
                      goToDate(dateStr);
                      setShowDatePicker(false);
                    }}
                    className={`relative flex flex-col items-center justify-center rounded-lg py-2 text-sm transition-colors ${
                      !isCurrentMonth ? 'cursor-default text-[#E5E5E5]' :
                      isFuture ? 'cursor-not-allowed text-[#CCD0CF]' :
                      isToday ? 'bg-[#00DC7D] font-bold text-white' :
                      'text-[#2F3331] hover:bg-[#F2F2F3]'
                    }`}
                  >
                    <span>{format(date, 'd')}</span>
                    {isCurrentMonth && !isFuture && (
                      <div className="mt-1 flex gap-0.5">
                        {hasJournal && <span className="h-1 w-1 rounded-full bg-[#A3A7A8]" />}
                        {hasDream && <span className="h-1 w-1 rounded-full bg-[#00DC7D]" />}
                        {hasExtra && <span className="h-1 w-1 rounded-full bg-[#5D8AFF]" />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      <section className="mx-auto max-w-[680px] px-6 py-9">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={goToPreviousWeek}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#6F7476] transition-colors hover:bg-[#F2F2F3] hover:text-[#2F3331]"
            title="previous 7 days"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="h-4 w-4" />
          </button>

          <p className="text-sm font-light text-[#6F7476]">
            {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </p>

          <button
            onClick={goToNextWeek}
            disabled={!canGoToNextRange}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#6F7476] transition-colors hover:bg-[#F2F2F3] hover:text-[#2F3331] disabled:cursor-not-allowed disabled:text-[#CCD0CF] disabled:hover:bg-transparent"
            title="next 7 days"
          >
            <FontAwesomeIcon icon={faChevronRight} className="h-4 w-4" />
          </button>
        </div>

        <div className="flex justify-center gap-4 sm:gap-6">
          {weekDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const data = weeklyEntries[dateStr] || { entries: 0, bullets: 0, hasDream: false, hasWisdom: false, hasNote: false, hasIdea: false };
            const isToday = dateStr === today;
            const hasContent = data.entries > 0 || data.hasDream || data.hasWisdom || data.hasNote || data.hasIdea;
            const hasMinimumBullets = data.bullets >= 3;

            return (
              <div key={dateStr} className="flex flex-col items-center">
                <button
                  onClick={() => goToDate(dateStr)}
                  className={`relative flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold transition-all sm:h-14 sm:w-14 ${
                    isToday
                      ? 'border-2 border-primary bg-surface text-primary shadow-sm ring-2 ring-primary/10'
                      : hasMinimumBullets
                      ? 'bg-[#FFF4E6] text-[#FF9933]'
                      : hasContent
                      ? 'bg-surface-alt text-primary'
                      : 'bg-surface-alt/40 text-secondary'
                  }`}
                  title={format(day, 'EEEE, MMMM d')}
                >
                  {format(day, 'EEEEE')}

                  {data.bullets > 0 && (
                    <svg className="absolute inset-0 h-full w-full -rotate-90">
                      <circle
                        cx="50%"
                        cy="50%"
                        r="46%"
                        fill="none"
                        stroke={isToday ? '#FFCC33' : '#D7DBDA'}
                        strokeWidth="2"
                        pathLength="100"
                        strokeDasharray={`${Math.min(data.bullets * 20, 100)} ${100 - Math.min(data.bullets * 20, 100)}`}
                      />
                    </svg>
                  )}
                </button>

                <div className="mt-2 flex h-3 items-center gap-1.5 justify-center">
                  {data.hasDream && <span className="orbit-dot h-1.5 w-1.5 rounded-full bg-[#00DC7D]" title="Dream" />}
                  {data.hasWisdom && <span className="orbit-dot h-1.5 w-1.5 rounded-full bg-[#5D8AFF]" title="Wisdom" />}
                  {data.hasNote && <span className="orbit-dot h-1.5 w-1.5 rounded-full bg-[#00875A]" title="Note" />}
                  {data.hasIdea && <span className="orbit-dot h-1.5 w-1.5 rounded-full bg-[#FFA952]" title="Idea" />}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <main className="mx-auto max-w-[680px] px-6">
        {/* Sleek Performance Filter Selector Bar to prevent DOM lag */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
          <div className="text-xs font-bold text-[#8E9392] uppercase tracking-wider">
            Showing {timelineEntries.length} entries
          </div>
          <div className="flex bg-[#F2F2F3] p-0.5 rounded-lg text-xs font-semibold border border-gray-100 self-start sm:self-auto shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
            <button
              onClick={() => setTimeFilter('30days')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${timeFilter === '30days' ? 'bg-white text-[#2F3331] shadow-sm font-bold' : 'text-[#6F7476] hover:text-[#2F3331]'}`}
            >
              30 Days
            </button>
            <button
              onClick={() => setTimeFilter('month')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${timeFilter === 'month' ? 'bg-white text-[#2F3331] shadow-sm font-bold' : 'text-[#6F7476] hover:text-[#2F3331]'}`}
            >
              Month
            </button>
            <button
              onClick={() => setTimeFilter('year')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${timeFilter === 'year' ? 'bg-white text-[#2F3331] shadow-sm font-bold' : 'text-[#6F7476] hover:text-[#2F3331]'}`}
            >
              Year
            </button>
            <button
              onClick={() => setTimeFilter('all')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${timeFilter === 'all' ? 'bg-white text-[#2F3331] shadow-sm font-bold' : 'text-[#6F7476] hover:text-[#2F3331]'}`}
            >
              All
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {timelineEntries.map((entry, index) => {
            const entryDate = parseISO(entry.date);
            const isEntryToday = entry.date === today;
            const entryNumber = entryNumberByDate.get(entry.date) || 1;
            const heading = format(entryDate, format(entryDate, 'yyyy') === format(todayDate, 'yyyy') ? 'EEE, MMM d' : 'EEE, MMM d, yyyy');
            const visibleBullets = sortBullets(entry.bullets).slice(0, 5);

            return (
              <Fragment key={entry.id}>
                <button
                  onClick={() => goToDate(entry.date)}
                  className="group w-full py-5 text-left transition-colors"
                >
                  <div>
                    <h2 className="font-sans text-2xl font-bold leading-tight tracking-normal text-primary sm:text-[26px]">
                      {heading}
                    </h2>
                    <p className="mt-0.5 text-sm font-semibold text-[#6F7476]">
                      <span className="text-[#6F7476]">#{entryNumber}</span>
                      {isEntryToday && <span className="text-[#FF9933]"> / Today</span>}
                    </p>
                  </div>

                  <div className="mt-4 space-y-2">
                    {entry.dream.trim() && (
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFF6D9] text-[#FFCC33]">
                          <FontAwesomeIcon icon={faMoon} className="h-2.5 w-2.5" />
                        </span>
                        <p className="line-clamp-3 text-sm font-light leading-6 text-[#74797B] italic">
                          {entry.dream}
                        </p>
                      </div>
                    )}

                    {entry.bullets.length > 0 ? (
                      <div className="space-y-1.5">
                        {visibleBullets.map((bullet) => {
                          const isSourceValid = !bullet.source || (
                            bullet.source === 'wisdom' ? wisdoms.some(w => w.id === bullet.sourceId || (w.linkedEntryId === entry.date && w.content === bullet.text)) :
                            bullet.source === 'note' ? notes.some(n => n.id === bullet.sourceId || ((n.linkedEntryId === entry.date || n.linkedDate === entry.date) && (n.content === bullet.text || (n.title && `${n.title}: ${n.content}` === bullet.text)))) :
                            bullet.source === 'idea' ? ideas.some(i => i.id === bullet.sourceId || (i.linkedEntries?.includes(entry.date) && i.content === bullet.text)) :
                            false
                          );
                          const hasValidSource = bullet.source && isSourceValid;

                          const sourceColors = hasValidSource && bullet.source === 'wisdom'
                            ? { bg: 'bg-[#F0D6FF]', text: 'text-[#8B00D4]' }
                            : hasValidSource && bullet.source === 'note'
                            ? { bg: 'bg-[#C8F7E4]', text: 'text-[#00875A]' }
                            : hasValidSource && bullet.source === 'idea'
                            ? { bg: 'bg-[#FFE4B5]', text: 'text-[#B45309]' }
                            : null;

                          return (
                            <div key={bullet.id} className="flex items-start gap-2">
                              {bullet.style === 'checklist' ? (
                                <FontAwesomeIcon
                                  icon={bullet.isCompleted ? faCheck : faSquare}
                                  className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${bullet.isCompleted ? 'text-[#22C55E]' : 'text-[#CCD0CF]'}`}
                                />
                              ) : bullet.style === 'star' ? (
                                <FontAwesomeIcon
                                  icon={faStar}
                                  className={`mt-0.5 h-3 w-3 shrink-0 ${bullet.isHighlight ? 'text-[#FF9933]' : 'text-[#F59E0B]/60'}`}
                                />
                              ) : (
                                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${bullet.isHighlight ? 'bg-[#FF9933]' : 'bg-[#9AA0A1]'}`} />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className={`line-clamp-2 text-sm font-light leading-6 ${hasValidSource ? sourceColors?.text || 'text-[#5D5AEF]' : 'text-[#2F3331]'} ${bullet.isHighlight ? 'font-semibold' : ''} ${bullet.isCompleted ? 'text-[#A3A7A8] line-through' : ''}`}>
                                  <HighlightedText text={bullet.text} interactive />
                                </p>
                                {sourceColors && (
                                  <span className={`mt-0.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${sourceColors.bg} ${sourceColors.text}`}>
                                    <FontAwesomeIcon icon={
                                      bullet.source === 'wisdom' ? faTree :
                                      bullet.source === 'note' ? faBook :
                                      faLightbulb
                                    } className="h-2.5 w-2.5" />
                                    {bullet.source}
                                    {bullet.sourceType && ` (${bullet.sourceType})`}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {entry.bullets.length > visibleBullets.length && (
                          <p className="pl-6 text-xs font-semibold text-[#A3A7A8]">
                            + {entry.bullets.length - visibleBullets.length} more
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm font-light italic leading-6 text-[#74797B]">
                        No bullets...
                      </p>
                    )}
                  </div>

                  {renderItemIndicators(entry)}
                </button>

                {index === 0 && shouldShowAddYesterday && (
                  <div className="flex py-5">
                    <button
                      onClick={() => goToDate(yesterday)}
                      className="inline-flex items-center gap-3 rounded-lg border border-[#D7DBDA] bg-[#F2F2F3] px-4 py-3 text-base font-bold text-[#6F7476] transition-colors hover:bg-[#E8E9EA] hover:text-[#2F3331]"
                    >
                      <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
                      Add yesterday
                    </button>
                  </div>
                )}

                {index < timelineEntries.length - 1 && (
                  <div className="flex justify-center gap-1 py-3" aria-hidden="true">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D7DBDA]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D7DBDA]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D7DBDA]" />
                  </div>
                )}
              </Fragment>
            );
          })}

          {timelineEntries.length === 0 && (
            <div className="py-16 text-center">
              <FontAwesomeIcon icon={faBook} className="mx-auto mb-4 h-10 w-10 text-[#CCD0CF]" />
              <p className="text-lg font-semibold text-[#2F3331]">
                {searchTerm ? 'No entry matches that search.' : 'No entries yet.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => goToDate(today)}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#00DC7D] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#00B866]"
                >
                  <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
                  Write entry
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
