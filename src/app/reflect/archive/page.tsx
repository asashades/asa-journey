'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCalendarDays, faChevronRight, faCompass, faInbox, faRotateRight } from '@fortawesome/free-solid-svg-icons';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { AIInsight } from '@/types/ai';
import WeeklyInsightResult from '@/components/ai/WeeklyInsightResult';
import AILoadingState from '@/components/ai/AILoadingState';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export default function ReflectionArchivePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { addGoal } = useData();
  const [recaps, setRecaps] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecapId, setSelectedRecapId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recapToDelete, setRecapToDelete] = useState<AIInsight | null>(null);

  // Filter states
  const [filterScope, setFilterScope] = useState<'alltime' | 'year'>('alltime');
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [isFilterDialOpen, setIsFilterDialOpen] = useState(false);

  // Fetch all weekly reflections from firestore
  const fetchRecaps = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const colRef = collection(db, 'users', user.uid, 'aiInsights');
      const snap = await getDocs(colRef);
      const list = snap.docs
        .map(d => d.data() as AIInsight)
        .filter(item => item.type === 'weekly');
      
      // Sort in memory by weekStart descending
      list.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
      
      setRecaps(list);
      
      if (list.length > 0 && !selectedRecapId) {
        setSelectedRecapId(list[0].id);
      }
    } catch (err) {
      console.error('Error fetching weekly reflections archive:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecaps();
  }, [user]);

  const availableYears = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear()]);
    recaps.forEach(recap => {
      try {
        const year = parseISO(recap.weekStart).getFullYear();
        if (!isNaN(year)) years.add(year);
      } catch (err) {
        console.error(err);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [recaps]);

  const filteredRecaps = useMemo(() => {
    return recaps.filter(recap => {
      if (filterScope === 'alltime') return true;
      try {
        const year = parseISO(recap.weekStart).getFullYear();
        return year === selectedYear;
      } catch {
        return false;
      }
    });
  }, [recaps, filterScope, selectedYear]);

  useEffect(() => {
    if (filteredRecaps.length > 0) {
      const exists = filteredRecaps.some(r => r.id === selectedRecapId);
      if (!exists) {
        setSelectedRecapId(filteredRecaps[0].id);
      }
    } else {
      setSelectedRecapId(null);
    }
  }, [filteredRecaps, selectedRecapId]);

  const selectedRecap = useMemo(() => {
    return filteredRecaps.find(r => r.id === selectedRecapId) || null;
  }, [filteredRecaps, selectedRecapId]);

  const handleSelectRecap = (id: string) => {
    setSelectedRecapId(id);
    setMobileView('detail');
  };

  const handleDeleteTrigger = (recap: AIInsight) => {
    setRecapToDelete(recap);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!user || !recapToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'aiInsights', recapToDelete.id));
      const updatedList = recaps.filter(r => r.id !== recapToDelete.id);
      setRecaps(updatedList);
      
      if (selectedRecapId === recapToDelete.id) {
        setSelectedRecapId(updatedList.length > 0 ? updatedList[0].id : null);
      }
      
      setShowDeleteConfirm(false);
      setRecapToDelete(null);
      setMobileView('list');
    } catch (err) {
      console.error('Error deleting archived reflection:', err);
    }
  };

  const handleGoalCreatedLocally = (goal: any) => {
    console.log('[ReflectionArchive] Goal sync triggered successfully');
  };

  const formatWeekRange = (start: string, end: string) => {
    try {
      const startDate = parseISO(start);
      const endDate = parseISO(end);
      return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
    } catch {
      return `${start} - ${end}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#151719] flex items-center justify-center">
        <AILoadingState />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#151719] pb-24 transition-colors duration-300">
      <div className="mx-auto max-w-[640px] md:max-w-[850px] lg:max-w-[1100px] xl:max-w-[1280px] 2xl:max-w-[1440px] px-6 pt-8">
        
        {/* Header Section with Filter */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/reflect')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-[#1E2022] text-[#2F3331] dark:text-[#FAFAFA] shadow-sm ring-1 ring-[#CCD0CF] dark:ring-[#2E3133] transition-colors hover:bg-[#F2F2F3] dark:hover:bg-[#282A2D]"
              title="Back to Reflect"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
            </button>
            <div>
              <h1 className="font-sans text-3xl font-bold tracking-normal text-[#2F3331] dark:text-[#FAFAFA]">Cosmic Archives</h1>
              <p className="text-sm font-light text-[#6F7476] dark:text-[#A3A7A8]">Your past weekly reflections and growth logs</p>
            </div>
          </div>

          {/* Time Scope Filter Dial */}
          <div className="relative self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setIsFilterDialOpen(open => !open)}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-white dark:bg-[#1E2022] px-4 text-sm font-semibold text-[#2F3331] dark:text-[#FAFAFA] shadow-sm ring-1 ring-[#CCD0CF] dark:ring-[#2E3133] transition-colors hover:bg-[#F2F2F3] dark:hover:bg-[#282A2D] cursor-pointer"
              aria-label="filter reflections by time"
              title="filter reflections by time"
            >
              <FontAwesomeIcon icon={faCalendarDays} className="h-3.5 w-3.5 text-[#6F7476] dark:text-[#A3A7A8]" />
              <span>{filterScope === 'alltime' ? 'All time' : `${selectedYear}`}</span>
            </button>

            {isFilterDialOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsFilterDialOpen(false)} />
                <div className="absolute right-0 top-12 z-20 w-44 rounded-2xl border border-[#EEF0EF] dark:border-[#2E3133] bg-white dark:bg-[#1E2022] p-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterScope('alltime');
                      setIsFilterDialOpen(false);
                    }}
                    className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition-colors cursor-pointer ${
                      filterScope === 'alltime'
                        ? 'bg-[#E9FFF4] dark:bg-[#00DC7D]/10 text-[#00A963] dark:text-[#00DC7D]'
                        : 'text-[#6F7476] dark:text-[#A3A7A8] hover:bg-[#F2F2F3] dark:hover:bg-[#282A2D] hover:text-[#2F3331] dark:hover:text-[#FAFAFA]'
                    }`}
                  >
                    All time
                    {filterScope === 'alltime' && <span className="text-xs">✓</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterScope('year')}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition-colors cursor-pointer ${
                      filterScope === 'year'
                        ? 'bg-[#E9FFF4] dark:bg-[#00DC7D]/10 text-[#00A963] dark:text-[#00DC7D]'
                        : 'text-[#6F7476] dark:text-[#A3A7A8] hover:bg-[#F2F2F3] dark:hover:bg-[#282A2D] hover:text-[#2F3331] dark:hover:text-[#FAFAFA]'
                    }`}
                  >
                    Year
                    {filterScope === 'year' && <span className="text-xs">✓</span>}
                  </button>

                  {filterScope === 'year' && (
                    <div className="mt-2 border-t border-[#EEF0EF] dark:border-[#2E3133]/40 pt-2 space-y-1 max-h-40 overflow-y-auto">
                      {availableYears.map(year => (
                        <button
                          key={year}
                          onClick={() => {
                            setSelectedYear(year);
                            setIsFilterDialOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                            selectedYear === year
                              ? 'bg-[#E9FFF4] dark:bg-[#00DC7D]/10 text-[#00A963] dark:text-[#00DC7D]'
                              : 'text-[#6F7476] dark:text-[#A3A7A8] hover:bg-[#F2F2F3] dark:hover:bg-[#282A2D] hover:text-[#2F3331] dark:hover:text-[#FAFAFA]'
                          }`}
                        >
                          {year}
                          {selectedYear === year && <span className="text-[10px]">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {recaps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 mb-4">
              <FontAwesomeIcon icon={faInbox} className="h-8 w-8" />
            </span>
            <h3 className="font-serif text-xl font-bold text-[#2F3331] dark:text-[#FAFAFA]">No Archives Yet</h3>
            <p className="mt-2 text-sm text-[#6F7476] dark:text-[#A3A7A8] max-w-sm">
              Generate your first weekly reflection on the Reflect page to start building your cosmic history.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: List of Weeks (Hidden on mobile detail view) */}
            <div className={`lg:col-span-4 space-y-4 ${mobileView === 'detail' ? 'hidden lg:block' : 'block'}`}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#A3A7A8] dark:text-[#6F7476] font-mono px-1">
                Reflections History ({filteredRecaps.length})
              </h3>
              
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                {filteredRecaps.length === 0 ? (
                  <div className="text-center py-10 px-4 border border-dashed border-[#EEF0EF] dark:border-[#2E3133] rounded-2xl">
                    <p className="text-xs text-[#6F7476] dark:text-[#A3A7A8]">No reflections found for this year.</p>
                  </div>
                ) : (
                  filteredRecaps.map((recap) => {
                    const isSelected = recap.id === selectedRecapId;
                    return (
                      <div
                        key={recap.id}
                        onClick={() => handleSelectRecap(recap.id)}
                        className={`relative overflow-hidden cursor-pointer rounded-2xl border p-4 transition-all duration-300 ${
                          isSelected
                            ? 'border-[#00DC7D] bg-[#E9FFF4]/20 dark:bg-[#00DC7D]/5 shadow-sm'
                            : 'border-[#EEF0EF] dark:border-[#2E3133] bg-white dark:bg-[#1E2022] hover:border-[#CCD0CF] dark:hover:border-[#3E4246] hover:scale-[1.01]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs text-[#00DC7D] font-mono">
                            <FontAwesomeIcon icon={faCalendarDays} className="h-3.5 w-3.5" />
                            <span>{formatWeekRange(recap.weekStart, recap.weekEnd)}</span>
                          </div>
                          <FontAwesomeIcon 
                            icon={faChevronRight} 
                            className={`h-3 w-3 text-[#A3A7A8] transition-transform duration-300 ${
                              isSelected ? 'translate-x-1 text-[#00DC7D]' : ''
                            }`}
                          />
                        </div>
                        
                        <p className="mt-2 text-xs font-light text-[#6F7476] dark:text-[#A3A7A8] line-clamp-2 leading-relaxed">
                          {recap.summary}
                        </p>
                        
                        <div className="mt-3 flex items-center gap-3 text-[10px] font-mono text-[#A3A7A8] dark:text-[#6F7476] border-t border-[#EEF0EF]/65 dark:border-[#2E3133]/40 pt-2">
                          <span>💡 {recap.lessons?.length || 0} Lessons</span>
                          <span>🎯 {recap.suggestedGoals?.length || 0} Goals</span>
                          <span>📋 {recap.actionItems?.length || 0} Tasks</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Active Reflection Details (Hidden on mobile list view) */}
            <div className={`lg:col-span-8 ${mobileView === 'list' ? 'hidden lg:block' : 'block'}`}>
              
              {/* Mobile back button to list */}
              {mobileView === 'detail' && (
                <button
                  onClick={() => setMobileView('list')}
                  className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#00DC7D] lg:hidden cursor-pointer"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" />
                  <span>Back to Archives list</span>
                </button>
              )}

              {selectedRecap ? (
                <div className="bg-white dark:bg-[#1E2022]/40 rounded-3xl border border-[#EEF0EF] dark:border-[#2E3133]/60 p-6 md:p-8">
                  
                  {/* Detailed date range card header */}
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#EEF0EF] dark:border-[#2E3133] pb-4">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#A3A7A8] dark:text-[#6F7476] font-mono block">Selected Reflection Range</span>
                      <h2 className="text-xl font-bold text-[#2F3331] dark:text-[#FAFAFA] mt-0.5">
                        {formatWeekRange(selectedRecap.weekStart, selectedRecap.weekEnd)}
                      </h2>
                    </div>
                  </div>

                  <WeeklyInsightResult
                    insight={selectedRecap}
                    userId={user?.uid || ''}
                    onGoalCreated={handleGoalCreatedLocally}
                    onDelete={() => handleDeleteTrigger(selectedRecap)}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-[#1E2022] rounded-3xl border border-[#EEF0EF] dark:border-[#2E3133]">
                  <FontAwesomeIcon icon={faCompass} className="h-10 w-10 text-neutral-300 animate-spin-slow mb-3" />
                  <p className="text-sm text-[#6F7476] dark:text-[#A3A7A8]">Select a reflection from the left to view details</p>
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Confirmation delete modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setRecapToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Archived Cosmic Recap"
        message="Are you sure you want to delete this weekly reflection from your archives? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
      />
    </div>
  );
}
