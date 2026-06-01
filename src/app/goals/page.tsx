'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO, differenceInDays, isPast, isToday } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faStar,
  faTrash,
  faCheck,
  faCrosshairs,
  faCalendar,
  faChartSimple,
  faGripVertical,
  faXmark,
  faEye,
  faBriefcase,
  faBookOpen,
  faDollarSign,
  faPalette,
  faHeart,
  faCompass,
  faBrain,
  faPen,
  faChevronUp,
  faChevronDown,
  faListCheck,
  faSquare,
  faClock,
} from '@fortawesome/free-solid-svg-icons';
import { useData } from '@/contexts/DataContext';
import { FocusGoal, SubGoal } from '@/types';

type FocusMode = 'hyperfocus' | 'top3' | 'pareto';

const focusModeInfo = {
  hyperfocus: { label: 'Hyperfocus', icon: faCrosshairs, color: '#8B00D4', bg: '#F0D6FF', desc: 'Focus on highlights only' },
  top3: { label: 'Top 3', icon: faStar, color: '#00875A', bg: '#C8F7E4', desc: 'Show first 3 goals' },
  pareto: { label: 'Pareto', icon: faChartSimple, color: '#B45309', bg: '#FFE4B5', desc: '20% most important' },
};

const getCategoryIcon = (category: string) => {
  const cat = category.toLowerCase().trim();
  if (cat.includes('work') || cat.includes('job') || cat.includes('office') || cat.includes('career')) return faBriefcase;
  if (cat.includes('health') || cat.includes('fit') || cat.includes('gym') || cat.includes('sport') || cat.includes('run')) return faHeart;
  if (cat.includes('study') || cat.includes('learn') || cat.includes('school') || cat.includes('read') || cat.includes('book')) return faBookOpen;
  if (cat.includes('money') || cat.includes('finance') || cat.includes('save') || cat.includes('rich') || cat.includes('invest')) return faDollarSign;
  if (cat.includes('art') || cat.includes('paint') || cat.includes('design') || cat.includes('create') || cat.includes('hobby')) return faPalette;
  if (cat.includes('love') || cat.includes('family') || cat.includes('friend') || cat.includes('relationship')) return faHeart;
  if (cat.includes('spirit') || cat.includes('meditate') || cat.includes('mind') || cat.includes('soul')) return faBrain;
  if (cat.includes('travel') || cat.includes('trip') || cat.includes('explore') || cat.includes('vacation')) return faCompass;
  return faCrosshairs;
};

export default function GoalsPage() {
  const router = useRouter();
  const {
    goals,
    addGoal,
    updateGoal,
    deleteGoal,
    toggleGoalComplete,
    reorderGoals,
    entries,
    toggleBulletComplete,
    setCurrentDate,
  } = useData();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoalContent, setNewGoalContent] = useState('');
  const [newGoalDeadline, setNewGoalDeadline] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState('');
  
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editProgress, setEditProgress] = useState(0);
  const [draggedGoalId, setDraggedGoalId] = useState<string | null>(null);

  const [focusMode, setFocusMode] = useState<FocusMode | 'none'>('none');
  const [newSubGoalText, setNewSubGoalText] = useState<{ [goalId: string]: string }>({});
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'goals' | 'inbox'>('goals');

  // Aggregate unresolved checklist bullets across all logs for full-page detailed view
  const pendingTasks = useMemo(() => {
    const list: { id: string; text: string; date: string; createdAt: Date; scheduledAt?: Date; isCompleted?: boolean }[] = [];
    (entries || []).forEach(entry => {
      (entry.bullets || []).forEach(b => {
        if (b.style === 'checklist' && !b.isCompleted) {
          list.push({
            id: b.id,
            text: b.text,
            date: entry.date,
            createdAt: new Date(b.createdAt),
            scheduledAt: b.scheduledAt ? new Date(b.scheduledAt) : undefined,
            isCompleted: b.isCompleted
          });
        }
      });
    });
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [entries]);

  const activeGoals = useMemo(
    () => goals.filter(g => !g.isCompleted).sort((a, b) => a.priority - b.priority),
    [goals]
  );

  const filteredGoals = useMemo(() => {
    if (focusMode === 'hyperfocus') {
      return activeGoals.slice(0, 1);
    }
    if (focusMode === 'top3') {
      return activeGoals.slice(0, 3);
    }
    if (focusMode === 'pareto') {
      const count = Math.max(1, Math.ceil(activeGoals.length * 0.2));
      return activeGoals.slice(0, count);
    }
    return activeGoals;
  }, [activeGoals, focusMode]);

  const completedGoals = useMemo(
    () => goals.filter(g => g.isCompleted).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
    [goals]
  );

  const categories = useMemo(() => {
    const cats = new Set<string>();
    goals.forEach(g => { if (g.category) cats.add(g.category); });
    return Array.from(cats).sort();
  }, [goals]);

  const handleAddGoal = async () => {
    if (!newGoalContent.trim()) return;
    await addGoal(newGoalContent.trim(), {
      deadline: newGoalDeadline || undefined,
      category: newGoalCategory || undefined,
      progress: 0,
      subGoals: [],
    });
    setNewGoalContent('');
    setNewGoalDeadline('');
    setNewGoalCategory('');
    setShowAddForm(false);
  };

  const handleEditGoal = (goal: FocusGoal) => {
    setEditingGoalId(goal.id);
    setEditContent(goal.content);
    setEditDeadline(goal.deadline || '');
    setEditCategory(goal.category || '');
    setEditProgress(goal.progress);
  };

  const handleSaveEdit = async () => {
    if (!editingGoalId || !editContent.trim()) return;
    const goalToEdit = goals.find(g => g.id === editingGoalId);
    let progress = editProgress;
    
    // Automatically recalculate progress if sub-goals exist
    if (goalToEdit && goalToEdit.subGoals && goalToEdit.subGoals.length > 0) {
      const completedCount = goalToEdit.subGoals.filter(s => s.isCompleted).length;
      progress = Math.round((completedCount / goalToEdit.subGoals.length) * 100);
    }

    await updateGoal(editingGoalId, {
      content: editContent.trim(),
      deadline: editDeadline || undefined,
      category: editCategory || undefined,
      progress,
    });
    setEditingGoalId(null);
  };

  const handleDeleteGoal = async (goalId: string) => {
    await deleteGoal(goalId);
  };

  const handleAddSubGoal = async (goal: FocusGoal, text: string) => {
    if (!text.trim()) return;
    const newSub: SubGoal = {
      id: Math.random().toString(36).substring(2, 9),
      content: text.trim(),
      isCompleted: false,
    };
    const updatedSubs = [...(goal.subGoals || []), newSub];
    const progress = Math.round((updatedSubs.filter(s => s.isCompleted).length / updatedSubs.length) * 100);
    
    await updateGoal(goal.id, {
      subGoals: updatedSubs,
      progress
    });
    setNewSubGoalText(prev => ({ ...prev, [goal.id]: '' }));
  };

  const handleToggleSubGoal = async (goal: FocusGoal, subId: string) => {
    const updatedSubs = (goal.subGoals || []).map(s => 
      s.id === subId ? { ...s, isCompleted: !s.isCompleted } : s
    );
    const progress = Math.round((updatedSubs.filter(s => s.isCompleted).length / updatedSubs.length) * 100);
    
    await updateGoal(goal.id, {
      subGoals: updatedSubs,
      progress
    });
  };

  const handleDeleteSubGoal = async (goal: FocusGoal, subId: string) => {
    const updatedSubs = (goal.subGoals || []).filter(s => s.id !== subId);
    const progress = updatedSubs.length > 0 
      ? Math.round((updatedSubs.filter(s => s.isCompleted).length / updatedSubs.length) * 100)
      : 0;
    
    await updateGoal(goal.id, {
      subGoals: updatedSubs,
      progress
    });
  };

  const handleMoveGoal = async (goalId: string, direction: 'up' | 'down') => {
    const currentOrder = [...activeGoals];
    const index = currentOrder.findIndex(g => g.id === goalId);
    if (index === -1) return;
    
    if (direction === 'up' && index > 0) {
      const [moved] = currentOrder.splice(index, 1);
      currentOrder.splice(index - 1, 0, moved);
    } else if (direction === 'down' && index < currentOrder.length - 1) {
      const [moved] = currentOrder.splice(index, 1);
      currentOrder.splice(index + 1, 0, moved);
    } else {
      return;
    }
    
    await reorderGoals(currentOrder.map(g => g.id));
  };

  const handleDragStart = (goalId: string) => {
    setDraggedGoalId(goalId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedGoalId || draggedGoalId === targetId) return;
  };

  const handleDrop = async (targetId: string) => {
    if (!draggedGoalId || draggedGoalId === targetId) return;
    const currentOrder = [...activeGoals];
    const draggedIndex = currentOrder.findIndex(g => g.id === draggedGoalId);
    const targetIndex = currentOrder.findIndex(g => g.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;
    const [draggedGoal] = currentOrder.splice(draggedIndex, 1);
    currentOrder.splice(targetIndex, 0, draggedGoal);
    await reorderGoals(currentOrder.map(g => g.id));
    setDraggedGoalId(null);
  };

  const getDaysUntil = (deadline: string) => {
    const deadlineDate = parseISO(deadline);
    if (isPast(deadlineDate) && !isToday(deadlineDate)) {
      return { text: `${Math.abs(differenceInDays(new Date(), deadlineDate))}d overdue`, overdue: true };
    }
    const days = differenceInDays(deadlineDate, new Date());
    if (days === 0) return { text: 'Today', overdue: false };
    if (days === 1) return { text: '1d left', overdue: false };
    return { text: `${days}d left`, overdue: false };
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24 font-sans text-[#2F3331]">
      <div className="mx-auto max-w-[600px] px-6 pt-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-sans text-4xl font-bold tracking-tight text-[#2F3331]">Goals</h1>
            <p className="mt-2 text-sm text-[#6F7476]">set and track your focus</p>
          </div>
          <button
            onClick={() => setShowAddForm(current => !current)}
            className="mt-1 flex h-11 w-11 items-center justify-center rounded-full bg-[#00DC7D] text-white shadow-sm transition-transform duration-200 hover:scale-105 active:scale-95 hover:bg-[#00B866]"
            title="add goal"
          >
            <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
          </button>
        </div>

        {/* Goals / Inbox Sub-Tab Selector */}
        <div className="mt-6 flex gap-2 border-b border-[#EEF0EF] pb-3 select-none">
          <button
            onClick={() => setActiveSubTab('goals')}
            className={`px-4 py-2 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer ${
              activeSubTab === 'goals'
                ? 'bg-[#E9FFF4] text-[#00A963] shadow-sm'
                : 'text-[#6F7476] hover:bg-gray-100 hover:text-[#2F3331]'
            }`}
          >
            Goals Dashboard
          </button>
          <button
            onClick={() => setActiveSubTab('inbox')}
            className={`px-4 py-2 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'inbox'
                ? 'bg-[#E9FFF4] text-[#00A963] shadow-sm'
                : 'text-[#6F7476] hover:bg-gray-100 hover:text-[#2F3331]'
            }`}
          >
            <FontAwesomeIcon icon={faListCheck} className="w-3.5 h-3.5" />
            Inbox Tasks
            {pendingTasks.length > 0 && (
              <span className="inline-flex h-4 min-w-4 px-1 rounded-full bg-[#FF453A] text-white text-[9px] font-black items-center justify-center animate-pulse">
                {pendingTasks.length}
              </span>
            )}
          </button>
        </div>

        {activeSubTab === 'goals' ? (
          <>
            {/* Global Focus View Selector Tray */}
            <div className="mt-6 bg-[#FAFAFA] rounded-2xl p-4.5 border border-[#EEF0EF] select-none flex flex-col items-center">
          <div className="flex items-center justify-between w-full mb-3.5 px-1">
            <span className="text-[10px] font-bold text-[#6F7476] uppercase tracking-widest flex items-center gap-1.5">
              <FontAwesomeIcon icon={faCrosshairs} className="text-gray-400" /> Focus View Filter
            </span>
            <span className="text-[9px] font-bold text-[#00A963] uppercase tracking-widest bg-white border border-[#EEF0EF] px-2 py-0.5 rounded-full shadow-sm">
              {focusMode === 'none' ? 'all goals' : focusModeInfo[focusMode].label}
            </span>
          </div>
          
          <div className="flex items-center justify-center gap-2 bg-[#F2F2F3]/60 p-1.5 rounded-full border border-[#EEF0EF] max-w-full">
            {(['none', 'hyperfocus', 'top3', 'pareto'] as const).map(mode => {
              const isActive = focusMode === mode;
              const icon = mode === 'none' ? faEye : mode === 'hyperfocus' ? faCrosshairs : mode === 'top3' ? faStar : faChartSimple;
              const label = mode === 'none' ? 'All' : focusModeInfo[mode].label;
              
              if (isActive) {
                // Selected: Expand with Icon + Text
                return (
                  <button
                    key={mode}
                    onClick={() => setFocusMode(mode)}
                    className="flex items-center gap-1.5 py-1.5 px-4 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 shadow-sm border border-transparent cursor-pointer active:scale-95 text-white bg-[#2F3331]"
                    style={mode !== 'none' ? {
                      backgroundColor: focusModeInfo[mode].color,
                    } : {}}
                  >
                    <FontAwesomeIcon icon={icon} className="h-3.5 w-3.5" />
                    <span>{label}</span>
                  </button>
                );
              } else {
                // Unselected: Icon only
                return (
                  <button
                    key={mode}
                    onClick={() => setFocusMode(mode)}
                    className="flex items-center justify-center w-8.5 h-8.5 rounded-full bg-white text-[#6F7476] border border-[#EEF0EF] hover:bg-gray-50 hover:text-black transition-all duration-300 cursor-pointer active:scale-95"
                    title={label}
                  >
                    <FontAwesomeIcon icon={icon} className="h-3.5 w-3.5" />
                  </button>
                );
              }
            })}
          </div>
          
          <p className="text-[10px] text-[#A3A7A8] mt-3 font-light text-center leading-normal max-w-[420px]">
            {focusMode === 'none' && "Showing all active goals in your custom priority order. Drag to reorder!"}
            {focusMode === 'hyperfocus' && "Hyperfocus: Showing ONLY your single highest priority goal. Crush it first! 🔥"}
            {focusMode === 'top3' && "Top 3: Displaying your top 3 prioritized milestones. Keep it simple! ⭐"}
            {focusMode === 'pareto' && "Pareto View: Showing the top 20% most impactful goals. Focus on the vital few! 📊"}
          </p>
        </div>

        {showAddForm && (
          <div className="mt-6 rounded-2xl bg-white/70 backdrop-blur-sm p-6 border border-[#EEF0EF]/80 shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition-all duration-300">
            <h3 className="text-sm font-bold text-[#2F3331] mb-4 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
              ✨ New Goal
            </h3>
            
            <textarea
              value={newGoalContent}
              onChange={(e) => setNewGoalContent(e.target.value)}
              placeholder="What do you want to achieve?"
              rows={2}
              className="mb-4 w-full resize-none bg-transparent border-b border-[#CCD0CF]/40 focus:border-b-[#00DC7D] rounded-none py-2 text-[#2F3331] placeholder-[#A3A7A8] font-sans text-base font-semibold focus:outline-none transition-all duration-300"
              autoFocus
            />
            
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#6F7476]">Deadline (optional)</label>
                <input
                  type="date"
                  value={newGoalDeadline}
                  onChange={(e) => setNewGoalDeadline(e.target.value)}
                  className="w-full bg-transparent border-b border-[#CCD0CF]/40 focus:border-b-[#00DC7D] rounded-none py-1.5 text-sm text-[#2F3331] focus:outline-none transition-all duration-300"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#6F7476]">Category (optional)</label>
                <input
                  type="text"
                  value={newGoalCategory}
                  onChange={(e) => setNewGoalCategory(e.target.value)}
                  placeholder="e.g. work, health, study"
                  list="categories"
                  className="w-full bg-transparent border-b border-[#CCD0CF]/40 focus:border-b-[#00DC7D] rounded-none py-1.5 text-sm text-[#2F3331] placeholder-[#CCD0CF]/80 focus:outline-none transition-all duration-300"
                />
                <datalist id="categories">
                  {categories.map(cat => <option key={cat} value={cat} />)}
                </datalist>
              </div>
            </div>
            
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowAddForm(false)}
                className="rounded-xl border border-[#CCD0CF] bg-white px-4 py-2 text-sm font-semibold text-[#6F7476] hover:bg-[#F2F2F3] transition-colors cursor-pointer active:scale-95"
              >
                cancel
              </button>
              <button
                onClick={handleAddGoal}
                disabled={!newGoalContent.trim()}
                className="rounded-xl bg-[#00DC7D] px-5 py-2 text-sm font-semibold text-white hover:bg-[#00B866] disabled:opacity-50 transition-all cursor-pointer active:scale-95 shadow-sm shadow-[#00DC7D]/10"
              >
                add goal
              </button>
            </div>
          </div>
        )}

        <main className="mt-8 space-y-10">
          <section>
            <h2 className="mb-4 font-sans text-xl font-bold text-[#2F3331]">
              Active
              <span className="ml-2 text-sm font-normal text-[#6F7476]">({activeGoals.length})</span>
            </h2>

            {filteredGoals.length > 0 ? (
              /* Grid 2 Columns of Playing Cards with aspect-ratio 4:5 and reduced roundness (rounded-2xl) */
              <div className="grid grid-cols-2 gap-5 pt-2">
                {filteredGoals.map((goal) => {
                  const deadlineInfo = goal.deadline ? getDaysUntil(goal.deadline) : null;

                  // Calculate priority status dynamically based on its position in active list
                  const originalIndex = activeGoals.findIndex(g => g.id === goal.id);

                  let borderClass = 'border-b-[5px] border-b-[#CCD0CF]';
                  let cardBg = 'bg-white shadow-[0_8px_25px_rgba(0,0,0,0.015)]';
                  let progressClass = 'energetic-progress';
                  let tipColor = '#00DC7D';
                  let checkboxStyle = 'bg-white text-gray-300 border-gray-200 hover:border-[#00DC7D] hover:bg-[#E9FFF4] hover:text-[#00DC7D]';
                  let solidGradient = 'bg-gradient-to-r from-[#00DC7D] via-[#00F099] to-[#00FFCC]';
                  
                  if (originalIndex === 0) {
                    borderClass = 'border-b-[5px] border-b-[#8B00D4]';
                    cardBg = 'bg-[#FAF5FF]/70 backdrop-blur-sm shadow-[0_8px_30px_rgba(139,0,212,0.03)]';
                    progressClass = 'hyperfocus-progress';
                    tipColor = '#8B00D4';
                    checkboxStyle = 'bg-white text-gray-300 border-gray-200 hover:border-[#8B00D4] hover:bg-[#F0D6FF] hover:text-[#8B00D4]';
                    solidGradient = 'bg-gradient-to-r from-[#8B00D4] via-[#9F2BE6] to-[#C494FF]';
                  } else if (originalIndex > 0 && originalIndex < 3) {
                    borderClass = 'border-b-[5px] border-b-[#00875A]';
                    cardBg = 'bg-[#F2FFF9]/70 backdrop-blur-sm shadow-[0_8px_30px_rgba(0,135,90,0.03)]';
                    progressClass = 'top3-progress';
                    tipColor = '#00875A';
                    checkboxStyle = 'bg-white text-gray-300 border-gray-200 hover:border-[#00875A] hover:bg-[#C8F7E4] hover:text-[#00875A]';
                    solidGradient = 'bg-gradient-to-r from-[#00875A] via-[#00A26C] to-[#00C58A]';
                  } else if (originalIndex >= 3 && originalIndex < Math.max(3, Math.ceil(activeGoals.length * 0.2))) {
                    borderClass = 'border-b-[5px] border-b-[#FF9933]';
                    cardBg = 'bg-[#FFF9F2]/70 backdrop-blur-sm shadow-[0_8px_30px_rgba(255,153,51,0.03)]';
                    progressClass = 'pareto-progress';
                    tipColor = '#FF9933';
                    checkboxStyle = 'bg-white text-gray-300 border-gray-200 hover:border-[#FF9933] hover:bg-[#FFE4B5] hover:text-[#FF9933]';
                    solidGradient = 'bg-gradient-to-r from-[#FF9933] via-[#FFAE59] to-[#FFCC66]';
                  }

                  const hasSubGoals = goal.subGoals && goal.subGoals.length > 0;
                  const totalSub = goal.subGoals?.length || 0;
                  const completedSub = goal.subGoals?.filter(s => s.isCompleted).length || 0;
                  const isFlipped = flippedCardId === goal.id;

                  return (
                    <div
                      key={goal.id}
                      className="flip-card aspect-[4/5] w-full select-none"
                      style={{ height: '100%' }}
                    >
                      <div className={`flip-card-inner h-full w-full ${isFlipped ? 'flip-card-flipped' : ''}`}>
                        
                        {/* FRONT SIDE (Main target, benchmarks checklist, etc.) */}
                        <div
                          className={`flip-card-front h-full w-full flex flex-col justify-between rounded-2xl border-t border-l border-r border-[#EEF0EF]/80 shadow-sm px-6.5 py-5 pb-8 cursor-pointer ${borderClass} ${cardBg}`}
                          onClick={(e) => {
                            const target = e.target as HTMLElement;
                            if (target.closest('button') || target.closest('input') || target.closest('form')) return;
                            setFlippedCardId(goal.id);
                          }}
                        >
                          {/* Top Row: Category (Left) and Big Checklist Button (Right) */}
                          <div className="flex justify-between items-start select-none z-10 w-full mb-1">
                            <div className="flex flex-col items-start gap-1">
                              {/* Category Chip using Solid FontAwesome Icon */}
                              <span className="text-[9px] font-bold text-[#6F7476] uppercase tracking-wider bg-white/90 border border-[#EEF0EF]/70 px-2 py-0.5 rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.01)] truncate max-w-[110px] flex items-center gap-1.5 transition-transform hover:scale-105">
                                <FontAwesomeIcon icon={getCategoryIcon(goal.category || '')} className="text-gray-400 h-3 w-3" />
                                <span>{goal.category || 'General'}</span>
                              </span>
                              
                              {deadlineInfo && (
                                <span className={`text-[8.5px] font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5 ${
                                  deadlineInfo.overdue ? 'text-red-500 font-extrabold' : 'text-[#A3A7A8]'
                                }`}>
                                  <FontAwesomeIcon icon={faCalendar} className="h-2.5 w-2.5" />
                                  {deadlineInfo.text}
                                </span>
                              )}
                            </div>

                            {/* Big Prominent Goal Checklist Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleGoalComplete(goal.id);
                              }}
                              className={`h-7 w-7 rounded-full border flex items-center justify-center transition-all duration-200 cursor-pointer shadow-sm hover:scale-110 active:scale-90 ${checkboxStyle}`}
                              title="Mark goal complete"
                            >
                              <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Main Center Area: Goal Text Content or Edit Inputs */}
                          <div className="flex-1 flex flex-col justify-center my-2 text-center overflow-hidden z-10 w-full px-1">
                            {editingGoalId === goal.id ? (
                              <div 
                                className="space-y-2 flex flex-col justify-center h-full text-left"
                                onClick={(e) => e.stopPropagation()} // Stop edit panel clicks from flipping card
                              >
                                <textarea
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  rows={2}
                                  className="w-full resize-none bg-transparent border-b border-[#CCD0CF]/40 focus:border-b-[#00DC7D] rounded-none py-0.5 text-xs font-semibold text-[#2F3331] focus:outline-none transition-all duration-300"
                                />
                                <div className="grid grid-cols-1 gap-1.5">
                                  <input
                                    type="date"
                                    value={editDeadline}
                                    onChange={(e) => setEditDeadline(e.target.value)}
                                    className="bg-transparent border-b border-[#CCD0CF]/40 focus:border-b-[#00DC7D] rounded-none py-0.5 text-[9px] text-[#2F3331] focus:outline-none"
                                  />
                                  <input
                                    type="text"
                                    value={editCategory}
                                    onChange={(e) => setEditCategory(e.target.value)}
                                    placeholder="category"
                                    className="bg-transparent border-b border-[#CCD0CF]/40 focus:border-b-[#00DC7D] rounded-none py-0.5 text-[9px] text-[#2F3331] focus:outline-none"
                                  />
                                </div>
                                
                                <div className="text-[10px] flex items-center gap-1.5 my-1 justify-between">
                                  {hasSubGoals ? (
                                    <span className="font-bold text-[#00A963] bg-[#E9FFF4] px-1.5 py-0.5 rounded-full text-[9px] border border-[#00DC7D]/10">
                                      ⚡ Auto: {goal.progress}%
                                    </span>
                                  ) : (
                                    <div className="flex items-center gap-1.5 w-full">
                                      <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={editProgress}
                                        onChange={(e) => setEditProgress(parseInt(e.target.value))}
                                        className="flex-1 accent-[#00DC7D] h-0.5 bg-[#EEF0EF] rounded-lg appearance-none cursor-pointer"
                                      />
                                      <span className="font-bold text-[#2F3331]">{editProgress}%</span>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex gap-1.5 justify-end">
                                  <button
                                    onClick={() => setEditingGoalId(null)}
                                    className="rounded-lg border border-[#CCD0CF] bg-white px-2 py-0.5 text-[9px] font-bold text-[#6F7476]"
                                  >
                                    cancel
                                  </button>
                                  <button
                                    onClick={handleSaveEdit}
                                    className="rounded-lg bg-[#00DC7D] px-2.5 py-0.5 text-[9px] font-bold text-white shadow-sm shadow-[#00DC7D]/10"
                                  >
                                    save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-xs sm:text-sm font-bold text-[#2F3331] leading-snug line-clamp-3 select-text font-serif">
                                  {goal.content}
                                </p>
                              </>
                            )}
                          </div>

                          {/* Bottom Area: Shimmering progress bar and scrollable capsule key steps list */}
                          {editingGoalId !== goal.id && (
                            <div className="z-10 w-full border-t border-[#EEF0EF]/40 pt-2 select-none">
                              {/* Shimmering Progress Bar */}
                              {(goal.progress > 0 || hasSubGoals) && (
                                <div className="flex items-center gap-2 mb-2 w-full">
                                  <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-gray-200/40 p-[0.5px]">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${progressClass}`}
                                      style={{ width: `${goal.progress}%` }}
                                    />
                                    {goal.progress > 0 && goal.progress < 100 && (
                                      <div 
                                        className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 -translate-x-1/2 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,1)] animate-ping"
                                        style={{ 
                                          left: `${goal.progress}%`,
                                          backgroundColor: tipColor 
                                        }}
                                      />
                                    )}
                                  </div>
                                  <span className="text-[9px] font-bold text-[#2F3331] min-w-[20px] text-right">{goal.progress}%</span>
                                </div>
                              )}

                              {/* Scrollable checklist of benchmark capsule bars (calm styling: bg stays standard gray!) */}
                              <div className="space-y-1.5 max-h-[85px] overflow-y-auto pr-0.5 mb-1.5 scrollbar-thin scrollbar-thumb-gray-200">
                                {goal.subGoals?.map((sub) => {
                                  return sub.isCompleted ? (
                                    /* Completed Sub-goal Capsule: Calm background (no color block), colored check button */
                                    <div
                                      key={sub.id}
                                      className="relative flex items-center justify-between px-2.5 py-1 rounded-full bg-gray-50 border border-dashed border-[#EEF0EF]/80 text-[#6F7476] transition-all duration-300 group/sub"
                                    >
                                      <span className="text-[9.5px] font-bold tracking-tight truncate max-w-[130px] line-through decoration-[#CCD0CF]/70 select-text">
                                        {sub.content}
                                      </span>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteSubGoal(goal, sub.id);
                                          }}
                                          className="opacity-0 group-hover/sub:opacity-100 text-gray-400 hover:text-[#FF453A] p-0.5 transition-opacity duration-200 cursor-pointer"
                                          title="Delete step"
                                        >
                                          <FontAwesomeIcon icon={faTrash} className="h-2.5 w-2.5" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleSubGoal(goal, sub.id);
                                          }}
                                          className={`h-4.5 w-4.5 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 text-white ${solidGradient}`}
                                          title="mark incomplete"
                                        >
                                          <FontAwesomeIcon icon={faCheck} className="h-2 w-2" />
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    /* Uncompleted Sub-goal Capsule: standard gray dashed with empty circle checkbox */
                                    <div
                                      key={sub.id}
                                      className="relative flex items-center justify-between px-2.5 py-1 rounded-full bg-gray-50 border border-dashed border-[#EEF0EF] text-[#6F7476] transition-all duration-300 hover:bg-white hover:border-[#CCD0CF]/60 group/sub"
                                    >
                                      <span className="text-[9.5px] font-medium tracking-tight truncate max-w-[130px] select-text">
                                        {sub.content}
                                      </span>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteSubGoal(goal, sub.id);
                                          }}
                                          className="opacity-0 group-hover/sub:opacity-100 text-gray-400 hover:text-[#FF453A] p-0.5 transition-opacity duration-200 cursor-pointer"
                                          title="Delete step"
                                        >
                                          <FontAwesomeIcon icon={faTrash} className="h-2.5 w-2.5" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleSubGoal(goal, sub.id);
                                          }}
                                          className="h-4.5 w-4.5 rounded-full border border-gray-300 bg-white flex items-center justify-center cursor-pointer transition-all hover:border-[#00DC7D] hover:bg-[#E9FFF4]"
                                          title="mark complete"
                                        >
                                          <div className="h-1 w-1 rounded-full bg-transparent" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Extremely compact quick add sub-goal input */}
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  const text = newSubGoalText[goal.id] || '';
                                  handleAddSubGoal(goal, text);
                                }}
                                onClick={(e) => e.stopPropagation()} // prevent input click from flipping
                                className="flex items-center gap-1 border-b border-[#CCD0CF]/20 focus-within:border-b-[#00DC7D]/50 py-0.5 select-none"
                              >
                                <input
                                  type="text"
                                  placeholder="+ Add step..."
                                  value={newSubGoalText[goal.id] || ''}
                                  onChange={(e) => setNewSubGoalText(prev => ({ ...prev, [goal.id]: e.target.value }))}
                                  className="flex-1 bg-transparent text-[9.5px] text-[#2F3331] placeholder-[#A3A7A8]/70 focus:outline-none"
                                />
                                {(newSubGoalText[goal.id] || '').trim() && (
                                  <button
                                    type="submit"
                                    className="text-[#00DC7D] hover:text-[#00B866] text-[9.5px] font-bold px-1 cursor-pointer"
                                  >
                                    Add
                                  </button>
                                )}
                              </form>
                            </div>
                          )}

                          {/* 4. Bottom Overlapping Motivational Pill (e.g. "2/4 done") */}
                          <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 bg-white rounded-full px-3.5 py-1 shadow-[0_3px_10px_rgba(0,0,0,0.05)] border border-[#EEF0EF] flex items-center gap-1 text-[8.5px] font-bold text-[#6F7476] select-none z-20 whitespace-nowrap transition-transform hover:scale-105">
                            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#E9FFF4] text-[#00A963] shadow-sm text-[9px]">👍</span>
                            <span>{hasSubGoals ? `${completedSub}/${totalSub} steps` : `${goal.progress}%`} done</span>
                          </div>
                        </div>

                        {/* BACK SIDE (Action Menu - Edit, Delete, Reorder) */}
                        <div
                          className={`flip-card-back h-full w-full flex flex-col justify-between rounded-2xl border-t border-l border-r border-[#EEF0EF]/80 shadow-sm px-6.5 py-5 pb-6 bg-white ${borderClass}`}
                        >
                          {/* Back Header */}
                          <div className="flex justify-between items-center w-full mb-2 border-b border-[#EEF0EF] pb-2">
                            <span className="text-[10px] font-bold text-[#6F7476] uppercase tracking-widest flex items-center gap-1.5">
                              <FontAwesomeIcon icon={faCrosshairs} className="text-gray-400" /> Goal Actions
                            </span>
                            <button
                              onClick={() => setFlippedCardId(null)}
                              className="text-gray-400 hover:text-black cursor-pointer p-0.5"
                              title="Flip to Front"
                            >
                              <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Back Action Center Grid Buttons */}
                          <div className="flex-1 flex flex-col justify-center gap-2.5 w-full my-2">
                            {/* Edit Target */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditGoal(goal);
                                setFlippedCardId(null); // Flip back to front so edit form shows
                              }}
                              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gray-50 hover:bg-gray-100/80 border border-[#EEF0EF] text-xs font-bold text-gray-700 transition-colors cursor-pointer active:scale-95"
                            >
                              <FontAwesomeIcon icon={faPen} className="text-[#6F7476] h-3 w-3" /> Edit Target
                            </button>

                            {/* Reorder Buttons (Move Up / Down) */}
                            <div className="grid grid-cols-2 gap-2 w-full">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveGoal(goal.id, 'up');
                                }}
                                disabled={originalIndex === 0}
                                className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-50 hover:bg-gray-100/80 border border-[#EEF0EF] text-xs font-bold text-gray-700 transition-colors cursor-pointer disabled:opacity-35 active:scale-95 select-none"
                              >
                                <FontAwesomeIcon icon={faChevronUp} className="text-gray-500 h-3 w-3" /> Move Up
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveGoal(goal.id, 'down');
                                }}
                                disabled={originalIndex === activeGoals.length - 1}
                                className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-50 hover:bg-gray-100/80 border border-[#EEF0EF] text-xs font-bold text-gray-700 transition-colors cursor-pointer disabled:opacity-35 active:scale-95 select-none"
                              >
                                <FontAwesomeIcon icon={faChevronDown} className="text-gray-500 h-3 w-3" /> Move Down
                              </button>
                            </div>

                            {/* Delete Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Are you sure you want to delete this goal?")) {
                                  handleDeleteGoal(goal.id);
                                }
                              }}
                              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-red-50 hover:bg-red-100/60 border border-red-100 text-xs font-bold text-red-600 transition-colors cursor-pointer active:scale-95"
                            >
                              <FontAwesomeIcon icon={faTrash} className="h-3 w-3" /> Delete Goal
                            </button>
                          </div>

                          {/* Done / Flip Back */}
                          <button
                            onClick={() => setFlippedCardId(null)}
                            className="w-full py-1.5 rounded-full bg-[#2F3331] text-white hover:bg-[#1E201F] text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-sm shadow-black/10 active:scale-95"
                          >
                            Done / Flip Card
                          </button>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm italic text-[#A3A7A8] bg-white border border-dashed border-[#CCD0CF]/60 rounded-xl p-6 text-center shadow-[0_8px_30px_rgba(0,0,0,0.005)]">
                {focusMode === 'none' ? 'No active goals. Add one above!' : `No goals meet the ${focusModeInfo[focusMode].label} filter criteria.`}
              </p>
            )}
          </section>

          {completedGoals.length > 0 && (
            <section>
              <h2 className="mb-4 font-sans text-xl font-bold text-[#2F3331]">
                Completed
                <span className="ml-2 text-sm font-normal text-[#6F7476]">({completedGoals.length})</span>
              </h2>

              <div className="grid grid-cols-2 gap-5">
                {completedGoals.slice(0, 10).map((goal) => {
                  return (
                    <div
                      key={goal.id}
                      className="group relative flex flex-col justify-between aspect-[4/5] w-full rounded-2xl border border-[#EEF0EF]/80 bg-[#FAFAFA]/70 shadow-sm transition-all hover:bg-white hover:shadow-[0_12px_35px_rgba(0,0,0,0.02)] px-6.5 py-5 pb-7.5"
                    >
                      <div className="flex justify-between items-center select-none w-full mb-1">
                        {/* Completed Category Badge with FontAwesome icon */}
                        <span className="text-[9px] font-bold text-[#A3A7A8] uppercase tracking-wider bg-white/90 border border-[#EEF0EF]/70 px-2 py-0.5 rounded-md flex items-center gap-1.5 truncate max-w-[110px]">
                          <FontAwesomeIcon icon={getCategoryIcon(goal.category || '')} className="text-gray-300 h-3 w-3" />
                          <span>{goal.category || 'General'}</span>
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => toggleGoalComplete(goal.id)}
                            className="h-4.5 w-4.5 rounded-full bg-[#E9FFF4] border border-[#00DC7D] text-[#00A963] flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
                            title="mark incomplete"
                          >
                            <FontAwesomeIcon icon={faCheck} className="h-2 w-2" />
                          </button>
                          <button
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="rounded-lg p-0.5 text-[#A3A7A8] opacity-0 group-hover:opacity-100 hover:text-[#FF453A] cursor-pointer transition-colors"
                            title="delete"
                          >
                            <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col justify-center my-2 text-center overflow-hidden w-full px-1">
                        <p className="text-xs sm:text-sm font-bold text-[#8E9392] line-through decoration-[#CCD0CF] leading-snug line-clamp-3 select-text font-serif">
                          {goal.content}
                        </p>
                      </div>

                      {/* Completed Subgoals checklist inside Completed Goals card (read-only, compact) */}
                      {goal.subGoals && goal.subGoals.length > 0 && (
                        <div className="w-full border-t border-[#EEF0EF]/30 pt-2 select-none overflow-y-auto max-h-[85px] scrollbar-thin scrollbar-thumb-gray-200 mb-1">
                          <div className="text-[8px] font-bold text-[#A3A7A8] uppercase tracking-widest mb-1 text-left">Steps Completed</div>
                          <div className="space-y-1">
                            {goal.subGoals.map((sub) => (
                              <div key={sub.id} className="flex items-center gap-1.5 text-[9.5px] text-[#A3A7A8]">
                                <FontAwesomeIcon icon={faCheck} className="h-2 w-2 text-[#00A963] shrink-0" />
                                <span className="line-through decoration-[#CCD0CF]/70 truncate max-w-[160px] text-left">{sub.content}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Bottom Overlapping Pill (Completed indicator) */}
                      <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 bg-white rounded-full px-3.5 py-1 shadow-[0_3px_10px_rgba(0,0,0,0.03)] border border-[#EEF0EF] flex items-center gap-1 text-[8.5px] font-bold text-[#00A963] select-none z-20 whitespace-nowrap">
                        <span className="text-[9px]">🏆</span>
                        <span>100% Done</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </main>
      </>
    ) : (
      /* Inbox Tasks detailed view */
      <main className="mt-8 space-y-6">
        <div>
          <h2 className="font-sans text-xl font-bold text-[#2F3331]">Pending Journal Tasks</h2>
          <p className="mt-1 text-sm text-[#6F7476]">Checklist items captured dynamically from your daily journal logs. Tapping an item marks it completed.</p>
        </div>

        <div className="relative border-l-2 border-[#E4E7E6]/75 ml-6 pl-8 py-2 space-y-6">
          {pendingTasks.map((task) => {
            const hasScheduled = Boolean(task.scheduledAt);
            const timeStr = hasScheduled
              ? format(new Date(task.scheduledAt!), 'h:mm a')
              : format(new Date(task.createdAt), 'h:mm a');
            
            const dateStr = format(new Date(task.date), 'MMM d, yyyy');
            const dateChipStr = hasScheduled
              ? format(new Date(task.scheduledAt!), 'MMM d')
              : format(new Date(task.date), 'MMM d');
            
            return (
              <div key={task.id} className="relative flex items-center justify-between gap-4 select-none group py-0.5">
                {/* Circular timeline bullet checkbox indicator */}
                <div className="absolute -left-[42px] flex h-5 w-5 items-center justify-center rounded-full border border-[#CCD0CF] bg-[#FAFAFA] text-[#CCD0CF] hover:text-[#00DC7D] hover:border-[#00DC7D] transition-all cursor-pointer z-10 hover:scale-105 active:scale-90">
                  <button
                    onClick={() => toggleBulletComplete(task.id)}
                    className="flex h-full w-full items-center justify-center cursor-pointer"
                    title="Mark Done"
                  >
                    <FontAwesomeIcon icon={faCheck} className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#00DC7D]" />
                  </button>
                </div>

                <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  {/* Text content */}
                  <p className="text-sm font-semibold text-[#2F3331] leading-relaxed break-words pr-2">
                    {task.text}
                  </p>

                  {/* Chips group (Time and Date) */}
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                    {/* Time Chip */}
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF3C4] text-[#8C6B00] px-2.5 py-0.5 text-[9px] font-extrabold select-none shadow-sm border border-[#FFE082]/30">
                      <FontAwesomeIcon icon={faClock} className="w-2.5 h-2.5 text-[#B58900]" />
                      {timeStr}
                    </span>
                    
                    {/* Date Chip (Tapping it redirects to /write on that date) */}
                    <button
                      onClick={() => {
                        setCurrentDate(task.date);
                        router.push('/write');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#E9FFF4] hover:bg-[#D6FADB] text-[#00A963] px-2.5 py-0.5 text-[9px] font-extrabold transition-colors cursor-pointer"
                      title={`Go to ${dateStr}`}
                    >
                      <FontAwesomeIcon icon={faCalendar} className="w-2.5 h-2.5 text-[#00DC7D]" />
                      {dateChipStr}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {pendingTasks.length === 0 && (
            <div className="text-center py-16 -ml-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E9FFF4] text-[#00A963] mx-auto mb-3">
                <FontAwesomeIcon icon={faListCheck} className="w-5.5 h-5.5" />
              </div>
              <h3 className="text-sm font-bold text-[#2F3331]">All Caught Up!</h3>
              <p className="text-xs text-[#A3A7A8] mt-1 max-w-[240px] mx-auto">There are no outstanding checklist items left in your journal logs. 🎉</p>
            </div>
          )}
        </div>
      </main>
    )}
  </div>
</div>
);
}