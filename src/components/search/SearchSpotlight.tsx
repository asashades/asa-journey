'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { searchClientSide } from '@/lib/ai/aiClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlass,
  faXmark,
  faCheck,
  faCopy,
  faBook,
  faLightbulb,
  faNoteSticky,
  faHistory,
  faChevronRight,
  faCrosshairs,
  faListCheck,
  faWandMagicSparkles,
  faMoon,
  faTree,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';

type SearchDocType = 'journal' | 'note' | 'wisdom' | 'idea' | 'goal' | 'task';

interface ContextDoc {
  id: string;
  type: SearchDocType;
  title: string;
  content: string;
  date?: string;
}

export default function SearchSpotlight() {
  const {
    isSearchOpen,
    setIsSearchOpen,
    entries,
    notes,
    wisdoms,
    ideas,
    goals,
    tasks
  } = useData();

  const { userProfile } = useAuth();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [referencedDocs, setReferencedDocs] = useState<ContextDoc[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('recent_ai_searches');
        if (saved) {
          setRecentSearches(JSON.parse(saved));
        }
      } catch (err) {
        console.warn('Failed to load recent searches from localStorage', err);
      }
    }
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (isSearchOpen) {
      setQuery('');
      setAnswer(null);
      setReferencedDocs([]);
      setErrorMsg(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isSearchOpen]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    if (isSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchOpen, setIsSearchOpen]);

  const saveRecentSearch = (text: string) => {
    if (!text.trim()) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== text.trim().toLowerCase());
      const next = [text.trim(), ...filtered].slice(0, 5);
      try {
        localStorage.setItem('recent_ai_searches', JSON.stringify(next));
      } catch (err) {
        console.warn('Failed to save recent searches', err);
      }
      return next;
    });
  };

  const getTimestamp = (obj: any, fallbackDateStr?: string): number => {
    if (!obj) return 0;
    if (obj.createdAt) {
      if (typeof obj.createdAt.toDate === 'function') {
        return obj.createdAt.toDate().getTime();
      }
      const t = new Date(obj.createdAt).getTime();
      if (!isNaN(t)) return t;
    }
    if (obj.updatedAt) {
      if (typeof obj.updatedAt.toDate === 'function') {
        return obj.updatedAt.toDate().getTime();
      }
      const t = new Date(obj.updatedAt).getTime();
      if (!isNaN(t)) return t;
    }
    if (fallbackDateStr) {
      const t = new Date(fallbackDateStr).getTime();
      if (!isNaN(t)) return t;
    }
    return 0;
  };

  // Client-side pre-filtering RAG retrieval
  const retrieveRelevantDocs = (searchQuery: string): ContextDoc[] => {
    // Clean punctuation and split into lowercase search terms
    const cleanQuery = searchQuery
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?\u2019]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    
    const terms = cleanQuery.split(/\s+/).filter(Boolean);

    const allDocs: (ContextDoc & { timestamp: number })[] = [];

    // 1. Gather Journal Entries
    entries.forEach((entry) => {
      let content = '';
      if (entry.dream?.trim()) {
        content += `Dream: ${entry.dream}\n`;
      }
      entry.bullets.forEach((b) => {
        content += `- ${b.text}\n`;
      });

      if (content.trim()) {
        const ts = getTimestamp(entry, entry.date);
        allDocs.push({
          id: entry.date,
          type: 'journal',
          title: `Journal - ${entry.date}`,
          content: content.trim(),
          date: entry.date,
          timestamp: ts
        });
      }
    });

    // 2. Gather Notes
    notes.forEach((note) => {
      if (note.status !== 'deleted' && note.status !== 'archived') {
        const ts = getTimestamp(note, note.linkedDate || note.linkedJournalDate);
        allDocs.push({
          id: note.id,
          type: 'note',
          title: note.title || 'Untitled Note',
          content: note.content || '',
          date: note.linkedDate || note.linkedJournalDate,
          timestamp: ts
        });
      }
    });

    // 3. Gather Wisdoms
    wisdoms.forEach((w) => {
      const ts = getTimestamp(w, w.linkedEntryId);
      allDocs.push({
        id: w.id,
        type: 'wisdom',
        title: `Wisdom (${w.type})`,
        content: w.content || '',
        date: w.linkedEntryId,
        timestamp: ts
      });
    });

    // 4. Gather Ideas
    ideas.forEach((idea) => {
      const ts = getTimestamp(idea, idea.linkedEntries?.[0]);
      allDocs.push({
        id: idea.id,
        type: 'idea',
        title: 'Idea Log',
        content: idea.content || '',
        date: idea.linkedEntries?.[0],
        timestamp: ts
      });
    });

    // 5. Gather Goals
    goals.forEach((goal) => {
      const ts = getTimestamp(goal, goal.deadline);
      allDocs.push({
        id: goal.id,
        type: 'goal',
        title: `Goal (Priority: ${goal.priority})`,
        content: goal.content || '',
        timestamp: ts
      });
    });

    // 6. Gather Tasks
    tasks.forEach((task) => {
      const ts = getTimestamp(task, task.entryDate);
      allDocs.push({
        id: task.id,
        type: 'task',
        title: `Task Checklist`,
        content: `${task.text} (Status: ${task.isCompleted ? 'Completed' : 'Pending'})`,
        date: task.entryDate,
        timestamp: ts
      });
    });

    // Sort all gathered documents chronologically descending
    const chronologicallySorted = [...allDocs].sort((a, b) => b.timestamp - a.timestamp);

    if (terms.length === 0) {
      return chronologicallySorted.slice(0, 12);
    }

    // Rank documents based on matching keywords
    const scoredDocs = allDocs.map((doc) => {
      let score = 0;
      const docTitleLower = doc.title.toLowerCase();
      const docContentLower = doc.content.toLowerCase();

      terms.forEach((term) => {
        // Keyword match in title
        if (docTitleLower.includes(term)) score += 10;
        
        // Exact term match occurrences in content
        const contentMatches = docContentLower.split(term).length - 1;
        score += contentMatches * 2;
      });

      // Bonus score for exact phrase match
      const phrase = terms.join(' ');
      if (docContentLower.includes(phrase)) score += 15;
      if (docTitleLower.includes(phrase)) score += 25;

      return { doc, score };
    });

    // Start with keyword-matched docs
    const matchedDocs = scoredDocs
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.doc);

    // To prevent duplicates, track by a composite key
    const resultDocsMap = new Map<string, ContextDoc>();
    matchedDocs.forEach(d => resultDocsMap.set(`${d.type}-${d.id}`, d));

    // Detect if this is a general list/chronological query (e.g. "what last notes", "apa note terakhir", "latest entries")
    // or if the specific keyword search yielded very few results (< 4)
    const isGeneralOrTimeQuery = terms.some(t =>
      ['last', 'latest', 'recent', 'today', 'yesterday', 'terakhir', 'baru', 'hari ini', 'kemarin', 'what', 'apa', 'show', 'list', 'all', 'semua', 'notes', 'note', 'jurnal', 'journal', 'wisdom', 'idea', 'goal', 'task', 'tasks'].includes(t)
    );

    if (isGeneralOrTimeQuery || matchedDocs.length < 4) {
      const recentNotes = chronologicallySorted.filter(d => d.type === 'note').slice(0, 5);
      const recentJournals = chronologicallySorted.filter(d => d.type === 'journal').slice(0, 5);
      const recentOthers = chronologicallySorted.filter(d => ['wisdom', 'idea', 'goal', 'task'].includes(d.type)).slice(0, 5);

      const addDocs = (docsList: ContextDoc[]) => {
        for (const doc of docsList) {
          const key = `${doc.type}-${doc.id}`;
          if (!resultDocsMap.has(key) && resultDocsMap.size < 12) {
            resultDocsMap.set(key, doc);
          }
        }
      };

      addDocs(recentNotes);
      addDocs(recentJournals);
      addDocs(recentOthers);
    }

    return Array.from(resultDocsMap.values());
  };

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setAnswer(null);
    setReferencedDocs([]);
    setErrorMsg(null);
    saveRecentSearch(searchQuery);

    try {
      // 1. Get relevant docs locally
      const relevantDocs = retrieveRelevantDocs(searchQuery);

      if (relevantDocs.length === 0) {
        setAnswer("Sorry, I couldn't find any relevant entries or notes in your Journal, Notes, or Wisdom logs.");
        setIsSearching(false);
        return;
      }

      let data: any = null;
      let success = false;

      // 2. Try calling backend API first (works in dev environment/SSR)
      try {
        const response = await fetch('/api/ai/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: searchQuery,
            userId: userProfile?.uid || 'anonymous',
            relevantDocs,
            aiConfig: userProfile?.settings?.aiConfig
          })
        });

        const text = await response.text();
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html') || response.status === 404) {
          throw new Error('API route returned HTML or 404. Running client-side fallback.');
        }

        data = JSON.parse(text);
        success = response.ok && data.success;
      } catch (fetchErr) {
        console.warn('[SearchSpotlight] API route failed or returned HTML. Running search client-side...', fetchErr);
        data = await searchClientSide(
          searchQuery,
          relevantDocs,
          userProfile?.uid || 'anonymous',
          userProfile?.settings?.aiConfig
        );
        success = data.success;
      }

      if (success && data) {
        setAnswer(data.answer);
        
        // Match referenced document IDs to show preview cards
        const refs = relevantDocs.filter((doc) => data.referencedIds?.includes(doc.id));
        setReferencedDocs(refs.length > 0 ? refs : relevantDocs.slice(0, 3));
      } else {
        throw new Error(data?.message || 'Failed to process search.');
      }
    } catch (err: any) {
      console.error('[SearchSpotlight] Error:', err);
      setErrorMsg(err.message || 'A system error occurred while performing the AI search.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(query);
    }
  };

  const handleCopy = async () => {
    if (!answer) return;
    try {
      await navigator.clipboard.writeText(answer);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const navigateToDoc = (doc: ContextDoc) => {
    setIsSearchOpen(false);
    if (doc.type === 'journal' || doc.type === 'task') {
      router.push(`/write?date=${doc.id}`);
    } else if (doc.type === 'note') {
      router.push(`/notes/new?id=${doc.id}`);
    } else if (doc.type === 'wisdom') {
      router.push(`/write?date=${doc.date || doc.id}`);
    } else if (doc.type === 'idea') {
      router.push(`/write?date=${doc.date || doc.id}`);
    } else if (doc.type === 'goal') {
      router.push(`/goals`);
    }
  };

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-neutral-900/40 dark:bg-black/60 backdrop-blur-md transition-all duration-300">
      <div
        ref={modalRef}
        className="w-full max-w-2xl bg-white/95 dark:bg-neutral-900/95 border border-[#EEF0EF] dark:border-neutral-800 rounded-3xl shadow-2xl flex flex-col max-h-[75vh] overflow-hidden transition-all duration-500 scale-100 focus-within:shadow-[0_20px_50px_rgba(0,220,125,0.06)]"
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3.5 px-5 py-4 border-b border-[#EEF0EF] dark:border-neutral-800 flex-shrink-0">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask your second brain..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-base md:text-lg text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 font-sans"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="w-6 h-6 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-neutral-600 transition-colors active:scale-95"
            >
              <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setIsSearchOpen(false)}
            className="text-xs font-bold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors uppercase tracking-wider font-mono select-none"
          >
            esc
          </button>
        </div>

        {/* Scrollable Content Pane */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin scrollbar-thumb-neutral-200">
          
          {/* Recent Searches (shown when no query & no active answer) */}
          {!query && !answer && !isSearching && (
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest flex items-center gap-1.5 select-none">
                <FontAwesomeIcon icon={faHistory} className="w-3 h-3" />
                Recent Searches
              </h4>
              {recentSearches.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {recentSearches.map((s, idx) => (
                    <button
                      key={`${s}-${idx}`}
                      onClick={() => {
                        setQuery(s);
                        handleSearch(s);
                      }}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/40 text-sm font-medium text-neutral-600 dark:text-neutral-300 text-left transition-colors cursor-pointer group"
                    >
                      <span className="truncate">{s}</span>
                      <FontAwesomeIcon icon={faChevronRight} className="w-2.5 h-2.5 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-medium text-neutral-400 dark:text-neutral-600 italic select-none">No search history yet.</p>
              )}
            </div>
          )}

          {/* Thinking / Loading State */}
          {isSearching && (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="relative mb-5 flex h-14 w-14 items-center justify-center">
                {/* Concentric planetary orbit loader */}
                <span className="absolute h-full w-full rounded-full border-2 border-[#00DC7D]/10" />
                <span className="absolute h-full w-full animate-spin rounded-full border-2 border-t-[#00DC7D] border-r-transparent border-b-transparent border-l-transparent" />
                <div className="h-2.5 w-2.5 animate-ping rounded-full bg-[#00DC7D] opacity-75" />
              </div>
              <h4 className="font-serif text-sm font-bold text-neutral-800 dark:text-neutral-200">Connecting stellar memories...</h4>
              <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500 font-mono animate-pulse">Filtering journals, notes & synthesizing answer...</p>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 text-xs font-semibold text-[#FF453A] animate-fade-in">
              {errorMsg}
            </div>
          )}

          {/* Synthesized Response */}
          {!isSearching && answer && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                <h4 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest flex items-center gap-1.5 select-none">
                  <FontAwesomeIcon icon={faWandMagicSparkles} className="w-3 h-3 text-[#00DC7D]" />
                  Synthesized Brain Output
                </h4>
                
                {/* Copy to Clipboard Button with checkmark feedback */}
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all duration-200 active:scale-95 cursor-pointer ${
                    isCopied
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/40'
                      : 'bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700/80 text-neutral-500 dark:text-neutral-400'
                  }`}
                  title="Copy synthesized answer"
                >
                  <FontAwesomeIcon icon={isCopied ? faCheck : faCopy} className="w-3 h-3" />
                  <span>{isCopied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              {/* AI synthesized response displayed in Serif font */}
              <div className="font-serif text-sm md:text-base font-light leading-relaxed text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap select-text p-1">
                {answer}
              </div>
            </div>
          )}

          {/* Referenced Source Documents */}
          {!isSearching && answer && referencedDocs.length > 0 && (
            <div className="space-y-3 pt-2 animate-in fade-in duration-300">
              <h4 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest select-none">
                Referenced Sources
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {referencedDocs.map((doc) => {
                  const getStyle = () => {
                    switch (doc.type) {
                      case 'journal':
                        return { icon: faBook, text: 'text-[#00875A] dark:text-[#00C58A]' };
                      case 'note':
                        return { icon: faNoteSticky, text: 'text-[#0052CC] dark:text-[#579DFF]' };
                      case 'wisdom':
                        return { icon: faTree, text: 'text-[#8B00D4] dark:text-[#C494FF]' };
                      case 'idea':
                        return { icon: faLightbulb, text: 'text-[#B45309] dark:text-[#FBBF24]' };
                      case 'goal':
                        return { icon: faCrosshairs, text: 'text-[#0D9488] dark:text-[#2DD4BF]' };
                      default:
                        return { icon: faListCheck, text: 'text-[#6F7476] dark:text-neutral-400' };
                    }
                  };

                  const style = getStyle();

                  return (
                    <button
                      key={doc.id}
                      onClick={() => navigateToDoc(doc)}
                      className="flex items-start gap-3 p-3.5 rounded-2xl border border-[#EEF0EF] bg-gray-50 hover:bg-gray-100 transition-all hover:scale-[1.02] active:scale-[0.98] text-left cursor-pointer w-full"
                    >
                      <span className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-white shadow-sm ${style.text}`}>
                        <FontAwesomeIcon icon={style.icon} className="w-3 h-3" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-[#2F3331] truncate leading-snug">
                          {doc.title}
                        </span>
                        <span className="block text-[10px] text-[#6F7476] font-mono mt-0.5 truncate uppercase">
                          {doc.type} {doc.date && `• ${doc.date}`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
