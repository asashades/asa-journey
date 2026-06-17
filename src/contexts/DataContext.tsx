'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef, useMemo } from 'react';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  increment,
  deleteField,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Entry, Bullet, Wisdom, Note, Idea, Highlight, Tag, Person, FocusGoal, WeeklyData, TagGroup, PersonGroup, Notebook, Task } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { format, addDays, parseISO, differenceInDays } from 'date-fns';
import { playChecklistJingle } from '@/lib/audio';
import { parseAndStripNLP } from '@/lib/nlpParser';

type BulletDraftOptions = Partial<Pick<Bullet, 'isHighlight' | 'source' | 'sourceType' | 'sourceId' | 'createdAt'>>;

interface DataContextType {
  currentEntry: Entry | null;
  currentDate: string;
  setCurrentDate: (date: string) => void;
  entries: Entry[];
  tasks: Task[];
  getEntryByDate: (date: string) => Promise<Entry | null>;
  saveEntry: (entry: Entry) => Promise<void>;
  getEntriesForDateRange: (startDate: string, endDate: string) => Promise<Entry[]>;
  addBullet: (text: string, style?: Bullet['style'], data?: BulletDraftOptions) => Promise<Bullet>;
  updateBullet: (bulletId: string, data: Partial<Bullet>) => Promise<void>;
  deleteBullet: (bulletId: string) => Promise<void>;
  toggleHighlight: (bulletId: string) => Promise<void>;
  toggleBulletComplete: (bulletId: string) => Promise<void>;
  updateDream: (dream: string) => Promise<void>;
  wisdoms: Wisdom[];
  addWisdom: (type: Wisdom['type'], content: string, linkedEntryId?: string) => Promise<Wisdom | null>;
  updateWisdom: (wisdomId: string, data: Partial<Wisdom>) => Promise<void>;
  deleteWisdom: (wisdomId: string) => Promise<void>;
  getWisdomOfTheDay: () => Wisdom | null;
  notes: Note[];
  addNote: (title: string, content: string, labels?: string[], linkedDate?: string, additionalData?: Partial<Note>) => Promise<Note | null>;
  updateNote: (noteId: string, data: Partial<Note>) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  toggleNoteChecklist: (noteId: string, taskText: string) => Promise<void>;
  notebooks: Notebook[];
  addNotebook: (name: string, description?: string, color?: string, icon?: string) => Promise<Notebook | null>;
  updateNotebook: (notebookId: string, data: Partial<Notebook>) => Promise<void>;
  deleteNotebook: (notebookId: string) => Promise<void>;
  ideas: Idea[];
  addIdea: (content: string, linkedEntryId?: string) => Promise<Idea | null>;
  updateIdea: (ideaId: string, data: Partial<Idea>) => Promise<void>;
  deleteIdea: (ideaId: string) => Promise<void>;
  getIdeaOfTheDay: () => Idea | null;
  highlights: Highlight[];
  getHighlightsForDateRange: (startDate: string, endDate: string) => Highlight[];
  tags: Tag[];
  tagGroups: TagGroup[];
  updateTag: (tagName: string, data: Partial<Tag>) => Promise<void>;
  createTagGroup: (name: string, tagNames: string[], color?: string) => Promise<void>;
  updateTagGroup: (groupId: string, data: Partial<TagGroup>) => Promise<void>;
  deleteTagGroup: (groupId: string) => Promise<void>;
  people: Person[];
  personGroups: PersonGroup[];
  updatePerson: (personName: string, data: Partial<Person>) => Promise<void>;
  createPersonGroup: (name: string, personNames: string[]) => Promise<void>;
  updatePersonGroup: (groupId: string, data: Partial<PersonGroup>) => Promise<void>;
  deletePersonGroup: (groupId: string) => Promise<void>;
  extractAndSaveTags: (text: string) => Promise<void>;
  extractAndSavePeople: (text: string) => Promise<void>;
  getBulletsForTag: (tagName: string) => { entryDate: string; bulletText: string; bulletId: string }[];
  getBulletsForPerson: (personName: string) => { entryDate: string; bulletText: string; bulletId: string }[];
  goals: FocusGoal[];
  addGoal: (content: string, data?: Partial<FocusGoal>) => Promise<void>;
  updateGoal: (goalId: string, data: Partial<FocusGoal>) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  toggleGoalComplete: (goalId: string) => Promise<void>;
  reorderGoals: (goalIds: string[]) => Promise<void>;
  getWeeklyData: (weekStart: string) => WeeklyData;
  totalEntries: number;
  totalBullets: number;
  totalHighlights: number;
  totalTags: number;
  totalMentions: number;
  currentStreak: number;
  longestStreak: number;
  loading: boolean;
  isOnline: boolean;
  isSpotlightOpen: boolean;
  setIsSpotlightOpen: (open: boolean) => void;
  addQuickJournalBullet: (text: string, style?: Bullet['style'], isHighlight?: boolean) => Promise<Bullet | null>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

type TimestampLike = {
  toDate: () => Date;
};

type TokenUsage = {
  count: number;
  firstMentioned: Date;
  days: Set<string>;
};

const extractTokenNames = (text: string, prefix: '@' | '#') => {
  const regex = prefix === '#'
    ? /(^|[^\p{L}\p{N}_-])#([\p{L}\p{N}_][\p{L}\p{N}_-]*)/gu
    : /(^|[^\p{L}\p{N}_-])@([\p{L}\p{N}_][\p{L}\p{N}_-]*)/gu;

  return Array.from(text.matchAll(regex), match => match[2].toLowerCase())
    .filter(Boolean)
    .filter((name, index, names) => names.indexOf(name) === index);
};

const extractTagNames = (text: string) => extractTokenNames(text, '#');
const extractMentionNames = (text: string) => extractTokenNames(text, '@');

const findCanonicalName = <T extends { name: string; aliases?: string[] }>(name: string, items: T[]) => {
  const normalized = name.toLowerCase();
  return items.find(item =>
    item.name.toLowerCase() === normalized ||
    (item.aliases || []).some(alias => alias.toLowerCase() === normalized)
  )?.name.toLowerCase() || normalized;
};

const addUsage = (usage: Map<string, TokenUsage>, name: string, date: string) => {
  const entryDate = parseISO(date);
  const existing = usage.get(name);

  if (existing) {
    existing.count += 1;
    existing.days.add(date);
    if (entryDate < existing.firstMentioned) {
      existing.firstMentioned = entryDate;
    }
    return;
  }

  usage.set(name, {
    count: 1,
    firstMentioned: entryDate,
    days: new Set([date]),
  });
};

const isTimestampLike = (value: unknown): value is TimestampLike => {
  if (typeof value !== 'object' || value === null) return false;
  const maybeTimestamp = value as { toDate?: unknown };
  return typeof maybeTimestamp.toDate === 'function';
};

const reviveFirestoreValue = (value: unknown): unknown => {
  if (isTimestampLike(value)) return value.toDate();
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(reviveFirestoreValue);
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, child]) => [key, reviveFirestoreValue(child)])
    );
  }
  return value;
};

const removeUndefinedFields = <T,>(value: T): T => {
  if (value instanceof Date) return value;
  if (Array.isArray(value)) {
    return value
      .filter(item => item !== undefined)
      .map(item => removeUndefinedFields(item)) as T;
  }
  if (typeof value === 'object' && value !== null) {
    const clean: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (child !== undefined) {
        clean[key] = removeUndefinedFields(child);
      }
    }
    return clean as T;
  }
  return value;
};

const entryFromDoc = (id: string, data: Record<string, unknown>): Entry => {
  const revived = reviveFirestoreValue(data) as Partial<Entry>;
  return {
    id,
    date: typeof revived.date === 'string' ? revived.date : id,
    dream: typeof revived.dream === 'string' ? revived.dream : '',
    bullets: Array.isArray(revived.bullets) ? revived.bullets : [],
    ...(Array.isArray(revived.media) ? { media: revived.media } : {}),
    ...(revived.location ? { location: revived.location } : {}),
    ...(revived.weather ? { weather: revived.weather } : {}),
    ...(revived.condition ? { condition: revived.condition } : {}),
    ...(revived.dailyInsight ? { dailyInsight: revived.dailyInsight } : {}),
    createdAt: revived.createdAt instanceof Date ? revived.createdAt : new Date(),
    updatedAt: revived.updatedAt instanceof Date ? revived.updatedAt : new Date(),
  };
};

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [currentEntry, setCurrentEntry] = useState<Entry | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [wisdoms, setWisdoms] = useState<Wisdom[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [personGroups, setPersonGroups] = useState<PersonGroup[]>([]);
  const [goals, setGoals] = useState<FocusGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
  const lastTokenSyncSignatureRef = useRef('');
  const isSyncingSourceRef = useRef(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  const tagsRef = useRef<Tag[]>(tags);
  const peopleRef = useRef<Person[]>(people);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    tagsRef.current = tags;
  }, [tags]);

  useEffect(() => {
    peopleRef.current = people;
  }, [people]);

  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updateLocalCache = useCallback((updates: Partial<{
    entries: Entry[];
    wisdoms: Wisdom[];
    notes: Note[];
    notebooks: Notebook[];
    ideas: Idea[];
    highlights: Highlight[];
    tags: Tag[];
    tagGroups: TagGroup[];
    people: Person[];
    personGroups: PersonGroup[];
    goals: FocusGoal[];
  }>) => {
    if (!user) return;
    const cacheKey = `asa_journey_${user.uid}`;
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || '{}');
      localStorage.setItem(cacheKey, JSON.stringify({ ...cached, ...updates }));
    } catch {
      // Local storage full
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      let isActive = true;
      queueMicrotask(() => {
        if (!isActive) return;
        setCurrentEntry(null);
        setEntries([]);
        setLoading(false);
      });
      return () => {
        isActive = false;
      };
    }

    let isActive = true;
    const cacheKey = `asa_journey_${user.uid}`;
    const cachedData = localStorage.getItem(cacheKey);
    let hasLoadedFromCache = false;

    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        const reviveDate = (d: unknown): Date | undefined => {
          if (d instanceof Date) return d;
          if (typeof d === 'string') {
            const parsed = new Date(d);
            return isNaN(parsed.getTime()) ? undefined : parsed;
          }
          return undefined;
        };
        const reviveDates = (obj: Record<string, unknown>): Record<string, unknown> => {
          const result: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(obj)) {
            if (value instanceof Date) {
              result[key] = value;
            } else if (typeof value === 'string' && (key === 'createdAt' || key === 'updatedAt' || key === 'capturedAt')) {
              const revived = reviveDate(value);
              result[key] = revived !== undefined ? revived : new Date();
            } else if (Array.isArray(value)) {
              result[key] = value.map(item => typeof item === 'object' && item !== null ? reviveDates(item as Record<string, unknown>) : item);
            } else if (typeof value === 'object' && value !== null) {
              result[key] = reviveDates(value as Record<string, unknown>);
            } else {
              result[key] = value;
            }
          }
          return result;
        };

        const revived = reviveDates(parsed);
        queueMicrotask(() => {
          if (!isActive) return;
          setEntries((revived.entries || []) as Entry[]);
          setWisdoms((revived.wisdoms || []) as Wisdom[]);
          setNotes((revived.notes || []) as Note[]);
          setNotebooks((revived.notebooks || []) as Notebook[]);
          setIdeas((revived.ideas || []) as Idea[]);
          setHighlights((revived.highlights || []) as Highlight[]);
          setTags((revived.tags || []) as Tag[]);
          setPeople((revived.people || []) as Person[]);
          setGoals((revived.goals || []) as FocusGoal[]);
          setLoading(false);
        });
        hasLoadedFromCache = true;
      } catch {
        localStorage.removeItem(cacheKey);
      }
    }

    const unsubs: (() => void)[] = [];
    let entriesLoaded = false;
    let goalsLoaded = false;
    let tasksLoaded = false;

    const checkInitialLoadComplete = () => {
      if (entriesLoaded && goalsLoaded && tasksLoaded && !hasLoadedFromCache) {
        setLoading(false);
      }
    };

    // --- PHASE 1: Immediate Listeners (Entries, Goals, Tasks) ---
    const entriesRef = collection(db, 'users', user.uid, 'entries');
    const unsubEntries = onSnapshot(
      query(entriesRef, orderBy('date', 'desc')),
      (snapshot) => {
        const entriesData = snapshot.docs.map(doc => entryFromDoc(doc.id, doc.data()));
        setEntries(entriesData);
        updateLocalCache({ entries: entriesData });
        if (!entriesLoaded) {
          entriesLoaded = true;
          checkInitialLoadComplete();
        }
      },
      (error) => {
        console.error('[DataContext] Error listening to entries:', error);
        if (!entriesLoaded) {
          entriesLoaded = true;
          checkInitialLoadComplete();
        }
      }
    );
    unsubs.push(unsubEntries);

    const tasksRef = collection(db, 'users', user.uid, 'tasks');
    const unsubTasks = onSnapshot(
      query(tasksRef, orderBy('createdAt', 'desc')),
      (snapshot) => {
        const tasksData = snapshot.docs.map(doc => {
          const revived = reviveFirestoreValue(doc.data()) as Record<string, any>;
          return {
            id: doc.id,
            ...revived,
            createdAt: revived.createdAt instanceof Date ? revived.createdAt : new Date(),
            updatedAt: revived.updatedAt instanceof Date ? revived.updatedAt : new Date(),
            scheduledAt: revived.scheduledAt instanceof Date ? revived.scheduledAt : undefined,
          } as Task;
        });
        setTasks(tasksData);
        if (!tasksLoaded) {
          tasksLoaded = true;
          checkInitialLoadComplete();
        }
      },
      (error) => {
        console.error('[DataContext] Error listening to tasks:', error);
        if (!tasksLoaded) {
          tasksLoaded = true;
          checkInitialLoadComplete();
        }
      }
    );
    unsubs.push(unsubTasks);

    const goalsRef = collection(db, 'users', user.uid, 'goals');
    const unsubGoals = onSnapshot(
      query(goalsRef, orderBy('priority', 'asc')),
      (snapshot) => {
        const goalsData = snapshot.docs.map(doc => {
          const revived = reviveFirestoreValue(doc.data()) as Record<string, any>;
          return {
            id: doc.id,
            ...revived,
            createdAt: revived.createdAt instanceof Date ? revived.createdAt : new Date(),
            updatedAt: revived.updatedAt instanceof Date ? revived.updatedAt : new Date(),
          } as FocusGoal;
        });
        setGoals(goalsData);
        updateLocalCache({ goals: goalsData });
        if (!goalsLoaded) {
          goalsLoaded = true;
          checkInitialLoadComplete();
        }
      },
      (error) => {
        console.error('[DataContext] Error listening to goals:', error);
        if (!goalsLoaded) {
          goalsLoaded = true;
          checkInitialLoadComplete();
        }
      }
    );
    unsubs.push(unsubGoals);

    // --- PHASE 2: Deferred Listeners (Wisdoms, Notes, Notebooks, Ideas) (500ms delay) ---
    const phase2Timeout = setTimeout(() => {
      if (!isActive) return;

      const wisdomsRef = collection(db, 'users', user.uid, 'wisdoms');
      const unsubWisdoms = onSnapshot(
        query(wisdomsRef, orderBy('createdAt', 'desc')),
        (snapshot) => {
          const wisdomsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          })) as Wisdom[];
          setWisdoms(wisdomsData);
          updateLocalCache({ wisdoms: wisdomsData });
        },
        (error) => {
          console.error('[DataContext] Error listening to wisdoms:', error);
        }
      );
      unsubs.push(unsubWisdoms);

      const notesRef = collection(db, 'users', user.uid, 'notes');
      const unsubNotes = onSnapshot(
        query(notesRef, orderBy('createdAt', 'desc')),
        (snapshot) => {
          const notesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          })) as Note[];
          setNotes(notesData);
          updateLocalCache({ notes: notesData });
        },
        (error) => {
          console.error('[DataContext] Error listening to notes:', error);
        }
      );
      unsubs.push(unsubNotes);

      const notebooksRef = collection(db, 'users', user.uid, 'notebooks');
      const unsubNotebooks = onSnapshot(
        notebooksRef,
        (snapshot) => {
          const notebooksData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              sortOrder: data.sortOrder ?? 0,
              createdAt: typeof data.createdAt?.toDate === 'function' ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
              updatedAt: typeof data.updatedAt?.toDate === 'function' ? data.updatedAt.toDate() : new Date(data.updatedAt || Date.now()),
            };
          }) as Notebook[];
          notebooksData.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
          setNotebooks(notebooksData);
          updateLocalCache({ notebooks: notebooksData });
        },
        (error) => {
          console.error('[DataContext] Error listening to notebooks:', error);
        }
      );
      unsubs.push(unsubNotebooks);

      const ideasRef = collection(db, 'users', user.uid, 'ideas');
      const unsubIdeas = onSnapshot(
        query(ideasRef, orderBy('createdAt', 'desc')),
        (snapshot) => {
          const ideasData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          })) as Idea[];
          setIdeas(ideasData);
          updateLocalCache({ ideas: ideasData });
        },
        (error) => {
          console.error('[DataContext] Error listening to ideas:', error);
        }
      );
      unsubs.push(unsubIdeas);
    }, 500);

    // --- PHASE 3: Deeply Deferred Listeners (Tags, People, TagGroups, PersonGroups) (1500ms delay) ---
    const phase3Timeout = setTimeout(() => {
      if (!isActive) return;

      const tagGroupsRef = collection(db, 'users', user.uid, 'tagGroups');
      const unsubTagGroups = onSnapshot(
        query(tagGroupsRef, orderBy('createdAt', 'desc')),
        (snapshot) => {
          const tagGroupsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          })) as TagGroup[];
          setTagGroups(tagGroupsData);
          updateLocalCache({ tagGroups: tagGroupsData });
        },
        (error) => {
          console.error('[DataContext] Error listening to tagGroups:', error);
        }
      );
      unsubs.push(unsubTagGroups);

      const tagsRef = collection(db, 'users', user.uid, 'tags');
      const unsubTags = onSnapshot(
        query(tagsRef),
        (snapshot) => {
          const tagsData = snapshot.docs
            .map(doc => ({
              id: doc.data().id || doc.id,
              ...doc.data(),
              name: doc.data().name || doc.id,
              createdAt: doc.data().createdAt?.toDate() || new Date(),
              firstMentioned: doc.data().firstMentioned?.toDate?.() || doc.data().firstMentioned || undefined,
            })) as Tag[];
          const sortedTags = tagsData.sort((a, b) => (b.count || 0) - (a.count || 0));
          setTags(sortedTags);
          updateLocalCache({ tags: sortedTags });
        },
        (error) => {
          console.error('[DataContext] Error listening to tags:', error);
        }
      );
      unsubs.push(unsubTags);

      const peopleRef = collection(db, 'users', user.uid, 'people');
      const unsubPeople = onSnapshot(
        query(peopleRef),
        (snapshot) => {
          const peopleData = snapshot.docs
            .map(doc => ({
              id: doc.data().id || doc.id,
              ...doc.data(),
              name: doc.data().name || doc.id,
              createdAt: doc.data().createdAt?.toDate() || new Date(),
              firstMentioned: doc.data().firstMentioned?.toDate?.() || doc.data().firstMentioned || undefined,
            })) as Person[];
          const sortedPeople = peopleData.sort((a, b) => (b.mentions || 0) - (a.mentions || 0));
          setPeople(sortedPeople);
          updateLocalCache({ people: sortedPeople });
        },
        (error) => {
          console.error('[DataContext] Error listening to people:', error);
        }
      );
      unsubs.push(unsubPeople);

      const personGroupsRef = collection(db, 'users', user.uid, 'personGroups');
      const unsubPersonGroups = onSnapshot(
        query(personGroupsRef, orderBy('createdAt', 'desc')),
        (snapshot) => {
          const personGroupsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          })) as PersonGroup[];
          setPersonGroups(personGroupsData);
          updateLocalCache({ personGroups: personGroupsData });
        },
        (error) => {
          console.error('[DataContext] Error listening to personGroups:', error);
        }
      );
      unsubs.push(unsubPersonGroups);
    }, 1500);

    const fallbackTimeout = setTimeout(() => {
      if (isActive && !hasLoadedFromCache) {
        setLoading(false);
      }
    }, 3000);

    return () => {
      isActive = false;
      clearTimeout(phase2Timeout);
      clearTimeout(phase3Timeout);
      clearTimeout(fallbackTimeout);
      unsubs.forEach(unsub => unsub());
    };
  }, [user, updateLocalCache]);

  const getEntryByDate = useCallback(async (date: string): Promise<Entry | null> => {
    if (!user) return null;
    const entryRef = doc(db, 'users', user.uid, 'entries', date);
    const entryDoc = await getDoc(entryRef);
    if (entryDoc.exists()) {
      return entryFromDoc(entryDoc.id, entryDoc.data());
    }
    return null;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const loadCurrentEntry = async () => {
      const entry = await getEntryByDate(currentDate);
      setCurrentEntry(entry);
    };
    loadCurrentEntry();
  }, [user, currentDate, getEntryByDate]);

  const syncTokenCollections = useCallback(async (nextEntries: Entry[]) => {
    if (!user) return;

    const tagUsage = new Map<string, TokenUsage>();
    const peopleUsage = new Map<string, TokenUsage>();

    nextEntries.forEach((entry) => {
      entry.bullets.forEach((bullet) => {
        extractTagNames(bullet.text).forEach((tagName) => {
          addUsage(tagUsage, findCanonicalName(tagName, tagsRef.current), entry.date);
        });
        extractMentionNames(bullet.text).forEach((personName) => {
          addUsage(peopleUsage, findCanonicalName(personName, peopleRef.current), entry.date);
        });
      });
    });

    const nextTags: Tag[] = [];
    const touchedTagNames = new Set<string>();

    await Promise.all([
      ...Array.from(tagUsage.entries()).map(async ([tagName, usage]) => {
        const existing = tagsRef.current.find(tag => tag.name.toLowerCase() === tagName);
        const updatedTag: Tag = {
          ...(existing || {
            id: uuidv4(),
            name: tagName,
            createdAt: usage.firstMentioned,
          }),
          count: usage.count,
          firstMentioned: existing?.firstMentioned && existing.firstMentioned < usage.firstMentioned
            ? existing.firstMentioned
            : usage.firstMentioned,
          totalDays: usage.days.size,
        };

        touchedTagNames.add(tagName);
        nextTags.push(updatedTag);
        await setDoc(doc(db, 'users', user.uid, 'tags', updatedTag.name), removeUndefinedFields(updatedTag), { merge: true });
      }),
      ...tagsRef.current
        .filter(tag => !tagUsage.has(tag.name.toLowerCase()))
        .map(async (tag) => {
          touchedTagNames.add(tag.name.toLowerCase());
          await deleteDoc(doc(db, 'users', user.uid, 'tags', tag.name));
        }),
    ]);

    const untouchedTags = tagsRef.current.filter(tag => !touchedTagNames.has(tag.name.toLowerCase()));
    const sortedTags = [...nextTags, ...untouchedTags]
      .filter(tag => tag.count > 0)
      .sort((a, b) => (b.count || 0) - (a.count || 0));
    setTags(sortedTags);
    updateLocalCache({ tags: sortedTags });

    const nextPeople: Person[] = [];
    const touchedPersonNames = new Set<string>();

    await Promise.all([
      ...Array.from(peopleUsage.entries()).map(async ([personName, usage]) => {
        const existing = peopleRef.current.find(person => person.name.toLowerCase() === personName);
        const updatedPerson: Person = {
          ...(existing || {
            id: uuidv4(),
            name: personName,
            createdAt: usage.firstMentioned,
          }),
          mentions: usage.count,
          firstMentioned: existing?.firstMentioned && existing.firstMentioned < usage.firstMentioned
            ? existing.firstMentioned
            : usage.firstMentioned,
          totalDays: usage.days.size,
        };

        touchedPersonNames.add(personName);
        nextPeople.push(updatedPerson);
        await setDoc(doc(db, 'users', user.uid, 'people', updatedPerson.name.toLowerCase()), removeUndefinedFields(updatedPerson), { merge: true });
      }),
      ...peopleRef.current
        .filter(person => !peopleUsage.has(person.name.toLowerCase()))
        .map(async (person) => {
          touchedPersonNames.add(person.name.toLowerCase());
          await deleteDoc(doc(db, 'users', user.uid, 'people', person.name.toLowerCase()));
        }),
    ]);

    const untouchedPeople = peopleRef.current.filter(person => !touchedPersonNames.has(person.name.toLowerCase()));
    const sortedPeople = [...nextPeople, ...untouchedPeople]
      .filter(person => person.mentions > 0)
      .sort((a, b) => (b.mentions || 0) - (a.mentions || 0));
    setPeople(sortedPeople);
    updateLocalCache({ people: sortedPeople });
  }, [updateLocalCache, user]);

  const runSyncTokenCollections = useCallback((nextEntries: Entry[]) => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(() => {
      syncTokenCollections(nextEntries).catch(() => undefined);
    }, 2000);
  }, [syncTokenCollections]);

  const syncEntryTasksInFirestore = async (entry: Entry, oldEntry?: Entry) => {
    if (!user) return;
    const oldChecklistBullets = oldEntry 
      ? (oldEntry.bullets || []).filter(b => b.style === 'checklist') 
      : [];
    const newChecklistBullets = (entry.bullets || []).filter(b => b.style === 'checklist');

    const oldIds = oldChecklistBullets.map(b => b.id);
    const newIds = newChecklistBullets.map(b => b.id);

    // 1. Delete tasks that are no longer checklists or were deleted
    const idsToDelete = oldIds.filter(id => !newIds.includes(id));
    for (const id of idsToDelete) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'tasks', id));
      } catch (err) {
        console.error('[DataContext] Error deleting task doc:', err);
      }
    }

    // 2. Upsert tasks that are new or changed
    for (const bullet of newChecklistBullets) {
      const oldBullet = oldChecklistBullets.find(b => b.id === bullet.id);
      const isChanged = !oldBullet || 
        oldBullet.text !== bullet.text || 
        oldBullet.isCompleted !== bullet.isCompleted || 
        String(oldBullet.scheduledAt) !== String(bullet.scheduledAt);

      if (isChanged) {
        try {
          const taskRef = doc(db, 'users', user.uid, 'tasks', bullet.id);
          await setDoc(taskRef, {
            id: bullet.id,
            text: bullet.text,
            isCompleted: bullet.isCompleted,
            createdAt: bullet.createdAt instanceof Date ? bullet.createdAt : new Date(bullet.createdAt),
            updatedAt: new Date(),
            entryDate: entry.date,
            isFromNote: false,
            reminderSent: false,
            ...(bullet.scheduledAt ? { scheduledAt: bullet.scheduledAt instanceof Date ? bullet.scheduledAt : new Date(bullet.scheduledAt) } : {})
          });
        } catch (err) {
          console.error('[DataContext] Error setting task doc:', err);
        }
      }
    }
  };

  const saveEntry = async (entry: Entry) => {
    if (!user) return;
    const oldEntry = entries.find(e => e.id === entry.id || e.date === entry.date);
    const nextEntries = (() => {
      const idx = entries.findIndex(e => e.id === entry.id || e.date === entry.date);
      if (idx >= 0) {
        const updated = [...entries];
        updated[idx] = entry;
        return updated;
      }
      return [entry, ...entries];
    })();

    if (entry.date === currentDate) {
      setCurrentEntry(entry);
    }
    setEntries(nextEntries);
    const entryRef = doc(db, 'users', user.uid, 'entries', entry.date);
    await setDoc(entryRef, {
      ...(removeUndefinedFields(entry) as Entry),
      ...(!entry.media || entry.media.length === 0 ? { media: deleteField() } : {}),
      ...(!entry.location ? { location: deleteField() } : {}),
      ...(!entry.weather ? { weather: deleteField() } : {}),
      ...(!entry.condition ? { condition: deleteField() } : {}),
      ...(!entry.dailyInsight ? { dailyInsight: deleteField() } : {}),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // Sync tasks in tasks subcollection
    await syncEntryTasksInFirestore(entry, oldEntry);

    runSyncTokenCollections(nextEntries);
  };

  // One-time tasks migration effect
  useEffect(() => {
    if (!user || loading) return;

    const migrationFlag = `tasks_migrated_v1_${user.uid}`;
    if (localStorage.getItem(migrationFlag) === 'true') return;

    const runMigration = async () => {
      console.log('[DataContext] Starting tasks migration...');
      try {
        if (entries.length === 0) {
          console.log('[DataContext] No entries found, marking migration as complete.');
          localStorage.setItem(migrationFlag, 'true');
          return;
        }

        // Collect all checklist tasks from all entries
        const allChecklistTasks: { id: string; bullet: Bullet; entryDate: string }[] = [];
        for (const entry of entries) {
          const checklists = (entry.bullets || []).filter(b => b.style === 'checklist');
          for (const bullet of checklists) {
            allChecklistTasks.push({
              id: bullet.id,
              bullet,
              entryDate: entry.date
            });
          }
        }

        if (allChecklistTasks.length === 0) {
          console.log('[DataContext] No old tasks to migrate.');
          localStorage.setItem(migrationFlag, 'true');
          return;
        }

        console.log(`[DataContext] Found ${allChecklistTasks.length} tasks to migrate.`);

        // Migrate in batches of 500
        const BATCH_LIMIT = 500;
        for (let i = 0; i < allChecklistTasks.length; i += BATCH_LIMIT) {
          const batch = writeBatch(db);
          const chunk = allChecklistTasks.slice(i, i + BATCH_LIMIT);
          for (const item of chunk) {
            const taskRef = doc(db, 'users', user.uid, 'tasks', item.id);
            batch.set(taskRef, {
              id: item.id,
              text: item.bullet.text,
              isCompleted: !!item.bullet.isCompleted,
              createdAt: item.bullet.createdAt instanceof Date ? item.bullet.createdAt : new Date(item.bullet.createdAt),
              updatedAt: item.bullet.updatedAt instanceof Date ? item.bullet.updatedAt : new Date(item.bullet.updatedAt),
              entryDate: item.entryDate,
              isFromNote: false,
              reminderSent: false,
              ...(item.bullet.scheduledAt ? { scheduledAt: item.bullet.scheduledAt instanceof Date ? item.bullet.scheduledAt : new Date(item.bullet.scheduledAt) } : {})
            }, { merge: true });
          }
          await batch.commit();
          console.log(`[DataContext] Migrated batch ${Math.floor(i / BATCH_LIMIT) + 1}`);
        }

        localStorage.setItem(migrationFlag, 'true');
        console.log('[DataContext] Tasks migration completed successfully.');
      } catch (err) {
        console.error('[DataContext] Tasks migration failed:', err);
      }
    };

    runMigration();
  }, [user, loading, entries]);

  useEffect(() => {
    if (!user || loading) return;

    const signature = entries
      .map(entry => `${entry.date}:${entry.bullets.map(bullet => `${bullet.id}:${bullet.text}`).join('|')}`)
      .sort()
      .join('||');

    if (signature === lastTokenSyncSignatureRef.current) return;
    lastTokenSyncSignatureRef.current = signature;

    runSyncTokenCollections(entries);
  }, [entries, loading, runSyncTokenCollections, user]);

  useEffect(() => {
    if (loading) return;
    const extractedHighlights: Highlight[] = [];
    entries.forEach(entry => {
      entry.bullets.forEach(bullet => {
        if (bullet.isHighlight) {
          extractedHighlights.push({
            id: bullet.id,
            bulletId: bullet.id,
            entryId: entry.id,
            entryDate: entry.date,
            content: bullet.text,
            createdAt: bullet.createdAt || entry.createdAt || new Date(),
          });
        }
      });
    });

    const currentBulletIds = new Set(highlights.map(h => h.bulletId));
    const extractedBulletIds = new Set(extractedHighlights.map(h => h.bulletId));
    
    const isDifferent = 
      currentBulletIds.size !== extractedBulletIds.size ||
      [...extractedBulletIds].some(id => !currentBulletIds.has(id)) ||
      extractedHighlights.some(eh => {
        const found = highlights.find(h => h.bulletId === eh.bulletId);
        return found ? found.content !== eh.content : true;
      });

    if (isDifferent) {
      setHighlights(extractedHighlights);
      updateLocalCache({ highlights: extractedHighlights });
    }
  }, [entries, loading, highlights, updateLocalCache]);

  const getEntriesForDateRange = async (startDate: string, endDate: string): Promise<Entry[]> => {
    if (!user) return [];
    const entriesRef = collection(db, 'users', user.uid, 'entries');
    const q = query(entriesRef);
    const snapshot = await getDocs(q);
    const allEntries = snapshot.docs.map(doc => entryFromDoc(doc.id, doc.data()));
    return allEntries
      .filter(e => e.date >= startDate && e.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const addBullet = async (text: string, style: Bullet['style'] = 'bullet', data: BulletDraftOptions = {}): Promise<Bullet> => {
    // Run NLP Parser only for checklists!
    const isChecklist = style === 'checklist';
    const { cleanText, parsedDate, hasCustomDate, hasCustomTime } = isChecklist
      ? parseAndStripNLP(text, currentDate)
      : { cleanText: text, parsedDate: undefined, hasCustomDate: false, hasCustomTime: false };

    // Creation timestamp always remains the exact log entry creation date/time
    const bulletCreatedAt = data.createdAt || new Date();
    
    // Parsed date/time from NLP goes strictly into scheduledAt (as task deadline)
    const bulletScheduledAt = (isChecklist && (hasCustomDate || hasCustomTime)) ? parsedDate : undefined;

    const bullet: Bullet = {
      id: uuidv4(),
      text: cleanText,
      style,
      isHighlight: data.isHighlight ?? cleanText.includes('*'),
      tags: extractTagNames(cleanText),
      mentions: extractMentionNames(cleanText),
      isCompleted: false,
      ...(data.source ? { source: data.source } : {}),
      ...(data.sourceType ? { sourceType: data.sourceType } : {}),
      ...(data.sourceId ? { sourceId: data.sourceId } : {}),
      createdAt: bulletCreatedAt,
      updatedAt: new Date(),
      ...(bulletScheduledAt ? { scheduledAt: bulletScheduledAt } : {})
    };
    const entry = currentEntry || { id: currentDate, date: currentDate, dream: '', bullets: [], createdAt: new Date(), updatedAt: new Date() };
    const updatedEntry = {
      ...entry,
      bullets: [...entry.bullets, bullet],
      updatedAt: new Date(),
    };
    await saveEntry(updatedEntry);
    return bullet;
  };

  const addQuickJournalBullet = async (
    text: string,
    style: Bullet['style'] = 'bullet',
    isHighlight = false
  ): Promise<Bullet | null> => {
    if (!user) return null;
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    
    let entry = entries.find(e => e.date === todayKey);
    
    if (!entry) {
      const entryRef = doc(db, 'users', user.uid, 'entries', todayKey);
      const entrySnap = await getDoc(entryRef);
      if (entrySnap.exists()) {
        entry = entryFromDoc(todayKey, entrySnap.data());
      } else {
        entry = {
          id: todayKey,
          date: todayKey,
          dream: '',
          bullets: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
    }

    const isChecklist = style === 'checklist';
    const { cleanText, parsedDate, hasCustomDate, hasCustomTime } = isChecklist
      ? parseAndStripNLP(text, todayKey)
      : { cleanText: text, parsedDate: undefined, hasCustomDate: false, hasCustomTime: false };

    const bulletCreatedAt = new Date();
    const bulletScheduledAt = (isChecklist && (hasCustomDate || hasCustomTime)) ? parsedDate : undefined;

    const bullet: Bullet = {
      id: uuidv4(),
      text: cleanText,
      style,
      isHighlight: isHighlight ?? cleanText.includes('*'),
      tags: extractTagNames(cleanText),
      mentions: extractMentionNames(cleanText),
      isCompleted: false,
      createdAt: bulletCreatedAt,
      updatedAt: new Date(),
      ...(bulletScheduledAt ? { scheduledAt: bulletScheduledAt } : {})
    };

    const updatedEntry = {
      ...entry,
      bullets: [...entry.bullets, bullet],
      updatedAt: new Date(),
    };

    await saveEntry(updatedEntry);
    return bullet;
  };

  const updateBullet = async (bulletId: string, data: Partial<Bullet>) => {
    // Find the bullet in currentEntry first
    let bullet = currentEntry?.bullets.find(b => b.id === bulletId);
    let targetEntry = currentEntry;

    if (!bullet) {
      // Search all loaded entries
      for (const entry of entries) {
        const found = entry.bullets.find(b => b.id === bulletId);
        if (found) {
          bullet = found;
          targetEntry = entry;
          break;
        }
      }
    }

    if (!bullet || !targetEntry) return;

    const bulletIndex = targetEntry.bullets.findIndex(b => b.id === bulletId);
    if (bulletIndex < 0) return;

    const originalBullet = targetEntry.bullets[bulletIndex];
    
    // Create copy of updates
    const updates = { ...data };
    const targetStyle = updates.style ?? originalBullet.style;
    const isChecklist = targetStyle === 'checklist';

    // If text is updated, OR if style changed to checklist (meaning they might want to parse the existing text)
    const textToParse = data.text !== undefined ? data.text : (updates.style === 'checklist' && originalBullet.style !== 'checklist' ? originalBullet.text : null);

    if (textToParse !== null) {
      if (isChecklist) {
        // Parse NLP on the text!
        const { cleanText, parsedDate, hasCustomDate, hasCustomTime } = parseAndStripNLP(textToParse, targetEntry.date);
        updates.text = cleanText;
        updates.tags = extractTagNames(cleanText);
        updates.mentions = extractMentionNames(cleanText);
        updates.isHighlight = cleanText.includes('*');
        
        // If NLP matched, update the scheduledAt field (leaving createdAt alone!)
        if (hasCustomDate || hasCustomTime) {
          updates.scheduledAt = parsedDate;
        }
      } else {
        updates.text = textToParse;
        updates.tags = extractTagNames(textToParse);
        updates.mentions = extractMentionNames(textToParse);
        updates.isHighlight = textToParse.includes('*');
      }
    }

    const updatedBullet = { ...originalBullet, ...updates, updatedAt: new Date() };
    if (!isChecklist) {
      delete updatedBullet.scheduledAt;
    }
    const updatedBullets = [...targetEntry.bullets];
    updatedBullets[bulletIndex] = updatedBullet;

    const updatedEntry = { ...targetEntry, bullets: updatedBullets, updatedAt: new Date() };

    // Update state
    setEntries(prev => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e));
    if (currentEntry && currentEntry.id === updatedEntry.id) {
      setCurrentEntry(updatedEntry);
    }

    // Save to database
    if (user) {
      const entryRef = doc(db, 'users', user.uid, 'entries', updatedEntry.id);
      await setDoc(entryRef, {
        ...updatedEntry,
        createdAt: updatedEntry.createdAt,
        updatedAt: updatedEntry.updatedAt,
        bullets: updatedEntry.bullets.map(b => ({
          ...b,
          createdAt: b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt),
          updatedAt: b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt),
          ...(b.scheduledAt ? { scheduledAt: b.scheduledAt instanceof Date ? b.scheduledAt : new Date(b.scheduledAt) } : {})
        }))
      });
      await syncEntryTasksInFirestore(updatedEntry, targetEntry);
    }

    // Sync text change to the linked collection item (wisdom/note/idea)
    if (updates.text && originalBullet.source && originalBullet.sourceId && !isSyncingSourceRef.current) {
      isSyncingSourceRef.current = true;
      try {
        if (originalBullet.source === 'wisdom') {
          await updateWisdom(originalBullet.sourceId, { content: updates.text });
        } else if (originalBullet.source === 'note') {
          const colonIndex = updates.text.indexOf(': ');
          if (colonIndex > 0) {
            await updateNote(originalBullet.sourceId, {
              title: updates.text.substring(0, colonIndex),
              content: updates.text.substring(colonIndex + 2),
            });
          } else {
            await updateNote(originalBullet.sourceId, { content: updates.text });
          }
        } else if (originalBullet.source === 'idea') {
          await updateIdea(originalBullet.sourceId, { content: updates.text });
        }
      } finally {
        isSyncingSourceRef.current = false;
      }
    }
  };

  const deleteBullet = async (bulletId: string) => {
    let bullet = currentEntry?.bullets.find(b => b.id === bulletId);
    let targetEntry = currentEntry;

    if (!bullet) {
      for (const entry of entries) {
        const found = entry.bullets.find(b => b.id === bulletId);
        if (found) {
          bullet = found;
          targetEntry = entry;
          break;
        }
      }
    }

    if (!bullet || !targetEntry) return;

    const sourceId = bullet.sourceId || (() => {
      if (!bullet.source) return undefined;
      if (bullet.source === 'wisdom') {
        return wisdoms.find(w =>
          w.linkedEntryId === targetEntry.date &&
          w.content === bullet.text &&
          (!bullet.sourceType || w.type === bullet.sourceType)
        )?.id;
      }
      if (bullet.source === 'note') {
        return notes.find(note => {
          const noteBulletText = note.content ? (note.title ? `${note.title}: ${note.content}` : note.content) : note.title;
          return (note.linkedEntryId === targetEntry.date || note.linkedDate === targetEntry.date) && noteBulletText === bullet.text;
        })?.id;
      }
      if (bullet.source === 'idea') {
        return ideas.find(idea =>
          idea.linkedEntries?.includes(targetEntry.date) &&
          idea.content === bullet.text
        )?.id;
      }
      return undefined;
    })();

    // If bullet has source, delete the source data too
    if (bullet.source && sourceId) {
      if (bullet.source === 'wisdom') {
        await deleteWisdom(sourceId);
      } else if (bullet.source === 'note') {
        await deleteNote(sourceId);
      } else if (bullet.source === 'idea') {
        await deleteIdea(sourceId);
      }
    }

    const updatedBullets = targetEntry.bullets.filter(b => b.id !== bulletId);
    const updatedEntry = { ...targetEntry, bullets: updatedBullets, updatedAt: new Date() };
    await saveEntry(updatedEntry);
  };

  const toggleHighlight = async (bulletId: string) => {
    if (!currentEntry) return;
    const bullet = currentEntry.bullets.find(b => b.id === bulletId);
    if (!bullet) return;
    if (!bullet.isHighlight) {
      const highlight: Highlight = { id: uuidv4(), bulletId: bullet.id, entryId: currentEntry.id, entryDate: currentEntry.date, content: bullet.text, createdAt: new Date() };
      setHighlights(prev => [...prev, highlight]);
    } else {
      setHighlights(prev => prev.filter(h => h.bulletId !== bulletId));
    }
    await updateBullet(bulletId, { isHighlight: !bullet.isHighlight });
  };

  const toggleBulletComplete = async (bulletId: string) => {
    // Find the bullet in currentEntry first
    let bullet = currentEntry?.bullets.find(b => b.id === bulletId);
    let targetEntry = currentEntry;

    if (!bullet) {
      // Search all loaded entries
      for (const entry of entries) {
        const found = entry.bullets.find(b => b.id === bulletId);
        if (found) {
          bullet = found;
          targetEntry = entry;
          break;
        }
      }
    }

    if (!bullet || !targetEntry) return;

    const nextCompleted = !bullet.isCompleted;

    const bulletIndex = targetEntry.bullets.findIndex(b => b.id === bulletId);
    if (bulletIndex < 0) return;

    const originalBullet = targetEntry.bullets[bulletIndex];
    const updatedBullet = { ...originalBullet, isCompleted: nextCompleted, updatedAt: new Date() };
    const updatedBullets = [...targetEntry.bullets];
    updatedBullets[bulletIndex] = updatedBullet;

    const updatedEntry = { ...targetEntry, bullets: updatedBullets, updatedAt: new Date() };

    // Update state
    setEntries(prev => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e));
    if (currentEntry && currentEntry.id === updatedEntry.id) {
      setCurrentEntry(updatedEntry);
    }

    // Save to database
    if (user) {
      const entryRef = doc(db, 'users', user.uid, 'entries', updatedEntry.id);
      await setDoc(entryRef, {
        ...updatedEntry,
        createdAt: updatedEntry.createdAt,
        updatedAt: updatedEntry.updatedAt,
        bullets: updatedEntry.bullets.map(b => ({
          ...b,
          createdAt: b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt),
          updatedAt: b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt),
          ...(b.scheduledAt ? { scheduledAt: b.scheduledAt instanceof Date ? b.scheduledAt : new Date(b.scheduledAt) } : {})
        }))
      });
      await syncEntryTasksInFirestore(updatedEntry, targetEntry);
    }

    // Synchronize bullet status with goals containing this as a sub-goal
    await syncBulletToSubGoals(bulletId, nextCompleted);

    // Play soft ascending done jingle
    if (nextCompleted) {
      playChecklistJingle();
    }
  };

  const updateDream = async (dream: string) => {
    const cleanDream = dream.trim();
    const entry = currentEntry || { id: currentDate, date: currentDate, dream: '', bullets: [], createdAt: new Date(), updatedAt: new Date() };
    const updatedEntry = { ...entry, dream: cleanDream, updatedAt: new Date() };
    await saveEntry(updatedEntry);
  };

  const addWisdom = async (type: Wisdom['type'], content: string, linkedEntryId?: string): Promise<Wisdom | null> => {
    if (!user) return null;
    const wisdom: Wisdom = {
      id: uuidv4(),
      type,
      content,
      ...(linkedEntryId ? { linkedEntryId } : {}),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setWisdoms(prev => [wisdom, ...prev]);
    const wisdomRef = doc(db, 'users', user.uid, 'wisdoms', wisdom.id);
    await setDoc(wisdomRef, removeUndefinedFields(wisdom));
    return wisdom;
  };

  const updateWisdom = async (wisdomId: string, data: Partial<Wisdom>) => {
    if (!user) return;
    const cleanData = Object.fromEntries(
      Object.entries({ ...data, updatedAt: new Date() }).filter(([, value]) => value !== undefined)
    ) as Partial<Wisdom>;
    setWisdoms(prev => prev.map(w => w.id === wisdomId ? { ...w, ...cleanData } : w));
    const wisdomRef = doc(db, 'users', user.uid, 'wisdoms', wisdomId);
    await setDoc(wisdomRef, removeUndefinedFields(cleanData), { merge: true });

    // Sync content change to linked bullets across all entries
    if (data.content && !isSyncingSourceRef.current) {
      isSyncingSourceRef.current = true;
      try {
        const updatedEntries = entries.map(entry => {
          const hasBulletToUpdate = entry.bullets.some(b => b.sourceId === wisdomId && b.source === 'wisdom');
          if (!hasBulletToUpdate) return entry;
          return {
            ...entry,
            bullets: entry.bullets.map(b =>
              b.sourceId === wisdomId && b.source === 'wisdom'
                ? { ...b, text: data.content!, tags: extractTagNames(data.content!), mentions: extractMentionNames(data.content!), updatedAt: new Date() }
                : b
            ),
            updatedAt: new Date(),
          };
        });
        const changedEntries = updatedEntries.filter((entry, i) => entry !== entries[i]);
        for (const entry of changedEntries) {
          await saveEntry(entry);
        }
      } finally {
        isSyncingSourceRef.current = false;
      }
    }
  };

  const deleteWisdom = async (wisdomId: string) => {
    if (!user) return;
    setWisdoms(prev => prev.filter(w => w.id !== wisdomId));
    await deleteDoc(doc(db, 'users', user.uid, 'wisdoms', wisdomId));
  };

  const getWisdomOfTheDay = (): Wisdom | null => {
    if (wisdoms.length === 0) return null;
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayWisdoms = wisdoms.filter(w => format(w.createdAt, 'yyyy-MM-dd') === today);
    if (todayWisdoms.length > 0) return todayWisdoms[Math.floor(Math.random() * todayWisdoms.length)];
    return wisdoms[Math.floor(Math.random() * wisdoms.length)];
  };

  const addNote = async (
    title: string,
    content: string,
    labels: string[] = [],
    linkedDate?: string,
    additionalData?: Partial<Note>
  ): Promise<Note | null> => {
    if (!user) return null;
    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
    const characterCount = content.length;
    const note: Note = {
      id: uuidv4(),
      title,
      content,
      contentMarkdown: additionalData?.contentMarkdown || content,
      labels,
      tags: additionalData?.tags || labels,
      mentions: additionalData?.mentions || [],
      notebookId: additionalData?.notebookId,
      notebookName: additionalData?.notebookName,
      linkedJournalDate: additionalData?.linkedJournalDate || linkedDate,
      linkedJournalEntryId: additionalData?.linkedJournalEntryId || linkedDate,
      linkedJournalDates: additionalData?.linkedJournalDates || (linkedDate ? [linkedDate] : []),
      linkedJournalEntryIds: additionalData?.linkedJournalEntryIds || (linkedDate ? [linkedDate] : []),
      linkedDate: additionalData?.linkedDate || linkedDate,
      linkedEntryId: additionalData?.linkedEntryId || linkedDate,
      embeddedWisdomIds: additionalData?.embeddedWisdomIds || [],
      embeddedIdeaIds: additionalData?.embeddedIdeaIds || [],
      source: additionalData?.source || (linkedDate ? 'fab' : 'collection'),
      status: additionalData?.status || 'saved',
      pinned: additionalData?.pinned || false,
      favorite: additionalData?.favorite || false,
      wordCount,
      characterCount,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setNotes(prev => [note, ...prev]);
    const noteRef = doc(db, 'users', user.uid, 'notes', note.id);
    await setDoc(noteRef, removeUndefinedFields(note));

    // Auto-tagging & Mentions extraction
    if (note.contentMarkdown) {
      await extractAndSaveTags(note.contentMarkdown);
      await extractAndSavePeople(note.contentMarkdown);
    }

    return note;
  };

  const updateNote = async (noteId: string, data: Partial<Note>) => {
    if (!user) return;

    let countUpdates: Partial<Note> = {};
    if (data.contentMarkdown !== undefined) {
      const text = data.contentMarkdown;
      countUpdates.wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
      countUpdates.characterCount = text.length;
      countUpdates.content = text; // Sync text content
    } else if (data.content !== undefined) {
      const text = data.content;
      countUpdates.wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
      countUpdates.characterCount = text.length;
    }

    const cleanData = removeUndefinedFields({ ...data, ...countUpdates, updatedAt: new Date() }) as Partial<Note>;
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, ...cleanData } : n));
    const noteRef = doc(db, 'users', user.uid, 'notes', noteId);
    await setDoc(noteRef, cleanData, { merge: true });

    // Save tags and mentions if markdown was updated
    if (data.contentMarkdown) {
      await extractAndSaveTags(data.contentMarkdown);
      await extractAndSavePeople(data.contentMarkdown);
    }

    // Sync content change to linked bullets across all entries
    if ((data.title !== undefined || data.content !== undefined || countUpdates.content !== undefined) && !isSyncingSourceRef.current) {
      isSyncingSourceRef.current = true;
      try {
        const note = notes.find(n => n.id === noteId);
        const newTitle = data.title ?? note?.title ?? '';
        const newContent = data.content ?? countUpdates.content ?? note?.content ?? '';
        const bulletText = newContent ? (newTitle ? `${newTitle}: ${newContent}` : newContent) : newTitle;

        const updatedEntries = entries.map(entry => {
          const hasBulletToUpdate = entry.bullets.some(b => b.sourceId === noteId && b.source === 'note');
          if (!hasBulletToUpdate) return entry;
          return {
            ...entry,
            bullets: entry.bullets.map(b =>
              b.sourceId === noteId && b.source === 'note'
                ? { ...b, text: bulletText, tags: extractTagNames(bulletText), mentions: extractMentionNames(bulletText), updatedAt: new Date() }
                : b
            ),
            updatedAt: new Date(),
          };
        });
        const changedEntries = updatedEntries.filter((entry, i) => entry !== entries[i]);
        for (const entry of changedEntries) {
          await saveEntry(entry);
        }
      } finally {
        isSyncingSourceRef.current = false;
      }
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!user) return;
    setNotes(prev => prev.filter(n => n.id !== noteId));
    await deleteDoc(doc(db, 'users', user.uid, 'notes', noteId));
  };

  const toggleNoteChecklist = async (noteId: string, taskText: string) => {
    if (!user) return;
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const lines = (note.contentMarkdown || '').split('\n');
    let updated = false;
    let bulletId = '';
    let isCompleted = false;

    const updatedLines = lines.map((line, index) => {
      const match = line.match(/^(\s*[-*]\s+\[\s*([ xX]?)\s*\]\s+)(.+)$/);
      if (match) {
        const text = match[3].trim();
        if (text === taskText.trim()) {
          const currentStatus = match[2].toLowerCase() === 'x';
          const newStatus = currentStatus ? ' ' : 'x';
          updated = true;
          bulletId = `note_${noteId}_line_${index}`;
          isCompleted = !currentStatus;
          const prefix = match[1].replace(/\[\s*[ xX]?\s*\]/, `[${newStatus}]`);
          return `${prefix}${match[3]}`;
        }
      }
      return line;
    });

    if (updated) {
      const newMarkdown = updatedLines.join('\n');
      await updateNote(noteId, {
        contentMarkdown: newMarkdown,
        content: newMarkdown
      });
      if (bulletId) {
        await syncBulletToSubGoals(bulletId, isCompleted);
      }
    }
  };

  const addNotebook = async (name: string, description: string = '', color: string = '', icon: string = ''): Promise<Notebook | null> => {
    if (!user) return null;
    const maxSort = notebooks.reduce((max, n) => Math.max(max, n.sortOrder), 0);
    const notebook: Notebook = {
      id: uuidv4(),
      userId: user.uid,
      name,
      description,
      color,
      icon,
      sortOrder: maxSort + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setNotebooks(prev => [...prev, notebook]);
    const notebookRef = doc(db, 'users', user.uid, 'notebooks', notebook.id);
    await setDoc(notebookRef, removeUndefinedFields(notebook));
    return notebook;
  };

  const updateNotebook = async (notebookId: string, data: Partial<Notebook>) => {
    if (!user) return;
    const cleanData = removeUndefinedFields({ ...data, updatedAt: new Date() }) as Partial<Notebook>;
    setNotebooks(prev => prev.map(n => n.id === notebookId ? { ...n, ...cleanData } : n));
    const notebookRef = doc(db, 'users', user.uid, 'notebooks', notebookId);
    await setDoc(notebookRef, cleanData, { merge: true });
  };

  const deleteNotebook = async (notebookId: string) => {
    if (!user) return;
    
    // Move all notes under this notebook to uncategorized (notebookId = undefined, notebookName = undefined)
    const notesToUpdate = notes.filter(n => n.notebookId === notebookId);
    for (const note of notesToUpdate) {
      await updateNote(note.id, { notebookId: deleteField() as any, notebookName: deleteField() as any });
    }

    setNotebooks(prev => prev.filter(n => n.id !== notebookId));
    await deleteDoc(doc(db, 'users', user.uid, 'notebooks', notebookId));
  };

  const addIdea = async (content: string, linkedEntryId?: string): Promise<Idea | null> => {
    if (!user) return null;
    const idea: Idea = {
      id: uuidv4(),
      content,
      ...(linkedEntryId ? { linkedEntries: [linkedEntryId] } : {}),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setIdeas(prev => [idea, ...prev]);
    const ideaRef = doc(db, 'users', user.uid, 'ideas', idea.id);
    await setDoc(ideaRef, removeUndefinedFields(idea));
    return idea;
  };

  const updateIdea = async (ideaId: string, data: Partial<Idea>) => {
    if (!user) return;
    const cleanData = removeUndefinedFields({ ...data, updatedAt: new Date() }) as Partial<Idea>;
    setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, ...cleanData } : i));
    const ideaRef = doc(db, 'users', user.uid, 'ideas', ideaId);
    await setDoc(ideaRef, cleanData, { merge: true });

    // Sync content change to linked bullets across all entries
    if (data.content && !isSyncingSourceRef.current) {
      isSyncingSourceRef.current = true;
      try {
        const updatedEntries = entries.map(entry => {
          const hasBulletToUpdate = entry.bullets.some(b => b.sourceId === ideaId && b.source === 'idea');
          if (!hasBulletToUpdate) return entry;
          return {
            ...entry,
            bullets: entry.bullets.map(b =>
              b.sourceId === ideaId && b.source === 'idea'
                ? { ...b, text: data.content!, tags: extractTagNames(data.content!), mentions: extractMentionNames(data.content!), updatedAt: new Date() }
                : b
            ),
            updatedAt: new Date(),
          };
        });
        const changedEntries = updatedEntries.filter((entry, i) => entry !== entries[i]);
        for (const entry of changedEntries) {
          await saveEntry(entry);
        }
      } finally {
        isSyncingSourceRef.current = false;
      }
    }
  };

  const deleteIdea = async (ideaId: string) => {
    if (!user) return;
    setIdeas(prev => prev.filter(i => i.id !== ideaId));
    await deleteDoc(doc(db, 'users', user.uid, 'ideas', ideaId));
  };

  const getIdeaOfTheDay = (): Idea | null => {
    if (ideas.length === 0) return null;
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayIdeas = ideas.filter(i => format(i.createdAt, 'yyyy-MM-dd') === today);
    if (todayIdeas.length > 0) return todayIdeas[Math.floor(Math.random() * todayIdeas.length)];
    return ideas[Math.floor(Math.random() * ideas.length)];
  };

  const extractAndSaveTags = async (text: string) => {
    if (!user) return;
    const tagNames = extractTagNames(text);
    if (tagNames.length === 0) return;

    const now = new Date();

    setTags(prev => {
      const next = [...prev];
      tagNames.forEach((tagName) => {
        const index = next.findIndex(t =>
          t.name.toLowerCase() === tagName || (t.aliases || []).some(alias => alias.toLowerCase() === tagName)
        );

        if (index >= 0) {
          next[index] = {
            ...next[index],
            count: (next[index].count || 0) + 1,
            firstMentioned: next[index].firstMentioned || now,
          };
        } else {
          next.push({
            id: uuidv4(),
            name: tagName,
            count: 1,
            firstMentioned: now,
            createdAt: now,
          });
        }
      });

      const sorted = next.sort((a, b) => (b.count || 0) - (a.count || 0));
      updateLocalCache({ tags: sorted });
      return sorted;
    });

    await Promise.all(tagNames.map(async (tagName) => {
      const existingTag = tags.find(t =>
        t.name.toLowerCase() === tagName || (t.aliases || []).some(alias => alias.toLowerCase() === tagName)
      );
      const docId = existingTag?.name || tagName;
      await setDoc(doc(db, 'users', user.uid, 'tags', docId), {
        id: existingTag?.id || uuidv4(),
        name: existingTag?.name || tagName,
        count: increment(1),
        firstMentioned: existingTag?.firstMentioned || now,
        createdAt: existingTag?.createdAt || now,
      }, { merge: true });
    }));
  };

  const extractAndSavePeople = async (text: string) => {
    if (!user) return;
    const mentionNames = extractMentionNames(text);
    if (mentionNames.length === 0) return;

    const now = new Date();

    setPeople(prev => {
      const next = [...prev];
      mentionNames.forEach((personName) => {
        const index = next.findIndex(p =>
          p.name.toLowerCase() === personName || (p.aliases || []).some(alias => alias.toLowerCase() === personName)
        );

        if (index >= 0) {
          next[index] = {
            ...next[index],
            mentions: (next[index].mentions || 0) + 1,
            firstMentioned: next[index].firstMentioned || now,
          };
        } else {
          next.push({
            id: uuidv4(),
            name: personName,
            mentions: 1,
            firstMentioned: now,
            createdAt: now,
          });
        }
      });

      const sorted = next.sort((a, b) => (b.mentions || 0) - (a.mentions || 0));
      updateLocalCache({ people: sorted });
      return sorted;
    });

    await Promise.all(mentionNames.map(async (personName) => {
      const existingPerson = people.find(p =>
        p.name.toLowerCase() === personName ||
        (p.aliases || []).some(alias => alias.toLowerCase() === personName)
      );
      const docId = existingPerson?.name.toLowerCase() || personName.toLowerCase();
      await setDoc(doc(db, 'users', user.uid, 'people', docId), {
        id: existingPerson?.id || uuidv4(),
        name: existingPerson?.name || personName,
        mentions: increment(1),
        firstMentioned: existingPerson?.firstMentioned || now,
        createdAt: existingPerson?.createdAt || now,
      }, { merge: true });
    }));
  };

  const getHighlightsForDateRange = (startDate: string, endDate: string): Highlight[] => {
    return highlights.filter(h => h.entryDate >= startDate && h.entryDate <= endDate);
  };

  const syncBulletToSubGoals = async (bulletId: string, isCompleted: boolean) => {
    if (!user) return;
    const updatedGoals = goals.map(goal => {
      if (!goal.subGoals || goal.subGoals.length === 0) return goal;
      const hasMatchingSubGoal = goal.subGoals.some(s => s.bulletId === bulletId);
      if (!hasMatchingSubGoal) return goal;
      
      const updatedSubs = goal.subGoals.map(s => 
        s.bulletId === bulletId ? { ...s, isCompleted } : s
      );
      const progress = Math.round((updatedSubs.filter(s => s.isCompleted).length / updatedSubs.length) * 100);
      return {
        ...goal,
        subGoals: updatedSubs,
        progress,
        updatedAt: new Date()
      };
    });

    const changedGoals = updatedGoals.filter((g, i) => g !== goals[i]);
    if (changedGoals.length === 0) return;

    setGoals(updatedGoals);
    
    for (const goal of changedGoals) {
      const goalRef = doc(db, 'users', user.uid, 'goals', goal.id);
      await setDoc(goalRef, removeUndefinedFields(goal), { merge: true });
    }
  };

  const addGoal = async (content: string, data?: Partial<FocusGoal>) => {
    if (!user) return;
    const maxPriority = goals.reduce((max, g) => Math.max(max, g.priority), 0);
    const goal: FocusGoal = {
      id: uuidv4(),
      content,
      priority: maxPriority + 1,
      isCompleted: false,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    };
    setGoals(prev => [...prev, goal]);
    const goalRef = doc(db, 'users', user.uid, 'goals', goal.id);
    await setDoc(goalRef, removeUndefinedFields(goal));
  };

  const updateGoal = async (goalId: string, data: Partial<FocusGoal>) => {
    if (!user) return;
    const cleanData = removeUndefinedFields({ ...data, updatedAt: new Date() }) as Partial<FocusGoal>;
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, ...cleanData } : g));
    const goalRef = doc(db, 'users', user.uid, 'goals', goalId);
    await setDoc(goalRef, cleanData, { merge: true });
  };

  const deleteGoal = async (goalId: string) => {
    if (!user) return;
    setGoals(prev => prev.filter(g => g.id !== goalId));
    await deleteDoc(doc(db, 'users', user.uid, 'goals', goalId));
  };

  const toggleGoalComplete = async (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    await updateGoal(goalId, { isCompleted: !goal.isCompleted });
  };

  const reorderGoals = async (goalIds: string[]) => {
    if (!user) return;
    const updates = goalIds.map((id, index) => {
      const goal = goals.find(g => g.id === id);
      if (!goal) return null;
      return updateGoal(id, { priority: index + 1 });
    });
    await Promise.all(updates.filter(Boolean));
  };

  const getBulletsForTag = (tagName: string) => {
    const normalizedTag = tagName.toLowerCase();
    const results: { entryDate: string; bulletText: string; bulletId: string }[] = [];
    entries.forEach(entry => {
      entry.bullets.forEach(bullet => {
        if (bullet.tags.some(t => t.toLowerCase() === normalizedTag)) {
          results.push({ entryDate: entry.date, bulletText: bullet.text, bulletId: bullet.id });
        }
      });
    });
    return results;
  };

  const getBulletsForPerson = (personName: string) => {
    const normalizedPerson = personName.toLowerCase();
    const results: { entryDate: string; bulletText: string; bulletId: string }[] = [];
    entries.forEach(entry => {
      entry.bullets.forEach(bullet => {
        if (bullet.mentions.some(m => m.toLowerCase() === normalizedPerson)) {
          results.push({ entryDate: entry.date, bulletText: bullet.text, bulletId: bullet.id });
        }
      });
    });
    return results;
  };

  const getWeeklyData = (weekStart: string): WeeklyData => {
    const data: WeeklyData = { date: weekStart, entries: 0, bullets: 0, dreams: 0, wisdom: 0, notes: 0, ideas: 0 };
    const start = parseISO(weekStart);
    for (let i = 0; i < 7; i++) {
      const dateStr = format(addDays(start, i), 'yyyy-MM-dd');
      const entry = entries.find(e => e.date === dateStr);
      if (entry) { data.entries++; data.bullets += entry.bullets.length; if (entry.dream) data.dreams++; }
    }
    const weekEnd = format(addDays(start, 6), 'yyyy-MM-dd');
    data.wisdom = wisdoms.filter(w => {
      let d = w.linkedEntryId;
      if (!d && w.createdAt) {
        try {
          const dateObj = w.createdAt instanceof Date ? w.createdAt : (typeof (w.createdAt as any).toDate === 'function' ? (w.createdAt as any).toDate() : new Date(w.createdAt));
          d = isNaN(dateObj.getTime()) ? '' : format(dateObj, 'yyyy-MM-dd');
        } catch {
          d = '';
        }
      }
      return d ? (d >= weekStart && d <= weekEnd) : false;
    }).length;
    data.notes = notes.filter(n => {
      let d = n.linkedJournalDate || n.linkedDate || n.linkedEntryId;
      if (!d && n.createdAt) {
        try {
          const dateObj = n.createdAt instanceof Date ? n.createdAt : (typeof (n.createdAt as any).toDate === 'function' ? (n.createdAt as any).toDate() : new Date(n.createdAt));
          d = isNaN(dateObj.getTime()) ? '' : format(dateObj, 'yyyy-MM-dd');
        } catch {
          d = '';
        }
      }
      return d ? (d >= weekStart && d <= weekEnd) : false;
    }).length;
    data.ideas = ideas.filter(i => {
      let d = i.linkedEntries?.find(d => d >= weekStart && d <= weekEnd);
      if (!d && i.createdAt) {
        try {
          const dateObj = i.createdAt instanceof Date ? i.createdAt : (typeof (i.createdAt as any).toDate === 'function' ? (i.createdAt as any).toDate() : new Date(i.createdAt));
          d = isNaN(dateObj.getTime()) ? '' : format(dateObj, 'yyyy-MM-dd');
        } catch {
          d = '';
        }
      }
      return d ? (d >= weekStart && d <= weekEnd) : false;
    }).length;
    return data;
  };

  const totalEntries = entries.length;
  const totalBullets = entries.reduce((sum, e) => sum + e.bullets.length, 0);
  const totalHighlights = highlights.length;
  const totalTags = tags.length;
  const totalMentions = people.reduce((sum, p) => sum + p.mentions, 0);

  const { currentStreak, longestStreak } = useMemo(() => {
    if (entries.length === 0) return { currentStreak: 0, longestStreak: 0 };
    let current = 0, longest = 0, tempStreak = 0;
    let checkDate = new Date();
    while (true) {
      const dateStr = format(checkDate, 'yyyy-MM-dd');
      if (entries.some(e => e.date === dateStr && e.bullets.length > 0)) {
        current++;
        checkDate = addDays(checkDate, -1);
      } else break;
    }
    const sortedDates = entries.filter(e => e.bullets.length > 0).map(e => e.date).sort();
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) tempStreak = 1;
      else {
        const diff = differenceInDays(parseISO(sortedDates[i]), parseISO(sortedDates[i - 1]));
        if (diff === 1) tempStreak++;
        else { longest = Math.max(longest, tempStreak); tempStreak = 1; }
      }
    }
    longest = Math.max(longest, tempStreak);
    return { currentStreak: current, longestStreak: longest };
  }, [entries]);

  // Tag CRUD
  const updateTag = async (tagName: string, data: Partial<Tag>) => {
    if (!user) return;
    const tagToUpdate = tags.find(t => t.name === tagName);
    if (!tagToUpdate) return;
    const cleanData = removeUndefinedFields({ ...data, updatedAt: new Date() }) as Partial<Tag>;
    setTags(prev => prev.map(t => t.name === tagName ? { ...t, ...cleanData } : t));
    await setDoc(doc(db, 'users', user.uid, 'tags', tagName), cleanData, { merge: true });
  };

  const createTagGroup = async (name: string, tagNames: string[], color?: string) => {
    if (!user) return;
    const group: TagGroup = {
      id: uuidv4(),
      name,
      tags: tagNames,
      color,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setTagGroups(prev => [group, ...prev]);
    const groupRef = doc(db, 'users', user.uid, 'tagGroups', group.id);
    await setDoc(groupRef, group);
  };

  const updateTagGroup = async (groupId: string, data: Partial<TagGroup>) => {
    if (!user) return;
    const cleanData = removeUndefinedFields({ ...data, updatedAt: new Date() }) as Partial<TagGroup>;
    setTagGroups(prev => prev.map(g => g.id === groupId ? { ...g, ...cleanData } : g));
    const groupRef = doc(db, 'users', user.uid, 'tagGroups', groupId);
    await setDoc(groupRef, cleanData, { merge: true });
  };

  const deleteTagGroup = async (groupId: string) => {
    if (!user) return;
    setTagGroups(prev => prev.filter(g => g.id !== groupId));
    await deleteDoc(doc(db, 'users', user.uid, 'tagGroups', groupId));
  };

  // Person CRUD
  const updatePerson = async (personName: string, data: Partial<Person>) => {
    if (!user) return;
    const personToUpdate = people.find(p => p.name.toLowerCase() === personName.toLowerCase());
    if (!personToUpdate) return;
    const cleanData = removeUndefinedFields({ ...data, updatedAt: new Date() }) as Partial<Person>;
    setPeople(prev => prev.map(p => p.name.toLowerCase() === personName.toLowerCase() ? { ...p, ...cleanData } : p));
    await setDoc(doc(db, 'users', user.uid, 'people', personName.toLowerCase()), cleanData, { merge: true });
  };

  const createPersonGroup = async (name: string, personNames: string[]) => {
    if (!user) return;
    const group: PersonGroup = {
      id: uuidv4(),
      name,
      people: personNames,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setPersonGroups(prev => [group, ...prev]);
    const groupRef = doc(db, 'users', user.uid, 'personGroups', group.id);
    await setDoc(groupRef, group);
  };

  const updatePersonGroup = async (groupId: string, data: Partial<PersonGroup>) => {
    if (!user) return;
    const cleanData = removeUndefinedFields({ ...data, updatedAt: new Date() }) as Partial<PersonGroup>;
    setPersonGroups(prev => prev.map(g => g.id === groupId ? { ...g, ...cleanData } : g));
    const groupRef = doc(db, 'users', user.uid, 'personGroups', groupId);
    await setDoc(groupRef, cleanData, { merge: true });
  };

  const deletePersonGroup = async (groupId: string) => {
    if (!user) return;
    setPersonGroups(prev => prev.filter(g => g.id !== groupId));
    await deleteDoc(doc(db, 'users', user.uid, 'personGroups', groupId));
  };

  return (
    <DataContext.Provider value={{
      currentEntry, currentDate, setCurrentDate, entries, tasks, getEntryByDate, saveEntry, getEntriesForDateRange,
      addBullet, updateBullet, deleteBullet, toggleHighlight, toggleBulletComplete, updateDream,
      wisdoms, addWisdom, updateWisdom, deleteWisdom, getWisdomOfTheDay,
      notes, addNote, updateNote, deleteNote, toggleNoteChecklist,
      notebooks, addNotebook, updateNotebook, deleteNotebook,
      ideas, addIdea, updateIdea, deleteIdea, getIdeaOfTheDay,
      highlights, getHighlightsForDateRange,
      tags, tagGroups, updateTag, createTagGroup, updateTagGroup, deleteTagGroup,
      people, personGroups, updatePerson, createPersonGroup, updatePersonGroup, deletePersonGroup,
      extractAndSaveTags, extractAndSavePeople, getBulletsForTag, getBulletsForPerson,
      goals, addGoal, updateGoal, deleteGoal, toggleGoalComplete, reorderGoals,
      getWeeklyData,
      totalEntries, totalBullets, totalHighlights, totalTags, totalMentions, currentStreak, longestStreak,
      loading, isOnline,
      isSpotlightOpen, setIsSpotlightOpen, addQuickJournalBullet,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) throw new Error('useData must be used within a DataProvider');
  return context;
}
