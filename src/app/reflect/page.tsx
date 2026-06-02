'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { addDays, format, parseISO, startOfWeek, subDays, subYears } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faBolt,
  faBookmark,
  faBook,
  faBookOpen,
  faCircleInfo,
  faDice,
  faGear,
  faMoon,
  faLightbulb,
  faPlus,
  faQuoteLeft,
  faStar,
  faTag,
  faTrash,
  faPen,
  faXmark,
  faCheck,
  faFolderPlus,
  faFolderOpen,
  faSliders,
  faRoad,
  faCalendarDays,
  faTags,
  faCompass,
  faPlusMinus,
  faBullseye,
  faTree,
  faSquare,
  faImage,
  faLocationDot,
} from '@fortawesome/free-solid-svg-icons';
import { HighlightedText } from '@/components/ui/HighlightedText';
import { useData } from '@/contexts/DataContext';
import type { Entry } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import QuietInsightCard from '@/components/ai/QuietInsightCard';
import { getEntryNumberByDate, sortBullets } from '@/lib/entryUtils';

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
  { id: 'random', label: 'Gems of the day', color: '#C494FF', icon: faTree },
  { id: 'focus', label: 'Focus Goals', color: '#FF8FB3', icon: faBullseye },
  { id: 'yesterday', label: 'Yesterday', color: '#00DC7D', icon: faBookOpen },
  { id: 'week', label: 'This week', color: '#5D8AFF', icon: faCalendarDays },
  { id: 'pins', label: 'Pins', color: '#C494FF', icon: faTags },
  { id: 'yearAgo', label: 'One year ago', color: '#FFD166', icon: faCompass },
  { id: 'memory', label: 'Time travel', color: '#00DC7D', icon: faRoad },
  { id: 'moreLess', label: 'More/Less', color: '#FFA952', icon: faPlusMinus },
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
  moreLess: true,
};

export default function ReflectPage() {
  const router = useRouter();
  const { userProfile, updateUserSettings } = useAuth();
  const settings = userProfile?.settings || ({} as any);
  const pinnedTags = settings.pinnedTags || [];
  const pinnedGroups = settings.pinnedGroups || [];

  const {
    entries,
    goals,
    highlights,
    tags,
    tagGroups = [],
    createTagGroup,
    updateTagGroup,
    deleteTagGroup,
    people,
    wisdoms,
    ideas,
    notes = [],
    getWisdomOfTheDay,
    getIdeaOfTheDay,
  } = useData();

  // Pins Modal & Detail States
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinModalTab, setPinModalTab] = useState<'tag' | 'group'>('tag');
  const [searchTagQuery, setSearchTagQuery] = useState('');
  const [selectedDayDetail, setSelectedDayDetail] = useState<{ itemId: string; itemName: string; dateKey: string; bullets: string[] } | null>(null);

  // Create Tag Group Form States
  const [showCreateGroupForm, setShowCreateGroupForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupTags, setNewGroupTags] = useState<string[]>([]);
  const [newGroupColor, setNewGroupColor] = useState('#5D8AFF');

  // Edit Tag Group States
  const [editingGroup, setEditingGroup] = useState<any | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupTags, setEditGroupTags] = useState<string[]>([]);
  const [editGroupColor, setEditGroupColor] = useState('#5D8AFF');

  const [showSettings, setShowSettings] = useState(false);
  const [visibleSections, setVisibleSections] = useState(defaultSections);
  const [randomTimeTravelDate, setRandomTimeTravelDate] = useState<string | null>(null);

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

  const entryNumberByDate = useMemo(() => getEntryNumberByDate(entries), [entries]);

  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekStartKey = format(weekStart, 'yyyy-MM-dd');

  // Helper to safely format Date string from firestore timestamp
  const getRawDateString = (item: any): string => {
    if (!item.createdAt) return '';
    try {
      let d: Date;
      if (typeof item.createdAt.toDate === 'function') d = item.createdAt.toDate();
      else if (item.createdAt instanceof Date) d = item.createdAt;
      else d = new Date(item.createdAt);
      return isNaN(d.getTime()) ? '' : format(d, 'yyyy-MM-dd');
    } catch {
      return '';
    }
  };

  // Get all unique dates that have any logged content (entries, notes, wisdoms, or ideas)
  const allContentDates = useMemo(() => {
    const dates = new Set<string>();

    // 1. From entries with content
    entries.forEach(e => {
      if (e.bullets.length > 0 || e.dream?.trim()) {
        dates.add(e.date);
      }
    });

    // 2. From notes
    (notes || []).forEach(n => {
      if (n.linkedDate) dates.add(n.linkedDate);
      else if (n.linkedEntryId) dates.add(n.linkedEntryId);
      else {
        const dStr = getRawDateString(n);
        if (dStr) dates.add(dStr);
      }
    });

    // 3. From wisdoms
    (wisdoms || []).forEach(w => {
      if (w.linkedEntryId) dates.add(w.linkedEntryId);
      else {
        const dStr = getRawDateString(w);
        if (dStr) dates.add(dStr);
      }
    });

    // 4. From ideas
    (ideas || []).forEach(i => {
      if (Array.isArray(i.linkedEntries)) {
        i.linkedEntries.forEach(d => dates.add(d));
      }
      const dStr = getRawDateString(i);
      if (dStr) dates.add(dStr);
    });

    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [entries, notes, wisdoms, ideas]);

  // Initialize random time travel date
  useEffect(() => {
    if (allContentDates.length > 0 && !randomTimeTravelDate) {
      const randomIndex = Math.floor(Math.random() * allContentDates.length);
      setRandomTimeTravelDate(allContentDates[randomIndex]);
    }
  }, [allContentDates, randomTimeTravelDate]);

  const handleRerollTimeTravel = () => {
    if (allContentDates.length > 0) {
      let nextDate = randomTimeTravelDate;
      if (allContentDates.length > 1) {
        while (nextDate === randomTimeTravelDate) {
          const randomIndex = Math.floor(Math.random() * allContentDates.length);
          nextDate = allContentDates[randomIndex];
        }
      } else {
        nextDate = allContentDates[0];
      }
      setRandomTimeTravelDate(nextDate);
    }
  };

  const itemIcons = {
    note: faBookOpen,
    wisdom: faTree,
    idea: faLightbulb,
    star: faStar,
  };

  const itemIconStyles = {
    note: { bg: 'bg-[#E9FFF4] dark:bg-[#00DC7D]/10', text: 'text-[#00A963] dark:text-[#00DC7D]' },
    wisdom: { bg: 'bg-[#F2EFFE] dark:bg-[#C494FF]/10', text: 'text-[#8B00D4] dark:text-[#C494FF]' },
    idea: { bg: 'bg-[#FFF8ED] dark:bg-[#FFA952]/10', text: 'text-[#B45309] dark:text-[#FFA952]' },
    star: { bg: 'bg-[#FFFDF0] dark:bg-[#FFD166]/10', text: 'text-[#FF9500] dark:text-[#FFD166]' },
  };

  const travelIcons = {
    ...itemIcons,
    dream: faMoon,
    bullet: faBook,
  };

  const travelIconStyles = {
    ...itemIconStyles,
    dream: { bg: 'bg-[#FFF6D9] dark:bg-[#FFCC33]/10', text: 'text-[#FFCC33]' },
    bullet: { bg: 'bg-gray-100 dark:bg-neutral-800', text: 'text-gray-500 dark:text-[#A3A7A8]' },
  };

  const timeTravelItems = useMemo(() => {
    if (!randomTimeTravelDate) return { dream: null, bullets: [], extras: [] };

    const dateKey = randomTimeTravelDate;
    const entry = entries.find(e => e.date === dateKey);

    // 1. Bullets from entry
    const bulletItems = entry
      ? entry.bullets.map((b) => ({
          id: b.id,
          type: 'bullet' as const,
          text: b.text,
          style: b.style,
          isHighlight: !!b.isHighlight,
          isCompleted: !!b.isCompleted,
          source: b.source,
          sourceType: b.sourceType,
          sourceId: b.sourceId,
        }))
      : [];

    // 2. Dream from entry
    const dreamText = entry?.dream?.trim() || null;

    // 3. Notes created on/linked to this date (and not already linked in bullets)
    const linkedNoteIds = new Set(bulletItems.filter(b => b.source === 'note').map(b => b.id));
    const dayNotes = (notes || []).filter(n => {
      const isForDate = n.linkedDate === dateKey || n.linkedEntryId === dateKey || getRawDateString(n) === dateKey;
      return isForDate && !linkedNoteIds.has(n.id);
    });
    const noteItems = dayNotes.map(n => ({
      id: n.id,
      type: 'note' as const,
      text: n.title ? `${n.title}: ${n.content}` : n.content,
    }));

    // 4. Wisdoms created on/linked to this date
    const linkedWisdomIds = new Set(bulletItems.filter(b => b.source === 'wisdom').map(b => b.id));
    const dayWisdoms = (wisdoms || []).filter(w => {
      const isForDate = w.linkedEntryId === dateKey || getRawDateString(w) === dateKey;
      return isForDate && !linkedWisdomIds.has(w.id);
    });
    const wisdomItems = dayWisdoms.map(w => ({
      id: w.id,
      type: 'wisdom' as const,
      text: w.content,
      wisdomType: w.type,
    }));

    // 5. Ideas created on/linked to this date
    const linkedIdeaIds = new Set(bulletItems.filter(b => b.source === 'idea').map(b => b.id));
    const dayIdeas = (ideas || []).filter(i => {
      const isForDate = i.linkedEntries?.includes(dateKey) || getRawDateString(i) === dateKey;
      return isForDate && !linkedIdeaIds.has(i.id);
    });
    const ideaItems = dayIdeas.map(i => ({
      id: i.id,
      type: 'idea' as const,
      text: i.content,
      status: i.status,
    }));

    return {
      date: dateKey,
      dream: dreamText,
      bullets: bulletItems,
      extras: [
        ...noteItems,
        ...wisdomItems,
        ...ideaItems,
      ]
    };
  }, [randomTimeTravelDate, entries, notes, wisdoms, ideas]);

  // Get actual items for "This Week" (combining Wisdom, Ideas, Notes, and Highlights/Stars)
  const combinedWeekItems = useMemo(() => {
    const weekNotes = (notes || []).filter(note => {
      const date = note.linkedDate || (note.createdAt ? format(new Date(note.createdAt), 'yyyy-MM-dd') : '');
      return date >= weekStartKey && date <= todayKey;
    });

    const weekWisdoms = (wisdoms || []).filter(wisdom => {
      const date = wisdom.linkedEntryId || (wisdom.createdAt ? format(new Date(wisdom.createdAt), 'yyyy-MM-dd') : '');
      return date >= weekStartKey && date <= todayKey;
    });

    const weekIdeas = (ideas || []).filter(idea => {
      const linkedDate = idea.linkedEntries?.find(d => d >= weekStartKey && d <= todayKey);
      const date = linkedDate || (idea.createdAt ? format(new Date(idea.createdAt), 'yyyy-MM-dd') : '');
      return date >= weekStartKey && date <= todayKey;
    });

    const weekHighlights = (highlights || []).filter(highlight => {
      return highlight.entryDate >= weekStartKey && highlight.entryDate <= todayKey;
    });

    const getRawDate = (item: any): Date => {
      if (!item.createdAt) return new Date(0);
      if (typeof item.createdAt.toDate === 'function') return item.createdAt.toDate();
      if (item.createdAt instanceof Date) return item.createdAt;
      return new Date(item.createdAt);
    };

    const noteItems = weekNotes.map(n => ({
      id: `note:${n.id}`,
      type: 'note' as const,
      text: n.title ? `${n.title}: ${n.content}` : n.content,
      date: n.linkedDate || format(getRawDate(n), 'yyyy-MM-dd'),
      rawDate: getRawDate(n),
    }));

    const wisdomItems = weekWisdoms.map(w => ({
      id: `wisdom:${w.id}`,
      type: 'wisdom' as const,
      text: w.content,
      date: w.linkedEntryId || format(getRawDate(w), 'yyyy-MM-dd'),
      rawDate: getRawDate(w),
    }));

    const ideaItems = weekIdeas.map(idItem => {
      const date = idItem.linkedEntries?.find(d => d >= weekStartKey && d <= todayKey) || format(getRawDate(idItem), 'yyyy-MM-dd');
      return {
        id: `idea:${idItem.id}`,
        type: 'idea' as const,
        text: idItem.content,
        date,
        rawDate: getRawDate(idItem),
      };
    });

    const starItems = weekHighlights.map(h => ({
      id: `star:${h.id}`,
      type: 'star' as const,
      text: h.content,
      date: h.entryDate,
      rawDate: getRawDate(h),
    }));

    return [
      ...noteItems,
      ...wisdomItems,
      ...ideaItems,
      ...starItems,
    ].sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime())
     .slice(0, 5);
  }, [notes, wisdoms, ideas, highlights, weekStartKey, todayKey]);

  // More/Less Habit Focus Calculation
  const weeklyHabits = useMemo(() => {
    const moreLessTags = (tags || []).filter(t => t.doMoreLess === 'more' || t.doMoreLess === 'less');
    return moreLessTags.map(tag => {
      let weekCount = 0;
      const lowerName = tag.name.toLowerCase();
      entries.forEach(entry => {
        if (entry.date >= weekStartKey && entry.date <= todayKey) {
          entry.bullets.forEach(bullet => {
            if (bullet.tags.some(t => t.toLowerCase() === lowerName)) {
              weekCount++;
            }
          });
        }
      });
      return {
        ...tag,
        weekCount,
      };
    });
  }, [tags, entries, weekStartKey, todayKey]);

  const pinDays = Array.from({ length: 30 }, (_, index) => {
    const date = addDays(subDays(today, 29), index);
    return { date, dateKey: format(date, 'yyyy-MM-dd') };
  });
  
  const oneYearDate = subYears(today, 1);
  const oneYearKey = format(oneYearDate, 'yyyy-MM-dd');
  const oneYearEntry = entries.find(entry => entry.date === oneYearKey);

  const toggleSection = (section: SectionId) => {
    setVisibleSections(current => ({ ...current, [section]: !current[section] }));
  };

  // Toggle Pinned status
  const togglePinTag = async (tagName: string) => {
    const isPinned = pinnedTags.includes(tagName);
    const newPinnedTags = isPinned
      ? pinnedTags.filter((t: string) => t !== tagName)
      : [...pinnedTags, tagName];
    await updateUserSettings({ pinnedTags: newPinnedTags });
  };

  const togglePinGroup = async (groupId: string) => {
    const isPinned = pinnedGroups.includes(groupId);
    const newPinnedGroups = isPinned
      ? pinnedGroups.filter((g: string) => g !== groupId)
      : [...pinnedGroups, groupId];
    await updateUserSettings({ pinnedGroups: newPinnedGroups });
  };

  // Pin & Group CRUD helpers
  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    await createTagGroup(name, newGroupTags, newGroupColor);
    
    setNewGroupName('');
    setNewGroupTags([]);
    setNewGroupColor('#5D8AFF');
    setShowCreateGroupForm(false);
  };

  const handleStartEditGroup = (group: any) => {
    setEditingGroup(group);
    setEditGroupName(group.name);
    setEditGroupTags(group.tags);
    setEditGroupColor(group.color || '#5D8AFF');
  };

  const handleSaveEditGroup = async () => {
    if (!editingGroup) return;
    const name = editGroupName.trim();
    if (!name) return;
    await updateTagGroup(editingGroup.id, {
      name,
      tags: editGroupTags,
      color: editGroupColor,
    });
    setEditingGroup(null);
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (pinnedGroups.includes(groupId)) {
      await togglePinGroup(groupId);
    }
    await deleteTagGroup(groupId);
    setEditingGroup(null);
  };

  const getTimelineForItem = (type: 'tag' | 'group', target: string, groupTagsList?: string[]) => {
    return pinDays.map(day => {
      const entry = entries.find(e => e.date === day.dateKey);
      if (!entry) return { ...day, active: false, bullets: [] };

      let matchingBullets: any[] = [];
      if (type === 'tag') {
        matchingBullets = entry.bullets.filter(bullet =>
          bullet.tags.some(t => t.toLowerCase() === target.toLowerCase())
        );
      } else if (type === 'group' && groupTagsList) {
        matchingBullets = entry.bullets.filter(bullet =>
          bullet.tags.some(t => groupTagsList.map(gt => gt.toLowerCase()).includes(t.toLowerCase()))
        );
      }

      return {
        ...day,
        active: matchingBullets.length > 0,
        bullets: sortBullets(matchingBullets).map(b => b.text)
      };
    });
  };

  const curatedColors = ['#5D8AFF', '#00DC7D', '#C494FF', '#FFA952', '#FF8FB3', '#FFD166'];

  const combinedPins = useMemo(() => {
    const list: any[] = [];
    pinnedTags.forEach((tagName: string) => {
      const tag = tags.find((t: any) => t.name.toLowerCase() === tagName.toLowerCase());
      list.push({
        id: `tag:${tagName}`,
        type: 'tag',
        name: tagName,
        color: '#5D8AFF', // default sky blue for single tags
        timeline: getTimelineForItem('tag', tagName),
        count: tag?.count || 0
      });
    });
    pinnedGroups.forEach((groupId: string) => {
      const group = tagGroups.find((g: any) => g.id === groupId);
      if (group) {
        list.push({
          id: `group:${groupId}`,
          type: 'group',
          name: group.name,
          color: group.color || '#00DC7D',
          tags: group.tags,
          timeline: getTimelineForItem('group', group.name, group.tags),
          rawGroup: group
        });
      }
    });
    return list;
  }, [pinnedTags, pinnedGroups, tags, tagGroups, entries]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#151719] pb-24 transition-colors duration-300">
      <div className="mx-auto max-w-[600px] px-6 pt-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-sans text-5xl font-bold tracking-normal text-[#2F3331] dark:text-[#FAFAFA]">Reflect</h1>
            <p className="mt-2 text-base font-light text-[#6F7476] dark:text-[#A3A7A8]">your entries, brought back into view</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowSettings(current => !current)}
              className="mt-1 flex h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-[#1E2022] text-[#2F3331] dark:text-[#FAFAFA] shadow-sm ring-1 ring-[#CCD0CF] dark:ring-[#2E3133] transition-colors hover:bg-[#F2F2F3] dark:hover:bg-[#282A2D]"
              title="reflect settings"
            >
              <FontAwesomeIcon icon={faSliders} className="h-4 w-4" />
            </button>
            
            {showSettings && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
                <div className="absolute right-0 mt-2 z-50 w-72 rounded-2xl border border-[#EEF0EF] dark:border-[#2E3133] bg-white/95 dark:bg-[#1E2022]/95 backdrop-blur-md p-4 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#A3A7A8] dark:text-[#6F7476] font-sans">
                    Reflect Customization
                  </h3>
                  <div className="space-y-3.5">
                    {sectionOptions.map(section => (
                      <div key={section.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="flex h-7 w-7 items-center justify-center rounded-full"
                            style={{ backgroundColor: `${section.color}15`, color: section.color }}
                          >
                            <FontAwesomeIcon icon={section.icon} className="h-3.5 w-3.5" />
                          </span>
                          <span className="text-sm font-semibold text-[#2F3331] dark:text-[#FAFAFA]">
                            {section.label}
                          </span>
                        </div>
                        
                        <button
                          onClick={() => toggleSection(section.id)}
                          className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                          style={{
                            backgroundColor: visibleSections[section.id] ? section.color : '#E5E5EA'
                          }}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              visibleSections[section.id] ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <main className="mt-14 space-y-10">
          {/* Quiet Insight Section */}
          <section>
            <QuietInsightCard />
          </section>

          {visibleSections.random && (
            <section className="space-y-6 bg-white dark:bg-[#1E2022] rounded-2xl border border-[#EEF0EF] dark:border-[#2E3133] p-5 shadow-sm">
              {wisdomOfTheDay && (
                <button
                  onClick={() => router.push(`/collections?tab=wisdom&focus=${wisdomOfTheDay.id}`)}
                  className="block w-full text-left"
                >
                  <h2 className="mb-4 text-sm font-bold text-[#FFB95C] uppercase tracking-wider font-sans">Gem of the day</h2>
                  <div className="flex items-start gap-4">
                    <span
                      className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: thoughtStyle.bg, color: thoughtStyle.color }}
                    >
                      <FontAwesomeIcon icon={thoughtIcon} className="h-3.5 w-3.5" />
                    </span>
                    <p className="whitespace-pre-line text-base font-light leading-7 text-[#2F3331] dark:text-[#FAFAFA]">
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
                  <h2 className="mb-4 text-sm font-bold text-[#FFB95C] uppercase tracking-wider font-sans">Idea of the day</h2>
                  <div className="flex items-start gap-4">
                    <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFE4B5] text-[#B45309]">
                      <FontAwesomeIcon icon={faLightbulb} className="h-3.5 w-3.5" />
                    </span>
                    <p className="text-base font-light leading-7 text-[#2F3331] dark:text-[#FAFAFA]">
                      {ideaOfTheDay.content}
                    </p>
                  </div>
                </button>
              )}
            </section>
          )}

          {visibleSections.focus && (
            <section className="bg-white dark:bg-[#1E2022] rounded-2xl border border-[#EEF0EF] dark:border-[#2E3133] p-5 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFF0F5] dark:bg-[#FF8FB3]/10 text-[#FF8FB3]">
                  <FontAwesomeIcon icon={faBullseye} className="h-4 w-4" />
                </span>
                <h2 className="font-sans text-xl font-bold tracking-normal text-[#2F3331] dark:text-[#FAFAFA]">Focus</h2>
              </div>
              <div className="space-y-5">
                {activeGoals.length > 0 ? activeGoals.map((goal, index) => (
                  <div key={goal.id} className="flex items-start gap-4">
                    <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFF0F5] dark:bg-[#FF8FB3]/10 text-sm font-bold text-[#FF8FB3]">
                      {index + 1}
                    </span>
                    <p className="text-base font-light leading-7 text-[#2F3331] dark:text-[#FAFAFA]">{goal.content}</p>
                  </div>
                )) : (
                  <p className="text-sm font-light italic text-[#74797B] dark:text-[#6F7476]">No focus goals active yet.</p>
                )}
              </div>
            </section>
          )}

          {visibleSections.yesterday && (
            <section className="bg-white dark:bg-[#1E2022] rounded-2xl border border-[#EEF0EF] dark:border-[#2E3133] p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E9FFF4] dark:bg-[#00DC7D]/10 text-[#00A963] dark:text-[#00DC7D]">
                  <FontAwesomeIcon icon={faBookOpen} className="h-4 w-4" />
                </span>
                <h2 className="font-sans text-xl font-bold tracking-normal text-[#2F3331] dark:text-[#FAFAFA]">Yesterday</h2>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#A3A7A8] dark:text-[#6F7476] font-sans">{format(yesterday, 'EEEE, MMMM d')}</p>

              {yesterdayEntry && yesterdayEntry.bullets.length > 0 ? (
                <div className="mt-5 space-y-4">
                  {sortBullets(yesterdayEntry.bullets).slice(0, 4).map((bullet) => (
                    <button
                      key={bullet.id}
                      onClick={() => router.push(`/write?date=${yesterdayKey}`)}
                      className="block w-full text-left text-sm font-light leading-6 text-[#5D6264] dark:text-[#A3A7A8] transition-colors hover:text-[#2F3331] dark:hover:text-white"
                    >
                      <HighlightedText text={bullet.text} interactive />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-5 text-sm italic text-[#74797B] dark:text-[#6F7476]">
                  There is no entry for {format(yesterday, 'MMMM d')} yet.
                </p>
              )}

              <button
                onClick={() => router.push(`/write?date=${yesterdayKey}`)}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-50 dark:bg-[#282A2D] text-[#2F3331] dark:text-[#FAFAFA] border border-[#CCD0CF] dark:border-[#2E3133] text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
              >
                <FontAwesomeIcon icon={faPlus} className="h-3 w-3 text-[#00DC7D]" />
                <span>Write Entry</span>
              </button>
            </section>
          )}

          {visibleSections.week && (
            <section className="bg-white dark:bg-[#1E2022] rounded-2xl border border-[#EEF0EF] dark:border-[#2E3133] p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E6F0FF] dark:bg-[#5D8AFF]/10 text-[#5D8AFF]">
                  <FontAwesomeIcon icon={faCalendarDays} className="h-4 w-4" />
                </span>
                <h2 className="font-sans text-xl font-bold tracking-normal text-[#2F3331] dark:text-[#FAFAFA]">This week</h2>
              </div>
              
              {/* Compact Spacing Actual Entries Grid */}
              <div className="space-y-3">
                {combinedWeekItems.map(item => {
                  const style = itemIconStyles[item.type];
                  const icon = itemIcons[item.type];
                  return (
                    <div key={item.id} className="flex items-center gap-3 py-1.5 px-3 rounded-xl bg-gray-50/50 dark:bg-neutral-800/20 border border-transparent hover:border-[#EEF0EF] dark:hover:border-[#2E3133] transition-all">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${style.bg} ${style.text}`}>
                        <FontAwesomeIcon icon={icon} className="h-3.5 w-3.5" />
                      </span>
                      <p className="text-sm font-light text-[#2F3331] dark:text-[#FAFAFA] line-clamp-2 leading-relaxed flex-1">
                        {item.text}
                      </p>
                      <span className="text-[10px] text-[#A3A7A8] dark:text-[#6F7476] shrink-0 font-sans font-light">
                        {format(parseISO(item.date), 'MMM d')}
                      </span>
                    </div>
                  );
                })}
                {combinedWeekItems.length === 0 && (
                  <p className="text-sm font-light italic text-[#74797B] dark:text-[#6F7476] py-3 text-center">
                    No entries logged this week yet.
                  </p>
                )}
              </div>
            </section>
          )}

          {visibleSections.pins && (
            <section className="bg-white dark:bg-[#1E2022] rounded-2xl border border-[#EEF0EF] dark:border-[#2E3133] p-5 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F2EFFE] dark:bg-[#C494FF]/10 text-[#8B00D4] dark:text-[#C494FF]">
                    <FontAwesomeIcon icon={faTags} className="h-4 w-4" />
                  </span>
                  <h2 className="font-sans text-xl font-bold tracking-normal text-[#2F3331] dark:text-[#FAFAFA]">Pins</h2>
                </div>
                <button
                  onClick={() => {
                    setShowPinModal(true);
                    setShowCreateGroupForm(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-[#1E2022] hover:bg-[#F2F2F3] dark:hover:bg-[#282A2D] text-xs font-bold text-[#2F3331] dark:text-[#FAFAFA] border border-[#CCD0CF] dark:border-[#2E3133] transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <FontAwesomeIcon icon={faPlus} className="w-3 h-3 text-[#00DC7D]" />
                  <span>Pin Tag or Group</span>
                </button>
              </div>

              {combinedPins.length > 0 ? (
                <div className="space-y-5">
                  {combinedPins.map(pin => {
                    const isGroup = pin.type === 'group';
                    const itemId = pin.id;
                    const name = pin.name;
                    const color = pin.color;
                    const timeline = pin.timeline;

                    return (
                      <div
                        key={itemId}
                        className="rounded-xl border border-[#EEF0EF] bg-[#FAFAFA] p-4 relative overflow-hidden transition-all duration-300 shadow-sm"
                      >
                        {/* Decorative background glow for groups */}
                        <div
                          className="absolute -right-16 -top-16 w-36 h-36 rounded-full blur-3xl opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
                          style={{ backgroundColor: color }}
                        />

                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all"
                              style={{ backgroundColor: `${color}15`, color: color }}
                            >
                              <FontAwesomeIcon icon={isGroup ? faFolderOpen : faTag} className="w-3.5 h-3.5" />
                            </span>
                            <div className="min-w-0">
                              <h3 className="font-bold text-base text-[#2F3331] dark:text-[#FAFAFA] truncate leading-none">
                                {isGroup ? name : `#${name}`}
                              </h3>
                              {isGroup && (
                                <span className="text-[10px] text-[#A3A7A8] dark:text-[#CBD5E1] font-light font-sans tracking-wide block mt-1 truncate">
                                  {pin.tags.length} tag(s): {pin.tags.map((gt: string) => `#${gt}`).join(', ')}
                                </span>
                              )}
                              {!isGroup && (
                                <span className="text-[10px] text-[#A3A7A8] dark:text-[#CBD5E1] font-light font-sans tracking-wide block mt-1">
                                  Used {pin.count} time(s)
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isGroup && (
                              <button
                                onClick={() => handleStartEditGroup(pin.rawGroup)}
                                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#282A2D] text-[#A3A7A8] hover:text-[#2F3331] dark:hover:text-[#FAFAFA] transition-all cursor-pointer"
                                title="Edit Tag Group"
                              >
                                <FontAwesomeIcon icon={faPen} className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={() => isGroup ? togglePinGroup(pin.rawGroup.id) : togglePinTag(name)}
                              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#282A2D] text-[#A3A7A8] hover:text-[#FF453A] transition-all cursor-pointer"
                              title="Unpin"
                            >
                              <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* 30-day Grid Timeline */}
                        <div className="relative">
                          <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-1.5 py-1">
                            {timeline.map((day: any) => {
                              const isDetailActive = selectedDayDetail?.itemId === itemId && selectedDayDetail?.dateKey === day.dateKey;
                              return (
                                <button
                                  key={day.dateKey}
                                  title={`${format(day.date, 'MMM d')}: ${day.bullets.length} log(s)`}
                                  disabled={!day.active}
                                  onClick={() => {
                                    if (isDetailActive) {
                                      setSelectedDayDetail(null);
                                    } else {
                                      setSelectedDayDetail({
                                        itemId,
                                        itemName: isGroup ? name : `#${name}`,
                                        dateKey: day.dateKey,
                                        bullets: day.bullets
                                      });
                                    }
                                  }}
                                  className={`h-3 rounded-[3px] transition-all duration-200 ${
                                    day.active
                                      ? 'cursor-pointer hover:scale-130 active:scale-95 shadow-sm'
                                      : 'cursor-default bg-gray-100 dark:bg-[#1A1C1D]'
                                  } ${
                                    isDetailActive
                                      ? 'ring-2 ring-[#2F3331] dark:ring-white scale-120 z-10'
                                      : ''
                                  }`}
                                  style={{
                                    backgroundColor: day.active ? color : undefined,
                                    boxShadow: day.active ? `0 0 6px ${color}50` : undefined,
                                    opacity: day.active ? 1 : 0.4
                                  }}
                                />
                              );
                            })}
                          </div>

                          <div className="flex justify-between items-center text-[9px] text-[#A3A7A8] dark:text-[#CBD5E1] font-semibold mt-2 uppercase tracking-wider font-sans select-none">
                            <span>30 days ago</span>
                            <span className="font-light normal-case">
                              Active <span className="font-bold text-[#2F3331] dark:text-[#FAFAFA]">{timeline.filter((d: any) => d.active).length}</span> of 30 days
                            </span>
                            <span>Today</span>
                          </div>
                        </div>

                        {/* Interactive sliding logs detail drawer */}
                        {selectedDayDetail && selectedDayDetail.itemId === itemId && (
                          <div className="mt-4 rounded-xl bg-gray-100 dark:bg-[#151718] border border-[#EEF0EF] dark:border-[#3E4246] p-4 animate-in fade-in slide-in-from-top-3 duration-250 shadow-inner">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A3A7A8] dark:text-[#CBD5E1] font-sans">
                                Logs for {format(parseISO(selectedDayDetail.dateKey), 'EEEE, MMMM d, yyyy')}
                              </span>
                              <button
                                onClick={() => setSelectedDayDetail(null)}
                                className="text-[#A3A7A8] hover:text-[#FF453A] p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-neutral-700 transition-all w-5 h-5 flex items-center justify-center text-xs leading-none cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                            <ul className="space-y-2.5">
                              {selectedDayDetail.bullets.map((b: any, i: number) => (
                                <li
                                  key={i}
                                  className="text-sm font-light text-[#5D6264] dark:text-[#E2E8F0] pl-3 border-l-2"
                                  style={{ borderLeftColor: color }}
                                >
                                  <HighlightedText text={b} interactive />
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Sleek Empty State */
                <div className="text-center py-6">
                  <div className="mx-auto w-12 h-12 rounded-full bg-[#EAD8FF] dark:bg-[#C494FF]/10 flex items-center justify-center text-[#8B00D4] dark:text-[#C494FF] mb-4">
                    <FontAwesomeIcon icon={faTag} className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-[#2F3331] dark:text-[#FAFAFA] mb-1">Track habits & tags over 30 days</h3>
                  <p className="text-xs text-[#6F7476] dark:text-[#A3A7A8] max-w-[380px] mx-auto font-light leading-relaxed mb-5">
                    Pins give you convenient 30-day timelines for Tags and Tag Groups. Group exercising tags together, or track how often you work on a side project!
                  </p>
                  <button
                    onClick={() => {
                      setShowPinModal(true);
                      setShowCreateGroupForm(false);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#2F3331] dark:bg-[#FAFAFA] text-white dark:text-[#2F3331] text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md shadow-black/10 dark:shadow-none"
                  >
                    <FontAwesomeIcon icon={faPlus} className="w-3 h-3" />
                    <span>Create Your First Pin</span>
                  </button>
                </div>
              )}
            </section>
          )}

          {visibleSections.yearAgo && oneYearEntry && (
            <section className="bg-white dark:bg-[#1E2022] rounded-2xl border border-[#EEF0EF] dark:border-[#2E3133] p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFFDF0] dark:bg-[#FFD166]/10 text-[#FF9500] dark:text-[#FFD166]">
                  <FontAwesomeIcon icon={faCompass} className="h-4 w-4" />
                </span>
                <h2 className="font-sans text-xl font-bold tracking-normal text-[#2F3331] dark:text-[#FAFAFA]">One year ago</h2>
              </div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#A3A7A8] dark:text-[#6F7476] font-sans">{format(oneYearDate, 'EEEE, MMMM d, yyyy')}</p>
              <button
                onClick={() => router.push(`/write?date=${oneYearKey}`)}
                className="block w-full text-left text-base font-light leading-7 text-[#2F3331] dark:text-[#FAFAFA] hover:text-[#00A963] dark:hover:text-[#00DC7D] transition-colors"
              >
                {oneYearEntry.dream || oneYearEntry.bullets[0]?.text || 'Open entry'}
              </button>
            </section>
          )}

          {visibleSections.memory && (
            <section className="bg-white dark:bg-[#1E2022] rounded-2xl border border-[#EEF0EF] dark:border-[#2E3133] p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E9FFF4] dark:bg-[#00DC7D]/10 text-[#00A963] dark:text-[#00DC7D]">
                    <FontAwesomeIcon icon={faRoad} className="h-4 w-4" />
                  </span>
                  <h2 className="font-sans text-xl font-bold tracking-normal text-[#2F3331] dark:text-[#FAFAFA]">Time travel</h2>
                </div>
                {randomTimeTravelDate && (
                  <button
                    onClick={handleRerollTimeTravel}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 dark:bg-[#282A2D] text-[#2F3331] dark:text-[#FAFAFA] border border-[#CCD0CF] dark:border-[#2E3133] hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer"
                    title="reroll time travel"
                  >
                    <FontAwesomeIcon icon={faDice} className="h-4 w-4 text-[#00DC7D]" />
                  </button>
                )}
              </div>
              {randomTimeTravelDate ? (
                (() => {
                  const entryDate = parseISO(randomTimeTravelDate);
                  const isEntryToday = randomTimeTravelDate === todayKey;
                  const entryNumber = entryNumberByDate.get(randomTimeTravelDate) || 1;
                  const heading = format(entryDate, entryDate.getFullYear() === today.getFullYear() ? 'EEE, MMM d' : 'EEE, MMM d, yyyy');
                  
                  const visibleBullets = sortBullets(timeTravelItems.bullets).slice(0, 5);
                  
                  const entryForDate = entries.find(e => e.date === randomTimeTravelDate);
                  const hasWisdom = wisdoms.some(wisdom => (wisdom.linkedEntryId || getRawDateString(wisdom)) === randomTimeTravelDate);
                  const hasNote = notes.some(note => note.linkedDate === randomTimeTravelDate || note.linkedEntryId === randomTimeTravelDate || getRawDateString(note) === randomTimeTravelDate);
                  const hasIdea = ideas.some(idea => idea.linkedEntries?.includes(randomTimeTravelDate) || getRawDateString(idea) === randomTimeTravelDate);
                  const hasMedia = entryForDate ? (entryForDate.media?.length ?? 0) > 0 : false;
                  const hasLocation = entryForDate ? !!entryForDate.location : false;
                  const hasIndicators = hasWisdom || hasNote || hasIdea || hasMedia || hasLocation;

                  return (
                    <div className="mt-2 text-left">
                      <button
                        onClick={() => router.push(`/write?date=${randomTimeTravelDate}`)}
                        className="group block w-full text-left transition-all hover:opacity-90 focus:outline-none cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-3 border-b border-[#EEF0EF] dark:border-[#2E3133] pb-2">
                          <div className="flex items-baseline gap-2">
                            <h3 className="font-sans text-base font-bold text-[#2F3331] dark:text-[#FAFAFA] group-hover:text-[#00A963] dark:group-hover:text-[#00DC7D] transition-colors">
                              {heading}
                            </h3>
                            <span className="text-xs font-semibold text-[#6F7476] dark:text-[#A3A7A8]">
                              #{entryNumber} {isEntryToday && <span className="text-[#FF9933]">/ Today</span>}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-[#A3A7A8] dark:text-[#6F7476] group-hover:text-[#00A963] dark:group-hover:text-[#00DC7D] transition-colors">
                            Open →
                          </span>
                        </div>

                        <div className="mt-4 space-y-4">
                          {/* Dream */}
                          {timeTravelItems.dream && (
                            <div className="flex items-start gap-3">
                              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFF6D9] dark:bg-[#FFCC33]/10 text-[#FFCC33]">
                                <FontAwesomeIcon icon={faMoon} className="h-2.5 w-2.5" />
                              </span>
                              <p className="line-clamp-3 text-sm font-light leading-6 text-[#74797B] dark:text-[#A3A7A8] italic">
                                {timeTravelItems.dream}
                              </p>
                            </div>
                          )}

                          {/* Bullets */}
                          {timeTravelItems.bullets.length > 0 && (
                            <div className="space-y-1.5">
                              {visibleBullets.map((bullet) => {
                                const isSourceValid = !bullet.source || (
                                  bullet.source === 'wisdom' ? wisdoms.some(w => w.id === bullet.sourceId || (w.linkedEntryId === (timeTravelItems.date || '') && w.content === bullet.text)) :
                                  bullet.source === 'note' ? notes.some(n => n.id === bullet.sourceId || (((n.linkedEntryId === (timeTravelItems.date || '') || n.linkedDate === (timeTravelItems.date || ''))) && (n.content === bullet.text || (n.title && `${n.title}: ${n.content}` === bullet.text)))) :
                                  bullet.source === 'idea' ? ideas.some(i => i.id === bullet.sourceId || (i.linkedEntries?.includes(timeTravelItems.date || '') && i.content === bullet.text)) :
                                  false
                                );
                                const hasValidSource = bullet.source && isSourceValid;

                                const sourceColors = hasValidSource && bullet.source === 'wisdom'
                                  ? { bg: 'bg-[#F0D6FF] dark:bg-[#C494FF]/10', text: 'text-[#8B00D4] dark:text-[#C494FF]' }
                                  : hasValidSource && bullet.source === 'note'
                                  ? { bg: 'bg-[#C8F7E4] dark:bg-[#00DC7D]/10', text: 'text-[#00875A] dark:text-[#00DC7D]' }
                                  : hasValidSource && bullet.source === 'idea'
                                  ? { bg: 'bg-[#FFE4B5] dark:bg-[#FFA952]/10', text: 'text-[#B45309] dark:text-[#FFA952]' }
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
                                      <p className={`line-clamp-2 text-sm font-light leading-6 ${hasValidSource ? sourceColors?.text || 'text-[#5D5AEF]' : 'text-[#2F3331] dark:text-[#FAFAFA]'} ${bullet.isHighlight ? 'font-semibold' : ''} ${bullet.isCompleted ? 'text-[#A3A7A8] line-through' : ''}`}>
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
                              {timeTravelItems.bullets.length > visibleBullets.length && (
                                <p className="pl-6 text-xs font-semibold text-[#A3A7A8]">
                                  + {timeTravelItems.bullets.length - visibleBullets.length} more
                                </p>
                              )}
                            </div>
                          )}

                          {/* Empty state */}
                          {!timeTravelItems.dream && timeTravelItems.bullets.length === 0 && (
                            <p className="text-sm font-light italic leading-6 text-[#74797B] dark:text-[#6F7476] py-3 text-center">
                              No logs recorded for this day.
                            </p>
                          )}
                        </div>

                        {/* Bottom Indicators */}
                        {hasIndicators && (
                          <div className="mt-4 flex items-center gap-1.5 select-none">
                            {hasWisdom && (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F0D6FF] dark:bg-[#C494FF]/10 text-[#8B00D4] dark:text-[#C494FF]" title="Wisdom inside log">
                                <FontAwesomeIcon icon={faTree} className="h-2.5 w-2.5" />
                              </span>
                            )}
                            {hasNote && (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#C8F7E4] dark:bg-[#00DC7D]/10 text-[#00875A] dark:text-[#00DC7D]" title="Note inside log">
                                <FontAwesomeIcon icon={faBook} className="h-2.5 w-2.5" />
                              </span>
                            )}
                            {hasIdea && (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FFE4B5] dark:bg-[#FFA952]/10 text-[#B45309] dark:text-[#FFA952]" title="Idea inside log">
                                <FontAwesomeIcon icon={faLightbulb} className="h-2.5 w-2.5" />
                              </span>
                            )}
                            {hasMedia && (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F2F2F3] dark:bg-[#282A2D] text-[#6F7476] dark:text-[#A3A7A8]" title="Media inside log">
                                <FontAwesomeIcon icon={faImage} className="h-2.5 w-2.5" />
                              </span>
                            )}
                            {hasLocation && (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FFE2E2] dark:bg-[#FF453A]/10 text-[#FF453A] dark:text-[#FF453A]" title="Location inside log">
                                <FontAwesomeIcon icon={faLocationDot} className="h-2.5 w-2.5" />
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    </div>
                  );
                })()
              ) : (
                <p className="text-sm font-light italic text-[#74797B] dark:text-[#6F7476]">Time travel opens once you have daily entries.</p>
              )}
            </section>
          )}

          {visibleSections.moreLess && (
            <section className="bg-white dark:bg-[#1E2022] rounded-2xl border border-[#EEF0EF] dark:border-[#2E3133] p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFF8ED] dark:bg-[#FFA952]/10 text-[#B45309] dark:text-[#FFA952]">
                  <FontAwesomeIcon icon={faPlusMinus} className="h-4 w-4" />
                </span>
                <h2 className="font-sans text-xl font-bold tracking-normal text-[#2F3331] dark:text-[#FAFAFA]">Habit focus (More/Less)</h2>
              </div>

              {weeklyHabits.length > 0 ? (
                <div className="space-y-4">
                  {weeklyHabits.map(habit => {
                    const isMore = habit.doMoreLess === 'more';
                    const weekCount = habit.weekCount;
                    return (
                      <div
                        key={habit.id}
                        className="flex flex-col gap-2 p-3.5 rounded-xl bg-[#FAFAFA] border border-[#EEF0EF] transition-all hover:shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-[#2F3331] dark:text-[#FAFAFA]">
                            #{habit.name}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isMore
                                ? 'bg-[#E9FFF4] text-[#00A963] dark:bg-[#00DC7D]/10 dark:text-[#00DC7D]'
                                : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                            }`}
                          >
                            {isMore ? 'Do More' : 'Do Less'}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-[#5D6264] dark:text-[#CBD5E1]">
                            Logged this week: <span className="font-bold text-[#2F3331] dark:text-[#FAFAFA]">{weekCount} times</span>
                          </span>
                          
                          <span className="font-sans text-[11px] font-medium leading-none">
                            {isMore ? (
                              weekCount > 0 ? (
                                <span className="text-[#00A963] dark:text-[#00DC7D]">Aktif {weekCount}x minggu ini! Terus pertahaman! 🔥</span>
                              ) : (
                                <span className="text-gray-400 dark:text-neutral-400">Belum dimulai minggu ini. Yuk lakukan! 💪</span>
                              )
                            ) : (
                              weekCount === 0 ? (
                                <span className="text-[#00A963] dark:text-[#00DC7D]">0x minggu ini! Luar biasa bersih! 🌟</span>
                              ) : (
                                <span className="text-amber-500">Sudah di-log {weekCount}x. Tetap awasi batasmu! ⚠️</span>
                              )
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-[#CCD0CF] dark:border-[#2E3133] rounded-xl bg-gray-50/20">
                  <p className="text-xs text-[#A3A7A8] dark:text-[#6F7476] font-light max-w-[280px] mx-auto leading-relaxed">
                    No tags set as Habit Focus. Tag your habits as "Do More" or "Do Less" in tag details to track weekly progress here.
                  </p>
                </div>
              )}
            </section>
          )}
        </main>

        {/* ==========================================
            PIN CREATION MODAL
            ========================================== */}
        {showPinModal && (
          <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div
              className="bg-white dark:bg-[#1E2022] rounded-3xl w-full max-w-[480px] p-6 shadow-2xl border border-[#EEF0EF] dark:border-[#2E3133] animate-in zoom-in-95 duration-150 relative max-h-[85vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-neutral-800 shrink-0">
                <h3 className="text-lg font-bold text-[#2F3331] dark:text-[#FAFAFA] flex items-center gap-2">
                  <FontAwesomeIcon icon={faTag} className="text-[#00DC7D]" />
                  Pin a Tag or Group
                </h3>
                <button
                  onClick={() => setShowPinModal(false)}
                  className="text-[#A3A7A8] hover:text-[#FF453A] w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Tabs */}
              {!showCreateGroupForm && (
                <div className="flex bg-gray-100 dark:bg-neutral-800 p-0.5 rounded-lg my-4 shrink-0">
                  <button
                    onClick={() => setPinModalTab('tag')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                      pinModalTab === 'tag'
                        ? 'bg-white dark:bg-[#2F3331] text-[#2F3331] dark:text-[#FAFAFA] shadow-sm'
                        : 'text-[#6F7476] dark:text-[#A3A7A8] hover:text-[#2F3331]'
                    }`}
                  >
                    Tags
                  </button>
                  <button
                    onClick={() => setPinModalTab('group')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                      pinModalTab === 'group'
                        ? 'bg-white dark:bg-[#2F3331] text-[#2F3331] dark:text-[#FAFAFA] shadow-sm'
                        : 'text-[#6F7476] dark:text-[#A3A7A8] hover:text-[#2F3331]'
                    }`}
                  >
                    Tag Groups
                  </button>
                </div>
              )}

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto pr-1">
                {pinModalTab === 'tag' && !showCreateGroupForm && (
                  <div className="space-y-4 pt-1">
                    {/* Search Tags Input */}
                    <input
                      type="text"
                      placeholder="Search tags..."
                      value={searchTagQuery}
                      onChange={(e) => setSearchTagQuery(e.target.value)}
                      className="w-full h-10 px-4 rounded-xl bg-gray-50 dark:bg-neutral-800 border border-[#CCD0CF] dark:border-[#2E3133] text-sm text-[#2F3331] dark:text-[#FAFAFA] focus:outline-none focus:border-[#00DC7D] transition-colors"
                    />

                    {/* Tags List */}
                    <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                      {tags
                        .filter(t => t.name.toLowerCase().includes(searchTagQuery.toLowerCase()))
                        .sort((a, b) => b.count - a.count)
                        .map(tag => {
                          const isPinned = pinnedTags.includes(tag.name);
                          return (
                            <div key={tag.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-800/40 border border-transparent hover:border-[#EEF0EF] dark:hover:border-[#2E3133] transition-all">
                              <span className="text-sm font-semibold text-[#5D8AFF]">#{tag.name}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-[#A3A7A8] dark:text-[#6F7476] font-light">{tag.count} logs</span>
                                <button
                                  onClick={() => togglePinTag(tag.name)}
                                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                    isPinned
                                      ? 'bg-red-50 hover:bg-red-100 text-[#FF453A] border border-red-200'
                                      : 'bg-[#E9FFF4] hover:bg-[#D6FADB] text-[#00A963] border border-transparent'
                                  }`}
                                >
                                  {isPinned ? 'Unpin' : 'Pin'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      {tags.length === 0 && (
                        <p className="text-xs text-[#A3A7A8] italic text-center py-6">No tags logged yet.</p>
                      )}
                    </div>
                  </div>
                )}

                {pinModalTab === 'group' && !showCreateGroupForm && (
                  <div className="space-y-4 pt-1">
                    {/* Groups list */}
                    <div className="space-y-2.5 max-h-[40vh] overflow-y-auto pr-1">
                      {tagGroups.map(group => {
                        const isPinned = pinnedGroups.includes(group.id);
                        const groupColor = group.color || '#00DC7D';
                        return (
                          <div key={group.id} className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50/50 dark:bg-neutral-800/20 border border-[#EEF0EF] dark:border-[#2E3133] transition-all">
                            <div className="flex items-center gap-2.5">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: groupColor }} />
                              <div className="text-left">
                                <span className="text-sm font-bold text-[#2F3331] dark:text-[#FAFAFA]">{group.name}</span>
                                <span className="block text-[10px] text-[#A3A7A8] dark:text-[#6F7476] font-light mt-0.5">
                                  {group.tags.map(gt => `#${gt}`).join(', ')}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => togglePinGroup(group.id)}
                              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                isPinned
                                  ? 'bg-red-50 hover:bg-red-100 text-[#FF453A] border border-red-200'
                                  : 'bg-[#E9FFF4] hover:bg-[#D6FADB] text-[#00A963] border border-transparent'
                              }`}
                            >
                              {isPinned ? 'Unpin' : 'Pin'}
                            </button>
                          </div>
                        );
                      })}
                      {tagGroups.length === 0 && (
                        <div className="py-6 text-center text-xs text-[#A3A7A8] italic">No tag groups created yet.</div>
                      )}
                    </div>

                    <button
                      onClick={() => setShowCreateGroupForm(true)}
                      className="w-full py-3 rounded-xl border border-dashed border-[#00DC7D] text-[#00A963] hover:bg-[#E9FFF4] text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <FontAwesomeIcon icon={faFolderPlus} className="w-4 h-4" />
                      Create New Tag Group
                    </button>
                  </div>
                )}

                {/* Create Tag Group Form Accordion */}
                {showCreateGroupForm && (
                  <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between pb-2">
                      <span className="text-xs font-bold text-[#A3A7A8] dark:text-[#6F7476] uppercase tracking-wider font-sans">New Tag Group Info</span>
                      <button onClick={() => setShowCreateGroupForm(false)} className="text-xs text-[#6F7476] hover:text-[#2F3331] font-semibold cursor-pointer">Back to groups</button>
                    </div>

                    {/* Group name input */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#6F7476] dark:text-[#A3A7A8]">Group Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Exercising, Work, Wellness"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        className="w-full h-10 px-4 rounded-xl bg-gray-50 dark:bg-neutral-800 border border-[#CCD0CF] dark:border-[#2E3133] text-sm text-[#2F3331] dark:text-[#FAFAFA] focus:outline-none focus:border-[#00DC7D] transition-colors"
                      />
                    </div>

                    {/* Curated Color Picker */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#6F7476] dark:text-[#A3A7A8] block">Group Color Accent</label>
                      <div className="flex gap-3.5 py-1">
                        {curatedColors.map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setNewGroupColor(color)}
                            className={`w-6 h-6 rounded-full transition-transform active:scale-90 cursor-pointer ${
                              newGroupColor === color ? 'scale-125 ring-2 ring-offset-2 dark:ring-offset-[#1E2022] ring-[#2F3331] dark:ring-white' : 'hover:scale-110'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Tags checklist selection */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#6F7476] dark:text-[#A3A7A8] block">Select Tags to Group</label>
                      <div className="border border-[#EEF0EF] dark:border-[#2E3133] rounded-2xl p-3.5 max-h-[25vh] overflow-y-auto space-y-1.5 bg-gray-50/30 dark:bg-neutral-800/10">
                        {tags.map(tag => {
                          const isSelected = newGroupTags.includes(tag.name);
                          return (
                            <label
                              key={tag.id}
                              className="flex items-center gap-2.5 p-1 text-sm font-semibold text-[#5D8AFF] select-none cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  if (isSelected) {
                                    setNewGroupTags(newGroupTags.filter(gt => gt !== tag.name));
                                  } else {
                                    setNewGroupTags([...newGroupTags, tag.name]);
                                  }
                                }}
                                className="accent-[#00DC7D]"
                              />
                              #{tag.name}
                              <span className="text-[10px] text-[#A3A7A8] dark:text-[#6F7476] font-light font-sans ml-auto">{tag.count} logs</span>
                            </label>
                          );
                        })}
                        {tags.length === 0 && (
                          <div className="text-xs italic text-[#A3A7A8] text-center py-4">No tags logged yet.</div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2.5 pt-2">
                      <button
                        onClick={() => setShowCreateGroupForm(false)}
                        className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-neutral-800 text-xs font-bold text-[#6F7476] dark:text-[#A3A7A8] hover:bg-gray-200 dark:hover:bg-neutral-700 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateGroup}
                        disabled={!newGroupName.trim() || newGroupTags.length === 0}
                        className="flex-1 py-2.5 rounded-xl bg-[#00DC7D] text-white text-xs font-bold hover:bg-[#00B866] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Create Group
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAG GROUP EDIT MODAL
            ========================================== */}
        {editingGroup && (
          <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div
              className="bg-white dark:bg-[#1E2022] rounded-3xl w-full max-w-[480px] p-6 shadow-2xl border border-[#EEF0EF] dark:border-[#2E3133] animate-in zoom-in-95 duration-150 relative max-h-[85vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-neutral-800 shrink-0">
                <h3 className="text-lg font-bold text-[#2F3331] dark:text-[#FAFAFA] flex items-center gap-2">
                  <FontAwesomeIcon icon={faPen} className="text-[#5D8AFF]" />
                  Edit Tag Group
                </h3>
                <button
                  onClick={() => setEditingGroup(null)}
                  className="text-[#A3A7A8] hover:text-[#FF453A] w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-4 pt-4">
                {/* Group name input */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#6F7476] dark:text-[#A3A7A8]">Group Name</label>
                  <input
                    type="text"
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    className="w-full h-10 px-4 rounded-xl bg-gray-50 dark:bg-neutral-800 border border-[#CCD0CF] dark:border-[#2E3133] text-sm text-[#2F3331] dark:text-[#FAFAFA] focus:outline-none focus:border-[#00DC7D] transition-colors"
                  />
                </div>

                {/* Color Picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#6F7476] dark:text-[#A3A7A8] block">Group Color Accent</label>
                  <div className="flex gap-3.5 py-1">
                    {curatedColors.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setEditGroupColor(color)}
                        className={`w-6 h-6 rounded-full transition-transform active:scale-90 cursor-pointer ${
                          editGroupColor === color ? 'scale-125 ring-2 ring-offset-2 dark:ring-offset-[#1E2022] ring-[#2F3331] dark:ring-white' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Tags Checklist */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#6F7476] dark:text-[#A3A7A8] block">Group Tags</label>
                  <div className="border border-[#EEF0EF] dark:border-[#2E3133] rounded-2xl p-3.5 max-h-[25vh] overflow-y-auto space-y-1.5 bg-gray-50/30 dark:bg-neutral-800/10">
                    {tags.map(tag => {
                      const isSelected = editGroupTags.includes(tag.name);
                      return (
                        <label
                          key={tag.id}
                          className="flex items-center gap-2.5 p-1 text-sm font-semibold text-[#5D8AFF] select-none cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setEditGroupTags(editGroupTags.filter(gt => gt !== tag.name));
                              } else {
                                setEditGroupTags([...editGroupTags, tag.name]);
                              }
                            }}
                            className="accent-[#00DC7D]"
                          />
                          #{tag.name}
                          <span className="text-[10px] text-[#A3A7A8] dark:text-[#6F7476] font-light font-sans ml-auto">{tag.count} logs</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => setEditingGroup(null)}
                      className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-neutral-800 text-xs font-bold text-[#6F7476] dark:text-[#A3A7A8] hover:bg-gray-200 dark:hover:bg-neutral-700 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEditGroup}
                      disabled={!editGroupName.trim() || editGroupTags.length === 0}
                      className="flex-1 py-2.5 rounded-xl bg-[#00DC7D] text-white text-xs font-bold hover:bg-[#00B866] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save Changes
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this tag group?')) {
                        handleDeleteGroup(editingGroup.id);
                      }
                    }}
                    className="w-full py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-[#FF453A] border border-red-100 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                    Delete Tag Group
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
