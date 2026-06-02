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
  subMonths,
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
  faTree,
  faChartLine,
  faClock,
  faSun,
} from '@fortawesome/free-solid-svg-icons';
import { Entry, WisdomType } from '@/types';
import { ActivityHeatmap } from '@/components/ui/ActivityHeatmap';

type InsightTab = 'journal' | 'dreams' | 'stars' | 'tags' | 'people' | 'wisdom' | 'ideas';
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
  { id: 'stars', label: 'Stars', icon: faStar },
  { id: 'tags', label: 'Tags', icon: faTag },
  { id: 'people', label: 'People', icon: faAt },
  { id: 'wisdom', label: 'Wisdom', icon: faTree },
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

  let firstDate = records.length > 0
    ? records.map(record => parseISO(record.date)).sort((a, b) => a.getTime() - b.getTime())[0]
    : subMonths(now, 3);

  const minStartDate = subMonths(now, 3);
  if (firstDate.getTime() > minStartDate.getTime()) {
    firstDate = minStartDate;
  }

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

    const getBadgeTiers = (
      currentVal: number,
      tiers: { target: number; label: string }[]
    ) => {
      let activeIndex = 0;
      for (let i = 0; i < tiers.length; i++) {
        activeIndex = i;
        if (currentVal < tiers[i].target) {
          break;
        }
      }
      const activeTier = tiers[activeIndex];
      const isUnlocked = currentVal >= tiers[0].target;
      const isFullyUnlocked = currentVal >= tiers[tiers.length - 1].target;
      return {
        label: activeTier.label,
        target: activeTier.target,
        isUnlocked,
        isFullyUnlocked,
        progressText: `${Math.min(currentVal, activeTier.target)} / ${activeTier.target}`,
      };
    };

    const dreamTiers = [{ target: 3, label: 'I' }, { target: 10, label: 'II' }, { target: 30, label: 'III' }];
    const dreamTierInfo = getBadgeTiers(activeDreams, dreamTiers);

    const entryTiers = [{ target: 5, label: 'I' }, { target: 15, label: 'II' }, { target: 50, label: 'III' }];
    const entryTierInfo = getBadgeTiers(entries.length, entryTiers);

    const wisdomTiers = [{ target: 5, label: 'I' }, { target: 15, label: 'II' }, { target: 40, label: 'III' }];
    const wisdomTierInfo = getBadgeTiers(wisdoms.length, wisdomTiers);

    const ideaTiers = [{ target: 5, label: 'I' }, { target: 15, label: 'II' }, { target: 40, label: 'III' }];
    const ideaTierInfo = getBadgeTiers(ideas.length, ideaTiers);

    const photoTiers = [{ target: 5, label: 'I' }, { target: 15, label: 'II' }, { target: 40, label: 'III' }];
    const photoTierInfo = getBadgeTiers(activePhotos, photoTiers);

    const badges = [
      {
        id: 'streak_3',
        title: 'Warm Up',
        description: 'Logged a 3-day journaling streak',
        icon: faFire,
        color: '#FF9933',
        bg: '#FFF4E6',
        isUnlocked: currentStreak >= 3 || longestStreak >= 3,
        isFullyUnlocked: currentStreak >= 3 || longestStreak >= 3,
        tierLabel: '',
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
        isFullyUnlocked: currentStreak >= 7 || longestStreak >= 7,
        tierLabel: '',
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
        isFullyUnlocked: currentStreak >= 15 || longestStreak >= 15,
        tierLabel: '',
        progressText: `${Math.min(15, Math.max(currentStreak, longestStreak))} / 15 days`,
      },
      {
        id: 'entries_tiered',
        title: `Word Weaver ${entryTierInfo.label}`,
        description: `Logged ${entryTierInfo.target} daily journal entries`,
        icon: faBook,
        color: '#1A56C4',
        bg: '#D6E4FF',
        isUnlocked: entryTierInfo.isUnlocked,
        isFullyUnlocked: entryTierInfo.isFullyUnlocked,
        tierLabel: entryTierInfo.label,
        progressText: entryTierInfo.progressText,
      },
      {
        id: 'wisdom_tiered',
        title: `Sage Apprentice ${wisdomTierInfo.label}`,
        description: `Recorded ${wisdomTierInfo.target} wisdom collection notes`,
        icon: faWandMagicSparkles,
        color: '#B45309',
        bg: '#FFE4B5',
        isUnlocked: wisdomTierInfo.isUnlocked,
        isFullyUnlocked: wisdomTierInfo.isFullyUnlocked,
        tierLabel: wisdomTierInfo.label,
        progressText: wisdomTierInfo.progressText,
      },
      {
        id: 'ideas_tiered',
        title: `Eureka Moment ${ideaTierInfo.label}`,
        description: `Captured ${ideaTierInfo.target} creative ideas`,
        icon: faLightbulb,
        color: '#FFCC33',
        bg: '#FFFCE6',
        isUnlocked: ideaTierInfo.isUnlocked,
        isFullyUnlocked: ideaTierInfo.isFullyUnlocked,
        tierLabel: ideaTierInfo.label,
        progressText: ideaTierInfo.progressText,
      },
      {
        id: 'dreams_tiered',
        title: `Dreamcatcher ${dreamTierInfo.label}`,
        description: `Logged ${dreamTierInfo.target} nightly dreams`,
        icon: faMoon,
        color: '#9E77ED',
        bg: '#F4F3FF',
        isUnlocked: dreamTierInfo.isUnlocked,
        isFullyUnlocked: dreamTierInfo.isFullyUnlocked,
        tierLabel: dreamTierInfo.label,
        progressText: dreamTierInfo.progressText,
      },
      {
        id: 'photos_tiered',
        title: `Lens of Life ${photoTierInfo.label}`,
        description: `Uploaded ${photoTierInfo.target} gallery memory photos`,
        icon: faImages,
        color: '#00B8D9',
        bg: '#E6FCFF',
        isUnlocked: photoTierInfo.isUnlocked,
        isFullyUnlocked: photoTierInfo.isFullyUnlocked,
        tierLabel: photoTierInfo.label,
        progressText: photoTierInfo.progressText,
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
  const scopedWordCount = scopedEntries.reduce((sum, entry) => {
    const dreamWords = entry.dream ? entry.dream.trim().split(/\s+/).filter(Boolean).length : 0;
    const bulletWords = entry.bullets.reduce(
      (bulletSum, bullet) => bulletSum + bullet.text.trim().split(/\s+/).filter(Boolean).length,
      0
    );
    return sum + dreamWords + bulletWords;
  }, 0);
  const daysInScope = getDaysInScope(entryRecords, insightScope, now, selectedYear);
  const wordsPerDay = Math.round(scopedWordCount / daysInScope);
  const wordsPerDayDecimal = daysInScope > 0 ? (scopedWordCount / daysInScope).toFixed(1) : '0.0';

  const highlightRate = useMemo(() => {
    if (scopedEntries.length === 0) return 0;
    const entriesWithHighlights = scopedEntries.filter(entry => 
      entry.bullets.some(bullet => bullet.isHighlight) ||
      scopedHighlights.some(h => h.entryId === entry.id)
    );
    return Math.round((entriesWithHighlights.length / scopedEntries.length) * 100);
  }, [scopedEntries, scopedHighlights]);

  const weeksInScope = getWeeksInScope(entryRecords, insightScope, now, selectedYear);
  const writingFrequencyPerWeek = weeksInScope > 0 ? (scopedEntries.length / weeksInScope).toFixed(1) : '0.0';

  const bulletRate = scopedEntries.length > 0
    ? (scopedBulletCount / scopedEntries.length).toFixed(1)
    : '0.0';

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

  const journalStats = useMemo(() => buildActivityStats(journalRecords, insightScope, now, selectedYear), [journalRecords, insightScope, now, selectedYear]);
  const dreamStats = useMemo(() => buildActivityStats(dreamRecords, insightScope, now, selectedYear), [dreamRecords, insightScope, now, selectedYear]);
  const wisdomStats = useMemo(() => buildActivityStats(wisdomRecords, insightScope, now, selectedYear), [wisdomRecords, insightScope, now, selectedYear]);
  const starStats = useMemo(() => buildActivityStats(highlightRecords, insightScope, now, selectedYear), [highlightRecords, insightScope, now, selectedYear]);
  const ideaStats = useMemo(() => buildActivityStats(ideaRecords, insightScope, now, selectedYear), [ideaRecords, insightScope, now, selectedYear]);

  const journalHeatmap = useMemo(() => getHeatmapData(journalRecords, insightScope, now, selectedYear), [journalRecords, insightScope, now, selectedYear]);
  const dreamHeatmap = useMemo(() => getHeatmapData(dreamRecords, insightScope, now, selectedYear), [dreamRecords, insightScope, now, selectedYear]);
  const wisdomHeatmap = useMemo(() => getHeatmapData(wisdomRecords, insightScope, now, selectedYear), [wisdomRecords, insightScope, now, selectedYear]);
  const starHeatmap = useMemo(() => getHeatmapData(highlightRecords, insightScope, now, selectedYear), [highlightRecords, insightScope, now, selectedYear]);
  const ideaHeatmap = useMemo(() => getHeatmapData(ideaRecords, insightScope, now, selectedYear), [ideaRecords, insightScope, now, selectedYear]);

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
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-5xl font-bold font-sans text-[#2F3331] mb-2">
              insights
            </h1>
            <p className="text-[#6F7476] font-light">your writing journey in numbers</p>
          </div>
          <div className="relative pt-2">
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

      {/* Tab Navigation (Styled exactly like Collections) */}
      <div className="max-w-[600px] mx-auto px-6 mb-6">
        <div className="flex items-center gap-1 rounded-full bg-white/80 p-1 shadow-sm ring-1 ring-[#EEF0EF]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex h-9 min-w-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold transition-all duration-300 ease-out ${
                  isActive
                    ? 'flex-[2.35] bg-[#00DC7D] px-2.5 text-white shadow-sm'
                    : 'flex-1 px-0 text-[#6F7476] hover:bg-[#F2F2F3] hover:text-[#2F3331]'
                }`}
                title={tab.label}
                aria-label={tab.label}
              >
                <FontAwesomeIcon icon={Icon} className="h-4 w-4 shrink-0" />
                <span
                  className={`overflow-hidden whitespace-nowrap text-xs transition-all duration-300 ease-out ${
                    isActive ? 'ml-1.5 max-w-[72px] translate-x-0 opacity-100' : 'ml-0 max-w-0 -translate-x-2 opacity-0'
                  }`}
                >
                  {tab.label}
                </span>
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
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-white dark:bg-[#1E2022] rounded-2xl p-3 border border-[#CCD0CF] dark:border-[#2E3133] shadow-sm flex flex-col justify-between h-[82px] relative overflow-hidden">
                <span className="text-xl font-bold text-[#2F3331] dark:text-[#FAFAFA] tracking-tight">{scopedEntries.length}</span>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-[#6F7476] dark:text-[#A3A7A8] leading-tight">entries</span>
                  <span className="text-[8px] text-[#A3A7A8] dark:text-[#6F7476] leading-none mt-0.5">{scopeLabel}</span>
                </div>
              </div>
              <div className="bg-white dark:bg-[#1E2022] rounded-2xl p-3 border border-[#CCD0CF] dark:border-[#2E3133] shadow-sm flex flex-col justify-between h-[82px] relative overflow-hidden">
                <span className="text-xl font-bold text-[#2F3331] dark:text-[#FAFAFA] tracking-tight">{scopedBulletCount}</span>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-[#6F7476] dark:text-[#A3A7A8] leading-tight">bullets</span>
                  <span className="text-[8px] text-[#A3A7A8] dark:text-[#6F7476] leading-none mt-0.5">{scopeLabel}</span>
                </div>
              </div>
              <div className="bg-white dark:bg-[#1E2022] rounded-2xl p-3 border border-[#CCD0CF] dark:border-[#2E3133] shadow-sm flex flex-col justify-between h-[82px] relative overflow-hidden">
                <span className="text-xl font-bold text-[#2F3331] dark:text-[#FAFAFA] tracking-tight">{journalAge}</span>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-[#6F7476] dark:text-[#A3A7A8] leading-tight">journal age</span>
                  <span className="text-[8px] text-[#A3A7A8] dark:text-[#6F7476] leading-none mt-0.5">days</span>
                </div>
              </div>
              <div className="bg-white dark:bg-[#1E2022] rounded-2xl p-3 border border-[#CCD0CF] dark:border-[#2E3133] shadow-sm flex flex-col justify-between h-[82px] relative overflow-hidden">
                <span className="text-xl font-bold text-[#2F3331] dark:text-[#FAFAFA] tracking-tight">{wordsPerDay}</span>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-[#6F7476] dark:text-[#A3A7A8] leading-tight">avg words</span>
                  <span className="text-[8px] text-[#A3A7A8] dark:text-[#6F7476] leading-none mt-0.5">/ day</span>
                </div>
              </div>
            </div>

            {/* Advanced Metrics / Detailed Stats Card */}
            <div className="bg-white dark:bg-[#1E2022] rounded-3xl p-5 border border-[#CCD0CF] dark:border-[#2E3133] shadow-sm">
              <h3 className="font-bold text-[#2F3331] dark:text-[#FAFAFA] text-sm flex items-center gap-2 mb-4">
                <FontAwesomeIcon icon={faChartLine} className="text-[#00DC7D]" />
                <span>journal stats detail</span>
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#6F7476] dark:text-[#A3A7A8] font-light">Journal age</span>
                  <span className="font-semibold text-[#2F3331] dark:text-[#FAFAFA]">{journalAge} days</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#6F7476] dark:text-[#A3A7A8] font-light">Words</span>
                  <div className="text-right">
                    <span className="font-semibold text-[#2F3331] dark:text-[#FAFAFA]">{scopedWordCount} total</span>
                    <span className="text-[10px] text-[#A3A7A8] dark:text-[#6F7476] ml-2">({wordsPerDayDecimal} / day)</span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#6F7476] dark:text-[#A3A7A8] font-light">Highlight rate</span>
                  <span className="font-semibold text-[#2F3331] dark:text-[#FAFAFA]">{highlightRate}% of entries</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#6F7476] dark:text-[#A3A7A8] font-light">Writing frequency</span>
                  <span className="font-semibold text-[#2F3331] dark:text-[#FAFAFA]">{writingFrequencyPerWeek} entries / week</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#6F7476] dark:text-[#A3A7A8] font-light">Bullet rate</span>
                  <span className="font-semibold text-[#2F3331] dark:text-[#FAFAFA]">{bulletRate} / entry</span>
                </div>
              </div>
            </div>

            <ActivityHeatmap
              title={heatmapTitle}
              data={journalHeatmap}
              color="#00DC7D"
            />

            {/* Word Count Timeline Chart */}
            <WordCountTimelineChart entries={scopedEntries} />

            {/* Daytime Distribution Chart */}
            <DaytimeDistributionChart entries={scopedEntries} />

            {/* Weekday Distribution Chart */}
            <WeekdayChart
              title="weekday distribution"
              counts={journalStats.weekdays}
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
                      badge.isFullyUnlocked || (badge.id.startsWith('streak_') && badge.isUnlocked)
                        ? 'bg-[#E9FFF4] text-[#00A963]'
                        : badge.isUnlocked
                        ? 'bg-[#E6F0FF] text-[#5D8AFF]'
                        : 'bg-[#EEF0EF] text-[#6F7476]'
                    }`}>
                      {badge.isFullyUnlocked || (badge.id.startsWith('streak_') && badge.isUnlocked)
                        ? 'Completed! 🎉'
                        : badge.isUnlocked
                        ? `Tier ${badge.tierLabel} Unlocked! (${badge.progressText})`
                        : badge.progressText
                      }
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
            <WeekdayChart
              title="weekday distribution"
              counts={dreamStats.weekdays}
            />
          </div>
        )}

        {activeTab === 'stars' && (
          <div className="space-y-8">
            <MetricChips
              items={[
                { label: 'stars', value: starStats.scopedRecords.length, color: '#FF9933' },
                { label: 'avg / week', value: starStats.averagePerWeek.toFixed(1), color: '#2F3331' },
                { label: 'stars this month', value: starStats.thisMonthCount, color: '#6F7476' },
              ]}
            />
            <ActivityHeatmap
              title={heatmapTitle}
              data={starHeatmap}
              color="#FF9933"
            />
            <InsightLines lines={getInsightSentences('stars', starStats, starStats.scopedRecords.length)} />
            <BarChart
              title="monthly variation"
              rows={starStats.months.map(item => ({ label: formatChartMonth(item.month, starStats.months.length), value: item.count }))}
              max={starStats.maxMonth}
              color="#FF9933"
            />
            <WeekdayChart
              title="weekday distribution"
              counts={starStats.weekdays}
            />
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
            <WeekdayChart
              title="weekday distribution"
              counts={wisdomStats.weekdays}
            />
          </div>
        )}

        {activeTab === 'ideas' && (
          <div className="space-y-8">
            <MetricChips
              items={[
                { label: 'ideas', value: ideaStats.scopedRecords.length, color: '#FFCC33' },
                { label: 'avg / week', value: ideaStats.averagePerWeek.toFixed(1), color: '#2F3331' },
                { label: 'ideas this month', value: ideaStats.thisMonthCount, color: '#6F7476' },
              ]}
            />
            <ActivityHeatmap
              title={heatmapTitle}
              data={ideaHeatmap}
              color="#FFCC33"
            />
            <InsightLines lines={getInsightSentences('ideas', ideaStats, ideaStats.scopedRecords.length)} />
            <BarChart
              title="monthly variation"
              rows={ideaStats.months.map(item => ({ label: formatChartMonth(item.month, ideaStats.months.length), value: item.count }))}
              max={ideaStats.maxMonth}
              color="#FFCC33"
            />
            <WeekdayChart
              title="weekday distribution"
              counts={ideaStats.weekdays}
            />
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

function WeekdayChart({
  title,
  counts,
}: {
  title: string;
  counts: number[];
}) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const maxVal = Math.max(...counts, 1);

  return (
    <div className="bg-white dark:bg-[#1E2022] rounded-3xl p-5 border border-[#CCD0CF] dark:border-[#2E3133] shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[#2F3331] dark:text-[#FAFAFA] text-sm flex items-center gap-2">
          <FontAwesomeIcon icon={faCalendar} className="text-[#00DC7D]" />
          <span>{title}</span>
        </h3>
        <div className="flex items-center gap-3 text-[9px] font-bold text-[#6F7476] dark:text-[#A3A7A8]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#3B82F6' }}></span>
            Weekday
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#F97316' }}></span>
            Weekend
          </span>
        </div>
      </div>
      
      <div className="flex gap-2 items-end w-full">
        {counts.map((val, i) => {
          const isWeekend = i === 0 || i === 6;
          const barColor = isWeekend ? '#F97316' : '#3B82F6';
          const barBg = isWeekend ? 'rgba(249,115,22,0.1)' : 'rgba(59,130,246,0.1)';
          const heightPct = Math.round((val / maxVal) * 100);
          
          return (
            <div key={i} className="flex flex-col items-center gap-1" style={{ flex: 1 }}>
              <span 
                className="text-[9px] font-bold" 
                style={{ color: val > 0 ? barColor : '#CBD5E1' }}
              >
                {val > 0 ? val : '-'}
              </span>
              <div 
                className="w-full rounded-t-md flex items-end" 
                style={{ height: '80px', backgroundColor: barBg }}
              >
                <div 
                  className="w-full rounded-t-md transition-all duration-300" 
                  style={{ 
                    height: `${Math.max(heightPct, val > 0 ? 4 : 0)}%`, 
                    backgroundColor: val > 0 ? barColor : 'transparent' 
                  }}
                />
              </div>
              <span className="text-[9px] font-bold text-gray-400 dark:text-[#A3A7A8]">
                {dayNames[i]}
              </span>
            </div>
          );
        })}
      </div>
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

const getEntryHour = (entry: Entry): number => {
  let dateObj: Date | null = null;
  
  if (entry.createdAt) {
    if (entry.createdAt instanceof Date) {
      dateObj = entry.createdAt;
    } else if (typeof entry.createdAt === 'string') {
      dateObj = parseISO(entry.createdAt);
    } else if (typeof entry.createdAt === 'object' && entry.createdAt !== null) {
      const ts = entry.createdAt as any;
      if (typeof ts.toDate === 'function') {
        dateObj = ts.toDate();
      } else if (ts.seconds !== undefined) {
        dateObj = new Date(ts.seconds * 1000);
      }
    }
  }
  
  if (!dateObj && entry.date) {
    dateObj = parseISO(entry.date);
  }
  
  return dateObj ? dateObj.getHours() : 12;
};

function WordCountTimelineChart({
  entries,
}: {
  entries: Entry[];
}) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const dailyData = sorted.map(entry => {
    const dreamWords = entry.dream ? entry.dream.trim().split(/\s+/).filter(Boolean).length : 0;
    const bulletWords = entry.bullets.reduce((sum, b) => sum + b.text.trim().split(/\s+/).filter(Boolean).length, 0);
    const totalWords = dreamWords + bulletWords;
    return {
      date: parseISO(entry.date),
      count: totalWords,
    };
  });

  const shouldGroupByMonth = dailyData.length > 30;
  
  let data: Array<{ label: string; count: number }> = [];
  
  if (shouldGroupByMonth) {
    const groups: { [key: string]: { label: string; count: number } } = {};
    dailyData.forEach(item => {
      const monthKey = format(item.date, 'yyyy-MM');
      const label = format(item.date, 'MMM yy');
      if (!groups[monthKey]) {
        groups[monthKey] = { label, count: 0 };
      }
      groups[monthKey].count += item.count;
    });
    data = Object.keys(groups)
      .sort()
      .map(key => groups[key]);
  } else {
    data = dailyData.map(item => ({
      label: format(item.date, 'd MMM'),
      count: item.count,
    }));
  }
  
  const maxVal = Math.max(...data.map(d => d.count), 1);
  
  // Chart dimensions
  const height = 180;
  const paddingTop = 25;
  const paddingBottom = 25;
  const paddingLeft = 35; // a bit more padding on left for larger numbers (e.g. monthly totals)
  const paddingRight = 30;
  
  const stepWidth = 55;
  const width = Math.max(500, data.length * stepWidth);
  
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  
  // Compute coordinates for data points
  const points = data.map((item, i) => {
    const x = paddingLeft + (i / Math.max(1, data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - (item.count / maxVal) * chartHeight;
    return { ...item, x, y };
  });
  
  // Generate the line path
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  
  // Generate the closed area path
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
    : '';

  return (
    <div className="bg-white dark:bg-[#1E2022] rounded-3xl p-5 border border-[#CCD0CF] dark:border-[#2E3133] shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[#2F3331] dark:text-[#FAFAFA] text-sm flex items-center gap-2">
          <FontAwesomeIcon icon={faChartLine} className="text-[#00DC7D]" />
          <span>word count timeline {shouldGroupByMonth ? '(monthly)' : '(daily)'}</span>
        </h3>
      </div>
      
      {data.length === 0 ? (
        <p className="text-xs text-[#A3A7A8] dark:text-[#6F7476] text-center py-6">No data in this period</p>
      ) : (
        <div className="overflow-x-auto pb-2 scrollbar-thin">
          <div style={{ width: `${width}px` }} className="relative h-[180px]">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00DC7D" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#00DC7D" stopOpacity="0.00" />
                </linearGradient>
              </defs>
              
              {/* Horizontal gridlines */}
              {[0, 0.5, 1].map((ratio, index) => {
                const y = paddingTop + chartHeight - ratio * chartHeight;
                const gridVal = Math.round(ratio * maxVal);
                return (
                  <g key={index}>
                    <line 
                      x1={paddingLeft} 
                      y1={y} 
                      x2={width - paddingRight} 
                      y2={y} 
                      stroke="#EEF0EF" 
                      className="stroke-[#EEF0EF] dark:stroke-[#2E3133]"
                      strokeDasharray="4 4" 
                    />
                    <text 
                      x={paddingLeft - 8} 
                      y={y + 3} 
                      textAnchor="end" 
                      className="text-[8px] font-bold fill-gray-400 dark:fill-[#6F7476]"
                    >
                      {gridVal >= 1000 ? `${(gridVal / 1000).toFixed(1)}k` : gridVal}
                    </text>
                  </g>
                );
              })}
              
              {/* Area path */}
              {areaPath && (
                <path d={areaPath} fill="url(#areaGradient)" />
              )}
              
              {/* Line path */}
              {linePath && (
                <path 
                  d={linePath} 
                  fill="none" 
                  stroke="#00DC7D" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />
              )}
              
              {/* Points, values and date text */}
              {points.map((item, i) => (
                <g key={i}>
                  <circle 
                    cx={item.x} 
                    cy={item.y} 
                    r="5" 
                    fill="white" 
                    stroke="#00DC7D" 
                    strokeWidth="1.5" 
                    className="fill-white dark:fill-[#1E2022]"
                  />
                  <circle 
                    cx={item.x} 
                    cy={item.y} 
                    r="2" 
                    fill="#00DC7D" 
                  />
                  <text 
                    x={item.x} 
                    y={item.y - 8} 
                    textAnchor="middle" 
                    className="text-[9px] font-extrabold fill-[#00DC7D]"
                  >
                    {item.count >= 1000 ? `${(item.count / 1000).toFixed(1)}k` : item.count}
                  </text>
                  <text 
                    x={item.x} 
                    y={paddingTop + chartHeight + 15} 
                    textAnchor="middle" 
                    className="text-[8px] font-bold fill-gray-400 dark:fill-[#A3A7A8]"
                  >
                    {item.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

function DaytimeDistributionChart({
  entries,
}: {
  entries: Entry[];
}) {
  const counts = {
    Morning: 0,
    Afternoon: 0,
    Evening: 0,
    Night: 0,
  };
  
  entries.forEach(entry => {
    const hour = getEntryHour(entry);
    if (hour >= 6 && hour < 12) {
      counts.Morning++;
    } else if (hour >= 12 && hour < 18) {
      counts.Afternoon++;
    } else if (hour >= 18 && hour < 24) {
      counts.Evening++;
    } else {
      counts.Night++;
    }
  });

  const items = [
    { label: 'Morning', sub: '6am - 12pm', count: counts.Morning, color: '#3B82F6', icon: faSun },
    { label: 'Afternoon', sub: '12pm - 6pm', count: counts.Afternoon, color: '#FFB800', icon: faSun },
    { label: 'Evening', sub: '6pm - 12am', count: counts.Evening, color: '#F97316', icon: faSun },
    { label: 'Night', sub: '12am - 6am', count: counts.Night, color: '#8B00D4', icon: faMoon },
  ];
  
  const maxVal = Math.max(...items.map(c => c.count), 1);
  
  return (
    <div className="bg-white dark:bg-[#1E2022] rounded-3xl p-5 border border-[#CCD0CF] dark:border-[#2E3133] shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[#2F3331] dark:text-[#FAFAFA] text-sm flex items-center gap-2">
          <FontAwesomeIcon icon={faClock} className="text-[#00DC7D]" />
          <span>daytime distribution</span>
        </h3>
      </div>
      
      <div className="grid grid-cols-4 gap-2 items-end w-full">
        {items.map((item, i) => {
          const heightPct = Math.round((item.count / maxVal) * 100);
          
          return (
            <div key={i} className="flex flex-col items-center gap-1" style={{ flex: 1 }}>
              <span 
                className="text-[9px] font-bold" 
                style={{ color: item.count > 0 ? item.color : '#CBD5E1' }}
              >
                {item.count > 0 ? item.count : '-'}
              </span>
              <div 
                className="w-full rounded-t-md flex items-end" 
                style={{ height: '80px', backgroundColor: `${item.color}15` }}
              >
                <div 
                  className="w-full rounded-t-md transition-all duration-300" 
                  style={{ 
                    height: `${Math.max(heightPct, item.count > 0 ? 4 : 0)}%`, 
                    backgroundColor: item.count > 0 ? item.color : 'transparent' 
                  }}
                />
              </div>
              <span className="text-[10px] font-bold text-[#2F3331] dark:text-[#FAFAFA] mt-1">
                <FontAwesomeIcon icon={item.icon} style={{ color: item.count > 0 ? item.color : '#CBD5E1' }} className="w-3.5 h-3.5" />
              </span>
              <span className="text-[9px] font-bold text-gray-500 dark:text-[#A3A7A8] mt-0.5">
                {item.label}
              </span>
              <span className="text-[7px] text-gray-400 dark:text-[#6F7476] text-center leading-none">
                {item.sub}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
