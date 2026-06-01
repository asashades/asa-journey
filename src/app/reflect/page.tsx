'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDays, format, parseISO, startOfWeek, subDays, subYears } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faBolt,
  faBookmark,
  faBookOpen,
  faCircleInfo,
  faDice,
  faGear,
  faLightbulb,
  faPlus,
  faQuoteLeft,
  faStar,
  faTag,
} from '@fortawesome/free-solid-svg-icons';
import { HighlightedText } from '@/components/ui/HighlightedText';
import { useData } from '@/contexts/DataContext';

const wisdomIcons: Record<string, IconDefinition> = {
  thought: faBolt,
  quote: faQuoteLeft,
  fact: faCircleInfo,
  excerpt: faBookmark,
  lesson: faBookOpen,
};

const wisdomIconStyles: Record<string, { bg: string; color: string }> = {
  thought: { bg: '#F0D6FF', color: '#8B00D4' },
  quote: { bg: '#D6E4FF', color: '#1A56C4' },
  fact: { bg: '#C8F7E4', color: '#00875A' },
  excerpt: { bg: '#FFE4B5', color: '#B45309' },
  lesson: { bg: '#EDD6FF', color: '#6B21A8' },
};

const sectionOptions = [
  { id: 'random', label: 'Random items' },
  { id: 'focus', label: 'Focus' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'This week' },
  { id: 'pins', label: 'Pins' },
  { id: 'yearAgo', label: 'One year ago' },
  { id: 'memory', label: 'Memory lane' },
] as const;

type SectionId = typeof sectionOptions[number]['id'];

const defaultSections: Record<SectionId, boolean> = {
  random: true,
  focus: true,
  yesterday: true,
  week: true,
  pins: true,
  yearAgo: true,
  memory: true,
};

export default function ReflectPage() {
  const router = useRouter();
  const {
    entries,
    goals,
    highlights,
    tags,
    people,
    wisdoms,
    ideas,
    getWisdomOfTheDay,
    getIdeaOfTheDay,
  } = useData();

  const [showSettings, setShowSettings] = useState(false);
  const [visibleSections, setVisibleSections] = useState(defaultSections);
  const [memoryOffset, setMemoryOffset] = useState(0);

  const today = new Date();
  const todayKey = format(today, 'yyyy-MM-dd');
  const yesterday = subDays(today, 1);
  const yesterdayKey = format(yesterday, 'yyyy-MM-dd');
  const yesterdayEntry = entries.find(entry => entry.date === yesterdayKey);
  const wisdomOfTheDay = getWisdomOfTheDay();
  const ideaOfTheDay = getIdeaOfTheDay();
  const thoughtIcon = wisdomOfTheDay ? wisdomIcons[wisdomOfTheDay.type] || faBolt : faBolt;
  const thoughtStyle = wisdomOfTheDay ? wisdomIconStyles[wisdomOfTheDay.type] || wisdomIconStyles.thought : wisdomIconStyles.thought;

  const activeGoals = goals
    .filter(goal => !goal.isCompleted)
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 5);

  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekStartKey = format(weekStart, 'yyyy-MM-dd');
  const weekHighlights = highlights
    .filter(highlight => highlight.entryDate >= weekStartKey && highlight.entryDate <= todayKey)
    .slice(0, 4);
  const weekWisdoms = wisdoms.filter(wisdom => {
    const date = wisdom.linkedEntryId || format(wisdom.createdAt, 'yyyy-MM-dd');
    return date >= weekStartKey && date <= todayKey;
  });
  const weekIdeas = ideas.filter(idea => {
    const linkedDate = idea.linkedEntries?.find(date => date >= weekStartKey && date <= todayKey);
    const date = linkedDate || format(idea.createdAt, 'yyyy-MM-dd');
    return date >= weekStartKey && date <= todayKey;
  });
  const weekTags = tags.filter(tag => format(tag.createdAt, 'yyyy-MM-dd') >= weekStartKey);
  const weekPeople = people.filter(person => format(person.createdAt, 'yyyy-MM-dd') >= weekStartKey);

  const topTags = useMemo(() => [...tags].sort((a, b) => b.count - a.count).slice(0, 3), [tags]);
  const pinDays = Array.from({ length: 30 }, (_, index) => {
    const date = addDays(subDays(today, 29), index);
    return { date, dateKey: format(date, 'yyyy-MM-dd') };
  });
  const oneYearDate = subYears(today, 1);
  const oneYearKey = format(oneYearDate, 'yyyy-MM-dd');
  const oneYearEntry = entries.find(entry => entry.date === oneYearKey);
  const memoryEntries = entries.filter(entry => entry.bullets.length > 0 || entry.dream).sort((a, b) => b.date.localeCompare(a.date));
  const memoryEntry = memoryEntries.length >= 10 ? memoryEntries[memoryOffset % memoryEntries.length] : null;

  const toggleSection = (section: SectionId) => {
    setVisibleSections(current => ({ ...current, [section]: !current[section] }));
  };

  const getTagTimeline = (tagName: string) => pinDays.map(day => ({
    ...day,
    active: entries.some(entry =>
      entry.date === day.dateKey && entry.bullets.some(bullet => bullet.tags.includes(tagName))
    ),
  }));

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="mx-auto max-w-[600px] px-6 pt-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-sans text-5xl font-bold tracking-normal text-[#2F3331]">Reflect</h1>
            <p className="mt-2 text-base font-light text-[#6F7476]">your entries, brought back into view</p>
          </div>
          <button
            onClick={() => setShowSettings(current => !current)}
            className="mt-1 flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#2F3331] shadow-sm ring-1 ring-[#CCD0CF] transition-colors hover:bg-[#F2F2F3]"
            title="reflect settings"
          >
            <FontAwesomeIcon icon={faGear} className="h-4 w-4" />
          </button>
        </div>

        {showSettings && (
          <div className="mt-6 grid grid-cols-2 gap-2 rounded-lg bg-[#F2F2F3] p-3">
            {sectionOptions.map(section => (
              <label key={section.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-[#2F3331]">
                <input
                  type="checkbox"
                  checked={visibleSections[section.id]}
                  onChange={() => toggleSection(section.id)}
                  className="accent-[#00DC7D]"
                />
                {section.label}
              </label>
            ))}
          </div>
        )}

        <main className="mt-14 space-y-14">
          {visibleSections.random && (
            <section className="space-y-8">
              {wisdomOfTheDay && (
                <button
                  onClick={() => router.push(`/collections?tab=wisdom&focus=${wisdomOfTheDay.id}`)}
                  className="block w-full text-left"
                >
                  <h2 className="mb-4 text-lg font-bold text-[#FFB95C]">Gem of the day</h2>
                  <div className="flex items-start gap-4">
                    <span
                      className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: thoughtStyle.bg, color: thoughtStyle.color }}
                    >
                      <FontAwesomeIcon icon={thoughtIcon} className="h-3.5 w-3.5" />
                    </span>
                    <p className="whitespace-pre-line text-lg font-light leading-8 text-[#2F3331]">
                      {wisdomOfTheDay.content}
                    </p>
                  </div>
                </button>
              )}

              {ideaOfTheDay && (
                <button
                  onClick={() => router.push(`/collections?tab=ideas&focus=${ideaOfTheDay.id}`)}
                  className="block w-full text-left"
                >
                  <h2 className="mb-4 text-lg font-bold text-[#FFB95C]">Idea of the day</h2>
                  <div className="flex items-start gap-4">
                    <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFE4B5] text-[#B45309]">
                      <FontAwesomeIcon icon={faLightbulb} className="h-3.5 w-3.5" />
                    </span>
                    <p className="text-lg font-light leading-8 text-[#2F3331]">
                      {ideaOfTheDay.content}
                    </p>
                  </div>
                </button>
              )}
            </section>
          )}

          {visibleSections.focus && (
            <section>
              <h2 className="mb-6 font-sans text-3xl font-bold tracking-normal text-[#2F3331]">Focus</h2>
              <div className="space-y-5">
                {activeGoals.length > 0 ? activeGoals.map((goal, index) => (
                  <div key={goal.id} className="flex items-start gap-4">
                    <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFF0F5] text-sm font-bold text-[#F3A7C1]">
                      {index + 1}
                    </span>
                    <p className="text-lg font-light leading-8 text-[#2F3331]">{goal.content}</p>
                  </div>
                )) : (
                  <p className="text-lg font-light italic text-[#74797B]">No focus item yet.</p>
                )}
              </div>
            </section>
          )}

          {visibleSections.yesterday && (
            <section>
              <h2 className="font-sans text-3xl font-bold tracking-normal text-[#2F3331]">Yesterday</h2>
              <p className="mt-1 text-base text-[#2F3331]">{format(yesterday, 'EEEE, MMMM d')}</p>

              {yesterdayEntry && yesterdayEntry.bullets.length > 0 ? (
                <div className="mt-6 space-y-4">
                  {yesterdayEntry.bullets.slice(0, 4).map((bullet) => (
                    <button
                      key={bullet.id}
                      onClick={() => router.push(`/write?date=${yesterdayKey}`)}
                      className="block w-full text-left text-base font-light leading-7 text-[#5D6264] transition-colors hover:text-[#2F3331]"
                    >
                      <HighlightedText text={bullet.text} interactive />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-6 text-lg italic text-[#74797B]">
                  There is no entry for {format(yesterday, 'MMMM d')} yet.
                </p>
              )}

              <button
                onClick={() => router.push(`/write?date=${yesterdayKey}`)}
                className="mt-6 inline-flex items-center gap-3 rounded-lg bg-[#F2F2F3] px-5 py-3 text-sm font-semibold text-[#2F3331] transition-colors hover:bg-[#E5E5E5]"
              >
                <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
                Write entry
              </button>
            </section>
          )}

          {visibleSections.week && (
            <section>
              <h2 className="mb-6 font-sans text-3xl font-bold tracking-normal text-[#2F3331]">This week</h2>
              <div className="space-y-4">
                {weekHighlights.map(highlight => (
                  <div key={highlight.id} className="flex items-start gap-4">
                    <FontAwesomeIcon icon={faStar} className="mt-1 h-4 w-4 shrink-0 text-[#FFB95C]" />
                    <div>
                      <p className="text-base font-light leading-7 text-[#2F3331]">{highlight.content}</p>
                      <p className="text-xs text-[#A3A7A8]">{format(parseISO(highlight.entryDate), 'MMM d')}</p>
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-4 pt-2 text-sm text-[#6F7476]">
                  <p><span className="font-bold text-[#2F3331]">{weekWisdoms.length}</span> wisdom</p>
                  <p><span className="font-bold text-[#2F3331]">{weekIdeas.length}</span> ideas</p>
                  <p><span className="font-bold text-[#2F3331]">{weekTags.length}</span> tags</p>
                  <p><span className="font-bold text-[#2F3331]">{weekPeople.length}</span> mentions</p>
                </div>
              </div>
            </section>
          )}

          {visibleSections.pins && (
            <section>
              <h2 className="mb-6 font-sans text-3xl font-bold tracking-normal text-[#2F3331]">Pins</h2>
              {topTags.length > 0 ? (
                <div className="space-y-5">
                  {topTags.map(tag => (
                    <div key={tag.id}>
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#5D8AFF]">
                        <FontAwesomeIcon icon={faTag} className="h-3.5 w-3.5" />
                        #{tag.name}
                      </div>
                      <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-1">
                        {getTagTimeline(tag.name).map(day => (
                          <span
                            key={day.dateKey}
                            title={day.dateKey}
                            className={`h-2 rounded-sm ${day.active ? 'bg-[#5D8AFF]' : 'bg-[#EEF0EF]'}`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-base font-light italic text-[#74797B]">No pinned tags yet.</p>
              )}
            </section>
          )}

          {visibleSections.yearAgo && oneYearEntry && (
            <section>
              <h2 className="mb-4 font-sans text-3xl font-bold tracking-normal text-[#2F3331]">One year ago</h2>
              <p className="mb-4 text-sm text-[#A3A7A8]">{format(oneYearDate, 'EEEE, MMMM d, yyyy')}</p>
              <button
                onClick={() => router.push(`/write?date=${oneYearKey}`)}
                className="block w-full text-left text-base font-light leading-7 text-[#2F3331]"
              >
                {oneYearEntry.dream || oneYearEntry.bullets[0]?.text || 'Open entry'}
              </button>
            </section>
          )}

          {visibleSections.memory && (
            <section>
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="font-sans text-3xl font-bold tracking-normal text-[#2F3331]">Memory lane</h2>
                {memoryEntry && (
                  <button
                    onClick={() => setMemoryOffset(current => current + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F2F2F3] text-[#2F3331] transition-colors hover:bg-[#E5E5E5]"
                    title="shuffle memory"
                  >
                    <FontAwesomeIcon icon={faDice} className="h-4 w-4" />
                  </button>
                )}
              </div>
              {memoryEntry ? (
                <button
                  onClick={() => router.push(`/write?date=${memoryEntry.date}`)}
                  className="block w-full text-left"
                >
                  <p className="mb-2 text-sm text-[#A3A7A8]">{format(parseISO(memoryEntry.date), 'EEEE, MMMM d, yyyy')}</p>
                  <p className="line-clamp-4 text-base font-light leading-7 text-[#2F3331]">
                    {memoryEntry.dream || memoryEntry.bullets[0]?.text}
                  </p>
                </button>
              ) : (
                <p className="text-base font-light italic text-[#74797B]">Memory lane opens after 10 entries.</p>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
