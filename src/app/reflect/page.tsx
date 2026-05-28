'use client';

import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays, startOfWeek, addDays, parseISO, isAfter } from 'date-fns';
import {
  SparklesIcon,
  LightBulbIcon,
  FireIcon,
  BookOpenIcon,
  CalendarIcon,
  ChevronRightIcon,
  BoltIcon,
  ChatBubbleBottomCenterTextIcon,
  InformationCircleIcon,
  BookmarkIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';

const wisdomIcons: Record<string, React.ElementType> = {
  thought: BoltIcon,
  quote: ChatBubbleBottomCenterTextIcon,
  fact: InformationCircleIcon,
  excerpt: BookmarkIcon,
  lesson: AcademicCapIcon,
};

export default function ReflectPage() {
  const { user } = useAuth();
  const {
    wisdoms,
    ideas,
    entries,
    goals,
    getWisdomOfTheDay,
    getIdeaOfTheDay,
    currentStreak,
    longestStreak,
  } = useData();

  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'goals'>('today');

  const wisdomOfTheDay = getWisdomOfTheDay();
  const ideaOfTheDay = getIdeaOfTheDay();
  const today = new Date();

  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const thisWeekEntries = entries.filter(e => {
    const entryDate = parseISO(e.date);
    return entryDate >= thisWeekStart && entryDate <= today;
  });

  const throwbackDate = subDays(today, 365);
  const throwbackEntry = entries.find(e => e.date === format(throwbackDate, 'yyyy-MM-dd'));

  const firstEntry = entries[entries.length - 1];
  const journalAge = firstEntry
    ? Math.floor((today.getTime() - parseISO(firstEntry.date).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const tabs = [
    { id: 'today' as const, label: 'today' },
    { id: 'week' as const, label: 'this week' },
    { id: 'goals' as const, label: 'focus' },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-6 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">reflect</h1>
        <p className="text-[#8B8AA0]">take 5 min to check in with yourself</p>
      </div>

      {/* Streak Display */}
      <div className="bg-[#1E1A2B] rounded-xl p-4 border border-[#4A4560] mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FireIcon className={`w-6 h-6 ${currentStreak > 0 ? 'text-[#F97316]' : 'text-[#4A4560]'}`} />
            <div>
              <p className="font-bold">{currentStreak} day streak</p>
              <p className="text-xs text-[#8B8AA0]">highest: {longestStreak} days</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-[#8B8AA0]">journal age</p>
            <p className="font-semibold">{journalAge} days</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'gradient-brand text-white'
                : 'bg-[#2F2B3A] text-[#8B8AA0] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'today' && (
        <div className="space-y-6">
          {/* Gem of the Day */}
          {wisdomOfTheDay ? (
            <div className="bg-[#1E1A2B] rounded-xl p-4 border border-[#3B82F6]/30">
              <div className="flex items-center gap-2 mb-3">
                <SparklesIcon className="w-5 h-5 text-[#C049FF]" />
                <span className="text-sm text-[#8B8AA0]">gem of the day</span>
              </div>
              <div className="flex gap-3">
                {(() => {
                  const Icon = wisdomIcons[wisdomOfTheDay.type] || SparklesIcon;
                  return <Icon className="w-8 h-8 text-[#3B82F6] flex-shrink-0" />;
                })()}
                <div>
                  <span className="text-xs text-[#3C82F6] uppercase">{wisdomOfTheDay.type}</span>
                  <p className="text-white mt-1">{wisdomOfTheDay.content}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#1E1A2B] rounded-xl p-4 border border-dashed border-[#4A4560]">
              <div className="flex items-center gap-2 mb-2">
                <SparklesIcon className="w-5 h-5 text-[#4A4560]" />
                <span className="text-sm text-[#8B8AA0]">gem of the day</span>
              </div>
              <p className="text-sm text-[#4A4560]">no wisdom captured yet today</p>
            </div>
          )}

          {/* Idea of the Day */}
          {ideaOfTheDay ? (
            <div className="bg-[#1E1A2B] rounded-xl p-4 border border-[#F97316]/30">
              <div className="flex items-center gap-2 mb-3">
                <LightBulbIcon className="w-5 h-5 text-[#F97316]" />
                <span className="text-sm text-[#8B8AA0]">idea of the day</span>
              </div>
              <p className="text-white">{ideaOfTheDay.content}</p>
            </div>
          ) : (
            <div className="bg-[#1E1A2B] rounded-xl p-4 border border-dashed border-[#4A4560]">
              <div className="flex items-center gap-2 mb-2">
                <LightBulbIcon className="w-5 h-5 text-[#4A4560]" />
                <span className="text-sm text-[#8B8AA0]">idea of the day</span>
              </div>
              <p className="text-sm text-[#4A4560]">no ideas captured yet today</p>
            </div>
          )}

          {/* Yesterday Review */}
          {thisWeekEntries.length > 0 && thisWeekEntries[0] && (
            <div className="bg-[#1E1A2B] rounded-xl p-4 border border-[#4A4560]">
              <div className="flex items-center gap-2 mb-3">
                <BookOpenIcon className="w-5 h-5 text-[#8B8AA0]" />
                <span className="text-sm text-[#8B8AA0]">yesterday's thoughts</span>
              </div>
              {thisWeekEntries[0].bullets.slice(0, 2).map((bullet, i) => (
                <p key={i} className="text-sm text-white mb-1">• {bullet.text}</p>
              ))}
              {thisWeekEntries[0].bullets.length === 0 && (
                <p className="text-sm text-[#4A4560]">no thoughts yesterday</p>
              )}
            </div>
          )}

          {/* Throwback - 1 Year Ago */}
          {throwbackEntry && (
            <div className="bg-[#1E1A2B] rounded-xl p-4 border border-[#C049FF]/30">
              <div className="flex items-center gap-2 mb-3">
                <CalendarIcon className="w-5 h-5 text-[#C049FF]" />
                <span className="text-sm text-[#8B8AA0]">flashback: 1 year ago</span>
              </div>
              <p className="text-xs text-[#8B8AA0] mb-2">
                {format(throwbackDate, 'MMM d, yyyy')}
              </p>
              {throwbackEntry.bullets.slice(0, 2).map((bullet, i) => (
                <p key={i} className="text-sm text-white mb-1">• {bullet.text}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'week' && (
        <div className="space-y-6">
          {/* This Week Summary */}
          <div className="bg-[#1E1A2B] rounded-xl p-4 border border-[#4A4560]">
            <h3 className="font-semibold mb-3">this week's recap</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold text-[#C049FF] z">{thisWeekEntries.length}</p>
                <p className="text-xs text-[#8B8AA0]">entries</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {thisWeekEntries.reduce((sum, e) => sum + e.bullets.length, 0)}
                </p>
                <p className="text-xs text-[#8B8AA0]">bullets</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#F59E0B]">
                  {entries.filter(e => {
                    const dateStr = format(parseISO(e.date), 'yyyy-MM-dd');
                    const weekStartStr = format(thisWeekStart, 'yyyy-MM-dd');
                    return dateStr >= weekStartStr && e.dream;
                  }).length}
                </p>
                <p className="text-xs text-[#8B8AA0]">dreams logged</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#22C55E]">
                  {wisdoms.filter(w => {
                    const dateStr = format(w.createdAt, 'yyyy-MM-dd');
                    const weekStartStr = format(thisWeekStart, 'yyyy-MM-dd');
                    return dateStr >= weekStartStr;
                  }).length}
                </p>
                <p className="text-xs text-[#8B8AA0]">wisdoms captured</p>
              </div>
            </div>
          </div>

          {/* Top Tags */}
          <div className="bg-[#1E1A2B] rounded-xl p-4 border border-[#4A4560]">
            <h3 className="font-semibold mb-3">trending tags</h3>
            <div className="flex flex-wrap gap-2">
              {/* Will implement tag extraction */}
              <span className="text-sm text-[#4A4560]">no tags yet</span>
            </div>
          </div>

          {/* Week's Highlights */}
          <div className="bg-[#1E1A2B] rounded-xl p-4 border border-[#4A4560]">
            <h3 className="font-semibold mb-3">week's highlights</h3>
            <div className="space-y-2">
              {thisWeekEntries.flatMap(e => e.bullets.filter(b => b.isHighlight)).slice(0, 5).map((bullet, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-[#C049FF]">*</span>
                  <span className="text-white">{bullet.text}</span>
                </div>
              ))}
              {thisWeekEntries.flatMap(e => e.bullets.filter(b => b.isHighlight)).length === 0 && (
                <p className="text-sm text-[#4A4560]">no highlights this week</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'goals' && (
        <div className="space-y-6">
          {/* Top Goals */}
          <div className="bg-[#1E1A2B] rounded-xl p-4 border border-[#4A4560]">
            <h3 className="font-semibold mb-3">top goals</h3>
            <div className="space-y-3">
              {goals.filter(g => !g.isCompleted).slice(0, 5).map((goal, i) => (
                <div key={goal.id} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#2F2B3A] flex items-center justify-center text-sm font-medium">
                    {i + 1}
                  </span>
                  <span className="text-white">{goal.content}</span>
                </div>
              ))}
              {goals.filter(g => !g.isCompleted).length === 0 && (
                <p className="text-sm text-[#4A4560]">no active goals</p>
              )}
            </div>
          </div>

          {/* Completed Goals */}
            {goals.filter(g => g.isCompleted).length > 0 && (
            <div className="bg-[#1E1A2B] rounded-xl p-4 border border-[#4A4560]">
              <h3 className="font-semibold mb-3 text-[#22C55E]">done</h3>
              <div className="space-y-2">
                {goals.filter(g => g.isCompleted).slice(0, 5).map((goal) => (
                  <div key={goal.id} className="flex items-center gap-3 text-sm">
                    <span className="text-[#22C55E]">✓</span>
                    <span className="text-[#8B8AA0] line-through">{goal.content}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => {/* Open add goal modal */}}
            className="w-full py-3 rounded-lg border border-dashed border-[#4A4560] text-[#8B8AA0] hover:border-[#C049FF] hover:text-[#C049FF] transition-colors"
          >
            + add a goal
          </button>
        </div>
      )}

      {/* Floating Wisdom Card */}
      <div className="fixed bottom-24 right-4 bg-[#1E1A2B] rounded-xl p-3 border border-[#4A4560] shadow-lg max-w-[200px]">
        <p className="text-sm italic text-[#8B8AA0]">
          "the unexamined life is not worth living"
        </p>
        <p className="text-xs text-[#4A4560] mt-1">— Socrates</p>
      </div>
    </div>
  );
}
