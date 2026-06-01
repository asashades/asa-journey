'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useData } from '@/contexts/DataContext';
import { useRouter } from 'next/navigation';
import { addDays, differenceInCalendarDays, format, parseISO, startOfYear } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { Entry, Idea, Note, Wisdom, WisdomType } from '@/types';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ActivityHeatmap } from '@/components/ui/ActivityHeatmap';
import {
  faMoon,
  faWandMagicSparkles,
  faBook,
  faLightbulb,
  faStar,
  faTag,
  faAt,
  faPen,
  faTrash,
  faCircleInfo,
  faMagnifyingGlass,
  faArrowRight,
  faPlus,
  faBolt,
  faQuoteLeft,
  faBookmark,
  faBookOpen,
  faArrowUp,
  faArrowDown,
  faXmark,
  faCheck,
  faCalendar,
  faCheckCircle,
} from '@fortawesome/free-solid-svg-icons';

type ModuleTab = 'dreams' | 'highlights' | 'tags' | 'people' | 'notes' | 'wisdom' | 'ideas';
type EditableCollection = 'dreams' | 'notes' | 'wisdom' | 'ideas';
type CollectionScope = 'alltime' | 'year';
type TabConfig = { id: ModuleTab; label: string; icon: IconDefinition; count: number };
const moduleTabs: ModuleTab[] = ['dreams', 'highlights', 'tags', 'people', 'notes', 'wisdom', 'ideas'];
const dreamColor = '#FF9933';
const dreamSoftColor = '#FFF4E6';

const wisdomTypeMeta: Record<WisdomType, { label: string; icon: IconDefinition; color: string; bg: string }> = {
  thought: { label: 'thoughts', icon: faBolt, color: '#8B00D4', bg: '#F0D6FF' },
  quote: { label: 'quotes', icon: faQuoteLeft, color: '#1A56C4', bg: '#D6E4FF' },
  fact: { label: 'facts', icon: faCircleInfo, color: '#00875A', bg: '#C8F7E4' },
  excerpt: { label: 'excerpts', icon: faBookmark, color: '#B45309', bg: '#FFE4B5' },
  lesson: { label: 'lessons', icon: faBookOpen, color: '#6B21A8', bg: '#EDD6FF' },
};

// Helper to parse and render formatted wisdom content beautifully
const renderParsedWisdom = (text: string, isQuote: boolean = false) => {
  const lines = text.split('\n');
  return (
    <span className="block whitespace-pre-line select-text">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.toLowerCase().startsWith('source :') || trimmed.toLowerCase().startsWith('source:')) {
          const colonIdx = line.indexOf(':');
          const value = line.substring(colonIdx + 1).trim();
          return (
            <span key={idx} className="block mt-1 text-[10px] text-[#A3A7A8] font-sans italic leading-normal select-text">
              source: <span className="text-[#8B9390]">{value}</span>
            </span>
          );
        }
        if (trimmed.toLowerCase().startsWith('context :') || trimmed.toLowerCase().startsWith('context:')) {
          const colonIdx = line.indexOf(':');
          const value = line.substring(colonIdx + 1).trim();
          return (
            <span key={idx} className="block mt-1 text-[10px] text-[#A3A7A8] font-sans italic leading-normal select-text">
              context: <span className="text-[#8B9390]">{value}</span>
            </span>
          );
        }
        if (trimmed.startsWith('--')) {
          return (
            <span key={idx} className="block mt-1 text-xs text-[#6F7476] font-normal leading-normal select-text">
              {line}
            </span>
          );
        }
        // Normal line
        return (
          <span key={idx} className={`block leading-relaxed ${isQuote ? 'italic text-[#4D5652]' : ''}`}>
            {line}
          </span>
        );
      })}
    </span>
  );
};

const dateKeyFromDate = (date: Date) => format(date, 'yyyy-MM-dd');
const getWisdomDateKey = (wisdom: Wisdom) => wisdom.linkedEntryId || dateKeyFromDate(wisdom.createdAt);
const getNoteDateKey = (note: Note) => note.linkedDate || note.linkedEntryId || dateKeyFromDate(note.createdAt);
const getIdeaDateKey = (idea: Idea) => dateKeyFromDate(idea.createdAt);

const isInCollectionScope = (dateKey: string, scope: CollectionScope, selectedYear: number) => {
  if (scope === 'alltime') return true;
  return parseISO(dateKey).getFullYear() === selectedYear;
};

const getScopeRange = (dateKeys: string[], scope: CollectionScope, selectedYear: number, now: Date) => {
  if (scope === 'year') {
    return {
      start: startOfYear(new Date(selectedYear, 0, 1)),
      end: selectedYear === now.getFullYear() ? now : new Date(selectedYear, 11, 31),
    };
  }

  const sortedDates = dateKeys.map(dateKey => parseISO(dateKey)).sort((a, b) => a.getTime() - b.getTime());
  return {
    start: sortedDates[0] || startOfYear(now),
    end: now,
  };
};

const buildHeatmapDays = (dateKeys: string[], scope: CollectionScope, selectedYear: number, now: Date) => {
  const { start, end } = getScopeRange(dateKeys, scope, selectedYear, now);
  const dayCount = Math.max(1, differenceInCalendarDays(end, start) + 1);
  const dateSet = new Set(dateKeys.filter(dateKey => isInCollectionScope(dateKey, scope, selectedYear)));

  return Array.from({ length: dayCount }, (_, index) => {
    const date = addDays(start, index);
    const dateKey = dateKeyFromDate(date);
    return { date, dateKey, count: dateSet.has(dateKey) ? 1 : 0 };
  });
};

export default function OtherPage() {
  const router = useRouter();
  const {
    entries,
    highlights,
    tags,
    people,
    wisdoms,
    notes,
    ideas,
    saveEntry,
    addWisdom,
    updateWisdom,
    deleteWisdom,
    updateNote,
    deleteNote,
    updateIdea,
    deleteIdea,
  } = useData();

  const [activeTab, setActiveTab] = useState<ModuleTab>('dreams');
  const [editingItem, setEditingItem] = useState<{ type: EditableCollection; id: string } | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editWisdomType, setEditWisdomType] = useState<WisdomType>('thought');
  const [wisdomFilter, setWisdomFilter] = useState<WisdomType | 'all'>('all');
  const [dreamSearchOpen, setDreamSearchOpen] = useState(false);
  const [dreamSearch, setDreamSearch] = useState('');
  const [wisdomSearchOpen, setWisdomSearchOpen] = useState(false);
  const [wisdomSearch, setWisdomSearch] = useState('');
  const [showAddWisdom, setShowAddWisdom] = useState(false);
  const [newWisdomType, setNewWisdomType] = useState<WisdomType>('thought');
  const [newWisdomContent, setNewWisdomContent] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'dream' | 'note' | 'wisdom' | 'idea'; id: string; entry?: Entry } | null>(null);
  const [tagsSubTab, setTagsSubTab] = useState<'all' | 'groups'>('all');
  const [peopleSubTab, setPeopleSubTab] = useState<'all' | 'groups'>('all');
  const [focusedItem, setFocusedItem] = useState('');
  const [collectionScope, setCollectionScope] = useState<CollectionScope>('alltime');
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [isScopeDialOpen, setIsScopeDialOpen] = useState(false);
  const now = new Date();
  const [showSavedToast, setShowSavedToast] = useState(false);
  const savedToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track which collection item has its action menu open (format: "type:id")
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const toggleMenu = (key: string) => setActiveMenu(prev => prev === key ? null : key);
  const closeMenu = () => setActiveMenu(null);

  const showSaved = () => {
    if (savedToastTimerRef.current) clearTimeout(savedToastTimerRef.current);
    setShowSavedToast(true);
    savedToastTimerRef.current = setTimeout(() => {
      setShowSavedToast(false);
      savedToastTimerRef.current = null;
    }, 1400);
  };

  // Use latest update time as key to force re-render when data changes
  const entriesKey = useMemo(() => {
    const latestEntry = entries.reduce((prev, curr) =>
      curr.updatedAt > prev.updatedAt ? curr : prev, entries[0]);
    const latestWisdom = wisdoms.reduce((prev, curr) =>
      curr.updatedAt > prev.updatedAt ? curr : prev, wisdoms[0]);
    const latestNote = notes.reduce((prev, curr) =>
      curr.updatedAt > prev.updatedAt ? curr : prev, notes[0]);
    const latestIdea = ideas.reduce((prev, curr) =>
      curr.updatedAt > prev.updatedAt ? curr : prev, ideas[0]);
    return Math.max(
      latestEntry?.updatedAt?.getTime() || 0,
      latestWisdom?.updatedAt?.getTime() || 0,
      latestNote?.updatedAt?.getTime() || 0,
      latestIdea?.updatedAt?.getTime() || 0,
    );
  }, [entries, wisdoms, notes, ideas]);

  const doMoreLessColors: Record<string, { bg: string; color: string; icon: typeof faArrowUp }> = {
    more: { bg: '#D6E4FF', color: '#1A56C4', icon: faArrowUp },
    less: { bg: '#FFF4E6', color: '#B45309', icon: faArrowDown },
  };

  const availableYears = Array.from(new Set([
    now.getFullYear(),
    ...entries.map(entry => parseISO(entry.date).getFullYear()),
    ...highlights.map(highlight => parseISO(highlight.entryDate).getFullYear()),
    ...wisdoms.map(wisdom => parseISO(getWisdomDateKey(wisdom)).getFullYear()),
    ...notes.map(note => parseISO(getNoteDateKey(note)).getFullYear()),
    ...ideas.map(idea => idea.createdAt.getFullYear()),
  ])).sort((a, b) => b - a);
  const scopedEntries = entries.filter(entry => isInCollectionScope(entry.date, collectionScope, selectedYear));
  const dreamEntries = scopedEntries
    .filter(e => e.dream.trim())
    .sort((a, b) => b.date.localeCompare(a.date));
  const dreamSearchTerm = dreamSearch.trim().toLowerCase();
  const filteredDreamEntries = dreamEntries.filter(entry => {
    if (!dreamSearchTerm) return true;
    return entry.dream.toLowerCase().includes(dreamSearchTerm) || entry.date.includes(dreamSearchTerm);
  });
  const allDreamDateKeys = entries.filter(entry => entry.dream.trim()).map(entry => entry.date);
  const heatmapDays = buildHeatmapDays(allDreamDateKeys, collectionScope, selectedYear, now);
  const scopedHighlights = highlights.filter(highlight => isInCollectionScope(highlight.entryDate, collectionScope, selectedYear));
  const scopedWisdoms = wisdoms.filter(wisdom => isInCollectionScope(getWisdomDateKey(wisdom), collectionScope, selectedYear));
  const scopedNotes = notes.filter(note => isInCollectionScope(getNoteDateKey(note), collectionScope, selectedYear));
  const scopedIdeas = ideas.filter(idea => isInCollectionScope(getIdeaDateKey(idea), collectionScope, selectedYear));
  const scopedTagCounts = scopedEntries.reduce((counts, entry) => {
    entry.bullets.forEach(bullet => {
      bullet.tags.forEach(tag => counts.set(tag.toLowerCase(), (counts.get(tag.toLowerCase()) || 0) + 1));
    });
    return counts;
  }, new Map<string, number>());
  const scopedPersonCounts = scopedEntries.reduce((counts, entry) => {
    entry.bullets.forEach(bullet => {
      bullet.mentions.forEach(person => counts.set(person.toLowerCase(), (counts.get(person.toLowerCase()) || 0) + 1));
    });
    return counts;
  }, new Map<string, number>());
  const scopedTags = collectionScope === 'alltime'
    ? tags
    : tags
        .map(tag => ({ ...tag, count: scopedTagCounts.get(tag.name.toLowerCase()) || 0 }))
        .filter(tag => tag.count > 0);
  const scopedPeople = collectionScope === 'alltime'
    ? people
    : people
        .map(person => ({ ...person, mentions: scopedPersonCounts.get(person.name.toLowerCase()) || 0 }))
        .filter(person => person.mentions > 0);
  const getRelativeDreamTime = (date: string) => {
    const days = differenceInCalendarDays(now, parseISO(date));
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 0) return 'coming soon';
    return `${days} days ago`;
  };
  const formatDreamDate = (date: string) => format(parseISO(date), 'EEE, MMM d, yyyy');
  const wisdomSearchTerm = wisdomSearch.trim().toLowerCase();
  const filteredWisdoms = scopedWisdoms.filter(wisdom => {
    const matchesType = wisdomFilter === 'all' || wisdom.type === wisdomFilter;
    const matchesSearch = !wisdomSearchTerm
      || wisdom.content.toLowerCase().includes(wisdomSearchTerm)
      || wisdom.type.includes(wisdomSearchTerm);
    return matchesType && matchesSearch;
  });
  const scopeLabel = collectionScope === 'year' ? `${selectedYear}` : 'All time';

  useEffect(() => {
    const applyUrlState = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') as ModuleTab | null;
      if (tab && moduleTabs.includes(tab)) {
        setActiveTab(tab);
        setEditingItem(null);
      }
      setFocusedItem(params.get('focus')?.toLowerCase() || '');
    };

    queueMicrotask(applyUrlState);
    window.addEventListener('popstate', applyUrlState);
    return () => window.removeEventListener('popstate', applyUrlState);
  }, []);

  const collectionTabs: TabConfig[] = [
    { id: 'dreams', label: 'Dreams', icon: faMoon, count: dreamEntries.length },
    { id: 'highlights', label: 'Highlights', icon: faStar, count: scopedHighlights.length },
    { id: 'tags', label: 'Tags', icon: faTag, count: scopedTags.length },
    { id: 'people', label: 'People', icon: faAt, count: scopedPeople.length },
    { id: 'notes', label: 'Notes', icon: faBook, count: scopedNotes.length },
    { id: 'wisdom', label: 'Wisdom', icon: faWandMagicSparkles, count: scopedWisdoms.length },
    { id: 'ideas', label: 'Ideas', icon: faLightbulb, count: scopedIdeas.length },
  ];

  const stopEditing = () => {
    setEditingItem(null);
    setEditTitle('');
    setEditContent('');
    setEditWisdomType('thought');
  };

  const startEditDream = (entry: Entry) => {
    setEditingItem({ type: 'dreams', id: entry.id });
    setEditTitle('');
    setEditContent(entry.dream);
  };

  const startEditNote = (note: Note) => {
    setEditingItem({ type: 'notes', id: note.id });
    setEditTitle(note.title);
    setEditContent(note.content);
  };

  const startEditWisdom = (wisdom: Wisdom) => {
    setEditingItem({ type: 'wisdom', id: wisdom.id });
    setEditWisdomType(wisdom.type);
    setEditContent(wisdom.content);
  };

  const startEditIdea = (idea: Idea) => {
    setEditingItem({ type: 'ideas', id: idea.id });
    setEditTitle('');
    setEditContent(idea.content);
  };

  const saveCollectionEdit = async () => {
    if (!editingItem) return;
    const content = editContent.trim();

    if (editingItem.type === 'dreams') {
      const entry = entries.find(e => e.id === editingItem.id);
      if (!entry) return;
      await saveEntry({ ...entry, dream: content, updatedAt: new Date() });
    }

    if (editingItem.type === 'notes') {
      const title = editTitle.trim() || 'Untitled';
      await updateNote(editingItem.id, { title, content });
    }

    if (editingItem.type === 'wisdom') {
      await updateWisdom(editingItem.id, { type: editWisdomType, content });
    }

    if (editingItem.type === 'ideas') {
      await updateIdea(editingItem.id, { content });
    }

    showSaved();
    stopEditing();
  };

  const deleteDream = (entry: Entry) => {
    setConfirmDelete({ type: 'dream', id: entry.id, entry });
  };

  const deleteNoteItem = (noteId: string) => {
    setConfirmDelete({ type: 'note', id: noteId });
  };

  const deleteWisdomItem = (wisdomId: string) => {
    setConfirmDelete({ type: 'wisdom', id: wisdomId });
  };

  const deleteIdeaItem = (ideaId: string) => {
    setConfirmDelete({ type: 'idea', id: ideaId });
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const { type, id, entry } = confirmDelete;
    if (type === 'dream' && entry) await saveEntry({ ...entry, dream: '', updatedAt: new Date() });
    if (type === 'note') await deleteNote(id);
    if (type === 'wisdom') await deleteWisdom(id);
    if (type === 'idea') await deleteIdea(id);
    setConfirmDelete(null);
  };

  const handleAddWisdomFromCollection = async () => {
    const content = newWisdomContent.trim();
    if (!content) return;
    await addWisdom(newWisdomType, content);
    setNewWisdomContent('');
    setNewWisdomType('thought');
    setShowAddWisdom(false);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24" onClick={closeMenu}>
      {showSavedToast && (
        <div className="fixed left-1/2 top-6 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#2F3331] px-4 py-2 text-sm font-semibold text-white shadow-lg">
          <FontAwesomeIcon icon={faCheckCircle} className="h-4 w-4 text-[#00DC7D]" />
          saved!
        </div>
      )}
      {/* Header */}
      <div className="max-w-[600px] mx-auto px-6 pt-8 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-5xl font-bold font-sans text-[#2F3331] mb-2">
              Collections
            </h1>
            <p className="text-[#6F7476] font-light">dreams, wisdom, notes, ideas</p>
          </div>
          <div className="relative pt-2">
            <button
              type="button"
              onClick={() => setIsScopeDialOpen(open => !open)}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-3 text-sm font-semibold text-[#2F3331] shadow-sm ring-1 ring-[#CCD0CF] transition-colors hover:bg-[#F2F2F3]"
              aria-expanded={isScopeDialOpen}
              aria-label="filter collections by time"
              title="filter collections by time"
            >
              <FontAwesomeIcon icon={faCalendar} className="h-3.5 w-3.5 text-[#6F7476]" />
              <span>{scopeLabel}</span>
            </button>

            {isScopeDialOpen && (
              <div className="absolute right-0 top-14 z-20 w-40 rounded-2xl bg-white p-2 shadow-lg ring-1 ring-[#EEF0EF]">
                <button
                  type="button"
                  onClick={() => {
                    setCollectionScope('alltime');
                    setIsScopeDialOpen(false);
                  }}
                  className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                    collectionScope === 'alltime'
                      ? 'bg-[#E9FFF4] text-[#00A963]'
                      : 'text-[#6F7476] hover:bg-[#F2F2F3] hover:text-[#2F3331]'
                  }`}
                >
                  All time
                  {collectionScope === 'alltime' && <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => setCollectionScope('year')}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                    collectionScope === 'year'
                      ? 'bg-[#E9FFF4] text-[#00A963]'
                      : 'text-[#6F7476] hover:bg-[#F2F2F3] hover:text-[#2F3331]'
                  }`}
                >
                  Year
                  {collectionScope === 'year' && <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />}
                </button>
                {collectionScope === 'year' && (
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

      {/* Module Navigation */}
      <div className="max-w-[600px] mx-auto px-6 mb-6">
        <div className="flex items-center gap-1 rounded-full bg-white/80 p-1 shadow-sm ring-1 ring-[#EEF0EF]">
          {collectionTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  stopEditing();
                }}
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
                {tab.count > 0 && isActive && (
                  <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] leading-none">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-[600px] mx-auto px-6">
        {activeTab === 'dreams' && (
          <div className="space-y-8">
            <div>
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-5xl font-bold font-sans text-[#2F3331] tracking-normal">Dreams</h2>
                <button
                  onClick={() => setDreamSearchOpen(current => !current)}
                  className="mt-2 flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#2F3331] shadow-sm ring-1 ring-[#CCD0CF] transition-colors hover:bg-[#F2F2F3]"
                  title="search dreams"
                >
                  <FontAwesomeIcon icon={faMagnifyingGlass} className="w-4 h-4" />
                </button>
              </div>

              {dreamSearchOpen && (
                <input
                  value={dreamSearch}
                  onChange={(e) => setDreamSearch(e.target.value)}
                  placeholder="search dreams"
                  className="mt-4 w-full rounded-lg border border-[#CCD0CF] bg-white px-4 py-3 text-[#2F3331] placeholder-[#A3A7A8] focus:border-[#5D8AFF] focus:outline-none"
                  autoFocus
                />
              )}
            </div>

            <div>
              <ActivityHeatmap
                data={heatmapDays}
                color={dreamColor}
                getDayTitle={(day) => `${day.dateKey}${day.count > 0 ? ' dream logged' : ''}`}
              />
              <div className="mt-4 flex items-center justify-between gap-3">
                <div
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold"
                  style={{ backgroundColor: dreamSoftColor, color: dreamColor }}
                >
                  <FontAwesomeIcon icon={faMoon} className="w-4 h-4" />
                  <span>{dreamEntries.length}</span>
                </div>
                <button
                  onClick={() => router.push('/insights')}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#F2F2F3] px-3 py-2 text-sm font-semibold text-[#2F3331] transition-colors hover:bg-[#E8E9EA]"
                >
                  Insights
                  <FontAwesomeIcon icon={faArrowRight} className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div key={entriesKey} className="space-y-8">
              {filteredDreamEntries.map((entry) => (
                <div key={entry.id} className="relative py-3">
                  <div className="mb-2 pr-10">
                    <h3 className="font-serif text-xl font-bold text-[#2F3331]">
                      {formatDreamDate(entry.date)}
                    </h3>
                    <p className="mt-1 text-sm text-[#A3A7A8]">{getRelativeDreamTime(entry.date)}</p>
                  </div>

                  {/* Kebab menu — always visible, works on mobile & desktop */}
                  <div className="absolute right-0 top-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleMenu(`dream:${entry.id}`); }}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-[#A3A7A8] hover:bg-[#F2F2F3] hover:text-[#2F3331] transition-colors"
                      title="actions"
                    >
                      <span className="text-base leading-none tracking-[-3px]" style={{ letterSpacing: '-2px' }}>&#8943;</span>
                    </button>
                    {activeMenu === `dream:${entry.id}` && (
                      <div
                        className="absolute right-0 top-9 z-30 min-w-[120px] rounded-2xl bg-white py-1.5 shadow-xl ring-1 ring-[#EEF0EF]"
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => { closeMenu(); startEditDream(entry); }}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-[#2F3331] hover:bg-[#F7F8F7] transition-colors"
                        >
                          <FontAwesomeIcon icon={faPen} className="w-3.5 h-3.5 text-[#6F7476]" />
                          Edit
                        </button>
                        <button
                          onClick={() => { closeMenu(); deleteDream(entry); }}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-[#FF453A] hover:bg-[#FF453A]/5 transition-colors"
                        >
                          <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {editingItem?.type === 'dreams' && editingItem.id === entry.id ? (
                    <div className="py-2">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase leading-4 tracking-wide text-[#65796E]">dream</span>
                        <div className="flex items-center gap-2">
                          <button onClick={stopEditing} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2F2F3] text-[#6F7476] transition-colors hover:bg-[#E8E9EA] hover:text-[#2F3331]" title="cancel">
                            <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={saveCollectionEdit} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00DC7D] text-white transition-colors hover:bg-[#00B866]" title="save">
                            <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={4}
                        className="w-full resize-none bg-transparent py-1 text-[#2F3331] placeholder-[#A3A7A8] focus:outline-none"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7F3EA] text-[#65796E]">
                        <FontAwesomeIcon icon={faMoon} className="w-4 h-4" />
                      </span>
                      <p className="flex-1 whitespace-pre-line text-lg leading-8 text-[#59615E] italic">
                        {entry.dream}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {dreamEntries.length === 0 && (
              <div className="text-center py-12">
                <FontAwesomeIcon icon={faMoon} className="w-12 h-12 text-[#CCD0CF] mx-auto mb-3" />
                <p className="text-[#6F7476]">no dreams logged yet</p>
                <p className="text-sm text-[#A3A7A8]">head to write to log your dreams</p>
              </div>
            )}
            {dreamEntries.length > 0 && filteredDreamEntries.length === 0 && (
              <div className="text-center py-10">
                <p className="text-[#6F7476]">no dream matches that search</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'highlights' && (
          <div className="space-y-4">
            {scopedHighlights.map((h) => (
              <div key={h.id} className="group relative py-3">
                <p className="text-[#2F3331] font-light">{h.content}</p>
                <p className="text-xs text-[#A3A7A8] mt-2">{h.entryDate}</p>
              </div>
            ))}
            {scopedHighlights.length === 0 && (
              <div className="text-center py-12">
                <FontAwesomeIcon icon={faStar} className="w-12 h-12 text-[#CCD0CF] mx-auto mb-3" />
                <p className="text-[#6F7476]">no highlights yet</p>
                <p className="text-sm text-[#A3A7A8]">make a bullet and toggle highlight</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tags' && (
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-[#EEF0EF] pb-3">
              <button
                onClick={() => setTagsSubTab('all')}
                className={`px-3 py-2 text-sm font-semibold transition-colors ${tagsSubTab === 'all' ? 'text-[#2F3331] border-b-2 border-[#2F3331]' : 'text-[#6F7476]'}`}
              >
                All
              </button>
              <button
                onClick={() => setTagsSubTab('groups')}
                className={`px-3 py-2 text-sm font-semibold transition-colors ${tagsSubTab === 'groups' ? 'text-[#2F3331] border-b-2 border-[#2F3331]' : 'text-[#6F7476]'}`}
              >
                Groups
              </button>
            </div>

            {tagsSubTab === 'all' && (
              <div className="space-y-2">
                {scopedTags.map((tag) => {
                  const doMoreLessStyle = tag.doMoreLess ? doMoreLessColors[tag.doMoreLess] : null;
                  const isFocused = focusedItem === tag.name.toLowerCase();
                  return (
                    <button
                      key={tag.id}
                      onClick={() => router.push(`/tags/${encodeURIComponent(tag.name.toLowerCase())}`)}
                      className={`flex w-full items-center justify-between rounded-xl p-4 text-left transition-colors ${isFocused ? 'bg-[#EAD8FF] ring-2 ring-[#C494FF]/40' : 'bg-white border border-[#CCD0CF] shadow-sm hover:border-[#C494FF]/50'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-[#EAD8FF] px-1 py-0.5 font-medium text-[#7A2EB8]">#{tag.name}</span>
                        {doMoreLessStyle && (
                          <span
                            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                            style={{ backgroundColor: doMoreLessStyle.bg, color: doMoreLessStyle.color }}
                          >
                            <FontAwesomeIcon icon={doMoreLessStyle.icon} className="h-2 w-2" />
                            {tag.doMoreLess}
                          </span>
                        )}
                        {tag.aliases && tag.aliases.length > 0 && (
                          <span className="text-xs text-[#A3A7A8]">({tag.aliases.slice(0, 2).map(a => `#${a}`).join(', ')})</span>
                        )}
                      </div>
                      <span className="text-sm text-[#A3A7A8]">{tag.count}x</span>
                    </button>
                  );
                })}
                {scopedTags.length === 0 && (
                  <div className="text-center py-12">
                    <FontAwesomeIcon icon={faTag} className="w-12 h-12 text-[#CCD0CF] mx-auto mb-3" />
                    <p className="text-[#6F7476]">no tags yet</p>
                    <p className="text-sm text-[#A3A7A8]">use # in your bullets to create tags</p>
                  </div>
                )}
              </div>
            )}

            {tagsSubTab === 'groups' && (
              <div className="space-y-4">
                <p className="text-sm text-[#A3A7A8]">tag groups management coming soon...</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'people' && (
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-[#EEF0EF] pb-3">
              <button
                onClick={() => setPeopleSubTab('all')}
                className={`px-3 py-2 text-sm font-semibold transition-colors ${peopleSubTab === 'all' ? 'text-[#2F3331] border-b-2 border-[#2F3331]' : 'text-[#6F7476]'}`}
              >
                All
              </button>
              <button
                onClick={() => setPeopleSubTab('groups')}
                className={`px-3 py-2 text-sm font-semibold transition-colors ${peopleSubTab === 'groups' ? 'text-[#2F3331] border-b-2 border-[#2F3331]' : 'text-[#6F7476]'}`}
              >
                Groups
              </button>
            </div>

            {peopleSubTab === 'all' && (
              <div className="space-y-2">
                {scopedPeople.map((p) => {
                  const doMoreLessStyle = p.doMoreLess ? doMoreLessColors[p.doMoreLess] : null;
                  const isFocused = focusedItem === p.name.toLowerCase();
                  return (
                    <button
                      key={p.id}
                      onClick={() => router.push(`/people/${encodeURIComponent(p.name.toLowerCase())}`)}
                      className={`flex w-full items-center justify-between rounded-xl p-4 text-left transition-colors ${isFocused ? 'bg-[#FFEEAA] ring-2 ring-[#FFCC33]/40' : 'bg-white border border-[#CCD0CF] shadow-sm hover:border-[#FFCC33]/60'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-[#FFEEAA] px-1 py-0.5 font-medium text-[#8A5A00]">@{p.name}</span>
                        {doMoreLessStyle && (
                          <span
                            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                            style={{ backgroundColor: doMoreLessStyle.bg, color: doMoreLessStyle.color }}
                          >
                            <FontAwesomeIcon icon={doMoreLessStyle.icon} className="h-2 w-2" />
                            {p.doMoreLess}
                          </span>
                        )}
                        {p.aliases && p.aliases.length > 0 && (
                          <span className="text-xs text-[#A3A7A8]">({p.aliases.slice(0, 2).map(a => `@${a}`).join(', ')})</span>
                        )}
                      </div>
                      <span className="text-sm text-[#A3A7A8]">{p.mentions}x</span>
                    </button>
                  );
                })}
                {scopedPeople.length === 0 && (
                  <div className="text-center py-12">
                    <FontAwesomeIcon icon={faAt} className="w-12 h-12 text-[#CCD0CF] mx-auto mb-3" />
                    <p className="text-[#6F7476]">no mentions yet</p>
                    <p className="text-sm text-[#A3A7A8]">use @ in your bullets to mention people</p>
                  </div>
                )}
              </div>
            )}

            {peopleSubTab === 'groups' && (
              <div className="space-y-4">
                <p className="text-sm text-[#A3A7A8]">people groups management coming soon...</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-4">
            {scopedNotes.map((note) => (
              <div key={note.id} className="relative py-3">
                <div className="mb-2 pr-10">
                  <h3 className="font-bold text-[#2F3331]">{note.title}</h3>
                </div>
                {/* Kebab menu */}
                <div className="absolute right-0 top-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleMenu(`note:${note.id}`); }}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[#A3A7A8] hover:bg-[#F2F2F3] hover:text-[#2F3331] transition-colors"
                    title="actions"
                  >
                    <span className="text-base leading-none" style={{ letterSpacing: '-2px' }}>&#8943;</span>
                  </button>
                  {activeMenu === `note:${note.id}` && (
                    <div
                      className="absolute right-0 top-9 z-30 min-w-[120px] rounded-2xl bg-white py-1.5 shadow-xl ring-1 ring-[#EEF0EF]"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={() => { closeMenu(); startEditNote(note); }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-[#2F3331] hover:bg-[#F7F8F7] transition-colors"
                      >
                        <FontAwesomeIcon icon={faPen} className="w-3.5 h-3.5 text-[#6F7476]" />
                        Edit
                      </button>
                      <button
                        onClick={() => { closeMenu(); deleteNoteItem(note.id); }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-[#FF453A] hover:bg-[#FF453A]/5 transition-colors"
                      >
                        <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                {editingItem?.type === 'notes' && editingItem.id === note.id ? (
                  <div className="py-2">
                    <div className="mb-3 flex items-center justify-between">
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-lg font-bold text-[#2F3331] focus:outline-none"
                        placeholder="Title"
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <button onClick={stopEditing} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2F2F3] text-[#6F7476] transition-colors hover:bg-[#E8E9EA] hover:text-[#2F3331]" title="cancel">
                          <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={saveCollectionEdit} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00DC7D] text-white transition-colors hover:bg-[#00B866]" title="save">
                          <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={4}
                      className="w-full resize-none bg-transparent py-1 text-[#6F7476] placeholder-[#A3A7A8] focus:outline-none"
                      placeholder="Note content..."
                    />
                  </div>
                ) : (
                  <p className="text-sm text-[#6F7476] whitespace-pre-line mb-3 font-light">{note.content}</p>
                )}
                <p className="text-xs text-[#A3A7A8]">{format(note.createdAt, 'MMM d, yyyy')}</p>
              </div>
            ))}
            {scopedNotes.length === 0 && (
              <div className="text-center py-12">
                <FontAwesomeIcon icon={faBook} className="w-12 h-12 text-[#CCD0CF] mx-auto mb-3" />
                <p className="text-[#6F7476]">no notes yet</p>
                <p className="text-sm text-[#A3A7A8]">use the + button in write to add notes</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'wisdom' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-5xl font-bold font-sans text-[#2F3331] tracking-normal">Wisdom</h2>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => setWisdomSearchOpen(current => !current)}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#2F3331] shadow-sm ring-1 ring-[#CCD0CF] transition-colors hover:bg-[#F2F2F3]"
                    title="search wisdom"
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowAddWisdom(current => !current)}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-[#00DC7D] text-white shadow-sm transition-colors hover:bg-[#00B866]"
                    title="add wisdom"
                  >
                    <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {wisdomSearchOpen && (
                <input
                  value={wisdomSearch}
                  onChange={(e) => setWisdomSearch(e.target.value)}
                  placeholder="search wisdom"
                  className="mt-4 w-full rounded-lg border border-[#CCD0CF] bg-white px-4 py-3 text-[#2F3331] placeholder-[#A3A7A8] focus:border-[#5D8AFF] focus:outline-none"
                  autoFocus
                />
              )}
            </div>

            {showAddWisdom && (
              <div className="py-3">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[#2F3331]">Wisdom</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAddWisdom(false)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2F2F3] text-[#6F7476] transition-colors hover:bg-[#E8E9EA] hover:text-[#2F3331]"
                      title="cancel"
                    >
                      <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={handleAddWisdomFromCollection}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00DC7D] text-white transition-colors hover:bg-[#00B866]"
                      title="save"
                    >
                      <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mb-3 flex flex-wrap gap-2">
                  {Object.entries(wisdomTypeMeta).map(([type, meta]) => (
                    <button
                      key={type}
                      onClick={() => setNewWisdomType(type as WisdomType)}
                      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${newWisdomType === type ? 'ring-2 ring-[#2F3331]/10' : ''}`}
                      style={{ backgroundColor: meta.bg, color: meta.color }}
                    >
                      <FontAwesomeIcon icon={meta.icon} className="w-3.5 h-3.5" />
                      {meta.label}
                    </button>
                  ))}
                </div>
                <div className="mb-3 border-t border-dashed border-[#D7DBDA]" />
                <textarea
                  value={newWisdomContent}
                  onChange={(e) => setNewWisdomContent(e.target.value)}
                  placeholder="drop the thing your future self needs..."
                  rows={3}
                  className="w-full resize-none bg-transparent py-1 text-[#2F3331] placeholder-[#A3A7A8] focus:outline-none"
                  autoFocus
                />
              </div>
            )}

            <div className="flex items-center gap-1 pb-2">
              <button
                onClick={() => setWisdomFilter('all')}
                className={`h-10 rounded-full px-3 text-sm font-semibold transition-all duration-300 ${
                  wisdomFilter === 'all'
                    ? 'bg-[#2F3331] text-white shadow-sm'
                    : 'bg-white text-[#6F7476] ring-1 ring-[#CCD0CF] hover:bg-[#F2F2F3]'
                }`}
              >
                All
              </button>
              {Object.entries(wisdomTypeMeta).map(([type, meta]) => {
                const isActiveType = wisdomFilter === type;
                return (
                  <button
                    key={type}
                    onClick={() => setWisdomFilter(type as WisdomType)}
                    className={`inline-flex h-10 items-center justify-center overflow-hidden rounded-full text-sm font-semibold transition-all duration-300 ease-out ${
                      isActiveType ? 'px-3 shadow-sm ring-2 ring-[#2F3331]/10' : 'w-10 px-0'
                    }`}
                    style={{ backgroundColor: meta.bg, color: meta.color }}
                    title={meta.label}
                    aria-label={meta.label}
                  >
                    <FontAwesomeIcon icon={meta.icon} className="h-3.5 w-3.5 shrink-0" />
                    <span
                      className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-out ${
                        isActiveType ? 'ml-2 max-w-24 translate-x-0 opacity-100' : 'ml-0 max-w-0 -translate-x-2 opacity-0'
                      }`}
                    >
                      {meta.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-4">
              {filteredWisdoms.map((w) => {
                const meta = wisdomTypeMeta[w.type];
                const isQuote = w.type === 'quote';
                const isFocused = focusedItem === w.id;
                const metadata = w.type === 'fact'
                  ? `Source: ${w.linkedEntryId || 'unknown'}`
                  : w.type === 'lesson'
                    ? `Context: ${w.linkedEntryId || 'unknown'}`
                    : w.type === 'excerpt'
                      ? `Source: ${w.linkedEntryId || 'unknown'}`
                      : '';

                return (
                  <div key={w.id} className={`flex items-start gap-3 rounded-lg transition-colors ${isFocused ? 'bg-[#F7EFFF] p-3 ring-2 ring-[#C494FF]/30' : ''}`}>
                    <span
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: meta.bg, color: meta.color }}
                    >
                      <FontAwesomeIcon icon={meta.icon} className="w-3.5 h-3.5" />
                    </span>
                    <div className="relative min-w-0 flex-1">
                      <div className="mb-0.5 pr-10">
                        <span className="block text-xs font-bold uppercase leading-4 tracking-wide" style={{ color: meta.color }}>
                          {w.type}
                        </span>
                      </div>
                      {/* Kebab menu */}
                      <div className="absolute right-0 top-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleMenu(`wisdom:${w.id}`); }}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[#A3A7A8] hover:bg-[#F2F2F3] hover:text-[#2F3331] transition-colors"
                          title="actions"
                        >
                          <span className="text-base leading-none" style={{ letterSpacing: '-2px' }}>&#8943;</span>
                        </button>
                        {activeMenu === `wisdom:${w.id}` && (
                          <div
                            className="absolute right-0 top-9 z-30 min-w-[120px] rounded-2xl bg-white py-1.5 shadow-xl ring-1 ring-[#EEF0EF]"
                            onClick={e => e.stopPropagation()}
                          >
                            <button
                              onClick={() => { closeMenu(); startEditWisdom(w); }}
                              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-[#2F3331] hover:bg-[#F7F8F7] transition-colors"
                            >
                              <FontAwesomeIcon icon={faPen} className="w-3.5 h-3.5 text-[#6F7476]" />
                              Edit
                            </button>
                            <button
                              onClick={() => { closeMenu(); deleteWisdomItem(w.id); }}
                              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-[#FF453A] hover:bg-[#FF453A]/5 transition-colors"
                            >
                              <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>

                      {editingItem?.type === 'wisdom' && editingItem.id === w.id ? (
                        <div className="space-y-3 py-1">
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(wisdomTypeMeta).map(([type, optionMeta]) => (
                              <button
                                key={type}
                                onClick={() => setEditWisdomType(type as WisdomType)}
                                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${editWisdomType === type ? 'ring-2 ring-[#2F3331]/10' : ''}`}
                                style={{ backgroundColor: optionMeta.bg, color: optionMeta.color }}
                              >
                                <FontAwesomeIcon icon={optionMeta.icon} className="w-3.5 h-3.5" />
                                {optionMeta.label}
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={4}
                            className="w-full resize-none border-t border-dashed border-[#D7DBDA] bg-transparent py-3 text-[#2F3331] focus:outline-none"
                          />
                          <div className="flex gap-2">
                            <button onClick={stopEditing} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2F2F3] text-[#6F7476] hover:bg-[#E8E9EA] hover:text-[#2F3331]" title="cancel">
                              <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={saveCollectionEdit} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00DC7D] text-white hover:bg-[#00B866]" title="save">
                              <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className={`whitespace-pre-line leading-6 ${isQuote ? 'italic text-[#4D5652]' : 'text-[#2F3331]'} font-light`}>
                            {renderParsedWisdom(w.content, isQuote)}
                          </div>
                          {metadata && (
                            <p className="mt-1 text-xs text-[#A3A7A8]">{metadata}</p>
                          )}
                          <p className="mt-1 text-xs text-[#A3A7A8]">{format(w.createdAt, 'MMM d, yyyy')}</p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {scopedWisdoms.length === 0 && (
              <div className="text-center py-12">
                <FontAwesomeIcon icon={faWandMagicSparkles} className="w-12 h-12 text-[#CCD0CF] mx-auto mb-3" />
                <p className="text-[#6F7476]">no wisdom captured yet</p>
                <p className="text-sm text-[#A3A7A8]">use the + button in write to add wisdom</p>
              </div>
            )}
            {scopedWisdoms.length > 0 && filteredWisdoms.length === 0 && (
              <div className="text-center py-10">
                <p className="text-[#6F7476]">no wisdom matches this view</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ideas' && (
          <div className="space-y-4">
            {scopedIdeas.map((idea) => {
              const isFocused = focusedItem === idea.id;
              return (
              <div key={idea.id} className={`relative py-3 ${isFocused ? 'bg-[#FFF8ED] -mx-3 px-3 rounded-lg' : ''}`}>
                <div className="mb-0.5 pr-10">
                  <span className="block text-xs font-bold uppercase leading-4 tracking-wide text-[#B45309]">idea</span>
                </div>
                {/* Kebab menu */}
                <div className="absolute right-0 top-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleMenu(`idea:${idea.id}`); }}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[#A3A7A8] hover:bg-[#FFF8ED] hover:text-[#B45309] transition-colors"
                    title="actions"
                  >
                    <span className="text-base leading-none" style={{ letterSpacing: '-2px' }}>&#8943;</span>
                  </button>
                  {activeMenu === `idea:${idea.id}` && (
                    <div
                      className="absolute right-0 top-9 z-30 min-w-[120px] rounded-2xl bg-white py-1.5 shadow-xl ring-1 ring-[#EEF0EF]"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={() => { closeMenu(); startEditIdea(idea); }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-[#2F3331] hover:bg-[#F7F8F7] transition-colors"
                      >
                        <FontAwesomeIcon icon={faPen} className="w-3.5 h-3.5 text-[#6F7476]" />
                        Edit
                      </button>
                      <button
                        onClick={() => { closeMenu(); deleteIdeaItem(idea.id); }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-[#FF453A] hover:bg-[#FF453A]/5 transition-colors"
                      >
                        <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                {editingItem?.type === 'ideas' && editingItem.id === idea.id ? (
                  <div className="py-2">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase leading-4 tracking-wide text-[#B45309]">idea</span>
                      <div className="flex items-center gap-2">
                        <button onClick={stopEditing} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2F2F3] text-[#6F7476] transition-colors hover:bg-[#E8E9EA] hover:text-[#2F3331]" title="cancel">
                          <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={saveCollectionEdit} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF9933] text-white transition-colors hover:bg-[#E68A26]" title="save">
                          <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={4}
                      className="w-full resize-none bg-transparent py-1 text-[#2F3331] placeholder-[#A3A7A8] focus:outline-none"
                      autoFocus
                    />
                  </div>
                ) : (
                  <p className="text-[#2F3331] font-light">{idea.content}</p>
                )}
                <p className="text-xs text-[#A3A7A8]">{format(idea.createdAt, 'MMM d, yyyy')}</p>
              </div>
              );
            })}
            {scopedIdeas.length === 0 && (
              <div className="text-center py-12">
                <FontAwesomeIcon icon={faLightbulb} className="w-12 h-12 text-[#CCD0CF] mx-auto mb-3" />
                <p className="text-[#6F7476]">no ideas captured yet</p>
                <p className="text-sm text-[#A3A7A8]">use the + button in write to add ideas</p>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={executeDelete}
        title={`Delete ${confirmDelete?.type || 'item'}`}
        message="Are you sure you want to delete this? This action cannot be undone."
      />
    </div>
  );
}
