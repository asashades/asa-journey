'use client';

import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from 'date-fns';
import {
  ChartBarIcon,
  CalendarIcon,
  FireIcon,
  StarIcon,
  TagIcon,
  AtSymbolIcon,
  BookOpenIcon,
  SparklesIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';

type InsightTab = 'journal' | 'dreams' | 'highlights' | 'tags' | 'people' | 'wisdom' | 'ideas';

export default function InsightsPage() {
  const {
    entries,
    highlights,
    tags,
    people,
    wisdoms,
    ideas,
    totalEntries,
    totalBullets,
    totalHighlights,
    totalTags,
    totalMentions,
    currentStreak,
    longestStreak,
  } = useData();

  const [activeTab, setActiveTab] = useState<InsightTab>('journal');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  const tabs: { id: InsightTab; label: string; icon: React.ElementType }[] = [
    { id: 'journal', label: 'Journal', icon: BookOpenIcon },
    { id: 'dreams', label: 'Dreams', icon: CalendarIcon },
    { id: 'highlights', label: 'Highlights', icon: StarIcon },
    { id: 'tags', label: 'Tags', icon: TagIcon },
    { id: 'people', label: 'People', icon: AtSymbolIcon },
    { id: 'wisdom', label: 'Wisdom', icon: SparklesIcon },
    { id: 'ideas', label: 'Ideas', icon: LightBulbIcon },
  ];

  const now = new Date();
  const rangeStart = timeRange === 'week' ? subDays(now, 7) : timeRange === 'month' ? subDays(now, 30) : subDays(now, 365);
  const rangeEntries = entries.filter(e => parseISO(e.date) >= rangeStart);

  // Calculate heatmap data (last 30 days)
  const last30Days = eachDayOfInterval({ start: subDays(now, 29), end: now });
  const heatmapData = last30Days.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const entry = entries.find(e => e.date === dateStr);
    return {
      date: dateStr,
      count: entry?.bullets.length || 0,
      intensity: entry ? Math.min(entry.bullets.length / 5, 1) : 0,
    };
  });

  // Words per day calculation
  const wordsPerDay = rangeEntries.length > 0
    ? Math.round(rangeEntries.reduce((sum, e) => sum + e.bullets.reduce((s, b) => s + b.text.split(' ').length, 0), 0) / rangeEntries.length)
    : 0;

  // Writing frequency
  const writingFrequency = rangeEntries.length > 0
    ? (rangeEntries.length / (timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365) * 100).toFixed(0)
    : '0';

  // Average bullets per entry
  const avgBulletsPerEntry = totalEntries > 0
    ? (totalBullets / totalEntries).toFixed(1)
    : '0';

  // Journal age (days since first entry)
  const firstEntry = entries[entries.length - 1];
  const journalAge = firstEntry
    ? Math.floor((now.getTime() - parseISO(firstEntry.date).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">insights</h1>
        <p className="text-[#8B8AA0]">your writing journey in numbers</p>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2 mb-6">
        {(['week', 'month', 'year'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === range
                ? 'bg-[#C049FF] text-white'
                : 'bg-[#2F2B3A] text-[#8B8AA0] hover:text-white'
            }`}
          >
            {range}
          </button>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-[#1E1A2B] text-[#C049FF] border border-[#C049FF]'
                : 'bg-[#1E1A2B] text-[#8B8AA0] border border-[#4A4560] hover:border-[#8B8AA0]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'journal' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#1E1A2B] rounded-xl p-4 border border-[#4A4560]">
              <p className="text-3xl font-bold">{totalEntries}</p>
              <p className="text-sm text-[#8B8AA0]">total entries</p>
            </div>
            <div className="bg-[#1E1A2B] rounded-xl p-4 border border-[#4A4560]">
              <p className="text-3xl font-bold">{totalBullets}</p>
              <p className="text-sm text-[#8B8AA0]">total bullets</p>
            </div>
            <div className="bg-[#1E1A2B] rounded-xl p-4 border border-[#4A4560]">
              <p className="text-3xl font-bold">{journalAge}</p>
              <p className="text-sm text-[#8B8AA0]">journal age (days)</p>
            </div>
            <div className="bg-[#1E1A2B] rounded-xl p-4 border border-[#4A4560]">
              <p className="text-3xl font-bold">{wordsPerDay}</p>
              <p className="text-sm text-[#8B8AA0]">avg words/day</p>
            </div>
          </div>

          {/* Heatmap */}
          <div className="bg-[#1E1A2B] rounded-xl p-4 border border-[#4A4560]">
            <h3 className="font-semibold mb-4">30-day heatmap</h3>
            <div className="grid grid-cols-7 gap-1">
              {heatmapData.map((day) => {
                const intensity = day.intensity;
                const bgColor = intensity > 0
                  ? `rgba(192, 73, 255, ${0.2 + intensity * 0.8})`
                  : '#1E1A2B';
                return (
                  <div
                    key={day.date}
                    className="w-8 h-8 rounded-sm"
                    style={{ backgroundColor: bgColor }}
                    title={`${day.date}: ${day.count} bullets`}
                  />
                );
              })}
            </div>
            <div className="flex justify-end mt-2 gap-1">
              <span className="text-xs text-[#4A4560]">less</span>
              {[0, 0.25, 0.5, 0.75, 1].map((level) => (
                <div
                  key={level}
                  className="w-4 h-4 rounded-sm"
                  style={{ backgroundColor: `rgba(192, 73, 255, ${0.2 + level * 0.8})` }}
                />
              ))}
              <span className="text-xs text-[#4A4560]">more</span>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-[#1E1A2B] rounded-xl p-4 border border-[#4A4560]">
            <h3 className="font-semibold mb-4">key stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-[#8B8AA0]">entries this {timeRange}</span>
                <span className="font-medium">{rangeEntries.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8B8AA0]">bullet rate per entry</span>
                <span className="font-medium">{avgBulletsPerEntry}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8B8AA0]">writing frequency</span>
                <span className="font-medium">{writingFrequency}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8B8AA0]">current streak</span>
                <span className="font-medium text-[#F97316]">{currentStreak}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8B8AA0]">longest streak</span>
                <span className="font-medium text-[#F97316]">{longestStreak}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'dreams' && (
        <div className="space-y-6">
          <div className="bg-[#1E1A2B] rounded-xl p-4 border border-[#4A4560]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#F59E0B]/20 flex items-center justify-center">
                <span className="text-2xl">🌙</span>
              </div>
              <div>
                <p className="text-2xl font-bold">{entries.filter(e => e.dream).length}</p>
                <p className="text-sm text-[#8B8AA0]">dreams logged</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'highlights' && (
        <div className="space-y-6">
          <div className="bg-[#1E1A2B] rounded-xl p-4 border border-[#4A4560]">
            <h3 className="font-semibold mb-4">total highlights</h3>
            <p className="text-3xl font-bold">{totalHighlights}</p>
          </div>
          <div className="space-y-2">
            {highlights.slice(0, 10).map((h) => (
              <div key={h.id} className="bg-[#1E1A2B] rounded-lg p-3 border border-[#C049FF]/30">
                <p className="text-white text-sm">{h.content}</p>
                <p className="text-xs text-[#4A4560] mt-1">{format(h.createdAt, 'MMM d, yyyy')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'tags' && (
        <div className="space-y-6">
          <div className="bg-[#1E1A2B] rounded-xl p-4 border border-[#4A4560]">
            <h3 className="font-semibold mb-2">total tags</h3>
            <p className="text-3xl font-bold">{totalTags}</p>
          </div>
          <div className="space-y-2">
            {tags.slice(0, 20).sort((a, b) => b.count - a.count).map((tag) => (
              <div key={tag.id} className="bg-[#1E1A2B] rounded-lg p-3 border border-[#4A4560] flex justify-between items-center">
                <span className="text-[#3B82F6]">#{tag.name}</span>
                <span className="text-sm text-[#8B8AA0]">{tag.count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'people' && (
        <div className="space-y-6">
          <div className="bg-[#1E1A2B] rounded-xl p-4 border border-[#4A4560]">
            <h3 className="font-semibold mb-2">total mentions</h3>
            <p className="text-3xl font-bold">{totalMentions}</p>
          </div>
          <div className="space-y-2">
            {people.slice(0, 20).sort((a, b) => b.mentions - a.mentions).map((person) => (
              <div key={person.id} className="bg-[#1E1A2B] rounded-lg p-3 border border-[#4A4560] flex justify-between items-center">
                <span className="text-[#F97316]">@{person.name}</span>
                <span className="text-sm text-[#8B8AA0]">{person.mentions}x</span>

              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'wisdom' && (
        <div className="space-y-6">
          <div className="bg-[#1E1A2B] rounded-xl p-4 border border-[#4A4560]">
            <h3 className="font-semibold mb-2">total wisdoms</h3>
            <p className="text-3xl font-bold">{wisdoms.length}</p>
          </div>
          <div className="space-y-2">
            {wisdoms.slice(0, 10).map((w) => (
              <div key={w.id} className="bg-[#1E1A2B] rounded-lg p-3 border border-[#3B82F6]/30">
                <span className="text-xs text-[#3B82F6] uppercase">{w.type}</span>
                <p className="text-white text-sm mt-1">{w.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'ideas' && (
        <div className="space-y-6">
          <div className="bg-[#1E1A2B] rounded-xl p-4 border border-[#4A4560]">
            <h3 className="font-semibold mb-2">total ideas</h3>
            <p className="text-3xl font-bold">{ideas.length}</p>
          </div>
          <div className="space-y-2">
            {ideas.slice(0, 10).map((idea) => (
              <div key={idea.id} className="bg-[#1E1A2B] rounded-lg p-3 border border-[#F97316]/30">
                <p className="text-white text-sm">{idea.content}</p>
                <p className="text-xs text-[#4A4560] mt-1">{format(idea.createdAt, 'MMM d, yyyy')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
