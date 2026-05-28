'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Entry, Bullet, Wisdom, Note, Idea, Highlight, Tag, Person, FocusGoal, WeeklyData } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { format, subDays, startOfWeek, addDays, parseISO, differenceInDays } from 'date-fns';

interface DataContextType {
  currentEntry: Entry | null;
  currentDate: string;
  setCurrentDate: (date: string) => void;
  entries: Entry[];
  getEntryByDate: (date: string) => Promise<Entry | null>;
  saveEntry: (entry: Entry) => Promise<void>;
  getEntriesForDateRange: (startDate: string, endDate: string) => Promise<Entry[]>;
  addBullet: (text: string, style?: Bullet['style']) => Promise<Bullet>;
  updateBullet: (bulletId: string, data: Partial<Bullet>) => Promise<void>;
  deleteBullet: (bulletId: string) => Promise<void>;
  toggleHighlight: (bulletId: string) => Promise<void>;
  updateDream: (dream: string) => Promise<void>;
  wisdoms: Wisdom[];
  addWisdom: (type: Wisdom['type'], content: string, linkedEntryId?: string) => Promise<void>;
  getWisdomOfTheDay: () => Wisdom | null;
  notes: Note[];
  addNote: (title: string, content: string, labels?: string[]) => Promise<void>;
  updateNote: (noteId: string, data: Partial<Note>) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  ideas: Idea[];
  addIdea: (content: string) => Promise<void>;
  updateIdea: (ideaId: string, data: Partial<Idea>) => Promise<void>;
  deleteIdea: (ideaId: string) => Promise<void>;
  getIdeaOfTheDay: () => Idea | null;
  highlights: Highlight[];
  getHighlightsForDateRange: (startDate: string, endDate: string) => Highlight[];
  tags: Tag[];
  people: Person[];
  extractAndSaveTags: (text: string) => void;
  extractAndSavePeople: (text: string) => void;
  goals: FocusGoal[];
  addGoal: (content: string) => Promise<void>;
  updateGoal: (goalId: string, data: Partial<FocusGoal>) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  toggleGoalComplete: (goalId: string) => Promise<void>;
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
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [currentEntry, setCurrentEntry] = useState<Entry | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [wisdoms, setWisdoms] = useState<Wisdom[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [goals, setGoals] = useState<FocusGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    setIsOnline(navigator.onLine);
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
    ideas: Idea[];
    highlights: Highlight[];
    tags: Tag[];
    people: Person[];
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
      setCurrentEntry(null);
      setEntries([]);
      setLoading(false);
      return;
    }

    const cacheKey = `asa_journey_${user.uid}`;
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        setEntries(parsed.entries || []);
        setWisdoms(parsed.wisdoms || []);
        setNotes(parsed.notes || []);
        setIdeas(parsed.ideas || []);
        setHighlights(parsed.highlights || []);
        setTags(parsed.tags || []);
        setPeople(parsed.people || []);
        setGoals(parsed.goals || []);
      } catch {
        localStorage.removeItem(cacheKey);
      }
    }

    const entriesRef = collection(db, 'users', user.uid, 'entries');
    const unsubEntries = onSnapshot(
      query(entriesRef, orderBy('date', 'desc'), limit(100)),
      (snapshot) => {
        const entriesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        })) as Entry[];
        setEntries(entriesData);
        updateLocalCache({ entries: entriesData });
      }
    );

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
      }
    );

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
      }
    );

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
      }
    );

    const goalsRef = collection(db, 'users', user.uid, 'goals');
    const unsubGoals = onSnapshot(
      query(goalsRef, orderBy('priority', 'asc')),
      (snapshot) => {
        const goalsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        })) as FocusGoal[];
        setGoals(goalsData);
        updateLocalCache({ goals: goalsData });
      }
    );

    setLoading(false);

    return () => {
      unsubEntries();
      unsubWisdoms();
      unsubNotes();
      unsubIdeas();
      unsubGoals();
    };
  }, [user, updateLocalCache]);

  useEffect(() => {
    if (!user) return;
    const loadCurrentEntry = async () => {
      const entry = await getEntryByDate(currentDate);
      setCurrentEntry(entry);
    };
    loadCurrentEntry();
  }, [user, currentDate]);

  const getEntryByDate = async (date: string): Promise<Entry | null> => {
    if (!user) return null;
    const entryRef = doc(db, 'users', user.uid, 'entries', date);
    const entryDoc = await getDoc(entryRef);
    if (entryDoc.exists()) {
      return {
        id: entryDoc.id,
        ...entryDoc.data(),
        createdAt: entryDoc.data().createdAt?.toDate() || new Date(),
        updatedAt: entryDoc.data().updatedAt?.toDate() || new Date(),
      } as Entry;
    }
    return null;
  };

  const saveEntry = async (entry: Entry) => {
    if (!user) return;
    setCurrentEntry(entry);
    setEntries(prev => {
      const idx = prev.findIndex(e => e.id === entry.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = entry;
        return updated;
      }
      return [entry, ...prev];
    });
    const entryRef = doc(db, 'users', user.uid, 'entries', entry.date);
    await setDoc(entryRef, {
      ...entry,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    entry.bullets.forEach(bullet => {
      extractAndSaveTags(bullet.text);
      extractAndSavePeople(bullet.text);
    });
  };

  const getEntriesForDateRange = async (startDate: string, endDate: string): Promise<Entry[]> => {
    if (!user) return [];
    const entriesRef = collection(db, 'users', user.uid, 'entries');
    const q = query(entriesRef);
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      }))
      .filter(e => e.date >= startDate && e.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date)) as Entry[];
  };

  const addBullet = async (text: string, style: Bullet['style'] = 'bullet'): Promise<Bullet> => {
    const bullet: Bullet = {
      id: uuidv4(),
      text,
      style,
      isHighlight: text.includes('*'),
      tags: text.match(/#(\w+)/g)?.map(t => t.slice(1)) || [],
      mentions: text.match(/@(\w+)/g)?.map(m => m.slice(1)) || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    let entry = currentEntry;
    if (!entry) {
      entry = { id: currentDate, date: currentDate, dream: '', bullets: [], createdAt: new Date(), updatedAt: new Date() };
    }
    entry.bullets.push(bullet);
    entry.updatedAt = new Date();
    await saveEntry(entry);
    return bullet;
  };

  const updateBullet = async (bulletId: string, data: Partial<Bullet>) => {
    if (!currentEntry) return;
    const bulletIndex = currentEntry.bullets.findIndex(b => b.id === bulletId);
    if (bulletIndex < 0) return;
    const updatedBullet = { ...currentEntry.bullets[bulletIndex], ...data, updatedAt: new Date() };
    if (data.text) {
      updatedBullet.tags = data.text.match(/#(\w+)/g)?.map(t => t.slice(1)) || [];
      updatedBullet.mentions = data.text.match(/@(\w+)/g)?.map(m => m.slice(1)) || [];
      updatedBullet.isHighlight = data.text.includes('*');
    }
    const updatedBullets = [...currentEntry.bullets];
    updatedBullets[bulletIndex] = updatedBullet;
    const updatedEntry = { ...currentEntry, bullets: updatedBullets, updatedAt: new Date() };
    await saveEntry(updatedEntry);
  };

  const deleteBullet = async (bulletId: string) => {
    if (!currentEntry) return;
    const updatedBullets = currentEntry.bullets.filter(b => b.id !== bulletId);
    const updatedEntry = { ...currentEntry, bullets: updatedBullets, updatedAt: new Date() };
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

  const updateDream = async (dream: string) => {
    let entry = currentEntry;
    if (!entry) {
      entry = { id: currentDate, date: currentDate, dream: '', bullets: [], createdAt: new Date(), updatedAt: new Date() };
    }
    const newDream = entry.dream ? `${entry.dream}\n${dream}` : dream;
    const updatedEntry = { ...entry, dream: newDream, updatedAt: new Date() };
    await saveEntry(updatedEntry);
  };

  const addWisdom = async (type: Wisdom['type'], content: string, linkedEntryId?: string) => {
    if (!user) return;
    const wisdom: Wisdom = { id: uuidv4(), type, content, linkedEntryId, createdAt: new Date(), updatedAt: new Date() };
    setWisdoms(prev => [wisdom, ...prev]);
    const wisdomRef = doc(db, 'users', user.uid, 'wisdoms', wisdom.id);
    await setDoc(wisdomRef, wisdom);
  };

  const getWisdomOfTheDay = (): Wisdom | null => {
    if (wisdoms.length === 0) return null;
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayWisdoms = wisdoms.filter(w => format(w.createdAt, 'yyyy-MM-dd') === today);
    if (todayWisdoms.length > 0) return todayWisdoms[Math.floor(Math.random() * todayWisdoms.length)];
    return wisdoms[Math.floor(Math.random() * wisdoms.length)];
  };

  const addNote = async (title: string, content: string, labels: string[] = []) => {
    if (!user) return;
    const note: Note = { id: uuidv4(), title, content, labels, createdAt: new Date(), updatedAt: new Date() };
    setNotes(prev => [note, ...prev]);
    const noteRef = doc(db, 'users', user.uid, 'notes', note.id);
    await setDoc(noteRef, note);
  };

  const updateNote = async (noteId: string, data: Partial<Note>) => {
    if (!user) return;
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, ...data, updatedAt: new Date() } : n));
    const noteRef = doc(db, 'users', user.uid, 'notes', noteId);
    await setDoc(noteRef, data, { merge: true });
  };

  const deleteNote = async (noteId: string) => {
    if (!user) return;
    setNotes(prev => prev.filter(n => n.id !== noteId));
    await deleteDoc(doc(db, 'users', user.uid, 'notes', noteId));
  };

  const addIdea = async (content: string) => {
    if (!user) return;
    const idea: Idea = { id: uuidv4(), content, createdAt: new Date(), updatedAt: new Date() };
    setIdeas(prev => [idea, ...prev]);
    const ideaRef = doc(db, 'users', user.uid, 'ideas', idea.id);
    await setDoc(ideaRef, idea);
  };

  const updateIdea = async (ideaId: string, data: Partial<Idea>) => {
    if (!user) return;
    setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, ...data, updatedAt: new Date() } : i));
    const ideaRef = doc(db, 'users', user.uid, 'ideas', ideaId);
    await setDoc(ideaRef, data, { merge: true });
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

  const extractAndSaveTags = (text: string) => {
    if (!user) return;
    (text.match(/#(\w+)/g) || []).forEach(async (tag) => {
      const tagName = tag.slice(1).toLowerCase();
      const existingTag = tags.find(t => t.name === tagName);
      if (existingTag) {
        const updatedTag = { ...existingTag, count: existingTag.count + 1 };
        setTags(prev => prev.map(t => t.name === tagName ? updatedTag : t));
        await setDoc(doc(db, 'users', user.uid, 'tags', tagName), updatedTag, { merge: true });
      } else {
        const newTag: Tag = { id: uuidv4(), name: tagName, count: 1, createdAt: new Date() };
        setTags(prev => [...prev, newTag]);
        await setDoc(doc(db, 'users', user.uid, 'tags', tagName), newTag);
      }
    });
  };

  const extractAndSavePeople = (text: string) => {
    if (!user) return;
    (text.match(/@(\w+)/g) || []).forEach(async (mention) => {
      const personName = mention.slice(1);
      const existingPerson = people.find(p => p.name.toLowerCase() === personName.toLowerCase());
      if (existingPerson) {
        const updatedPerson = { ...existingPerson, mentions: existingPerson.mentions + 1 };
        setPeople(prev => prev.map(p => p.name.toLowerCase() === personName.toLowerCase() ? updatedPerson : p));
        await setDoc(doc(db, 'users', user.uid, 'people', personName.toLowerCase()), updatedPerson, { merge: true });
      } else {
        const newPerson: Person = { id: uuidv4(), name: personName, mentions: 1, createdAt: new Date() };
        setPeople(prev => [...prev, newPerson]);
        await setDoc(doc(db, 'users', user.uid, 'people', personName.toLowerCase()), newPerson);
      }
    });
  };

  const getHighlightsForDateRange = (startDate: string, endDate: string): Highlight[] => {
    return highlights.filter(h => h.entryDate >= startDate && h.entryDate <= endDate);
  };

  const addGoal = async (content: string) => {
    if (!user) return;
    const maxPriority = goals.reduce((max, g) => Math.max(max, g.priority), 0);
    const goal: FocusGoal = { id: uuidv4(), content, priority: maxPriority + 1, isCompleted: false, createdAt: new Date(), updatedAt: new Date() };
    setGoals(prev => [...prev, goal]);
    const goalRef = doc(db, 'users', user.uid, 'goals', goal.id);
    await setDoc(goalRef, goal);
  };

  const updateGoal = async (goalId: string, data: Partial<FocusGoal>) => {
    if (!user) return;
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, ...data, updatedAt: new Date() } : g));
    const goalRef = doc(db, 'users', user.uid, 'goals', goalId);
    await setDoc(goalRef, data, { merge: true });
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

  const getWeeklyData = (weekStart: string): WeeklyData => {
    const data: WeeklyData = { date: weekStart, entries: 0, bullets: 0, dreams: 0, wisdom: 0, notes: 0, ideas: 0 };
    const start = parseISO(weekStart);
    for (let i = 0; i < 7; i++) {
      const dateStr = format(addDays(start, i), 'yyyy-MM-dd');
      const entry = entries.find(e => e.date === dateStr);
      if (entry) { data.entries++; data.bullets += entry.bullets.length; if (entry.dream) data.dreams++; }
    }
    const weekEnd = format(addDays(start, 6), 'yyyy-MM-dd');
    data.wisdom = wisdoms.filter(w => { const d = format(w.createdAt, 'yyyy-MM-dd'); return d >= weekStart && d <= weekEnd; }).length;
    data.notes = notes.filter(n => { const d = format(n.createdAt, 'yyyy-MM-dd'); return d >= weekStart && d <= weekEnd; }).length;
    data.ideas = ideas.filter(i => { const d = format(i.createdAt, 'yyyy-MM-dd'); return d >= weekStart && d <= weekEnd; }).length;
    return data;
  };

  const totalEntries = entries.length;
  const totalBullets = entries.reduce((sum, e) => sum + e.bullets.length, 0);
  const totalHighlights = highlights.length;
  const totalTags = tags.length;
  const totalMentions = people.reduce((sum, p) => sum + p.mentions, 0);

  const calculateStreak = () => {
    if (entries.length === 0) return { current: 0, longest: 0 };
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
    return { current, longest };
  };

  const { current: currentStreak, longest: longestStreak } = calculateStreak();

  return (
    <DataContext.Provider value={{
      currentEntry, currentDate, setCurrentDate, entries, getEntryByDate, saveEntry, getEntriesForDateRange,
      addBullet, updateBullet, deleteBullet, toggleHighlight, updateDream,
      wisdoms, addWisdom, getWisdomOfTheDay,
      notes, addNote, updateNote, deleteNote,
      ideas, addIdea, updateIdea, deleteIdea, getIdeaOfTheDay,
      highlights, getHighlightsForDateRange,
      tags, people, extractAndSaveTags, extractAndSavePeople,
      goals, addGoal, updateGoal, deleteGoal, toggleGoalComplete,
      getWeeklyData,
      totalEntries, totalBullets, totalHighlights, totalTags, totalMentions, currentStreak, longestStreak,
      loading, isOnline,
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
