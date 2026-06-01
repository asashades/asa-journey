'use client';

import { useMemo, useState } from 'react';
import { useData } from '@/contexts/DataContext';
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfYear,
} from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faBolt,
  faBookmark,
  faBookOpen,
  faCalendar,
  faCheck,
  faCircleInfo,
  faFire,
  faStar,
  faTag,
  faAt,
  faBook,
  faWandMagicSparkles,
  faLightbulb,
  faMoon,
  faQuoteLeft,
  faImages,
} from '@fortawesome/free-solid-svg-icons';
import { Entry, WisdomType } from '@/types';
import { ActivityHeatmap } from '@/components/ui/ActivityHeatmap';

type InsightTab = 'journal' | 'dreams' | 'highlights' | 'tags' | 'people' | 'wisdom' | 'ideas';
type InsightScope = 'year' | 'alltime';
type ActivityRecord = {
  id: string;
  date: string;
  type?: WisdomType;
};
type DreamReadyEntry = Entry & {
  dreams?: Array<{
    id?: string;
    content?: string;
    text?: string;
    createdAt?: Date | string;
  }>;
};

const tabs: { id: InsightTab; label: string; icon: IconDefinition }[] = [
  { id: 'journal', label: 'Journal', icon: faBook },
  { id: 'dreams', label: 'Dreams', icon: faMoon },
  { id: 'highlights', label: 'Highlights', icon: faStar },
  { id: 'tags', label: 'Tags', icon: faTag },
  { id: 'people', label: 'People', icon: faAt },
  { id: 'wisdom', label: 'Wisdom', icon: faWandMagicSparkles },
  { id: 'ideas', label: 'Ideas', icon: faLightbulb },
];

const wisdomTypeMeta: Record<WisdomType, { label: string; icon: IconDefinition; color: string; bg: string }> = {
  thought: { label: 'thoughts', icon: faBolt, color: '#8B00D4', bg: '#F0D6FF' },
  quote: { label: 'quotes', icon: faQuoteLeft, color: '#1A56C4', bg: '#D6E4FF' },
  fact: { label: 'facts', icon: faCircleInfo, color: '#00875A', bg: '#C8F7E4' },
  excerpt: { label: 'excerpts', icon: faBookmark, color: '#B45309', bg: '#FFE4B5' },
  lesson: { label: 'lessons', icon: faBookOpen, color: '#6B21A8', bg: '#EDD6FF' },
};

const weekdayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dreamColor = '#FF9933';

const getRecordDate = (date: Date | string) => {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return format(parsedDate, 'yyyy-MM-dd');
};

const getDreamRecords = (entries: Entry[]): ActivityRecord[] => {
  return entries.flatMap((entry) => {
    const dreamEntry = entry as DreamReadyEntry;
    const multiDreams = Array.isArray(dreamEntry.dreams)
      ? dreamEntry.dreams
          .filter(dream => (dream.content || dream.text || '').trim())
          .map((dream, index) => ({
            id: dream.id || `${entry.id}-dream-${index}`,
            date: dream.createdAt ? getRecordDate(dream.createdAt) : entry.date,
          }))
      : [];

    if (multiDreams.length > 0) return multiDreams;
    return entry.dream?.trim() ? [{ id: `${entry.id}-dream`, date: entry.date }] : [];
  });
};

const getScopeBounds = (records: ActivityRecord[], scope: InsightScope, now: Date, selectedYear: number) => {
  if (scope === 'year') {
    return {
      start: startOfYear(new Date(selectedYear, 0, 1)),
      end: selectedYear === now.getFullYear() ? now : new Date(selectedYear, 11, 31),
    };
  }

  const firstDate = records.length > 0
    ? records.map(record => parseISO(record.date)).sort((a, b) => a.getTime() - b.getTime())[0]
    : startOfYear(now);

  return {
    start: firstDate,
    end: now,
  };
};

const isDateInBounds = (date: Date, start: Date, end: Date) => date.getTime() >= start.getTime() && date.getTime() <= end.getTime();

const getRecordsInScope = (records: ActivityRecord[], scope: InsightScope, now: Date, selectedYear: number) => {
  const { start, end } = getScopeBounds(records, scope, now, selectedYear);
  return records.filter(record => isDateInBounds(parseISO(record.date), start, end));
};

const getDaysInScope = (records: ActivityRecord[], scope: InsightScope, now: Date, selectedYear: number) => {
  const { start, end } = getScopeBounds(records, scope, now, selectedYear);
  return Math.max(1, differenceInCalendarDays(end, start) + 1);
};

const getWeeksInScope = (records: ActivityRecord[], scope: InsightScope, now: Date, selectedYear: number) => {
  return Math.max(1, Math.ceil(getDaysInScope(records, scope, now, selectedYear) / 7));
};

const getMonthsInScope = (records: ActivityRecord[], scope: InsightScope, now: Date, selectedYear: number) => {
  const { start, end } = getScopeBounds(records, scope, now, selectedYear);
  const months = [];
  let cursor = startOfMonth(start);
  const finalMonth = startOfMonth(end);

  while (cursor.getTime() <= finalMonth.getTime()) {
    months.push(cursor);
    cursor = addMonths(cursor, 1);
  }

  return months;
};

const monthKey = (date: Date) => format(date, 'yyyy-MM');
const formatChartMonth = (month: Date, totalMonths: number) => format(month, totalMonths > 12 ? 'MMM yy' : 'MMM');

const buildActivityStats = (records: ActivityRecord[], scope: InsightScope, now: Date, selectedYear: number) => {
  const scopedRecords = getRecordsInScope(records, scope, now, selectedYear);
  const thisMonthCount = records.filter(record => isSameMonth(parseISO(record.date), now)).length;
  const weeks = getWeeksInScope(records, scope, now, selectedYear);
  const weekdays = Array.from({ length: 7 }, () => 0);
  const months = getMonthsInScope(records, scope, now, selectedYear).map(month => ({
    month,
    count: scopedRecords.filter(record => monthKey(parseISO(record.date)) === monthKey(month)).length,
  }));
  scopedRecords.forEach(record => {
    weekdays[parseISO(record.date).getDay()] += 1;
  });
  const maxWeekday = Math.max(0, ...weekdays);
  const maxWeekdayIndex = weekdays.findIndex(count => count === maxWeekday);
  const averageWeekday = scopedRecords.length / 7;
  const aboveAverage = averageWeekday > 0 ? Math.round(((maxWeekday - averageWeekday) / averageWeekday) * 100) : 0;

  return {
    scopedRecords,
    thisMonthCount,
    averagePerWeek: scopedRecords.length / weeks,
    weekdays,
    months,
    maxMonth: Math.max(1, ...months.map(month => month.count)),
    maxWeekday: Math.max(1, maxWeekday),
    maxWeekdayLabel: maxWeekdayIndex >= 0 ? weekdayLabels[maxWeekdayIndex] : '',
    aboveAverage,
  };
};

const getHeatmapData = (records: ActivityRecord[], scope: InsightScope, now: Date, selectedYear: number) => {
  const { start, end } = getScopeBounds(records, scope, now, selectedYear);
  const totalDays = Math.max(1, differenceInCalendarDays(end, start) + 1);

  return Array.from({ length: totalDays }, (_, index) => {
    const date = addDays(start, index);
    const dateKey = format(date, 'yyyy-MM-dd');
    return {
      date,
      dateKey,
      count: records.filter(record => record.date === dateKey).length,
    };
  });
};

const getInsightSentences = (label: string, stats: ReturnType<typeof buildActivityStats>, total: number) => {
  if (total === 0) return [`no ${label} yet. the chart is waiting for the lore.`];
  const sentences = [
    `most of your ${label} land on ${stats.maxWeekdayLabel || 'no specific day'} (${Math.max(0, stats.aboveAverage)}% above average).`,
  ];

  if (stats.thisMonthCount > stats.averagePerWeek * 4) {
    sentences.push(`this month is kinda popping: ${stats.thisMonthCount} ${label} already.`);
  }

  if (stats.averagePerWeek < 1) {
    sentences.push(`soft signal: you average under 1 ${label.slice(0, -1)} per week.`);
  } else {
    sentences.push(`solid rhythm: ${stats.averagePerWeek.toFixed(1)} ${label} per week on average.`);
  }

  return sentences;
};

export default function InsightsPage() {
  const {
    entries,
    highlights,
    wisdoms,
    ideas,
    notes,
    currentStreak,
    longestStreak,
  } = useData();

  const [activeTab, setActiveTab] = useState<InsightTab>('journal');
  const [insightScope, setInsightScope] = useState<InsightScope>('year');
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [isScopeDialOpen, setIsScopeDialOpen] = useState(false);

  const now = useMemo(() => new Date(), []);

  // --- Gamification System: XP, Level & Badges ---
  const gamificationData = useMemo(() => {
    // 1. XP Calculations
    const entryXP = entries.length * 100;
    const bulletXP = entries.reduce((sum, e) => sum + e.bullets.length, 0) * 10;
    const dreamXP = entries.filter((e) => e.dream?.trim()).length * 50;
    const collectionXP = (wisdoms.length + (notes?.length || 0) + ideas.length) * 50;
    const photoXP = entries.reduce((sum, e) => sum + (e.media?.filter((m) => m.type === 'image').length || 0), 0) * 30;
    const streakBonus = currentStreak * 25;

    const totalXP = entryXP + bulletXP + dreamXP + collectionXP + photoXP + streakBonus;

    // 2. Level Calculation (Progressive Level Up Curve)
    let level = 1;
    let xpForNextLevel = 300;
    let prevXPThreshold = 0;
    while (totalXP >= xpForNextLevel) {
      level++;
      prevXPThreshold = xpForNextLevel;
      xpForNextLevel += level * 200; // progressive curve: 300, 700, 1300, 2100...
    }
    const progressXP = totalXP - prevXPThreshold;
    const levelCapacity = xpForNextLevel - prevXPThreshold;
    const progressPercent = Math.min(100, Math.max(0, (progressXP / levelCapacity) * 100));

    // 3. Level Titles
    let levelTitle = '🌱 Sprout Scribe';
    if (level >= 3 && level < 5) levelTitle = '✍️ Mind Mapper';
    else if (level >= 5 && level < 7) levelTitle = '🧠 Thought Weaver';
    else if (level >= 7 && level < 10) levelTitle = '🌌 Wisdom Alchemist';
    else if (level >= 10) levelTitle = '👑 Master Chronicler';

    // 4. Badges Definitions
    const activeDreams = entries.filter((e) => e.dream?.trim()).length;
    const activePhotos = entries.reduce((sum, e) => sum + (e.media?.filter((m) => m.type === 'image').length || 0), 0);

    const badges = [
      {
        id: 'streak_3',
        title: 'Warm Up',
        description: 'Logged a 3-day journaling streak',
        icon: faFire,
        color: '#FF9933',
        bg: '#FFF4E6',
        isUnlocked: currentStreak >= 3 || longestStreak >= 3,
        progressText: `${Math.min(3, Math.max(currentStreak, longestStreak))} / 3 days`,
      },
      {
        id: 'streak_7',
        title: 'Habit Spark',
        description: 'Logged a 7-day journaling streak',
        icon: faFire,
        color: '#00DC7D',
        bg: '#E9FFF4',
        isUnlocked: currentStreak >= 7 || longestStreak >= 7,
        progressText: `${Math.min(7, Math.max(currentStreak, longestStreak))} / 7 days`,
      },
      {
        id: 'streak_15',
        title: 'Unstoppable',
        description: 'Logged a 15-day journaling streak',
        icon: faFire,
        color: '#8B00D4',
        bg: '#F0D6FF',
        isUnlocked: currentStreak >= 15 || longestStreak >= 15,
        progressText: `${Math.min(15, Math.max(currentStreak, longestStreak))} / 15 days`,
      },
      {
        id: 'entries_5',
        title: 'Word Weaver',
        description: 'Logged 5 daily journal entries',
        icon: faBook,
        color: '#1A56C4',
        bg: '#D6E4FF',
        isUnlocked: entries.length >= 5,
        progressText: `${Math.min(5, entries.length)} / 5 entries`,
      },
      {
        id: 'wisdom_5',
        title: 'Sage Apprentice',
        description: 'Recorded 5 wisdom collection notes',
        icon: faWandMagicSparkles,
        color: '#B45309',
        bg: '#FFE4B5',
        isUnlocked: wisdoms.length >= 5,
        progressText: `${Math.min(5, wisdoms.length)} / 5 wisdom`,
      },
      {
        id: 'ideas_5',
        title: 'Eureka Moment',
        description: 'Captured 5 creative ideas',
        icon: faLightbulb,
        color: '#FFCC33',
        bg: '#FFFCE6',
        isUnlocked: ideas.length >= 5,
        progressText: `${Math.min(5, ideas.length)} / 5 ideas`,
      },
      {
        id: 'dreams_3',
        title: 'Dreamcatcher',
        description: 'Logged 3 nightly dreams',
        icon: faMoon,
        color: '#9E77ED',
        bg: '#F4F3FF',
        isUnlocked: activeDreams >= 3,
        progressText: `${Math.min(3, activeDreams)} / 3 dreams`,
      },
      {
        id: 'photos_5',
        title: 'Lens of Life',
        description: 'Uploaded 5 gallery memory photos',
        icon: faImages,
        color: '#00B8D9',
        bg: '#E6FCFF',
        isUnlocked: activePhotos >= 5,
        progressText: `${Math.min(5, activePhotos)} / 5 photos`,
      },
    ];

    return {
      totalXP,
      level,
      progressXP,
      levelCapacity,
      progressPercent,
      levelTitle,
      badges,
    };
  }, [entries, wisdoms, notes, ideas, currentStreak, longestStreak]);
  const entryRecords = useMemo(
    () => entries.map(entry => ({ id: entry.id, date: entry.date })),
    [entries]
  );
  const journalRecords = useMemo(
    () => entries
      .filter(entry => entry.bullets.length > 0 || entry.dream?.trim())
      .map(entry => ({ id: entry.id, date: entry.date })),
    [entries]
  );
  const dreamRecords = useMemo(() => getDreamRecords(entries), [entries]);
  const wisdomRecords = useMemo(
    () => wisdoms.map(wisdom => ({
      id: wisdom.id,
      date: wisdom.linkedEntryId || format(wisdom.createdAt, 'yyyy-MM-dd'),
      type: wisdom.type,
    })),
    [wisdoms]
  );
  const highlightRecords = useMemo(
    () => highlights.map(highlight => ({ id: highlight.id, date: highlight.entryDate })),
    [highlights]
  );
  const ideaRecords = useMemo(
    () => ideas.map(idea => ({ id: idea.id, date: format(idea.createdAt, 'yyyy-MM-dd') })),
    [ideas]
  );
  const availableYears = useMemo(() => {
    const years = new Set<number>([now.getFullYear()]);

    entryRecords.forEach(record => years.add(parseISO(record.date).getFullYear()));
    wisdomRecords.forEach(record => years.add(parseISO(record.date).getFullYear()));
    highlightRecords.forEach(record => years.add(parseISO(record.date).getFullYear()));
    ideaRecords.forEach(record => years.add(parseISO(record.date).getFullYear()));

    return Array.from(years).sort((a, b) => b - a);
  }, [entryRecords, highlightRecords, ideaRecords, now, wisdomRecords]);
  const scopedEntryIds = useMemo(() => {
    return new Set(getRecordsInScope(entryRecords, insightScope, now, selectedYear).map(record => record.id));
  }, [entryRecords, insightScope, now, selectedYear]);
  const scopedEntries = useMemo(() => entries.filter(entry => scopedEntryIds.has(entry.id)), [entries, scopedEntryIds]);
  const scopedHighlightIds = useMemo(() => {
    return new Set(getRecordsInScope(highlightRecords, insightScope, now, selectedYear).map(record => record.id));
  }, [highlightRecords, insightScope, now, selectedYear]);
  const scopedHighlights = useMemo(() => highlights.filter(highlight => scopedHighlightIds.has(highlight.id)), [highlights, scopedHighlightIds]);
  const scopedIdeaIds = useMemo(() => {
    return new Set(getRecordsInScope(ideaRecords, insightScope, now, selectedYear).map(record => record.id));
  }, [ideaRecords, insightScope, now, selectedYear]);
  const scopedIdeas = useMemo(() => ideas.filter(idea => scopedIdeaIds.has(idea.id)), [ideas, scopedIdeaIds]);
  const scopedTagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    scopedEntries.forEach(entry => {
      entry.bullets.forEach(bullet => {
        bullet.tags.forEach(tag => counts.set(tag, (counts.get(tag) || 0) + 1));
      });
    });

    return Array.from(counts, ([name, count]) => ({ id: name, name, count })).sort((a, b) => b.count - a.count);
  }, [scopedEntries]);
  const scopedPeopleCounts = useMemo(() => {
    const counts = new Map<string, number>();
    scopedEntries.forEach(entry => {
      entry.bullets.forEach(bullet => {
        bullet.mentions.forEach(person => counts.set(person, (counts.get(person) || 0) + 1));
      });
    });

    return Array.from(counts, ([name, mentions]) => ({ id: name, name, mentions })).sort((a, b) => b.mentions - a.mentions);
  }, [scopedEntries]);
  const scopedBulletCount = scopedEntries.reduce((sum, entry) => sum + entry.bullets.length, 0);
  const scopedWordCount = scopedEntries.reduce(
    (sum, entry) => sum + entry.bullets.reduce((bulletSum, bullet) => bulletSum + bullet.text.trim().split(/\s+/).filter(Boolean).length, 0),
    0
  );
  const daysInScope = getDaysInScope(entryRecords, insightScope, now, selectedYear);
  const wordsPerDay = Math.round(scopedWordCount / daysInScope);
  const writingFrequency = scopedEntries.length > 0
    ? ((scopedEntries.length / daysInScope) * 100).toFixed(0)
    : '0';
  const avgBulletsPerEntry = scopedEntries.length > 0
    ? (scopedBulletCount / scopedEntries.length).toFixed(1)
    : '0';

  // Journal age (days since first entry)
  const firstEntryDate = entryRecords.length > 0
    ? entryRecords.map(record => parseISO(record.date)).sort((a, b) => a.getTime() - b.getTime())[0]
    : null;
  const journalAge = firstEntryDate ? differenceInCalendarDays(now, firstEntryDate) : 0;
  const scopeLabel = insightScope === 'year' ? `in ${selectedYear}` : 'all time';
  const heatmapTitle = insightScope === 'year' ? `yearly heatmap ${selectedYear}` : 'all time heatmap';

  const dreamStats = useMemo(() => buildActivityStats(dreamRecords, insightScope, now, selectedYear), [dreamRecords, insightScope, now, selectedYear]);
  const wisdomStats = useMemo(() => buildActivityStats(wisdomRecords, insightScope, now, selectedYear), [wisdomRecords, insightScope, now, selectedYear]);
  const journalHeatmap = useMemo(() => getHeatmapData(journalRecords, insightScope, now, selectedYear), [journalRecords, insightScope, now, selectedYear]);
  const dreamHeatmap = useMemo(() => getHeatmapData(dreamRecords, insightScope, now, selectedYear), [dreamRecords, insightScope, now, selectedYear]);
  const wisdomHeatmap = useMemo(() => getHeatmapData(wisdomRecords, insightScope, now, selectedYear), [wisdomRecords, insightScope, now, selectedYear]);
  const wisdomTypeCounts = useMemo(() => {
    return (Object.keys(wisdomTypeMeta) as WisdomType[]).map(type => ({
      type,
      count: wisdomStats.scopedRecords.filter(record => record.type === type).length,
    }));
  }, [wisdomStats.scopedRecords]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24">
      {/* Header */}
      <div className="max-w-[600px] mx-auto px-6 pt-8 pb-6">
        <h1 className="text-3xl font-bold font-serif text-[#2F3331] mb-2">
          insights
        </h1>
        <p className="text-[#6F7476] font-light">your writing journey in numbers</p>
      </div>

      <div className="max-w-[600px] mx-auto px-6 mb-6">
        <div className="flex items-center justify-end gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsScopeDialOpen(open => !open)}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-3 text-sm font-semibold text-[#2F3331] shadow-sm ring-1 ring-[#CCD0CF] transition-colors hover:bg-[#F2F2F3]"
              aria-expanded={isScopeDialOpen}
              aria-label="filter insights by time"
              title="filter insights by time"
            >
              <FontAwesomeIcon icon={faCalendar} className="h-3.5 w-3.5 text-[#6F7476]" />
              <span>{insightScope === 'alltime' ? 'All time' : `${selectedYear}`}</span>
            </button>

            {isScopeDialOpen && (
              <div className="absolute right-0 top-14 z-20 w-40 rounded-2xl bg-white p-2 shadow-lg ring-1 ring-[#EEF0EF]">
                <button
                  type="button"
                  onClick={() => {
                    setInsightScope('alltime');
                    setIsScopeDialOpen(false);
                  }}
                  className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                    insightScope === 'alltime'
                      ? 'bg-[#E9FFF4] text-[#00A963]'
                      : 'text-[#6F7476] hover:bg-[#F2F2F3] hover:text-[#2F3331]'
                  }`}
                >
                  All time
                  {insightScope === 'alltime' && <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => setInsightScope('year')}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                    insightScope === 'year'
                      ? 'bg-[#E9FFF4] text-[#00A963]'
                      : 'text-[#6F7476] hover:bg-[#F2F2F3] hover:text-[#2F3331]'
                  }`}
                >
                  Year
                  {insightScope === 'year' && <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />}
                </button>
                {insightScope === 'year' && (
                  <div className="mt-2 space-y-1">
                    {availableYears.map(year => (
                      <button
                        key={year}
                        onClick={() => {
                          setSelectedYear(year);
                          setIsScopeDialOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                          selectedYear === year
                            ? 'bg-[#E9FFF4] text-[#00A963]'
                            : 'text-[#6F7476] hover:bg-[#F2F2F3] hover:text-[#2F3331]'
                        }`}
                      >
                        {year}
                        {selectedYear === year && <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-[600px] mx-auto px-6 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#00DC7D] text-white shadow-sm'
                    : 'bg-white text-[#6F7476] hover:bg-[#F2F2F3] border border-[#CCD0CF]'
                }`}
              >
                <FontAwesomeIcon icon={Icon} className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-[600px] mx-auto px-6">
        {activeTab === 'journal' && (
          <div className="space-y-8">
            {/* Gamification Level & XP Progress Card */}
            <div className="bg-white rounded-3xl p-6 border border-[#CCD0CF] shadow-sm relative overflow-hidden">
              {/* Decorative pastel backdrop glow */}
              <div className="absolute -right-16 -top-16 w-36 h-36 rounded-full bg-[#E9FFF4]/60 blur-3xl" />
              
              <div className="flex items-center gap-4 relative z-10">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#E9FFF4] border border-[#CCD0CF]/40 shadow-inner">
                  <span className="text-2xl">🏆</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-xl font-black text-[#2F3331] font-sans tracking-tight">
                      Level {gamificationData.level}
                    </h2>
                    <span className="text-[10px] font-bold text-[#00A963] uppercase tracking-wider bg-[#E9FFF4] px-2 py-0.5 rounded">
                      {gamificationData.levelTitle}
                    </span>
                  </div>
                  <p className="text-xs text-[#6F7476] mt-0.5">
                    {gamificationData.progressXP} / {gamificationData.levelCapacity} XP to level up (Total: {gamificationData.totalXP} XP)
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4 relative z-10">
                <div className="h-3 w-full bg-[#F2F2F3] rounded-full overflow-hidden border border-[#CCD0CF]/30 p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#00DC7D] to-[#00B866] transition-all duration-500 shadow-sm"
                    style={{ width: `${gamificationData.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-5 border border-[#CCD0CF] shadow-sm">
                <p className="text-3xl font-bold text-[#2F3331]">{scopedEntries.length}</p>
                <p className="text-xs text-[#A3A7A8] mt-1">entries {scopeLabel}</p>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-[#CCD0CF] shadow-sm">
                <p className="text-3xl font-bold text-[#2F3331]">{scopedBulletCount}</p>
                <p className="text-xs text-[#A3A7A8] mt-1">bullets {scopeLabel}</p>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-[#CCD0CF] shadow-sm">
                <p className="text-3xl font-bold text-[#2F3331]">{journalAge}</p>
                <p className="text-xs text-[#A3A7A8] mt-1">journal age (days)</p>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-[#CCD0CF] shadow-sm">
                <p className="text-3xl font-bold text-[#2F3331]">{wordsPerDay}</p>
                <p className="text-xs text-[#A3A7A8] mt-1">avg words/day</p>
              </div>
            </div>

            <ActivityHeatmap
              title={heatmapTitle}
              data={journalHeatmap}
              color="#00DC7D"
            />

            {/* Badges Achievements Gallery */}
            <div className="bg-white rounded-3xl p-5 border border-[#CCD0CF] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold font-serif text-[#2F3331] text-base">
                  badges & milestones
                </h3>
                <span className="text-[10px] font-bold text-[#6F7476] bg-[#F2F2F3] px-2 py-0.5 rounded-full">
                  {gamificationData.badges.filter(b => b.isUnlocked).length} / {gamificationData.badges.length} unlocked
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {gamificationData.badges.map((badge) => (
                  <div
                    key={badge.id}
                    className={`relative p-3.5 rounded-2xl border transition-all duration-300 flex flex-col items-center text-center ${
                      badge.isUnlocked
                        ? 'bg-white border-[#CCD0CF]/60 shadow-sm hover:scale-[1.01]'
                        : 'bg-[#FAFAFA]/70 border-[#E4E7E6]/50 opacity-60'
                    }`}
                  >
                    {/* Badge Icon Wrapper */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-300 relative"
                      style={badge.isUnlocked ? { backgroundColor: badge.bg } : { backgroundColor: '#EEF0EF' }}
                    >
                      <FontAwesomeIcon
                        icon={badge.icon}
                        className="w-3.5 h-3.5"
                        style={badge.isUnlocked ? { color: badge.color } : { color: '#A3A7A8' }}
                      />
                      {badge.isUnlocked && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00DC7D] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00DC7D] border border-white"></span>
                        </span>
                      )}
                    </div>
                    
                    <h4 className="font-bold text-xs text-[#2F3331] leading-tight mb-0.5 truncate max-w-full">
                      {badge.title}
                    </h4>
                    <p className="text-[9px] text-[#6F7476] leading-snug mb-2 font-light line-clamp-2 h-7">
                      {badge.description}
                    </p>
                    
                    {/* Progress tracking chip */}
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md ${
                      badge.isUnlocked 
                        ? 'bg-[#E9FFF4] text-[#00A963]' 
                        : 'bg-[#EEF0EF] text-[#6F7476]'
                    }`}>
                      {badge.isUnlocked ? 'Unlocked!' : badge.progressText}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-2xl p-5 border border-[#CCD0CF] shadow-sm">
              <h3 className="font-bold font-serif text-[#2F3331] mb-4">
                key stats
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[#6F7476] font-light">entries {scopeLabel}</span>
                  <span className="font-medium text-[#2F3331]">{scopedEntries.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6F7476] font-light">bullet rate per entry</span>
                  <span className="font-medium text-[#2F3331]">{avgBulletsPerEntry}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6F7476] font-light">writing frequency</span>
                  <span className="font-medium text-[#2F3331]">{writingFrequency}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6F7476] font-light">current streak</span>
                  <span className="font-medium text-[#FF9933] flex items-center gap-1">
                    <FontAwesomeIcon icon={faFire} className="w-4 h-4" /> {currentStreak}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6F7476] font-light">longest streak</span>
                  <span className="font-medium text-[#FF9933] flex items-center gap-1">
                    <FontAwesomeIcon icon={faFire} className="w-4 h-4" /> {longestStreak}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dreams' && (
          <div className="space-y-8">
            <MetricChips
              items={[
                { label: 'dreams', value: dreamStats.scopedRecords.length, color: '#FF9933' },
                { label: 'avg / week', value: dreamStats.averagePerWeek.toFixed(1), color: '#2F3331' },
                { label: 'dreams this month', value: dreamStats.thisMonthCount, color: '#6F7476' },
              ]}
            />
            <ActivityHeatmap
              title={heatmapTitle}
              data={dreamHeatmap}
              color={dreamColor}
            />
            <InsightLines lines={getInsightSentences('dreams', dreamStats, dreamStats.scopedRecords.length)} />
            <BarChart
              title="monthly variation"
              rows={dreamStats.months.map(item => ({ label: formatChartMonth(item.month, dreamStats.months.length), value: item.count }))}
              max={dreamStats.maxMonth}
              color={dreamColor}
            />
            <BarChart
              title="weekday distribution"
              rows={dreamStats.weekdays.map((value, index) => ({ label: weekdayLabels[index].slice(0, 3), value }))}
              max={dreamStats.maxWeekday}
              color={dreamColor}
            />
          </div>
        )}

        {activeTab === 'highlights' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-[#CCD0CF] shadow-sm">
              <h3 className="font-bold font-serif text-[#2F3331] mb-2">
                highlights {scopeLabel}
              </h3>
              <p className="text-3xl font-bold text-[#FF9933]">{scopedHighlights.length}</p>
            </div>
            <div className="space-y-2">
              {scopedHighlights.slice(0, 10).map((h) => (
                <div key={h.id} className="bg-white rounded-xl p-4 border border-[#FFEEAA] shadow-sm">
                  <p className="text-[#2F3331] text-sm font-light">{h.content}</p>
                  <p className="text-xs text-[#A3A7A8] mt-2">{format(h.createdAt, 'MMM d, yyyy')}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tags' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-[#CCD0CF] shadow-sm">
              <h3 className="font-bold font-serif text-[#2F3331] mb-2">
                tags {scopeLabel}
              </h3>
              <p className="text-3xl font-bold text-[#5D8AFF]">{scopedTagCounts.length}</p>
            </div>
            <div className="space-y-2">
              {scopedTagCounts.slice(0, 20).map((tag) => (
                <div key={tag.id} className="bg-white rounded-xl p-3 border border-[#CCD0CF] shadow-sm flex justify-between items-center">
                  <span className="text-[#5D8AFF] font-light">#{tag.name}</span>
                  <span className="text-sm text-[#A3A7A8]">{tag.count}x</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'people' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-[#CCD0CF] shadow-sm">
              <h3 className="font-bold font-serif text-[#2F3331] mb-2">
                mentions {scopeLabel}
              </h3>
              <p className="text-3xl font-bold text-[#E97C9B]">
                {scopedPeopleCounts.reduce((sum, person) => sum + person.mentions, 0)}
              </p>
            </div>
            <div className="space-y-2">
              {scopedPeopleCounts.slice(0, 20).map((person) => (
                <div key={person.id} className="bg-white rounded-xl p-3 border border-[#CCD0CF] shadow-sm flex justify-between items-center">
                  <span className="text-[#E97C9B] font-light">@{person.name}</span>
                  <span className="text-sm text-[#A3A7A8]">{person.mentions}x</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'wisdom' && (
          <div className="space-y-8">
            <MetricChips
              items={[
                { label: 'wisdoms', value: wisdomStats.scopedRecords.length, color: '#C494FF' },
                { label: 'avg / week', value: wisdomStats.averagePerWeek.toFixed(1), color: '#2F3331' },
                { label: 'gems this month', value: wisdomStats.thisMonthCount, color: '#6F7476' },
              ]}
            />
            <ActivityHeatmap
              title={heatmapTitle}
              data={wisdomHeatmap}
              color="#C494FF"
            />
            <WisdomPolarChart counts={wisdomTypeCounts} />
            <InsightLines lines={getInsightSentences('wisdoms', wisdomStats, wisdomStats.scopedRecords.length)} />
            <BarChart
              title="monthly variation"
              rows={wisdomStats.months.map(item => ({ label: formatChartMonth(item.month, wisdomStats.months.length), value: item.count }))}
              max={wisdomStats.maxMonth}
              color="#C494FF"
            />
            <BarChart
              title="weekday distribution"
              rows={wisdomStats.weekdays.map((value, index) => ({ label: weekdayLabels[index].slice(0, 3), value }))}
              max={wisdomStats.maxWeekday}
              color="#C494FF"
            />
          </div>
        )}

        {activeTab === 'ideas' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-[#CCD0CF] shadow-sm">
              <h3 className="font-bold font-serif text-[#2F3331] mb-2">
                ideas {scopeLabel}
              </h3>
              <p className="text-3xl font-bold text-[#FF9933]">{scopedIdeas.length}</p>
            </div>
            <div className="space-y-2">
              {scopedIdeas.slice(0, 10).map((idea) => (
                <div key={idea.id} className="bg-white rounded-xl p-4 border border-[#FFEEAA] shadow-sm">
                  <p className="text-[#2F3331] text-sm font-light">{idea.content}</p>
                  <p className="text-xs text-[#A3A7A8] mt-2">{format(idea.createdAt, 'MMM d, yyyy')}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function MetricChips({
  items,
}: {
  items: Array<{ label: string; value: string | number; color: string }>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(item => (
        <div key={item.label} className="rounded-full bg-white px-4 py-2 ring-1 ring-[#EEF0EF]">
          <span className="mr-2 text-lg font-bold" style={{ color: item.color }}>{item.value}</span>
          <span className="text-xs font-semibold uppercase text-[#A3A7A8]">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function BarChart({
  title,
  rows,
  max,
  color,
}: {
  title: string;
  rows: Array<{ label: string; value: number }>;
  max: number;
  color: string;
}) {
  return (
    <section>
      <h3 className="mb-4 font-sans text-lg font-bold tracking-normal text-[#2F3331]">{title}</h3>
      <div className="space-y-3">
        {rows.map(row => (
          <div key={row.label} className="flex items-center gap-3">
            <span className="w-12 text-xs font-semibold text-[#6F7476]">{row.label}</span>
            <div className="h-2 flex-1 rounded-full bg-[#EEF0EF]">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(row.value / Math.max(1, max)) * 100}%`, backgroundColor: color }}
              />
            </div>
            <span className="w-7 text-right text-xs font-semibold text-[#2F3331]">{row.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function InsightLines({ lines }: { lines: string[] }) {
  return (
    <section className="space-y-2">
      {lines.map(line => (
        <p key={line} className="text-base font-light leading-7 text-[#2F3331]">
          {line}
        </p>
      ))}
    </section>
  );
}

function WisdomPolarChart({ counts }: { counts: Array<{ type: WisdomType; count: number }> }) {
  const max = Math.max(1, ...counts.map(item => item.count));
  const center = 90;
  const inner = 22;
  const maxRadius = 78;

  return (
    <section>
      <h3 className="mb-4 font-sans text-lg font-bold tracking-normal text-[#2F3331]">wisdom mix</h3>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <svg viewBox="0 0 180 180" className="h-44 w-44 shrink-0" role="img" aria-label="wisdom category polar chart">
          <circle cx={center} cy={center} r={inner} fill="#F7F8F8" />
          {counts.map((item, index) => {
            const angle = (Math.PI * 2 * index) / counts.length - Math.PI / 2;
            const radius = inner + (item.count / max) * (maxRadius - inner);
            const x = center + Math.cos(angle) * radius;
            const y = center + Math.sin(angle) * radius;
            const meta = wisdomTypeMeta[item.type];

            return (
              <g key={item.type}>
                <line
                  x1={center}
                  y1={center}
                  x2={x}
                  y2={y}
                  stroke={meta.color}
                  strokeWidth="16"
                  strokeLinecap="round"
                  opacity={item.count > 0 ? 0.9 : 0.18}
                />
                <circle cx={x} cy={y} r="7" fill={meta.bg} stroke={meta.color} strokeWidth="2" />
              </g>
            );
          })}
        </svg>

        <div className="space-y-2">
          {counts.map(item => {
            const meta = wisdomTypeMeta[item.type];
            return (
              <div key={item.type} className="flex items-center gap-3">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: meta.bg, color: meta.color }}
                >
                  <FontAwesomeIcon icon={meta.icon} className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm font-semibold text-[#2F3331]">
                  {item.count} {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
