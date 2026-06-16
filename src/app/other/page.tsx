'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { addDays, differenceInCalendarDays, format, parseISO, startOfYear, subMonths } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { Entry, Idea, Wisdom, WisdomType } from '@/types';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ActivityHeatmap } from '@/components/ui/ActivityHeatmap';
import {
  faMoon,
  faSun,
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
  faTree,
  faCopy,
  faShareNodes,
  faPlay,
} from '@fortawesome/free-solid-svg-icons';

type ModuleTab = 'dreams' | 'highlights' | 'tags' | 'people' | 'wisdom' | 'ideas';
type EditableCollection = 'dreams' | 'wisdom' | 'ideas';
type CollectionScope = 'alltime' | 'year';
type TabConfig = { id: ModuleTab; label: string; icon: IconDefinition; count: number };
const moduleTabs: ModuleTab[] = ['dreams', 'highlights', 'tags', 'people', 'wisdom', 'ideas'];
const dreamColor = '#FF9933';
const dreamSoftColor = '#FFF4E6';

const SHARE_THEMES = [
  {
    id: 'journalistic',
    name: 'Orbital Dawn',
    indicator: 'bg-[#00DC7D]',
    light: {
      cardClass: 'bg-[#FAFAFA] border-[#EEF0EF] text-[#2F3331]',
      accentText: 'text-[#00A963]',
      accentBg: 'bg-[#E9FFF4]',
      borderClass: 'border-[#EEF0EF]',
      metaText: 'text-[#6F7476]',
      quoteMark: 'text-[#00DC7D]/15',
    },
    dark: {
      cardClass: 'bg-[#151719] border-[#2E3133] text-[#FAFAFA]',
      accentText: 'text-[#00DC7D]',
      accentBg: 'bg-[#00DC7D]/15',
      borderClass: 'border-[#2E3133]',
      metaText: 'text-[#A3A7A8]',
      quoteMark: 'text-[#00DC7D]/15',
    }
  },
  {
    id: 'cosmic',
    name: 'Deep Nebula',
    indicator: 'bg-[#9CF6F6]',
    light: {
      cardClass: 'bg-[#F2F6FA] border-[#D0E0F5] text-[#132238]',
      accentText: 'text-[#0072ff]',
      accentBg: 'bg-[#0072ff]/10',
      borderClass: 'border-[#D0E0F5]',
      metaText: 'text-[#5A6E85]',
      quoteMark: 'text-[#0072ff]/15',
    },
    dark: {
      cardClass: 'bg-[#08090D] border-[#1F2433] text-[#FAFAFA]',
      accentText: 'text-[#9CF6F6]',
      accentBg: 'bg-[#9CF6F6]/15',
      borderClass: 'border-[#1F2433]',
      metaText: 'text-[#A3A7A8]',
      quoteMark: 'text-[#9CF6F6]/15',
    }
  },
  {
    id: 'moss',
    name: 'Emerald Station',
    indicator: 'bg-[#00A963]',
    light: {
      cardClass: 'bg-[#F5F9F6] border-[#E1EDE6] text-[#112215]',
      accentText: 'text-[#00875A]',
      accentBg: 'bg-[#C8F7E4]',
      borderClass: 'border-[#E1EDE6]',
      metaText: 'text-[#536E5C]',
      quoteMark: 'text-[#00875A]/15',
    },
    dark: {
      cardClass: 'bg-[#111412] border-[#2E3832] text-[#FAFAFA]',
      accentText: 'text-[#00DC7D]',
      accentBg: 'bg-[#00DC7D]/15',
      borderClass: 'border-[#2E3832]',
      metaText: 'text-[#8C9890]',
      quoteMark: 'text-[#00DC7D]/15',
    }
  },
  {
    id: 'nocturne',
    name: 'Twilight Void',
    indicator: 'bg-[#B79CFF]',
    light: {
      cardClass: 'bg-[#F8F6FC] border-[#EADFFF] text-[#20113B]',
      accentText: 'text-[#8B00D4]',
      accentBg: 'bg-[#F2EFFE]',
      borderClass: 'border-[#EADFFF]',
      metaText: 'text-[#6A5A85]',
      quoteMark: 'text-[#8B00D4]/15',
    },
    dark: {
      cardClass: 'bg-[#0C081A] border-[#202433] text-[#FAFAFA]',
      accentText: 'text-[#B79CFF]',
      accentBg: 'bg-[#B79CFF]/15',
      borderClass: 'border-[#202433]',
      metaText: 'text-[#948CA6]',
      quoteMark: 'text-[#B79CFF]/15',
    }
  }
];

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
            <span key={idx} className="block mt-1 text-[10px] text-[#A3A7A8] font-light leading-normal select-text">
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

const parseWisdom = (fullContent: string) => {
  const lines = fullContent.split('\n');
  let author = '';
  let source = '';
  let context = '';
  const contentLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('--')) {
      author = trimmed.substring(2).trim();
    } else if (trimmed.toLowerCase().startsWith('source :') || trimmed.toLowerCase().startsWith('source:')) {
      const colonIdx = line.indexOf(':');
      source = line.substring(colonIdx + 1).trim();
    } else if (trimmed.toLowerCase().startsWith('context :') || trimmed.toLowerCase().startsWith('context:')) {
      const colonIdx = line.indexOf(':');
      context = line.substring(colonIdx + 1).trim();
    } else {
      contentLines.push(line);
    }
  }

  const content = contentLines.join('\n').trim();
  return { content, author, source, context };
};

const dateKeyFromDate = (date: Date) => format(date, 'yyyy-MM-dd');

const getWisdomDateKey = (wisdom: Wisdom) => {
  const d = wisdom.linkedEntryId;
  if (d) return d;
  if (!wisdom.createdAt) return '';
  try {
    const dateObj = wisdom.createdAt instanceof Date ? wisdom.createdAt : (typeof (wisdom.createdAt as any).toDate === 'function' ? (wisdom.createdAt as any).toDate() : new Date(wisdom.createdAt));
    return isNaN(dateObj.getTime()) ? '' : format(dateObj, 'yyyy-MM-dd');
  } catch {
    return '';
  }
};

const getIdeaDateKey = (idea: Idea) => {
  if (!idea.createdAt) return '';
  try {
    const dateObj = idea.createdAt instanceof Date ? idea.createdAt : (typeof (idea.createdAt as any).toDate === 'function' ? (idea.createdAt as any).toDate() : new Date(idea.createdAt));
    return isNaN(dateObj.getTime()) ? '' : format(dateObj, 'yyyy-MM-dd');
  } catch {
    return '';
  }
};

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
  let start = sortedDates[0] || subMonths(now, 3);
  const minStartDate = subMonths(now, 3);
  if (start.getTime() > minStartDate.getTime()) {
    start = minStartDate;
  }

  return {
    start,
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
  const { userProfile } = useAuth();
  const {
    entries,
    highlights,
    tags,
    people,
    wisdoms,
    ideas,
    saveEntry,
    addWisdom,
    updateWisdom,
    deleteWisdom,
    updateIdea,
    deleteIdea,
  } = useData();

  const getInitialTab = (): ModuleTab => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') as ModuleTab | null;
      if (tab && moduleTabs.includes(tab)) return tab;
    }
    return 'dreams';
  };
  const [activeTab, setActiveTab] = useState<ModuleTab>(getInitialTab);
  const [editingItem, setEditingItem] = useState<{ type: EditableCollection; id: string } | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editWisdomType, setEditWisdomType] = useState<WisdomType>('thought');
  const [editIdeaStatus, setEditIdeaStatus] = useState<'cooking' | 'grinding' | 'slayed'>('cooking');
  const [editWisdomAuthor, setEditWisdomAuthor] = useState('');
  const [editWisdomSource, setEditWisdomSource] = useState('');
  const [editWisdomContext, setEditWisdomContext] = useState('');
  const [shareItem, setShareItem] = useState<{
    type: 'wisdom' | 'note' | 'idea';
    title?: string;
    content: string;
    date: Date | string;
    wisdomType?: WisdomType;
    status?: 'cooking' | 'grinding' | 'slayed';
  } | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [selectedShareThemeIndex, setSelectedShareThemeIndex] = useState(0);
  const [isShareCardDark, setIsShareCardDark] = useState(true);

  // Sync share card theme settings with user's settings when share card is opened
  useEffect(() => {
    if (shareItem && userProfile?.settings) {
      const userTheme = userProfile.settings.theme || 'journalistic';
      const userDarkMode = userProfile.settings.darkMode ?? true;
      const themeIdx = SHARE_THEMES.findIndex(t => t.id === userTheme);
      setSelectedShareThemeIndex(themeIdx >= 0 ? themeIdx : 0);
      setIsShareCardDark(userDarkMode);
    }
  }, [shareItem, userProfile?.settings]);

  const [wisdomFilter, setWisdomFilter] = useState<WisdomType | 'all'>('all');
  const [dreamSearchOpen, setDreamSearchOpen] = useState(false);
  const [dreamSearch, setDreamSearch] = useState('');
  const [wisdomSearchOpen, setWisdomSearchOpen] = useState(false);
  const [wisdomSearch, setWisdomSearch] = useState('');
  const [showAddWisdom, setShowAddWisdom] = useState(false);
  const [newWisdomType, setNewWisdomType] = useState<WisdomType>('thought');
  const [newWisdomContent, setNewWisdomContent] = useState('');
  const [newWisdomAuthor, setNewWisdomAuthor] = useState('');
  const [newWisdomSource, setNewWisdomSource] = useState('');
  const [newWisdomContext, setNewWisdomContext] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'dream' | 'wisdom' | 'idea'; id: string; entry?: Entry } | null>(null);
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
    const latestIdea = ideas.reduce((prev, curr) =>
      curr.updatedAt > prev.updatedAt ? curr : prev, ideas[0]);
    return Math.max(
      latestEntry?.updatedAt?.getTime() || 0,
      latestWisdom?.updatedAt?.getTime() || 0,
      latestIdea?.updatedAt?.getTime() || 0,
    );
  }, [entries, wisdoms, ideas]);

  const doMoreLessColors: Record<string, { bg: string; color: string; icon: typeof faArrowUp }> = {
    more: { bg: '#D6E4FF', color: '#1A56C4', icon: faArrowUp },
    less: { bg: '#FFF4E6', color: '#B45309', icon: faArrowDown },
  };

  const availableYears = Array.from(new Set([
    now.getFullYear(),
    ...entries.map(entry => parseISO(entry.date).getFullYear()),
    ...highlights.map(highlight => parseISO(highlight.entryDate).getFullYear()),
    ...wisdoms.map(wisdom => parseISO(getWisdomDateKey(wisdom)).getFullYear()),
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
    { id: 'highlights', label: 'Stars', icon: faStar, count: scopedHighlights.length },
    { id: 'tags', label: 'Tags', icon: faTag, count: scopedTags.length },
    { id: 'people', label: 'People', icon: faAt, count: scopedPeople.length },
    { id: 'wisdom', label: 'Wisdom', icon: faTree, count: scopedWisdoms.length },
    { id: 'ideas', label: 'Ideas', icon: faLightbulb, count: scopedIdeas.length },
  ];

  const stopEditing = () => {
    setEditingItem(null);
    setEditTitle('');
    setEditContent('');
    setEditWisdomType('thought');
    setEditWisdomAuthor('');
    setEditWisdomSource('');
    setEditWisdomContext('');
  };

  const startEditDream = (entry: Entry) => {
    setEditingItem({ type: 'dreams', id: entry.id });
    setEditTitle('');
    setEditContent(entry.dream);
  };

  const startEditWisdom = (wisdom: Wisdom) => {
    setEditingItem({ type: 'wisdom', id: wisdom.id });
    setEditWisdomType(wisdom.type);
    const parsed = parseWisdom(wisdom.content);
    setEditContent(parsed.content);
    setEditWisdomAuthor(parsed.author);
    setEditWisdomSource(parsed.source);
    setEditWisdomContext(parsed.context);
  };

  const startEditIdea = (idea: Idea) => {
    setEditingItem({ type: 'ideas', id: idea.id });
    setEditTitle('');
    setEditContent(idea.content);
    setEditIdeaStatus(idea.status || 'cooking');
  };

  const saveCollectionEdit = async () => {
    if (!editingItem) return;
    const content = editContent.trim();

    if (editingItem.type === 'dreams') {
      const entry = entries.find(e => e.id === editingItem.id);
      if (!entry) return;
      await saveEntry({ ...entry, dream: content, updatedAt: new Date() });
    }

    if (editingItem.type === 'wisdom') {
      let finalContent = content;
      if (editWisdomType === 'quote') {
        const author = editWisdomAuthor.trim();
        finalContent = content + (author ? `\n\n-- ${author}` : '');
      } else if (editWisdomType === 'fact') {
        const source = editWisdomSource.trim();
        finalContent = content + (source ? `\n\nsource : ${source}` : '');
      } else if (editWisdomType === 'excerpt') {
        const author = editWisdomAuthor.trim();
        const source = editWisdomSource.trim();
        const metaParts = [];
        if (author) metaParts.push(`-- ${author}`);
        if (source) metaParts.push(`source : ${source}`);
        finalContent = content + (metaParts.length > 0 ? `\n\n${metaParts.join('\n')}` : '');
      } else if (editWisdomType === 'lesson') {
        const context = editWisdomContext.trim();
        finalContent = content + (context ? `\n\ncontext : ${context}` : '');
      }
      await updateWisdom(editingItem.id, { type: editWisdomType, content: finalContent });
    }

    if (editingItem.type === 'ideas') {
      await updateIdea(editingItem.id, { content, status: editIdeaStatus });
    }

    showSaved();
    stopEditing();
  };

  const deleteDream = (entry: Entry) => {
    setConfirmDelete({ type: 'dream', id: entry.id, entry });
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
    if (type === 'wisdom') await deleteWisdom(id);
    if (type === 'idea') await deleteIdea(id);
    setConfirmDelete(null);
  };

  const handleAddWisdomFromCollection = async () => {
    const content = newWisdomContent.trim();
    if (!content) return;
    
    let finalContent = content;
    if (newWisdomType === 'quote') {
      const author = newWisdomAuthor.trim();
      finalContent = content + (author ? `\n\n-- ${author}` : '');
    } else if (newWisdomType === 'fact') {
      const source = newWisdomSource.trim();
      finalContent = content + (source ? `\n\nsource : ${source}` : '');
    } else if (newWisdomType === 'excerpt') {
      const author = newWisdomAuthor.trim();
      const source = newWisdomSource.trim();
      const metaParts = [];
      if (author) metaParts.push(`-- ${author}`);
      if (source) metaParts.push(`source : ${source}`);
      finalContent = content + (metaParts.length > 0 ? `\n\n${metaParts.join('\n')}` : '');
    } else if (newWisdomType === 'lesson') {
      const context = newWisdomContext.trim();
      finalContent = content + (context ? `\n\ncontext : ${context}` : '');
    }
    
    await addWisdom(newWisdomType, finalContent);
    setNewWisdomContent('');
    setNewWisdomAuthor('');
    setNewWisdomSource('');
    setNewWisdomContext('');
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
      <div className="max-w-[640px] md:max-w-[850px] lg:max-w-[1100px] xl:max-w-[1280px] 2xl:max-w-[1440px] mx-auto px-6 pt-8 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-5xl font-bold font-sans text-[#2F3331] mb-2">
              Collections
            </h1>
            <p className="text-[#6F7476] font-light">dreams, wisdom, ideas</p>
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
      <div className="max-w-[640px] md:max-w-[850px] lg:max-w-[1100px] xl:max-w-[1280px] 2xl:max-w-[1440px] mx-auto px-6 mb-6">
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
      <div className="max-w-[640px] md:max-w-[850px] lg:max-w-[1100px] xl:max-w-[1280px] 2xl:max-w-[1440px] mx-auto px-6">
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
                      onClick={() => router.push(`/tags?name=${encodeURIComponent(tag.name.toLowerCase())}`)}
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
                      onClick={() => router.push(`/people?name=${encodeURIComponent(p.name.toLowerCase())}`)}
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
                <div className="mt-2 space-y-2">
                  {(newWisdomType === 'quote' || newWisdomType === 'excerpt') && (
                    <input
                      type="text"
                      value={newWisdomAuthor}
                      onChange={(e) => setNewWisdomAuthor(e.target.value)}
                      placeholder="Author..."
                      className="w-full rounded-xl border border-[#CCD0CF] bg-white px-4 py-2 text-sm text-[#2F3331] placeholder-[#A3A7A8] focus:border-[#00DC7D] focus:outline-none"
                    />
                  )}
                  {(newWisdomType === 'fact' || newWisdomType === 'excerpt') && (
                    <input
                      type="text"
                      value={newWisdomSource}
                      onChange={(e) => setNewWisdomSource(e.target.value)}
                      placeholder="Source..."
                      className="w-full rounded-xl border border-[#CCD0CF] bg-white px-4 py-2 text-sm text-[#2F3331] placeholder-[#A3A7A8] focus:border-[#00DC7D] focus:outline-none"
                    />
                  )}
                  {newWisdomType === 'lesson' && (
                    <input
                      type="text"
                      value={newWisdomContext}
                      onChange={(e) => setNewWisdomContext(e.target.value)}
                      placeholder="Context..."
                      className="w-full rounded-xl border border-[#CCD0CF] bg-white px-4 py-2 text-sm text-[#2F3331] placeholder-[#A3A7A8] focus:border-[#00DC7D] focus:outline-none"
                    />
                  )}
                </div>
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
                const linkedEntryDate = w.linkedEntryId
                  ? `Linked entry: ${w.linkedEntryId}`
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
                            className="absolute right-0 top-9 z-30 min-w-[140px] rounded-2xl bg-white py-1.5 shadow-xl ring-1 ring-[#EEF0EF]"
                            onClick={e => e.stopPropagation()}
                          >
                            <button
                              onClick={() => { closeMenu(); setSelectedShareThemeIndex(0); setShareItem({ type: 'wisdom', content: w.content, date: w.createdAt, wisdomType: w.type }); }}
                              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-[#2F3331] hover:bg-[#F7F8F7] transition-colors"
                            >
                              <FontAwesomeIcon icon={faShareNodes} className="w-3.5 h-3.5 text-[#6F7476]" />
                              Share Card
                            </button>
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
                            placeholder="Wisdom content..."
                          />
                          <div className="mt-2 space-y-2">
                            {(editWisdomType === 'quote' || editWisdomType === 'excerpt') && (
                              <input
                                type="text"
                                value={editWisdomAuthor}
                                onChange={(e) => setEditWisdomAuthor(e.target.value)}
                                placeholder="Author..."
                                className="w-full rounded-xl border border-[#CCD0CF] bg-white px-4 py-2 text-sm text-[#2F3331] placeholder-[#A3A7A8] focus:border-[#00DC7D] focus:outline-none"
                              />
                            )}
                            {(editWisdomType === 'fact' || editWisdomType === 'excerpt') && (
                              <input
                                type="text"
                                value={editWisdomSource}
                                onChange={(e) => setEditWisdomSource(e.target.value)}
                                placeholder="Source..."
                                className="w-full rounded-xl border border-[#CCD0CF] bg-white px-4 py-2 text-sm text-[#2F3331] placeholder-[#A3A7A8] focus:border-[#00DC7D] focus:outline-none"
                              />
                            )}
                            {editWisdomType === 'lesson' && (
                              <input
                                type="text"
                                value={editWisdomContext}
                                onChange={(e) => setEditWisdomContext(e.target.value)}
                                placeholder="Context..."
                                className="w-full rounded-xl border border-[#CCD0CF] bg-white px-4 py-2 text-sm text-[#2F3331] placeholder-[#A3A7A8] focus:border-[#00DC7D] focus:outline-none"
                              />
                            )}
                          </div>
                          <div className="flex gap-2 mt-3">
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
                          {linkedEntryDate && (
                            <p className="mt-1 text-xs text-[#A3A7A8]">{linkedEntryDate}</p>
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
                      className="absolute right-0 top-9 z-30 min-w-[140px] rounded-2xl bg-white py-1.5 shadow-xl ring-1 ring-[#EEF0EF]"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={() => { closeMenu(); setSelectedShareThemeIndex(2); setShareItem({ type: 'idea', content: idea.content, date: idea.createdAt, status: idea.status }); }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-[#2F3331] hover:bg-[#F7F8F7] transition-colors"
                      >
                        <FontAwesomeIcon icon={faShareNodes} className="w-3.5 h-3.5 text-[#6F7476]" />
                        Share Card
                      </button>
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
                    {/* Status selector */}
                    <div className="mb-3 flex gap-2">
                      {(['cooking', 'grinding', 'slayed'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setEditIdeaStatus(s)}
                          className={`rounded-full px-3 py-1 text-xs font-bold transition-all border ${
                            editIdeaStatus === s
                              ? s === 'cooking' ? 'bg-[#FFE4B5] text-[#B45309] border-[#B45309]/30 scale-105 shadow-sm' :
                                s === 'grinding' ? 'bg-[#D6E4FF] text-[#1A56C4] border-[#1A56C4]/30 scale-105 shadow-sm' :
                                'bg-[#C8F7E4] text-[#00875A] border-[#00875A]/30 scale-105 shadow-sm'
                              : 'bg-white text-[#6F7476] border-[#EEF0EF] hover:bg-[#F2F2F3]'
                          }`}
                        >
                          {s === 'cooking' ? 'cooking 🍳' :
                           s === 'grinding' ? 'grinding ⚡️' :
                           'slayed 💅'}
                        </button>
                      ))}
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
                  <>
                    <p className="text-[#2F3331] font-light">{idea.content}</p>
                  </>
                )}
                <div className="mt-2.5 flex items-center justify-between">
                  <p className="text-xs text-[#A3A7A8]">{format(idea.createdAt, 'MMM d, yyyy')}</p>
                  {idea.status && (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      idea.status === 'cooking' ? 'bg-[#FFE4B5]/40 text-[#B45309]' :
                      idea.status === 'grinding' ? 'bg-[#D6E4FF]/40 text-[#1A56C4]' :
                      'bg-[#C8F7E4]/40 text-[#00875A]'
                    }`}>
                      {idea.status === 'cooking' ? 'cooking 🍳' :
                       idea.status === 'grinding' ? 'grinding ⚡️' :
                       'slayed 💅'}
                    </span>
                  )}
                </div>
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

      {shareItem && (() => {
        const activeTheme = SHARE_THEMES[selectedShareThemeIndex] || SHARE_THEMES[0];
        const themeStyles = isShareCardDark ? activeTheme.dark : activeTheme.light;
        
        return (
          <div className="fixed inset-0 bg-black/85 sm:bg-black/75 backdrop-blur-md z-[100] flex flex-col items-center justify-center sm:p-4 animate-in fade-in duration-200">
            {/* Vertical 9:16 Card */}
            <div
              className={`w-full h-full sm:h-auto sm:aspect-[9/16] sm:max-w-[420px] rounded-none sm:rounded-[32px] p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden border-0 sm:border transition-all duration-300 ${
                themeStyles.cardClass
              }`}
            >
              {/* Top controls: Left is Theme selector + Dark/Light toggle, Right is Close button */}
              <div className="absolute top-5 left-5 right-5 flex items-center justify-between z-20">
                <div className="flex items-center gap-2">
                  {/* Theme Dots Picker */}
                  <div className={`flex gap-1.5 backdrop-blur-md px-2.5 py-1.5 rounded-full ring-1 ${
                    isShareCardDark 
                      ? 'bg-black/20 ring-white/10' 
                      : 'bg-white/40 ring-black/5'
                  }`}>
                    {SHARE_THEMES.map((themeOption, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedShareThemeIndex(idx)}
                        className={`w-4 h-4 rounded-full border transition-all hover:scale-110 active:scale-95 cursor-pointer ${
                          selectedShareThemeIndex === idx 
                            ? isShareCardDark ? 'border-white scale-105 shadow' : 'border-[#2F3331] scale-105 shadow'
                            : 'border-transparent opacity-60 hover:opacity-100'
                        } ${themeOption.indicator}`}
                        title={themeOption.name}
                        aria-label={`Select ${themeOption.name} theme`}
                      />
                    ))}
                  </div>

                  {/* Dark/Light mode toggle */}
                  <button
                    onClick={() => setIsShareCardDark(prev => !prev)}
                    className={`flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-md transition-colors border cursor-pointer active:scale-90 ${
                      isShareCardDark 
                        ? 'bg-white/10 border-white/10 text-white hover:bg-white/20' 
                        : 'bg-black/5 border-black/5 text-[#2F3331] hover:bg-black/10'
                    }`}
                    title={isShareCardDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  >
                    <FontAwesomeIcon icon={isShareCardDark ? faSun : faMoon} className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => { setShareItem(null); setCopySuccess(false); }}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors cursor-pointer ${
                    isShareCardDark 
                      ? 'bg-white/10 hover:bg-white/20 text-white' 
                      : 'bg-black/5 hover:bg-black/10 text-[#2F3331]'
                  }`}
                  title="Close"
                  aria-label="Close"
                >
                  <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
                </button>
              </div>

              {/* Top Header */}
              <div className="flex items-center justify-between opacity-85 mt-10 sm:mt-12">
                <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.2em] uppercase font-sans">
                  <FontAwesomeIcon icon={faPlay} className="h-2 w-2 rotate-270" style={{ transform: 'rotate(-90deg)' }} />
                  ASA JOURNEY
                </span>
                <span className="text-[10px] font-bold tracking-wider font-sans">
                  {format(typeof shareItem.date === 'string' ? parseISO(shareItem.date) : shareItem.date, 'MMM d, yyyy')}
                </span>
              </div>

              {/* Middle Content */}
              <div className="flex-1 flex flex-col justify-center relative my-6">
                {/* Quotation Mark */}
                <span className={`font-serif text-8xl absolute -top-10 -left-4 select-none leading-none ${themeStyles.quoteMark}`}>“</span>
                
                {/* Main Content Text */}
                <div className="font-serif italic text-xl sm:text-2xl leading-relaxed font-semibold tracking-wide relative z-10 select-text overflow-y-auto max-h-[280px] sm:max-h-[300px] pr-2 scrollbar-thin scrollbar-thumb-current">
                  {shareItem.type === 'note' && shareItem.title && (
                    <h4 className={`font-sans not-italic text-sm uppercase tracking-wider font-bold mb-3 ${
                      isShareCardDark ? 'text-white/80' : 'text-[#2F3331]/80'
                    }`}>
                      {shareItem.title}
                    </h4>
                  )}
                  {shareItem.type === 'wisdom' ? (
                    <>
                      <p className="leading-relaxed whitespace-pre-wrap">{parseWisdom(shareItem.content).content}</p>
                      {parseWisdom(shareItem.content).author && (
                        <p className={`mt-4 text-right text-xs font-sans tracking-wide not-italic ${
                          isShareCardDark ? 'text-white/70' : 'text-[#2F3331]/70'
                        }`}>
                          — {parseWisdom(shareItem.content).author}
                        </p>
                      )}
                      {parseWisdom(shareItem.content).source && (
                        <p className={`mt-1 text-right text-[10px] font-sans tracking-wide not-italic ${
                          isShareCardDark ? 'text-white/50' : 'text-[#2F3331]/50'
                        }`}>
                          source: {parseWisdom(shareItem.content).source}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="leading-relaxed whitespace-pre-wrap">{shareItem.content}</p>
                  )}
                </div>

                {/* Status Badge for Ideas */}
                {shareItem.type === 'idea' && shareItem.status && (
                  <div className="mt-4 z-10">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase backdrop-blur-sm ${
                      isShareCardDark ? 'bg-white/20' : 'bg-black/5'
                    }`}>
                      {shareItem.status === 'cooking' ? 'cooking 🍳' :
                       shareItem.status === 'grinding' ? 'grinding ⚡️' :
                       'slayed 💅'}
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom Footer & Action Panel */}
              <div className={`flex flex-col gap-4 border-t pt-4 ${themeStyles.borderClass}`}>
                <div className="flex items-end justify-between opacity-80">
                  <div>
                    <p className={`text-[9px] font-bold uppercase tracking-widest font-sans ${
                      isShareCardDark ? 'text-white/60' : 'text-[#2F3331]/60'
                    }`}>type</p>
                    <p className="text-xs font-semibold font-sans mt-0.5">
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full select-none ${
                        themeStyles.accentBg
                      } ${themeStyles.accentText}`}>
                        {shareItem.type === 'wisdom' ? `wisdom (${shareItem.wisdomType || 'gem'})` : shareItem.type}
                      </span>
                    </p>
                  </div>
                  <span className={`text-[10px] font-medium font-serif italic ${
                    isShareCardDark ? 'text-white/60' : 'text-[#2F3331]/60'
                  }`}>
                    — reflection
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        let shareText = '';
                        if (shareItem.type === 'note' && shareItem.title) {
                          shareText += `**${shareItem.title}**\n`;
                        }
                        
                        if (shareItem.type === 'wisdom') {
                          const parsed = parseWisdom(shareItem.content);
                          shareText += `"${parsed.content}"`;
                          if (parsed.author) {
                            shareText += `\n-- ${parsed.author}`;
                          }
                          if (parsed.source) {
                            shareText += `\nsource: ${parsed.source}`;
                          }
                          if (parsed.context) {
                            shareText += `\ncontext: ${parsed.context}`;
                          }
                        } else {
                          shareText += `"${shareItem.content}"`;
                        }
                        
                        await navigator.clipboard.writeText(shareText);
                        setCopySuccess(true);
                        setTimeout(() => setCopySuccess(false), 2000);
                      } catch (err) {
                        console.error('Failed to copy', err);
                      }
                    }}
                    className={`w-full inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-xs font-bold transition-all active:scale-[0.98] cursor-pointer ${
                      isShareCardDark 
                        ? 'bg-white hover:bg-[#FAFAFA] text-[#2F3331] shadow-md' 
                        : 'bg-[#2F3331] hover:bg-[#1E201E] text-white shadow-md'
                    }`}
                  >
                    <FontAwesomeIcon icon={faCopy} className="h-3.5 w-3.5" />
                    <span>{copySuccess ? 'Copied! ✓' : 'Copy Text'}</span>
                  </button>
                  <p className={`text-[10px] font-medium ${
                    isShareCardDark ? 'text-white/60' : 'text-[#2F3331]/60'
                  }`}>
                    📸 Screenshot this to share on social!
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
