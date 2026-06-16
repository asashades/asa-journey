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
  faCalendarPlus,
  faChartSimple,
  faGripVertical,
  faXmark,
  faEye,
  faEyeSlash,
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
  faChevronLeft,
  faChevronRight,
  faListCheck,
  faSquare,
  faClock,
  faFilter,
  faSort,
  faCircleInfo,
} from '@fortawesome/free-solid-svg-icons';
import { useData } from '@/contexts/DataContext';
import { FocusGoal, SubGoal } from '@/types';
import { HighlightedText } from '@/components/ui/HighlightedText';
import { MentionTextarea } from '@/components/ui/MentionTextarea';

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

const playClickSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(680, ctx.currentTime + 0.06);
    
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.07);
  } catch (err) {
    console.warn("Sound playback blocked or failed:", err);
  }
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
    tasks,
    toggleBulletComplete,
    setCurrentDate,
    notes,
    toggleNoteChecklist,
    updateBullet,
    addQuickJournalBullet,
    updateNote,
    deleteBullet,
  } = useData();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoalContent, setNewGoalContent] = useState('');
  const [newGoalDeadline, setNewGoalDeadline] = useState('');
  const [newGoalPriority, setNewGoalPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [categorySelectOption, setCategorySelectOption] = useState('General');
  const [customCategory, setCustomCategory] = useState('');
  
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editProgress, setEditProgress] = useState(0);
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [editCategorySelectOption, setEditCategorySelectOption] = useState('General');
  const [editCustomCategory, setEditCustomCategory] = useState('');
  
  const [draggedGoalId, setDraggedGoalId] = useState<string | null>(null);

  const [focusMode, setFocusMode] = useState<FocusMode | 'none'>('none');
  const [newSubGoalText, setNewSubGoalText] = useState<{ [goalId: string]: string }>({});
  const [newSubGoalDeadline, setNewSubGoalDeadline] = useState<{ [goalId: string]: string }>({});
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'goals' | 'inbox' | 'calendar'>('goals');
  const [showStats, setShowStats] = useState(false);
  const [showGoalsFilters, setShowGoalsFilters] = useState(false);
  const [showInboxFilters, setShowInboxFilters] = useState(false);
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(new Date());
  const [showCompletedTasksInCalendar, setShowCompletedTasksInCalendar] = useState<boolean>(true);

  // States for Inbox Tasks rescheduling & filtering
  const [reschedulingTaskId, setReschedulingTaskId] = useState<string | null>(null);
  const [linkingTaskId, setLinkingTaskId] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [inboxFilter, setInboxFilter] = useState<'all' | 'today' | 'overdue' | 'week' | 'journal' | 'notes'>('all');
  const [inboxSort, setInboxSort] = useState<'time-asc' | 'time-desc' | 'created-desc'>('time-asc');
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [newTaskContent, setNewTaskContent] = useState('');


  // Aggregate unresolved checklist bullets across all logs and notes for full-page detailed view
  const pendingTasks = useMemo(() => {
    const list: {
      id: string;
      text: string;
      date: string;
      createdAt: Date;
      scheduledAt?: Date;
      isCompleted?: boolean;
      isFromNote?: boolean;
      noteId?: string;
    }[] = [];

    // 1. Journal entries checklist items from tasks state
    (tasks || []).forEach(task => {
      if (!task.isCompleted && !task.isFromNote) {
        list.push({
          id: task.id,
          text: task.text,
          date: task.entryDate,
          createdAt: new Date(task.createdAt),
          scheduledAt: task.scheduledAt ? new Date(task.scheduledAt) : undefined,
          isCompleted: task.isCompleted,
          isFromNote: false,
        });
      }
    });

    // 2. Saved notes checklist items
    (notes || []).forEach(note => {
      if (note.status !== 'saved') return; // Only scan active saved notes
      const lines = (note.contentMarkdown || '').split('\n');
      lines.forEach((line, index) => {
        const match = line.match(/^(\s*[-*]\s+\[\s*\]\s+)(.+)$/);
        if (match) {
          const text = match[2].trim();
          list.push({
            id: `note_${note.id}_line_${index}`,
            text: text,
            date: format(note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt), 'yyyy-MM-dd'),
            createdAt: note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt),
            isCompleted: false,
            isFromNote: true,
            noteId: note.id
          });
        }
      });
    });

    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [tasks, notes]);

  // Aggregate resolved (completed) checklist bullets across all logs and notes
  const completedTasks = useMemo(() => {
    const list: {
      id: string;
      text: string;
      date: string;
      createdAt: Date;
      scheduledAt?: Date;
      isCompleted?: boolean;
      isFromNote?: boolean;
      noteId?: string;
    }[] = [];

    // 1. Journal entries completed checklists from tasks state
    (tasks || []).forEach(task => {
      if (task.isCompleted && !task.isFromNote) {
        list.push({
          id: task.id,
          text: task.text,
          date: task.entryDate,
          createdAt: new Date(task.createdAt),
          scheduledAt: task.scheduledAt ? new Date(task.scheduledAt) : undefined,
          isCompleted: task.isCompleted,
          isFromNote: false,
        });
      }
    });

    // 2. Saved notes completed checklists
    (notes || []).forEach(note => {
      if (note.status !== 'saved') return;
      const lines = (note.contentMarkdown || '').split('\n');
      lines.forEach((line, index) => {
        const match = line.match(/^(\s*[-*]\s+\[\s*[xX]\s*\]\s+)(.+)$/);
        if (match) {
          const text = match[2].trim();
          list.push({
            id: `note_${note.id}_line_${index}`,
            text: text,
            date: format(note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt), 'yyyy-MM-dd'),
            createdAt: note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt),
            isCompleted: true,
            isFromNote: true,
            noteId: note.id
          });
        }
      });
    });

    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [tasks, notes]);

  // Task & Goal Statistics calculations
  const stats = useMemo(() => {
    // 1. Goal Metrics
    const totalGoalsCount = goals.length;
    const completedGoalsCount = goals.filter(g => g.isCompleted).length;
    const activeGoalsCount = totalGoalsCount - completedGoalsCount;
    const goalCompletionRate = totalGoalsCount > 0 ? Math.round((completedGoalsCount / totalGoalsCount) * 100) : 0;
    
    // Average progress of active goals
    const activeGoals = goals.filter(g => !g.isCompleted);
    const avgGoalProgress = activeGoals.length > 0 
      ? Math.round(activeGoals.reduce((sum, g) => sum + g.progress, 0) / activeGoals.length)
      : 0;

    // Sub-goal counts
    let totalSubgoals = 0;
    let completedSubgoals = 0;
    goals.forEach(g => {
      if (g.subGoals && g.subGoals.length > 0) {
        totalSubgoals += g.subGoals.length;
        completedSubgoals += g.subGoals.filter(s => s.isCompleted).length;
      }
    });

    // 2. Task Metrics (Journal checklist items)
    let completedJournalTasks = 0;
    let pendingJournalTasks = 0;
    const completedJournalTasksByDate: { [date: string]: number } = {};
    
    (tasks || []).forEach(task => {
      if (!task.isFromNote) {
        if (task.isCompleted) {
          completedJournalTasks++;
          const entryDate = task.entryDate; // YYYY-MM-DD
          completedJournalTasksByDate[entryDate] = (completedJournalTasksByDate[entryDate] || 0) + 1;
        } else {
          pendingJournalTasks++;
        }
      }
    });

    // 3. Task Metrics (Note checklist items)
    let completedNoteTasks = 0;
    let pendingNoteTasks = 0;
    (notes || []).forEach(note => {
      if (note.status !== 'saved') return;
      const lines = (note.contentMarkdown || '').split('\n');
      lines.forEach(line => {
        const match = line.match(/^(\s*[-*]\s+\[\s*([ xX]?)\s*\]\s+)(.+)$/);
        if (match) {
          const isCompleted = match[2].toLowerCase() === 'x';
          if (isCompleted) {
            completedNoteTasks++;
          } else {
            pendingNoteTasks++;
          }
        }
      });
    });

    // Summary Task Metrics
    const totalCompletedTasks = completedJournalTasks + completedNoteTasks;
    const totalPendingTasks = pendingJournalTasks + pendingNoteTasks;
    const totalTasks = totalCompletedTasks + totalPendingTasks;
    const taskCompletionRate = totalTasks > 0 ? Math.round((totalCompletedTasks / totalTasks) * 100) : 0;

    // Overdue tasks count
    let overdueTasksCount = 0;
    (tasks || []).forEach(task => {
      if (!task.isFromNote && !task.isCompleted && task.scheduledAt) {
        const sDate = new Date(task.scheduledAt);
        if (isPast(sDate) && !isToday(sDate)) {
          overdueTasksCount++;
        }
      }
    });

    // 4. Priority breakdown of active goals
    const priorityBreakdown = {
      high: activeGoals.filter(g => g.priorityLevel === 'high').length,
      medium: activeGoals.filter(g => g.priorityLevel === 'medium' || !g.priorityLevel).length,
      low: activeGoals.filter(g => g.priorityLevel === 'low').length,
    };

    // 5. 7-Day Completed Tasks Trend Chart Data
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    const trendData = last7Days.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const label = format(date, 'EEE'); // e.g. Mon, Tue
      const count = completedJournalTasksByDate[dateStr] || 0;
      return { dateStr, label, count };
    });

    const maxTrendCount = Math.max(...trendData.map(d => d.count), 1); // avoid division by 0

    return {
      totalGoalsCount,
      completedGoalsCount,
      activeGoalsCount,
      goalCompletionRate,
      avgGoalProgress,
      totalSubgoals,
      completedSubgoals,
      completedJournalTasks,
      pendingJournalTasks,
      completedNoteTasks,
      pendingNoteTasks,
      totalCompletedTasks,
      totalPendingTasks,
      totalTasks,
      taskCompletionRate,
      overdueTasksCount,
      priorityBreakdown,
      trendData,
      maxTrendCount,
    };
  }, [goals, tasks, notes]);

  // Rescheduling helper functions
  const startRescheduling = (task: any) => {
    setReschedulingTaskId(task.id);
    const baseDate = task.scheduledAt ? new Date(task.scheduledAt) : new Date(task.createdAt);
    setCustomDate(format(baseDate, 'yyyy-MM-dd'));
    setCustomTime(task.scheduledAt ? format(baseDate, 'HH:mm') : '');
  };

  const handleReschedule = async (taskId: string, dateStr: string, timeStr?: string) => {
    if (!dateStr) return;
    let scheduledDate: Date;
    if (timeStr) {
      scheduledDate = new Date(`${dateStr}T${timeStr}`);
    } else {
      scheduledDate = new Date(`${dateStr}T12:00:00`); // default to noon
    }
    
    await updateBullet(taskId, { scheduledAt: scheduledDate });
    setReschedulingTaskId(null);
  };

  const handleQuickSnooze = async (taskId: string, type: 'today' | 'tomorrow' | 'next-monday' | 'plus-1-hour') => {
    let newDate = new Date();
    if (type === 'today') {
      newDate.setHours(12, 0, 0, 0); // today at 12 PM
    } else if (type === 'tomorrow') {
      newDate.setDate(newDate.getDate() + 1);
      newDate.setHours(9, 0, 0, 0); // tomorrow at 9 AM
    } else if (type === 'next-monday') {
      const day = newDate.getDay();
      const daysUntilMonday = day === 0 ? 1 : 8 - day;
      newDate.setDate(newDate.getDate() + daysUntilMonday);
      newDate.setHours(9, 0, 0, 0); // next Monday at 9 AM
    } else if (type === 'plus-1-hour') {
      const task = pendingTasks.find(t => t.id === taskId);
      const baseDate = task?.scheduledAt ? new Date(task.scheduledAt) : new Date();
      newDate = new Date(baseDate.getTime() + 60 * 60 * 1000);
    }

    await updateBullet(taskId, { scheduledAt: newDate });
    setReschedulingTaskId(null);
  };

  const handleRemoveSchedule = async (taskId: string) => {
    await updateBullet(taskId, { scheduledAt: undefined });
    setReschedulingTaskId(null);
  };

  const handleLinkTaskToGoal = async (taskId: string, taskText: string, goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    // Check if already linked
    const exists = goal.subGoals?.some(s => s.bulletId === taskId);
    if (exists) return;

    playClickSound();
    const newSub: SubGoal = {
      id: Math.random().toString(36).substring(2, 9),
      content: taskText.trim(),
      isCompleted: false,
      bulletId: taskId
    };

    const updatedSubs = [...(goal.subGoals || []), newSub];
    const progress = Math.round((updatedSubs.filter(s => s.isCompleted).length / updatedSubs.length) * 100);

    await updateGoal(goal.id, {
      subGoals: updatedSubs,
      progress
    });
  };

  const handleUnlinkTask = async (taskId: string) => {
    const goal = goals.find(g => g.subGoals?.some(s => s.bulletId === taskId));
    if (!goal) return;

    playClickSound();
    const updatedSubs = (goal.subGoals || []).filter(s => s.bulletId !== taskId);
    const progress = updatedSubs.length > 0
      ? Math.round((updatedSubs.filter(s => s.isCompleted).length / updatedSubs.length) * 100)
      : 0;

    await updateGoal(goal.id, {
      subGoals: updatedSubs,
      progress
    });
  };

  const handleAddTask = async () => {
    if (!newTaskContent.trim()) return;
    await addQuickJournalBullet(newTaskContent.trim(), 'checklist');
    setNewTaskContent('');
    setShowAddTaskForm(false);
  };


  // Overdue tasks
  const overdueTasks = useMemo(() => {
    return pendingTasks.filter(task => {
      if (!task.scheduledAt) return false;
      return isPast(new Date(task.scheduledAt)) && !isToday(new Date(task.scheduledAt));
    });
  }, [pendingTasks]);

  const handlePostponeAllOverdue = async () => {
    if (overdueTasks.length === 0) return;
    const todayNoon = new Date();
    todayNoon.setHours(12, 0, 0, 0); // default to 12 PM today
    try {
      const promises = overdueTasks.map(task =>
        updateBullet(task.id, { scheduledAt: todayNoon })
      );
      await Promise.all(promises);
    } catch (e) {
      console.error('Failed to postpone overdue tasks', e);
    }
  };

  // Filtered and Sorted pending tasks
  const filteredPendingTasks = useMemo(() => {
    let list = [...pendingTasks];

    // 1. Filtering
    if (inboxFilter === 'today') {
      list = list.filter(task => {
        const d = task.scheduledAt ? new Date(task.scheduledAt) : new Date(task.date);
        return isToday(d);
      });
    } else if (inboxFilter === 'overdue') {
      list = list.filter(task => {
        if (!task.scheduledAt) return false;
        return isPast(new Date(task.scheduledAt)) && !isToday(new Date(task.scheduledAt));
      });
    } else if (inboxFilter === 'week') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      nextWeek.setHours(23, 59, 59, 999);
      list = list.filter(task => {
        const d = task.scheduledAt ? new Date(task.scheduledAt) : new Date(task.date);
        return d >= today && d <= nextWeek;
      });
    } else if (inboxFilter === 'journal') {
      list = list.filter(task => !task.isFromNote);
    } else if (inboxFilter === 'notes') {
      list = list.filter(task => task.isFromNote);
    }

    // 2. Sorting
    if (inboxSort === 'time-asc') {
      list.sort((a, b) => {
        const timeA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : new Date(a.date).getTime() + 24*60*60*1000*365;
        const timeB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : new Date(b.date).getTime() + 24*60*60*1000*365;
        return timeA - timeB;
      });
    } else if (inboxSort === 'time-desc') {
      list.sort((a, b) => {
        const timeA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
        const timeB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
        return timeB - timeA;
      });
    } else if (inboxSort === 'created-desc') {
      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    return list;
  }, [pendingTasks, inboxFilter, inboxSort]);

  const activeGoals = useMemo(
    () => {
      let list = goals.filter(g => !g.isCompleted);
      if (selectedYear !== 'all') {
        list = list.filter(g => g.createdAt && new Date(g.createdAt).getFullYear().toString() === selectedYear);
      }
      return list.sort((a, b) => a.priority - b.priority);
    },
    [goals, selectedYear]
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
    () => {
      let list = goals.filter(g => g.isCompleted);
      if (selectedYear !== 'all') {
        list = list.filter(g => g.createdAt && new Date(g.createdAt).getFullYear().toString() === selectedYear);
      }
      return list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    },
    [goals, selectedYear]
  );

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    (goals || []).forEach(g => {
      if (g.createdAt) {
        const yr = new Date(g.createdAt).getFullYear().toString();
        years.add(yr);
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [goals]);

  const defaultCategories = ['General', 'Health', 'Work', 'Creative', 'Relationship', 'Self-Care', 'Spirituality'];

  const categories = useMemo(() => {
    const cats = new Set(defaultCategories);
    goals.forEach(g => {
      if (g.category) {
        const trimmed = g.category.trim();
        if (trimmed) {
          const exists = Array.from(cats).some(c => c.toLowerCase() === trimmed.toLowerCase());
          if (!exists) {
            cats.add(trimmed);
          }
        }
      }
    });
    return Array.from(cats).sort();
  }, [goals]);

  const calendarGrid = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startDayOfWeek = firstDayOfMonth.getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    const cells: { date: Date; isCurrentMonth: boolean; key: string }[] = [];
    
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthTotalDays - i);
      cells.push({
        date: d,
        isCurrentMonth: false,
        key: `prev-${prevMonthTotalDays - i}`
      });
    }
    
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      cells.push({
        date: d,
        isCurrentMonth: true,
        key: `curr-${i}`
      });
    }
    
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      cells.push({
        date: d,
        isCurrentMonth: false,
        key: `next-${i}`
      });
    }
    
    return cells;
  }, [calendarDate]);

  const calendarWeeks = useMemo(() => {
    const weeks = [];
    for (let i = 0; i < calendarGrid.length; i += 7) {
      weeks.push(calendarGrid.slice(i, i + 7));
    }
    return weeks;
  }, [calendarGrid]);

  const calendarEvents = useMemo(() => {
    const eventsMap: { [dateStr: string]: {
      tasks: any[];
      goals: any[];
      subgoals: any[];
    } } = {};
    
    const addEvent = (dateStr: string, type: 'tasks' | 'goals' | 'subgoals', item: any) => {
      if (!eventsMap[dateStr]) {
        eventsMap[dateStr] = { tasks: [], goals: [], subgoals: [] };
      }
      eventsMap[dateStr][type].push(item);
    };

    (tasks || []).forEach(task => {
      if (!task.isFromNote) {
        const taskDate = task.scheduledAt 
          ? format(new Date(task.scheduledAt), 'yyyy-MM-dd')
          : task.entryDate;
        
        addEvent(taskDate, 'tasks', {
          id: task.id,
          text: task.text,
          isCompleted: task.isCompleted,
          isFromNote: false,
          scheduledAt: task.scheduledAt,
          sourceDate: task.entryDate
        });
      }
    });

    (notes || []).forEach(note => {
      if (note.status !== 'saved') return;
      const lines = (note.contentMarkdown || '').split('\n');
      lines.forEach((line, index) => {
        const match = line.match(/^(\s*[-*]\s+\[\s*([ xX]?)\s*\]\s+)(.+)$/);
        if (match) {
          const text = match[3].trim();
          const isCompleted = match[2].toLowerCase() === 'x';
          const noteDate = format(note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt), 'yyyy-MM-dd');
          addEvent(noteDate, 'tasks', {
            id: `note_${note.id}_line_${index}`,
            text: text,
            isCompleted,
            isFromNote: true,
            noteId: note.id,
            sourceDate: noteDate
          });
        }
      });
    });

    goals.forEach(goal => {
      if (goal.deadline) {
        addEvent(goal.deadline, 'goals', goal);
      }
      if (goal.subGoals) {
        goal.subGoals.forEach(sub => {
          if (sub.deadline) {
            addEvent(sub.deadline, 'subgoals', {
              ...sub,
              goalId: goal.id,
              goalContent: goal.content
            });
          }
        });
      }
    });

    return eventsMap;
  }, [tasks, notes, goals]);

  const handleClearCompletedTasks = async () => {
    if (!confirm('Are you sure you want to permanently delete all completed tasks? This action cannot be undone.')) {
      return;
    }
    playClickSound();
    let clearedCount = 0;
    const completedJournalTasksList = (tasks || []).filter(t => !t.isFromNote && t.isCompleted);
    for (const t of completedJournalTasksList) {
      await deleteBullet(t.id);
      clearedCount++;
    }
    for (const note of notes || []) {
      if (note.status !== 'saved') continue;
      const lines = (note.contentMarkdown || '').split('\n');
      let updated = false;
      const updatedLines = lines.filter(line => {
        const match = line.match(/^(\s*[-*]\s+\[\s*([xX])\s*\]\s+)(.+)$/);
        if (match) {
          updated = true;
          clearedCount++;
          return false;
        }
        return true;
      });
      if (updated) {
        const newMarkdown = updatedLines.join('\n');
        await updateNote(note.id, {
          contentMarkdown: newMarkdown,
          content: newMarkdown
        });
      }
    }
    alert(`Successfully deleted ${clearedCount} completed tasks!`);
  };

  const handleAddGoal = async () => {
    if (!newGoalContent.trim()) return;
    const resolvedCategory = categorySelectOption === '__custom__'
      ? customCategory.trim()
      : categorySelectOption;
      
    await addGoal(newGoalContent.trim(), {
      deadline: newGoalDeadline || undefined,
      category: resolvedCategory || 'General',
      priorityLevel: newGoalPriority,
      progress: 0,
      subGoals: [],
    });
    setNewGoalContent('');
    setNewGoalDeadline('');
    setCategorySelectOption('General');
    setCustomCategory('');
    setNewGoalPriority('medium');
    setShowAddForm(false);
  };

  const handleEditGoal = (goal: FocusGoal) => {
    setEditingGoalId(goal.id);
    setEditContent(goal.content);
    setEditDeadline(goal.deadline || '');
    setEditProgress(goal.progress);
    setEditPriority(goal.priorityLevel || 'medium');
    
    const cat = goal.category || 'General';
    const match = categories.find(c => c.toLowerCase() === cat.trim().toLowerCase());
    if (match) {
      setEditCategorySelectOption(match);
      setEditCustomCategory('');
    } else {
      setEditCategorySelectOption('__custom__');
      setEditCustomCategory(cat);
    }
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

    const resolvedCategory = editCategorySelectOption === '__custom__'
      ? editCustomCategory.trim()
      : editCategorySelectOption;

    await updateGoal(editingGoalId, {
      content: editContent.trim(),
      deadline: editDeadline || undefined,
      category: resolvedCategory || 'General',
      priorityLevel: editPriority,
      progress,
    });
    setEditingGoalId(null);
  };

  const handleDeleteGoal = async (goalId: string) => {
    await deleteGoal(goalId);
  };

  const handleAddSubGoal = async (goal: FocusGoal, text: string) => {
    if (!text.trim()) return;
    const deadline = newSubGoalDeadline[goal.id] || undefined;
    const newSub: SubGoal = {
      id: Math.random().toString(36).substring(2, 9),
      content: text.trim(),
      isCompleted: false,
      deadline: deadline || undefined,
    };
    const updatedSubs = [...(goal.subGoals || []), newSub];
    const progress = Math.round((updatedSubs.filter(s => s.isCompleted).length / updatedSubs.length) * 100);
    
    await updateGoal(goal.id, {
      subGoals: updatedSubs,
      progress
    });
    setNewSubGoalText(prev => ({ ...prev, [goal.id]: '' }));
    setNewSubGoalDeadline(prev => ({ ...prev, [goal.id]: '' }));
  };

  const handleToggleSubGoal = async (goal: FocusGoal, subId: string) => {
    const subGoal = goal.subGoals?.find(s => s.id === subId);
    if (subGoal && subGoal.bulletId) {
      if (subGoal.bulletId.startsWith('note_')) {
        const parts = subGoal.bulletId.split('_');
        const noteId = parts[1];
        await toggleNoteChecklist(noteId, subGoal.content);
      } else {
        await toggleBulletComplete(subGoal.bulletId);
      }
    } else {
      const updatedSubs = (goal.subGoals || []).map(s => 
        s.id === subId ? { ...s, isCompleted: !s.isCompleted } : s
      );
      const progress = Math.round((updatedSubs.filter(s => s.isCompleted).length / updatedSubs.length) * 100);
      
      await updateGoal(goal.id, {
        subGoals: updatedSubs,
        progress
      });
    }
  };

  const handleUpdateSubGoalDeadline = async (goal: FocusGoal, subId: string, deadline: string) => {
    const updatedSubs = (goal.subGoals || []).map(s => 
      s.id === subId ? { ...s, deadline: deadline || undefined } : s
    );
    await updateGoal(goal.id, {
      subGoals: updatedSubs
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
      <div className="mx-auto max-w-[640px] md:max-w-[850px] lg:max-w-[1100px] xl:max-w-[1280px] 2xl:max-w-[1440px] px-6 pt-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-sans text-4xl font-bold tracking-tight text-[#2F3331]">Goals</h1>
            <p className="mt-2 text-sm text-[#6F7476]">set and track your focus</p>
          </div>
          <button
            onClick={() => {
              if (activeSubTab === 'goals') {
                setShowAddForm(current => !current);
              } else {
                setShowAddTaskForm(current => !current);
              }
            }}
            className="mt-1 flex h-11 w-11 items-center justify-center rounded-full bg-[#00DC7D] text-white shadow-sm transition-transform duration-200 hover:scale-105 active:scale-95 hover:bg-[#00B866]"
            title={activeSubTab === 'goals' ? 'add goal' : 'add task'}
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
          <button
            onClick={() => setActiveSubTab('calendar')}
            className={`px-4 py-2 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'calendar'
                ? 'bg-[#E9FFF4] text-[#00A963] shadow-sm'
                : 'text-[#6F7476] hover:bg-gray-100 hover:text-[#2F3331]'
            }`}
          >
            <FontAwesomeIcon icon={faCalendar} className="w-3.5 h-3.5" />
            Calendar View
          </button>
        </div>

        {/* Toggle Button for Stats Dashboard / Filters */}
        <div className="mt-4 flex justify-end gap-2 select-none">
          {activeSubTab === 'goals' && (
            <button
              onClick={() => setShowGoalsFilters(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#1E2022] border border-[#EEF0EF] dark:border-[#2E3133] hover:border-[#CCD0CF] dark:hover:border-zinc-700 text-[10px] font-extrabold uppercase tracking-wider text-[#6F7476] dark:text-[#A3A7A8] transition-all hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer shadow-sm"
            >
              <FontAwesomeIcon icon={faFilter} className={`h-3 w-3 ${showGoalsFilters ? 'text-[#00DC7D]' : 'text-gray-400'}`} />
              <span>{showGoalsFilters ? 'Hide Filters' : 'Show Filters'}</span>
              <FontAwesomeIcon icon={faChevronDown} className={`h-2.5 w-2.5 transition-transform duration-300 ${showGoalsFilters ? 'rotate-180' : ''}`} />
            </button>
          )}
          {activeSubTab === 'inbox' && (
            <button
              onClick={() => setShowInboxFilters(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#1E2022] border border-[#EEF0EF] dark:border-[#2E3133] hover:border-[#CCD0CF] dark:hover:border-zinc-700 text-[10px] font-extrabold uppercase tracking-wider text-[#6F7476] dark:text-[#A3A7A8] transition-all hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer shadow-sm"
            >
              <FontAwesomeIcon icon={faFilter} className={`h-3 w-3 ${showInboxFilters ? 'text-[#00DC7D]' : 'text-gray-400'}`} />
              <span>{showInboxFilters ? 'Hide Filters' : 'Show Filters'}</span>
              <FontAwesomeIcon icon={faChevronDown} className={`h-2.5 w-2.5 transition-transform duration-300 ${showInboxFilters ? 'rotate-180' : ''}`} />
            </button>
          )}
          {activeSubTab === 'goals' && (
            <button
              onClick={() => setShowStats(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#1E2022] border border-[#EEF0EF] dark:border-[#2E3133] hover:border-[#CCD0CF] dark:hover:border-zinc-700 text-[10px] font-extrabold uppercase tracking-wider text-[#6F7476] dark:text-[#A3A7A8] transition-all hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer shadow-sm"
            >
              <FontAwesomeIcon icon={faChartSimple} className={`h-3 w-3 ${showStats ? 'text-[#00DC7D]' : 'text-gray-400'}`} />
              <span>{showStats ? 'Hide Dashboard' : 'Show Dashboard'}</span>
              <FontAwesomeIcon icon={faChevronDown} className={`h-2.5 w-2.5 transition-transform duration-300 ${showStats ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {/* Collapsible Stats Dashboard */}
        <div
          className={`overflow-hidden transition-all duration-500 ease-in-out ${
            showStats ? 'max-h-[1000px] opacity-100 mt-4' : 'max-h-0 opacity-0 pointer-events-none'
          }`}
        >
          <div className="bg-white dark:bg-[#1E2022] rounded-3xl p-6 border border-[#EEF0EF] dark:border-[#2E3133] shadow-sm space-y-6">
            
            {/* Top Grid: Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Card 1: Goals Progress Circle */}
              <div className="bg-[#FAFAFA] dark:bg-[#202324] rounded-2xl p-5 border border-[#EEF0EF] dark:border-[#2E3133] flex items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-[#A3A7A8] dark:text-[#888D8F] uppercase tracking-wider block">Goals Overview</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-[#2F3331] dark:text-[#FAFAFA]">{stats.completedGoalsCount}</span>
                    <span className="text-xs text-[#6F7476] dark:text-[#A3A7A8]">/ {stats.totalGoalsCount} completed</span>
                  </div>
                  <p className="text-[9.5px] text-[#6F7476] dark:text-[#A3A7A8] leading-tight">
                    Avg progress of active goals: <span className="font-bold text-[#00A963]">{stats.avgGoalProgress}%</span>
                  </p>
                </div>
                
                {/* SVG Circular Progress Ring */}
                <div className="relative h-16 w-16 shrink-0 flex items-center justify-center">
                  <svg className="h-full w-full transform -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      stroke="#EEF0EF"
                      strokeWidth="5"
                      fill="transparent"
                      className="text-gray-100 dark:text-zinc-800 stroke-current"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      stroke="url(#goalsGrad)"
                      strokeWidth="5"
                      strokeDasharray={2 * Math.PI * 26}
                      strokeDashoffset={2 * Math.PI * 26 * (1 - stats.goalCompletionRate / 100)}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-1000"
                    />
                    <defs>
                      <linearGradient id="goalsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#00DC7D" />
                        <stop offset="100%" stopColor="#00A963" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-xs font-black text-[#2F3331] dark:text-[#FAFAFA]">{stats.goalCompletionRate}%</span>
                    <span className="text-[7px] font-bold uppercase tracking-wider text-[#A3A7A8]">Rate</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Tasks Mastery */}
              <div className="bg-[#FAFAFA] dark:bg-[#202324] rounded-2xl p-5 border border-[#EEF0EF] dark:border-[#2E3133] flex flex-col justify-between gap-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-[#A3A7A8] dark:text-[#888D8F] uppercase tracking-wider block">Tasks Mastery</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-[#2F3331] dark:text-[#FAFAFA]">{stats.totalCompletedTasks}</span>
                    <span className="text-xs text-[#6F7476] dark:text-[#A3A7A8]">/ {stats.totalTasks} done</span>
                  </div>
                  <p className="text-[9.5px] text-[#6F7476] dark:text-[#A3A7A8] leading-tight">
                    Completed journal & note checklists.
                  </p>
                </div>
                
                {/* Glowing Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[9px] font-bold text-[#6F7476] dark:text-[#A3A7A8]">
                    <span>Completion Rate</span>
                    <span>{stats.taskCompletionRate}%</span>
                  </div>
                  <div className="h-2 w-full bg-[#EEF0EF] dark:bg-zinc-800 rounded-full overflow-hidden relative">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#8B00D4] to-[#A900FF] transition-all duration-1000"
                      style={{ width: `${stats.taskCompletionRate}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Urgency & Focus Breakdown */}
              <div className="bg-[#FAFAFA] dark:bg-[#202324] rounded-2xl p-5 border border-[#EEF0EF] dark:border-[#2E3133] flex flex-col justify-between gap-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-[#A3A7A8] dark:text-[#888D8F] uppercase tracking-wider block">Urgency & Priority</span>
                  <div className="flex items-center gap-4">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-[#6F7476] dark:text-[#A3A7A8]">Overdue</span>
                      <div className="flex items-center gap-1">
                        <span className={`text-xl font-black ${stats.overdueTasksCount > 0 ? 'text-[#FF453A]' : 'text-[#2F3331] dark:text-[#FAFAFA]'}`}>
                          {stats.overdueTasksCount}
                        </span>
                        <span className="text-[9px] text-[#A3A7A8]">tasks</span>
                      </div>
                    </div>
                    <div className="h-8 w-px bg-[#EEF0EF] dark:bg-[#2E3133]" />
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-[#6F7476] dark:text-[#A3A7A8]">Sub-steps</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xl font-black text-[#2F3331] dark:text-[#FAFAFA]">
                          {stats.completedSubgoals}
                        </span>
                        <span className="text-[9px] text-[#A3A7A8]">/ {stats.totalSubgoals} done</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Priority distribution bar chart */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[8px] font-bold text-[#A3A7A8] dark:text-[#888D8F] uppercase">
                    <span>Active Priority (H / M / L)</span>
                  </div>
                  <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800">
                    {stats.activeGoalsCount > 0 ? (
                      <>
                        <div
                          className="bg-red-500 transition-all duration-500"
                          style={{ width: `${(stats.priorityBreakdown.high / stats.activeGoalsCount) * 100}%` }}
                          title={`High: ${stats.priorityBreakdown.high}`}
                        />
                        <div
                          className="bg-yellow-500 transition-all duration-500"
                          style={{ width: `${(stats.priorityBreakdown.medium / stats.activeGoalsCount) * 100}%` }}
                          title={`Medium: ${stats.priorityBreakdown.medium}`}
                        />
                        <div
                          className="bg-gray-400 transition-all duration-500"
                          style={{ width: `${(stats.priorityBreakdown.low / stats.activeGoalsCount) * 100}%` }}
                          title={`Low: ${stats.priorityBreakdown.low}`}
                        />
                      </>
                    ) : (
                      <div className="w-full bg-gray-200 dark:bg-zinc-800" />
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Section: Sebaran & Tren Productivity */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
              
              {/* Task Origin Distribution (Donut Chart or Split Bar) */}
              <div className="bg-[#FAFAFA] dark:bg-[#202324] rounded-2xl p-5 border border-[#EEF0EF] dark:border-[#2E3133] md:col-span-2 space-y-4">
                <span className="text-[10px] font-bold text-[#A3A7A8] dark:text-[#888D8F] uppercase tracking-wider block">Task Sources</span>
                
                <div className="flex flex-col justify-center h-full space-y-4 pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-[#00DC7D]" />
                      <span className="text-[10px] font-bold text-[#6F7476] dark:text-[#A3A7A8]">Journal checklists</span>
                    </div>
                    <span className="text-xs font-black text-[#2F3331] dark:text-[#FAFAFA]">
                      {stats.completedJournalTasks + stats.pendingJournalTasks}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-[#8B00D4]" />
                      <span className="text-[10px] font-bold text-[#6F7476] dark:text-[#A3A7A8]">Note checklists</span>
                    </div>
                    <span className="text-xs font-black text-[#2F3331] dark:text-[#FAFAFA]">
                      {stats.completedNoteTasks + stats.pendingNoteTasks}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800">
                      {stats.totalTasks > 0 ? (
                        <>
                          <div
                            className="bg-[#00DC7D]"
                            style={{ width: `${((stats.completedJournalTasks + stats.pendingJournalTasks) / stats.totalTasks) * 100}%` }}
                          />
                          <div
                            className="bg-[#8B00D4]"
                            style={{ width: `${((stats.completedNoteTasks + stats.pendingNoteTasks) / stats.totalTasks) * 100}%` }}
                          />
                        </>
                      ) : (
                        <div className="w-full bg-gray-200 dark:bg-zinc-800" />
                      )}
                    </div>
                    <div className="flex justify-between text-[8px] font-bold text-[#A3A7A8] dark:text-[#888D8F]">
                      <span>
                        {stats.totalTasks > 0
                          ? `${Math.round(((stats.completedJournalTasks + stats.pendingJournalTasks) / stats.totalTasks) * 100)}%`
                          : '0%'} Journal
                      </span>
                      <span>
                        {stats.totalTasks > 0
                          ? `${Math.round(((stats.completedNoteTasks + stats.pendingNoteTasks) / stats.totalTasks) * 100)}%`
                          : '0%'} Note
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Weekly Productivity Bar Chart */}
              <div className="bg-[#FAFAFA] dark:bg-[#202324] rounded-2xl p-5 border border-[#EEF0EF] dark:border-[#2E3133] md:col-span-3 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#A3A7A8] dark:text-[#888D8F] uppercase tracking-wider">7-Day Productivity Trend</span>
                  <span className="text-[9px] font-bold text-[#00A963] dark:text-[#00DC7D] uppercase tracking-wider bg-white dark:bg-zinc-900 border border-[#EEF0EF] dark:border-zinc-800 px-2 py-0.5 rounded-full shadow-sm">
                    completed tasks
                  </span>
                </div>

                {/* SVG Bar Chart */}
                <div className="flex items-end justify-between h-28 pt-4 px-2">
                  {stats.trendData.map((d) => {
                    const heightPercent = (d.count / stats.maxTrendCount) * 80;
                    return (
                      <div key={d.dateStr} className="flex flex-col items-center justify-end flex-1 h-full group/bar relative">
                        <div className="absolute bottom-[105%] bg-zinc-900 dark:bg-zinc-800 text-white dark:text-[#FAFAFA] text-[8px] font-bold px-1.5 py-0.5 rounded shadow-md opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap">
                          {d.count} done
                        </div>
                        <div
                          className="w-5 md:w-6 bg-gradient-to-t from-[#00A963] to-[#00DC7D] hover:from-[#00DC7D] hover:to-[#55FFB4] rounded-t-md transition-all duration-700 cursor-pointer relative shadow-sm"
                          style={{ height: `${Math.max(heightPercent, 4)}%` }}
                        />
                        <span className="text-[8.5px] font-bold text-[#6F7476] dark:text-[#A3A7A8] mt-2 block tracking-tight uppercase">
                          {d.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>
        </div>

        {activeSubTab === 'goals' && (
          <>
            {/* Global Focus View Selector Tray */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                showGoalsFilters ? 'max-h-[500px] opacity-100 mt-6' : 'max-h-0 opacity-0 pointer-events-none mt-0'
              }`}
            >
              <div className="bg-[#FAFAFA] dark:bg-[#202324] rounded-2xl p-4.5 border border-[#EEF0EF] dark:border-[#2E3133] select-none flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col items-start gap-1">
                  <span className="text-[10px] font-bold text-[#6F7476] dark:text-[#A3A7A8] uppercase tracking-widest flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faCrosshairs} className="text-gray-400" /> Focus View Filter
                  </span>
                  <div className="flex items-center gap-2 mt-2 bg-[#F2F2F3]/60 dark:bg-zinc-800/40 p-1.5 rounded-full border border-[#EEF0EF] dark:border-[#2E3133] max-w-full">
                    {(['none', 'hyperfocus', 'top3', 'pareto'] as const).map(mode => {
                      const isActive = focusMode === mode;
                      const icon = mode === 'none' ? faEye : mode === 'hyperfocus' ? faCrosshairs : mode === 'top3' ? faStar : faChartSimple;
                      const label = mode === 'none' ? 'All' : focusModeInfo[mode].label;
                      
                      if (isActive) {
                        return (
                          <button
                            key={mode}
                            onClick={() => setFocusMode(mode)}
                            className="flex items-center gap-1.5 py-1.5 px-4 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 shadow-sm border border-transparent cursor-pointer active:scale-95 text-white bg-[#2F3331] dark:bg-zinc-700"
                            style={mode !== 'none' ? {
                              backgroundColor: focusModeInfo[mode].color,
                            } : {}}
                          >
                            <FontAwesomeIcon icon={icon} className="h-3.5 w-3.5" />
                            <span>{label}</span>
                          </button>
                        );
                      } else {
                        return (
                          <button
                            key={mode}
                            onClick={() => setFocusMode(mode)}
                            className="flex items-center justify-center w-8.5 h-8.5 rounded-full bg-white dark:bg-[#1E2022] text-[#6F7476] dark:text-[#A3A7A8] border border-[#EEF0EF] dark:border-[#2E3133] hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white transition-all duration-300 cursor-pointer active:scale-95"
                            title={label}
                          >
                            <FontAwesomeIcon icon={icon} className="h-3.5 w-3.5" />
                          </button>
                        );
                      }
                    })}
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end gap-1">
                  <span className="text-[10px] font-bold text-[#6F7476] dark:text-[#A3A7A8] uppercase tracking-widest flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faFilter} className="text-gray-400" /> Time Horizon
                  </span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="mt-2 bg-white dark:bg-[#1E2022] border border-[#EEF0EF] dark:border-[#2E3133] rounded-full px-4 py-2 text-xs font-bold text-[#6F7476] dark:text-[#A3A7A8] focus:outline-none focus:border-[#00DC7D] transition-colors cursor-pointer shadow-sm"
                  >
                    <option value="all">All Time</option>
                    {availableYears.map(yr => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-[10px] text-[#A3A7A8] dark:text-[#888D8F] mt-3 font-light text-center leading-normal max-w-full">
                {focusMode === 'none' && "Showing all active goals in your custom priority order. Drag to reorder!"}
                {focusMode === 'hyperfocus' && "Hyperfocus: Showing ONLY your single highest priority goal. Crush it first! 🔥"}
                {focusMode === 'top3' && "Top 3: Displaying your top 3 prioritized milestones. Keep it simple! ⭐"}
                {focusMode === 'pareto' && "Pareto View: Showing the top 20% most impactful goals. Focus on the vital few! 📊"}
              </p>
            </div>

        {showAddForm && (
          <div className="mt-6 rounded-3xl bg-white p-6 border border-[#EEF0EF] shadow-md transition-all duration-300">
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
            
            <div className="mb-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#6F7476]">Category</label>
                  <select
                    value={categorySelectOption}
                    onChange={(e) => setCategorySelectOption(e.target.value)}
                    className="w-full bg-transparent border-b border-[#CCD0CF]/40 focus:border-b-[#00DC7D] rounded-none py-1.5 text-sm text-[#2F3331] focus:outline-none transition-all duration-300"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__custom__">➕ Create new...</option>
                  </select>
                  {categorySelectOption === '__custom__' && (
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Enter custom category"
                      className="mt-2 w-full bg-transparent border-b border-[#CCD0CF]/40 focus:border-b-[#00DC7D] rounded-none py-1 text-xs text-[#2F3331] placeholder-[#CCD0CF]/80 focus:outline-none transition-all duration-300"
                    />
                  )}
                </div>
              </div>
              
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-[#6F7476]">Priority Level</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map((level) => {
                    const active = newGoalPriority === level;
                    const colorClasses = 
                      level === 'low'
                        ? active ? 'bg-gray-100 text-gray-800 border-gray-300 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                        : level === 'medium'
                        ? active ? 'bg-yellow-50 text-yellow-800 border-yellow-300 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-yellow-50/30'
                        : active ? 'bg-red-50 text-red-700 border-red-300 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-red-50/30';
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setNewGoalPriority(level)}
                        className={`flex-1 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer text-center ${colorClasses}`}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#CCD0CF] bg-white text-[#6F7476] hover:bg-[#F2F2F3] hover:text-[#2F3331] transition-all cursor-pointer active:scale-95"
                title="Cancel"
                aria-label="Cancel"
              >
                <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
              </button>
              <button
                onClick={handleAddGoal}
                disabled={!newGoalContent.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00DC7D] text-white hover:bg-[#00B866] disabled:opacity-50 transition-all cursor-pointer active:scale-95 shadow-sm shadow-[#00DC7D]/10"
                title="Add Goal"
                aria-label="Add Goal"
              >
                <FontAwesomeIcon icon={faCheck} className="h-4 w-4" />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pt-2">
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
                               <div className="flex flex-wrap gap-1 items-center max-w-[150px]">
                                 {/* Category Chip using Solid FontAwesome Icon */}
                                 <span className="text-[9px] font-bold text-[#6F7476] uppercase tracking-wider bg-white/90 border border-[#EEF0EF]/70 px-2 py-0.5 rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.01)] truncate flex items-center gap-1.5 transition-transform hover:scale-105">
                                   <FontAwesomeIcon icon={getCategoryIcon(goal.category || '')} className="text-gray-400 h-3 w-3" />
                                   <span>{goal.category || 'General'}</span>
                                 </span>
                                 {goal.priorityLevel && (
                                   <span className={`text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${
                                     goal.priorityLevel === 'high'
                                       ? 'bg-red-50 text-red-700 border-red-100'
                                       : goal.priorityLevel === 'low'
                                       ? 'bg-gray-50 text-gray-500 border-gray-100'
                                       : 'bg-yellow-50 text-yellow-800 border-yellow-200'
                                   }`}>
                                     {goal.priorityLevel}
                                   </span>
                                 )}
                               </div>
                              
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
                                playClickSound();
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
                                  <select
                                    value={editCategorySelectOption}
                                    onChange={(e) => setEditCategorySelectOption(e.target.value)}
                                    className="bg-transparent border-b border-[#CCD0CF]/40 focus:border-b-[#00DC7D] rounded-none py-0.5 text-[9px] text-[#2F3331] focus:outline-none"
                                  >
                                    {categories.map(cat => (
                                      <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                    <option value="__custom__">➕ Create new...</option>
                                  </select>
                                  {editCategorySelectOption === '__custom__' && (
                                    <input
                                      type="text"
                                      value={editCustomCategory}
                                      onChange={(e) => setEditCustomCategory(e.target.value)}
                                      placeholder="custom category"
                                      className="bg-transparent border-b border-[#CCD0CF]/40 focus:border-b-[#00DC7D] rounded-none py-0.5 text-[9px] text-[#2F3331] focus:outline-none"
                                    />
                                  )}
                                </div>
                                
                                <div className="flex gap-1">
                                  {(['low', 'medium', 'high'] as const).map((level) => {
                                    const active = editPriority === level;
                                    const colorClasses = 
                                      level === 'low'
                                        ? active ? 'bg-gray-100 text-gray-800 border-gray-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                        : level === 'medium'
                                        ? active ? 'bg-yellow-50 text-yellow-800 border-yellow-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-yellow-50/30'
                                        : active ? 'bg-red-50 text-red-700 border-red-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-red-50/30';
                                    return (
                                      <button
                                        key={level}
                                        type="button"
                                        onClick={() => setEditPriority(level)}
                                        className={`flex-1 py-0.5 rounded-lg border text-[8px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer text-center ${colorClasses}`}
                                      >
                                        {level}
                                      </button>
                                    );
                                  })}
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
                                      className="relative flex items-center justify-between px-2.5 py-1 rounded-full bg-gray-50 dark:bg-gray-800 border border-dashed border-[#EEF0EF]/80 dark:border-[#2E3133] text-[#6F7476] dark:text-[#A3A7A8] transition-all duration-300 group/sub"
                                    >
                                      <span className="text-[9.5px] font-bold tracking-tight truncate max-w-[130px] line-through decoration-[#CCD0CF]/70 select-text">
                                        {sub.content}
                                      </span>
                                      <div className="flex items-center gap-1 shrink-0">
                                        {/* Completed Deadline Display */}
                                        {sub.deadline && (
                                          <span className="text-[8px] text-[#A3A7A8] line-through">
                                            {format(parseISO(sub.deadline), 'MMM d')}
                                          </span>
                                        )}
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
                                            playClickSound();
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
                                      className="relative flex items-center justify-between px-2.5 py-1 rounded-full bg-gray-50 dark:bg-gray-800 border border-dashed border-[#EEF0EF] dark:border-[#2E3133] text-[#6F7476] dark:text-[#A3A7A8] transition-all duration-300 hover:bg-white dark:hover:bg-zinc-800 hover:border-[#CCD0CF]/60 dark:hover:border-[#2E3133] group/sub"
                                    >
                                      <span className="text-[9.5px] font-medium tracking-tight truncate max-w-[130px] select-text">
                                        {sub.content}
                                      </span>
                                      <div className="flex items-center gap-1 shrink-0">
                                        {/* Uncompleted Deadline Display */}
                                        {sub.deadline ? (
                                          (() => {
                                            const dlInfo = getDaysUntil(sub.deadline);
                                            return (
                                              <span className={`text-[8px] font-bold flex items-center gap-0.5 ${dlInfo.overdue ? 'text-red-500 font-extrabold' : 'text-[#8B00D4] dark:text-[#D6B2FF]'}`}>
                                                {dlInfo.text}
                                              </span>
                                            );
                                          })()
                                        ) : null}

                                        {/* Calendar Edit Button with Date Input Picker */}
                                        <div className={`relative flex items-center justify-center h-4 w-4 cursor-pointer transition-opacity duration-200 ${sub.deadline ? 'text-[#8B00D4] dark:text-[#D6B2FF] opacity-100' : 'text-gray-400 opacity-0 group-hover/sub:opacity-100'}`}>
                                          <FontAwesomeIcon icon={faCalendar} className="h-2.5 w-2.5" />
                                          <input
                                            type="date"
                                            value={sub.deadline || ''}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              handleUpdateSubGoalDeadline(goal, sub.id, e.target.value);
                                            }}
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                            title="Edit step deadline"
                                          />
                                        </div>

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
                                            playClickSound();
                                            handleToggleSubGoal(goal, sub.id);
                                          }}
                                          className="h-4.5 w-4.5 rounded-full border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex items-center justify-center cursor-pointer transition-all hover:border-[#00DC7D] hover:bg-[#E9FFF4] dark:hover:bg-[#1E3A2F]"
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
                                  className="flex-1 bg-transparent text-[9.5px] text-[#2F3331] dark:text-[#FAFAFA] placeholder-[#A3A7A8]/70 focus:outline-none"
                                />

                                {/* Calendar Icon for setting deadline in quick add */}
                                <div className="relative flex items-center justify-center h-4 w-4 text-[#A3A7A8] hover:text-[#8B00D4] dark:hover:text-[#D6B2FF] transition-colors cursor-pointer mr-1">
                                  <FontAwesomeIcon icon={faCalendar} className="h-2.5 w-2.5" />
                                  <input
                                    type="date"
                                    value={newSubGoalDeadline[goal.id] || ''}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      const val = e.target.value;
                                      setNewSubGoalDeadline(prev => ({ ...prev, [goal.id]: val }));
                                    }}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    title="Set step deadline"
                                  />
                                </div>

                                {newSubGoalDeadline[goal.id] && (
                                  <span className="text-[8px] bg-[#F0D6FF] dark:bg-[#4E2B6B] text-[#8B00D4] dark:text-[#D6B2FF] px-1 py-0.5 rounded mr-1 font-medium shrink-0">
                                    {format(parseISO(newSubGoalDeadline[goal.id]), 'MMM d')}
                                  </span>
                                )}

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
            <section className="bg-white dark:bg-[#1E2022] rounded-3xl border border-[#EEF0EF] dark:border-[#2E3133] p-5 shadow-sm">
              <button
                type="button"
                onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
                className="flex items-center justify-between w-full text-left focus:outline-none"
              >
                <h2 className="font-sans text-xl font-bold text-[#2F3331] dark:text-[#FAFAFA] flex items-center gap-2">
                  <span>Completed Goals</span>
                  <span className="text-sm font-normal text-[#6F7476] dark:text-[#A3A7A8]">({completedGoals.length})</span>
                </h2>
                <FontAwesomeIcon
                  icon={isCompletedExpanded ? faChevronUp : faChevronDown}
                  className="h-4 w-4 text-[#A3A7A8] transition-transform duration-200"
                />
              </button>

              {isCompletedExpanded && (
                <div className="mt-4 divide-y divide-[#EEF0EF] dark:divide-[#2E3133]/50">
                  {completedGoals.map((goal) => {
                    return (
                      <div
                        key={goal.id}
                        className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => {
                              playClickSound();
                              toggleGoalComplete(goal.id);
                            }}
                            className="h-5 w-5 shrink-0 rounded-full bg-[#E9FFF4] border border-[#00DC7D] text-[#00A963] flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
                            title="Mark incomplete"
                          >
                            <FontAwesomeIcon icon={faCheck} className="h-2.5 w-2.5" />
                          </button>
                          
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-light text-[#8E9392] dark:text-[#A3A7A8] line-through decoration-[#CCD0CF]/70 truncate select-text">
                              {goal.content}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] font-bold text-[#6F7476] dark:text-[#A3A7A8] uppercase tracking-wider bg-[#FAFAFA] dark:bg-[#202324] border border-[#EEF0EF] dark:border-[#2E3133] px-1.5 py-0.2 rounded">
                                {goal.category || 'General'}
                              </span>
                              {goal.priorityLevel && (
                                <span className={`text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                                  goal.priorityLevel === 'high'
                                    ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-950/30'
                                    : goal.priorityLevel === 'low'
                                    ? 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-700'
                                    : 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-950/30'
                                }`}>
                                  {goal.priorityLevel}
                                </span>
                              )}
                              {goal.subGoals && goal.subGoals.length > 0 && (
                                <span className="text-[8.5px] font-semibold text-[#00A963]">
                                  {goal.subGoals.filter(s => s.isCompleted).length}/{goal.subGoals.length} steps completed
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="rounded-lg p-1 text-[#A3A7A8] opacity-0 group-hover:opacity-100 hover:text-[#FF453A] cursor-pointer transition-all shrink-0"
                          title="Delete completed goal"
                        >
                          <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </main>
      </>
    )}

    {activeSubTab === 'inbox' && (
      /* Inbox Tasks detailed view */
      <main className="mt-8 space-y-6">
        
        {/* Collapsible Header, Postpone/Clear tools, and Filter/Sort Bar */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            showInboxFilters ? 'max-h-[500px] opacity-100 mb-6' : 'max-h-0 opacity-0 pointer-events-none mb-0'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none mb-6">
            <div>
              <h2 className="font-sans text-xl font-bold text-[#2F3331] dark:text-[#FAFAFA]">Pending Tasks</h2>
              <p className="mt-1 text-sm text-[#6F7476] dark:text-[#A3A7A8]">Checklist items captured dynamically from your daily journals and notes. Tapping an item marks it completed.</p>
            </div>
            
            <div className="flex flex-wrap gap-2 self-start sm:self-center">
              {overdueTasks.length > 0 && (
                <button
                  onClick={handlePostponeAllOverdue}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E9FFF4] dark:bg-[#00DC7D]/10 hover:bg-[#D6FADB] dark:hover:bg-[#00DC7D]/20 text-[#00A963] dark:text-[#00DC7D] border border-[#00DC7D]/25 dark:border-transparent text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95 animate-pulse"
                  title="Reschedule all overdue tasks to today"
                >
                  <FontAwesomeIcon icon={faCalendarPlus} className="w-3.5 h-3.5" />
                  <span>Postpone Overdue ({overdueTasks.length})</span>
                </button>
              )}
              {stats.totalCompletedTasks > 0 && (
                <button
                  onClick={handleClearCompletedTasks}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200/45 dark:border-transparent text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                  <span>Clear Checked ({stats.totalCompletedTasks})</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter and Sort Bar */}
          {pendingTasks.length > 0 && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#1E2022] p-4 rounded-2xl border border-[#EEF0EF] dark:border-[#2E3133]/60 shadow-sm select-none mb-6">
              {/* Filters */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] font-bold text-[#6F7476] dark:text-[#A3A7A8] uppercase tracking-wider mr-1.5 flex items-center gap-1">
                  <FontAwesomeIcon icon={faFilter} className="w-3 h-3 text-gray-400" /> Filter:
                </span>
                {(['all', 'today', 'overdue', 'week', 'journal', 'notes'] as const).map((filter) => {
                  const active = inboxFilter === filter;
                  const labels = {
                    all: 'All',
                    today: 'Today',
                    overdue: 'Overdue',
                    week: 'This Week',
                    journal: 'Journals',
                    notes: 'Notes'
                  };
                  return (
                    <button
                      key={filter}
                      onClick={() => setInboxFilter(filter)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                        active
                          ? 'bg-[#E9FFF4] border-[#00DC7D]/25 text-[#00A963] shadow-sm'
                          : 'bg-[#FAFAFA] dark:bg-[#202324] border-[#EEF0EF] dark:border-[#2E3133] text-[#6F7476] dark:text-[#A3A7A8] hover:bg-[#F2F2F3] dark:hover:bg-zinc-800'
                      }`}
                    >
                      {labels[filter]}
                    </button>
                  );
                })}
              </div>

              {/* Sort Selection */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-bold text-[#6F7476] dark:text-[#A3A7A8] uppercase tracking-wider flex items-center gap-1">
                  <FontAwesomeIcon icon={faSort} className="w-3 h-3 text-gray-400" /> Sort:
                </span>
                <select
                  value={inboxSort}
                  onChange={(e) => setInboxSort(e.target.value as any)}
                  className="bg-[#FAFAFA] dark:bg-[#202324] border border-[#EEF0EF] dark:border-[#2E3133] rounded-full px-3 py-1 text-xs font-bold text-[#6F7476] dark:text-[#A3A7A8] focus:outline-none focus:border-[#00DC7D] transition-colors cursor-pointer"
                >
                  <option value="time-asc">Scheduled (Nearest)</option>
                  <option value="time-desc">Scheduled (Furthest)</option>
                  <option value="created-desc">Created Date (Newest)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* New Inbox Task Form */}
        {showAddTaskForm && (
          <div className="rounded-3xl bg-white dark:bg-[#1E2022] p-6 border border-[#EEF0EF] dark:border-[#2E3133]/60 shadow-md transition-all duration-300">
            <h3 className="text-sm font-bold text-[#2F3331] dark:text-[#FAFAFA] mb-4 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
              ✨ New Inbox Task
            </h3>
            
            <MentionTextarea
              value={newTaskContent}
              onChange={setNewTaskContent}
              onEnter={handleAddTask}
              placeholder="Type your task... (e.g., 'Buy groceries tomorrow at 3pm')"
              className="mb-4 w-full bg-transparent border-b border-[#CCD0CF]/40 focus:border-[#00DC7D] rounded-none py-2 text-[#2F3331] dark:text-[#FAFAFA] placeholder-[#A3A7A8] font-sans text-base font-semibold focus:outline-none transition-all duration-300 resize-none overflow-hidden"
              autoFocus
              style={{ minHeight: '38px', height: 'auto' }}
            />
            
            <p className="text-[10px] text-[#A3A7A8] mb-4">
              💡 <strong>Tip:</strong> You can type dates and times in natural language (e.g., "tomorrow morning", "tonight at 8pm"). The app will automatically schedule it!
            </p>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowAddTaskForm(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#CCD0CF] bg-white dark:bg-[#1E2022] text-[#6F7476] hover:bg-[#F2F2F3] hover:text-[#2F3331] transition-all cursor-pointer active:scale-95"
                title="Cancel"
                aria-label="Cancel"
              >
                <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
              </button>
              <button
                onClick={handleAddTask}
                disabled={!newTaskContent.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00DC7D] text-white hover:bg-[#00B866] disabled:opacity-50 transition-all cursor-pointer active:scale-95 shadow-sm shadow-[#00DC7D]/10"
                title="Add Task"
                aria-label="Add Task"
              >
                <FontAwesomeIcon icon={faCheck} className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <div className="relative border-l-2 border-[#E4E7E6]/75 dark:border-[#2E3133]/40 ml-6 pl-8 py-2 space-y-6">
          {filteredPendingTasks.map((task) => {
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
                <div className="absolute -left-[42px] flex h-5 w-5 items-center justify-center rounded-full border border-[#CCD0CF] bg-[#FAFAFA] dark:bg-[#1E2022] text-[#CCD0CF] hover:text-[#00DC7D] hover:border-[#00DC7D] transition-all cursor-pointer z-10 hover:scale-105 active:scale-90">
                  <button
                    onClick={() => {
                      playClickSound();
                      if (task.isFromNote && task.noteId) {
                        toggleNoteChecklist(task.noteId, task.text);
                      } else {
                        toggleBulletComplete(task.id);
                      }
                    }}
                    className="flex h-full w-full items-center justify-center cursor-pointer"
                    title="Mark Done"
                  >
                    <FontAwesomeIcon icon={faCheck} className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#00DC7D]" />
                  </button>
                </div>

                <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  {/* Text content */}
                  <p className="text-sm font-semibold text-[#2F3331] dark:text-[#FAFAFA] leading-relaxed break-words pr-2">
                    <HighlightedText text={task.text} />
                  </p>

                  {/* Chips group (Time and Date/Note) */}
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                    {/* Time Chip */}
                    {task.isFromNote ? (
                      <span 
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF3C4] text-[#8C6B00] dark:bg-[#FFA952]/10 dark:text-[#FFA952] px-2.5 py-0.5 text-[9px] font-extrabold select-none shadow-sm border border-[#FFE082]/30 dark:border-transparent"
                        title="Note tasks inherit note creation time"
                      >
                        <FontAwesomeIcon icon={faClock} className="w-2.5 h-2.5 text-[#B58900] dark:text-[#FFA952]" />
                        {timeStr}
                        <FontAwesomeIcon icon={faCircleInfo} className="w-2 h-2 ml-0.5 text-[#B58900]/50" />
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startRescheduling(task);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF3C4] hover:bg-[#FFE082] text-[#8C6B00] dark:bg-[#FFA952]/10 dark:text-[#FFA952] hover:dark:bg-[#FFA952]/20 px-2.5 py-0.5 text-[9px] font-extrabold transition-all cursor-pointer shadow-sm border border-[#FFE082]/30 dark:border-transparent hover:scale-105 active:scale-95"
                        title="Click to Reschedule / Snooze"
                      >
                        <FontAwesomeIcon icon={faClock} className="w-2.5 h-2.5 text-[#B58900] dark:text-[#FFA952]" />
                        {timeStr}
                      </button>
                    )}
                    
                    {/* Date/Note Chip */}
                    {task.isFromNote ? (
                      <button
                        onClick={() => {
                          router.push(`/notes/new?id=${task.noteId}`);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#F2EFFE] hover:bg-[#EDD6FF] text-[#8B00D4] dark:bg-[#C494FF]/10 dark:text-[#C494FF] px-2.5 py-0.5 text-[9px] font-extrabold transition-colors cursor-pointer"
                        title="Go to Note"
                      >
                        <FontAwesomeIcon icon={faBookOpen} className="w-2.5 h-2.5 text-[#8B00D4] dark:text-[#C494FF]" />
                        <span>Note</span>
                      </button>
                    ) : (
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
                    )}

                    {/* Goal link status / action */}
                    {(() => {
                      const linkedGoal = goals.find(g => g.subGoals?.some(s => s.bulletId === task.id));
                      if (linkedGoal) {
                        return (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FAF5FF] hover:bg-[#F0D6FF] border border-[#8B00D4]/20 text-[#8B00D4] dark:bg-[#8B00D4]/10 dark:text-[#C494FF] dark:border-transparent px-2.5 py-0.5 text-[9px] font-extrabold shadow-sm select-none">
                            🎯 {linkedGoal.content}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnlinkTask(task.id);
                              }}
                              className="ml-1 text-gray-400 hover:text-red-500 cursor-pointer"
                              title="Unlink from Goal"
                            >
                              <FontAwesomeIcon icon={faXmark} className="w-2 h-2" />
                            </button>
                          </span>
                        );
                      } else {
                        return (
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setLinkingTaskId(current => current === task.id ? null : task.id);
                              }}
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white dark:bg-[#1E2022] text-[#6F7476] dark:text-[#A3A7A8] border border-[#EEF0EF] dark:border-[#2E3133] hover:border-[#8B00D4] hover:text-[#8B00D4] transition-all cursor-pointer shadow-sm active:scale-90"
                              title="Link to Goal"
                            >
                              <FontAwesomeIcon icon={faCrosshairs} className="w-2.5 h-2.5" />
                            </button>

                            {/* Goal selection popover */}
                            {linkingTaskId === task.id && (
                              <div
                                className="absolute right-0 top-6 z-50 bg-white dark:bg-[#1E2022] rounded-2xl shadow-xl border border-[#EEF0EF] dark:border-[#2E3133]/60 p-3 min-w-[200px] max-w-[250px] animate-in zoom-in-95 duration-150"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex justify-between items-center mb-2 border-b border-[#EEF0EF]/60 dark:border-[#2E3133]/40 pb-1.5">
                                  <span className="text-[9px] font-bold text-[#6F7476] dark:text-[#A3A7A8] uppercase tracking-wider">Link to Goal</span>
                                  <button
                                    onClick={() => setLinkingTaskId(null)}
                                    className="text-gray-400 hover:text-black dark:hover:text-white cursor-pointer"
                                  >
                                    <FontAwesomeIcon icon={faXmark} className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                                <div className="max-h-[150px] overflow-y-auto space-y-1">
                                  {activeGoals.map(goal => (
                                    <button
                                      key={goal.id}
                                      onClick={() => {
                                        handleLinkTaskToGoal(task.id, task.text, goal.id);
                                        setLinkingTaskId(null);
                                      }}
                                      className="w-full text-left px-2 py-1 text-[10px] font-bold text-gray-700 dark:text-gray-300 hover:bg-[#E9FFF4] hover:text-[#00A963] dark:hover:bg-[#00DC7D]/10 dark:hover:text-[#55FFB4] rounded-lg transition-colors truncate block"
                                      title={goal.content}
                                    >
                                      🎯 {goal.content}
                                    </button>
                                  ))}
                                  {activeGoals.length === 0 && (
                                    <p className="text-[9px] text-[#A3A7A8] italic text-center py-2">No active goals</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }
                    })()}

                    {/* Hover Reschedule Trigger */}
                    {!task.isFromNote && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startRescheduling(task);
                        }}
                        className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 text-gray-400 hover:text-[#00DC7D] p-1 transition-opacity duration-200 cursor-pointer ml-1"
                        title="Reschedule task"
                      >
                        <FontAwesomeIcon icon={faPen} className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Reschedule Popover overlay */}
                {reschedulingTaskId === task.id && (
                  <div 
                    className="absolute right-0 top-8 z-50 bg-white dark:bg-[#1E2022] rounded-2xl shadow-xl border border-[#EEF0EF] dark:border-[#2E3133]/60 p-4 min-w-[280px] max-w-[320px] animate-in zoom-in-95 duration-150"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-between items-center mb-3 border-b border-[#EEF0EF]/60 dark:border-[#2E3133]/40 pb-2">
                      <span className="text-[10px] font-bold text-[#6F7476] dark:text-[#A3A7A8] uppercase tracking-wider flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faClock} className="text-[#00DC7D] w-3 h-3" /> Reschedule Task
                      </span>
                      <button 
                        onClick={() => setReschedulingTaskId(null)}
                        className="text-gray-400 hover:text-black dark:hover:text-white cursor-pointer"
                        title="Close"
                      >
                        <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Quick Snooze Buttons */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <button
                        onClick={() => handleQuickSnooze(task.id, 'today')}
                        className="py-1.5 px-2.5 rounded-xl border border-[#EEF0EF] dark:border-[#2E3133] hover:border-[#00DC7D]/50 bg-[#FAFAFA] dark:bg-[#202324] hover:bg-[#E9FFF4] hover:text-[#00A963] text-[10px] font-bold text-gray-700 dark:text-gray-300 transition-all cursor-pointer text-center"
                      >
                        Today (12:00)
                      </button>
                      <button
                        onClick={() => handleQuickSnooze(task.id, 'tomorrow')}
                        className="py-1.5 px-2.5 rounded-xl border border-[#EEF0EF] dark:border-[#2E3133] hover:border-[#00DC7D]/50 bg-[#FAFAFA] dark:bg-[#202324] hover:bg-[#E9FFF4] hover:text-[#00A963] text-[10px] font-bold text-gray-700 dark:text-gray-300 transition-all cursor-pointer text-center"
                      >
                        Tomorrow (9:00)
                      </button>
                      <button
                        onClick={() => handleQuickSnooze(task.id, 'next-monday')}
                        className="py-1.5 px-2.5 rounded-xl border border-[#EEF0EF] dark:border-[#2E3133] hover:border-[#00DC7D]/50 bg-[#FAFAFA] dark:bg-[#202324] hover:bg-[#E9FFF4] hover:text-[#00A963] text-[10px] font-bold text-gray-700 dark:text-gray-300 transition-all cursor-pointer text-center"
                      >
                        Next Monday
                      </button>
                      <button
                        onClick={() => handleQuickSnooze(task.id, 'plus-1-hour')}
                        className="py-1.5 px-2.5 rounded-xl border border-[#EEF0EF] dark:border-[#2E3133] hover:border-[#00DC7D]/50 bg-[#FAFAFA] dark:bg-[#202324] hover:bg-[#E9FFF4] hover:text-[#00A963] text-[10px] font-bold text-gray-700 dark:text-gray-300 transition-all cursor-pointer text-center"
                      >
                        +1 Hour
                      </button>
                    </div>

                    {/* Custom DateTime Picker */}
                    <div className="space-y-3 pt-2 border-t border-[#EEF0EF]/40 dark:border-[#2E3133]/30">
                      <div>
                        <label className="block text-[8px] font-bold uppercase tracking-wider text-[#A3A7A8] mb-1">Custom Date</label>
                        <input
                          type="date"
                          value={customDate}
                          onChange={(e) => setCustomDate(e.target.value)}
                          className="w-full bg-[#FAFAFA] dark:bg-[#202324] border border-[#EEF0EF] dark:border-[#2E3133] rounded-xl px-3 py-1.5 text-xs text-[#2F3331] dark:text-[#FAFAFA] focus:outline-none focus:border-[#00DC7D]"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold uppercase tracking-wider text-[#A3A7A8] mb-1">Custom Time</label>
                        <input
                          type="time"
                          value={customTime}
                          onChange={(e) => setCustomTime(e.target.value)}
                          className="w-full bg-[#FAFAFA] dark:bg-[#202324] border border-[#EEF0EF] dark:border-[#2E3133] rounded-xl px-3 py-1.5 text-xs text-[#2F3331] dark:text-[#FAFAFA] focus:outline-none focus:border-[#00DC7D]"
                        />
                      </div>

                      <div className="flex gap-2 justify-between pt-2">
                        {task.scheduledAt && (
                          <button
                            onClick={() => handleRemoveSchedule(task.id)}
                            className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-xl border border-[#FF453A]/20 hover:border-[#FF453A]/40 text-[#FF453A] bg-[#FF453A]/5 hover:bg-[#FF453A]/10 transition-colors cursor-pointer animate-in fade-in"
                          >
                            Remove
                          </button>
                        )}
                        <div className="flex gap-2 ml-auto">
                          <button
                            onClick={() => setReschedulingTaskId(null)}
                            className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-xl border border-[#CCD0CF]/60 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-500 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleReschedule(task.id, customDate, customTime)}
                            className="px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-xl bg-[#00DC7D] text-white hover:bg-[#00B866] transition-colors cursor-pointer shadow-sm shadow-[#00DC7D]/10"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}


              </div>
            );
          })}

          {pendingTasks.length === 0 && (
            <div className="text-center py-16 -ml-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E9FFF4] text-[#00A963] mx-auto mb-3">
                <FontAwesomeIcon icon={faListCheck} className="w-5.5 h-5.5" />
              </div>
              <h3 className="text-sm font-bold text-[#2F3331] dark:text-[#FAFAFA]">All Caught Up!</h3>
              <p className="text-xs text-[#A3A7A8] mt-1 max-w-[240px] mx-auto">There are no outstanding checklist items left in your journals or notes. 🎉</p>
            </div>
          )}

          {pendingTasks.length > 0 && filteredPendingTasks.length === 0 && (
            <div className="text-center py-16 -ml-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FAFAFA] dark:bg-[#1E2022] border border-[#EEF0EF] dark:border-[#2E3133] text-gray-400 mx-auto mb-3">
                <FontAwesomeIcon icon={faFilter} className="w-5.5 h-5.5 text-gray-300" />
              </div>
              <h3 className="text-sm font-bold text-[#2F3331] dark:text-[#FAFAFA]">No Tasks Found</h3>
              <p className="text-xs text-[#A3A7A8] mt-1 max-w-[240px] mx-auto">No checklist items matched the selected filter. Try changing your filters. 🔍</p>
            </div>
          )}
        </div>

        {/* Completed Tasks Collapsible Section */}
        {completedTasks.length > 0 && (
          <div className="mt-8 border-t border-[#EEF0EF] dark:border-[#2E3133] pt-6 select-none">
            <button
              onClick={() => setIsCompletedExpanded(prev => !prev)}
              className="flex items-center gap-2 text-xs font-bold text-[#6F7476] dark:text-[#A3A7A8] hover:text-black dark:hover:text-white transition-colors cursor-pointer"
            >
              <FontAwesomeIcon icon={faChevronDown} className={`w-3 h-3 transition-transform duration-300 ${isCompletedExpanded ? '' : '-rotate-90'}`} />
              <span>Completed Tasks ({completedTasks.length})</span>
            </button>

            {isCompletedExpanded && (
              <div className="mt-4 space-y-3.5 pl-6">
                {completedTasks.map((task) => {
                  const dateStr = format(new Date(task.date), 'MMM d, yyyy');
                  return (
                    <div key={task.id} className="flex items-center justify-between gap-3 bg-white dark:bg-[#1E2022]/40 p-3 rounded-2xl border border-[#EEF0EF] dark:border-[#2E3133]/60">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          onClick={() => {
                            playClickSound();
                            if (task.isFromNote && task.noteId) {
                              toggleNoteChecklist(task.noteId, task.text);
                            } else {
                              toggleBulletComplete(task.id);
                            }
                          }}
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-[#00DC7D] border-[#00DC7D] text-white shadow-sm shadow-[#00DC7D]/20 hover:scale-105 active:scale-90 transition-all cursor-pointer"
                        >
                          <FontAwesomeIcon icon={faCheck} className="w-2.5 h-2.5" />
                        </button>
                        <p className="text-xs font-normal leading-relaxed text-[#A3A7A8] line-through pr-2 truncate">
                          <HighlightedText text={task.text} />
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[8.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          task.isFromNote
                            ? 'bg-[#F2EFFE] border-[#EDD6FF] text-[#8B00D4] dark:bg-[#C494FF]/10 dark:text-[#C494FF] dark:border-transparent'
                            : 'bg-[#E9FFF4] border-[#D6FADB] text-[#00A963] dark:bg-[#00DC7D]/10 dark:text-[#00DC7D] dark:border-transparent'
                        }`}>
                          {task.isFromNote ? 'Note' : 'Journal'}
                        </span>
                        <span className="text-[9px] text-[#A3A7A8]">
                          {dateStr}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    )}

    {activeSubTab === 'calendar' && (
      <main className="mt-8 space-y-6">
        <div className="bg-white dark:bg-[#1E2022] rounded-3xl p-6 border border-[#EEF0EF] dark:border-[#2E3133] shadow-sm select-none">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-sans text-lg font-bold text-[#2F3331] dark:text-[#FAFAFA] flex items-center gap-2">
              <FontAwesomeIcon icon={faCalendar} className="text-[#00DC7D] w-5 h-5" />
              <span>{format(calendarDate, 'MMMM yyyy')}</span>
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCompletedTasksInCalendar(prev => !prev)}
                className={`px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                  showCompletedTasksInCalendar
                    ? 'bg-[#E9FFF4] border-[#00DC7D]/30 text-[#00A963] dark:bg-[#00DC7D]/10 dark:text-[#00DC7D]'
                    : 'bg-white dark:bg-[#1E2022] border-[#EEF0EF] dark:border-[#2E3133] text-gray-600 dark:text-[#A3A7A8] hover:bg-gray-50 dark:hover:bg-[#202324] dark:hover:text-[#FAFAFA]'
                }`}
                title={showCompletedTasksInCalendar ? "Hide Completed Tasks" : "Show Completed Tasks"}
              >
                <FontAwesomeIcon icon={showCompletedTasksInCalendar ? faEye : faEyeSlash} className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{showCompletedTasksInCalendar ? "Completed" : "Completed Hidden"}</span>
              </button>
              <button
                onClick={() => setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#EEF0EF] dark:border-[#2E3133] hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-600 dark:text-[#A3A7A8] transition-all cursor-pointer hover:scale-105 active:scale-95"
                title="Previous Month"
              >
                <FontAwesomeIcon icon={faChevronLeft} className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCalendarDate(new Date())}
                className="px-3 text-xs font-bold rounded-xl border border-[#EEF0EF] dark:border-[#2E3133] hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-600 dark:text-[#A3A7A8] transition-all cursor-pointer active:scale-95"
                title="Go to Today"
              >
                Today
              </button>
              <button
                onClick={() => setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#EEF0EF] dark:border-[#2E3133] hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-600 dark:text-[#A3A7A8] transition-all cursor-pointer hover:scale-105 active:scale-95"
                title="Next Month"
              >
                <FontAwesomeIcon icon={faChevronRight} className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Weekdays Row */}
          <div className="grid grid-cols-7 gap-2 mb-2 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <span key={day} className="text-[10px] font-bold text-[#A3A7A8] dark:text-[#888D8F] uppercase tracking-wider py-1 block">
                {day}
              </span>
            ))}
          </div>

          {/* Monthly Grid */}
          <div className="flex flex-col bg-[#EEF0EF] dark:bg-[#2E3133] gap-[1px] border border-[#EEF0EF] dark:border-[#2E3133] rounded-3xl overflow-hidden shadow-sm">
            {calendarWeeks.map((week, weekIdx) => {
              const selectedCell = selectedCalendarDate && week.find(cell => 
                format(cell.date, 'yyyy-MM-dd') === format(selectedCalendarDate, 'yyyy-MM-dd')
              );

              return (
                <div key={weekIdx} className="flex flex-col bg-[#EEF0EF] dark:bg-[#2E3133] gap-[1px]">
                  {/* Week Row */}
                  <div className="grid grid-cols-7 gap-[1px]">
                    {week.map((cell) => {
                      const dateStr = format(cell.date, 'yyyy-MM-dd');
                      const cellEvents = calendarEvents[dateStr] || { tasks: [], goals: [], subgoals: [] };
                      const hasGoals = cellEvents.goals.length > 0 || cellEvents.subgoals.length > 0;
                      const visibleTasks = showCompletedTasksInCalendar
                        ? cellEvents.tasks
                        : cellEvents.tasks.filter(t => !t.isCompleted);
                      const hasCompletedTasks = showCompletedTasksInCalendar && cellEvents.tasks.some(t => t.isCompleted);
                      const hasPendingTasks = cellEvents.tasks.some(t => !t.isCompleted);

                      const isCurrentToday = isToday(cell.date);
                      const isSelected = selectedCalendarDate && format(selectedCalendarDate, 'yyyy-MM-dd') === dateStr;

                      return (
                        <button
                          key={cell.key}
                          onClick={() => setSelectedCalendarDate(cell.date)}
                          className={`p-2 rounded-none flex flex-col justify-between items-center transition-all cursor-pointer ${
                            !cell.isCurrentMonth ? 'opacity-35 hover:opacity-100' : ''
                          } ${
                            isSelected
                              ? 'bg-[#E9FFF4] text-[#00A963] dark:bg-[#00DC7D]/10 dark:text-[#00DC7D] z-10 ring-2 ring-[#00DC7D] ring-inset'
                              : isCurrentToday
                              ? 'bg-white dark:bg-[#1E2022] font-black text-[#2F3331] dark:text-[#FAFAFA] z-10 ring-2 ring-[#00DC7D] ring-inset'
                              : 'bg-white dark:bg-[#1E2022] text-[#2F3331] dark:text-[#FAFAFA] hover:bg-gray-50/70 dark:hover:bg-zinc-800/40'
                          } aspect-square md:aspect-auto md:min-h-[100px] lg:min-h-[120px] md:items-stretch md:justify-start md:p-2.5`}
                        >
                          <span className={`text-xs font-bold ${
                            isCurrentToday 
                              ? 'text-[#00A963] dark:text-[#00DC7D] md:bg-[#E9FFF4] md:dark:bg-[#00DC7D]/15 md:px-1.5 md:py-0.5 md:rounded-md md:self-start' 
                              : 'md:self-start'
                          }`}>
                            {cell.date.getDate()}
                          </span>

                          {/* Event Indicators (Mobile only) */}
                          <div className="flex gap-1 justify-center mt-1 w-full overflow-hidden md:hidden">
                            {hasGoals && (
                              <span className="h-1.5 w-1.5 rounded-full bg-[#8B00D4] shrink-0" title="Goal / Sub-goal deadline" />
                            )}
                            {hasCompletedTasks && (
                              <span className="h-1.5 w-1.5 rounded-full bg-[#00DC7D] shrink-0" title="Completed tasks" />
                            )}
                            {hasPendingTasks && (
                              <span className="h-1.5 w-1.5 rounded-full bg-gray-400 dark:bg-zinc-600 shrink-0" title="Pending tasks" />
                            )}
                          </div>

                          {/* Event Chips (Desktop only) */}
                          <div className="hidden md:flex flex-col gap-1 mt-1.5 w-full text-[9px] font-bold text-left overflow-hidden">
                            {/* Goal deadlines */}
                            {cellEvents.goals.slice(0, 1).map((g) => (
                              <div
                                key={g.id}
                                className="px-1.5 py-0.5 rounded-lg bg-[#F8F5FF] text-[#8B00D4] dark:bg-[#8B00D4]/30 dark:text-[#E2D5FF] truncate border border-[#F2EDFF]/40 dark:border-[#C494FF]/35"
                                title={`Goal Deadline: ${g.content}`}
                              >
                                🏁 {g.content}
                              </div>
                            ))}
                            {/* Sub-goal deadlines */}
                            {cellEvents.subgoals.slice(0, 1).map((sub) => (
                              <div
                                key={sub.id}
                                className="px-1.5 py-0.5 rounded-lg bg-[#F8F5FF] text-[#8B00D4] dark:bg-[#8B00D4]/30 dark:text-[#E2D5FF] truncate border border-[#F2EDFF]/40 dark:border-[#C494FF]/35"
                                title={`Sub-goal Deadline: ${sub.content}`}
                              >
                                🏁 {sub.content}
                              </div>
                            ))}
                            {/* Tasks (up to 2 pending or completed) */}
                            {visibleTasks.slice(0, 2).map((t) => (
                              <div
                                key={t.id}
                                className={`px-1.5 py-0.5 rounded-lg truncate border ${
                                  t.isCompleted
                                    ? 'bg-[#E9FFF4] text-[#00A963] border-[#D6FADB] dark:bg-[#00DC7D]/25 dark:text-[#55FFB4] dark:border-[#55FFB4]/30 line-through opacity-85'
                                    : 'bg-gray-50 text-gray-600 border-gray-200/50 dark:bg-[#2F3331]/90 dark:text-[#E4E7E6] dark:border-zinc-700/80'
                                }`}
                                title={t.text}
                              >
                                {t.isCompleted ? '✓ ' : '• '}
                                {t.text}
                              </div>
                            ))}
                            {/* +X More Indicator */}
                            {cellEvents.goals.length + cellEvents.subgoals.length + visibleTasks.length > 3 && (
                              <div className="text-[8px] text-[#A3A7A8] dark:text-[#A3A7A8] font-extrabold pl-1 select-none">
                                +{cellEvents.goals.length + cellEvents.subgoals.length + visibleTasks.length - 3} more
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Inline Selected Date Details Panel (appears below the calendar week line) */}
                  {selectedCell && (() => {
                    const dateStr = format(selectedCalendarDate, 'yyyy-MM-dd');
                    const dayEvents = calendarEvents[dateStr] || { tasks: [], goals: [], subgoals: [] };
                    const visibleDayTasks = showCompletedTasksInCalendar
                      ? dayEvents.tasks
                      : dayEvents.tasks.filter(t => !t.isCompleted);
                    const totalEventsCount = dayEvents.goals.length + dayEvents.subgoals.length + visibleDayTasks.length;

                    return (
                      <div className="bg-[#FAFAFA] dark:bg-[#202324]/50 border-t border-b border-[#EEF0EF] dark:border-[#2E3133] p-6 space-y-4 animate-in slide-in-from-top duration-300">
                        <div className="flex justify-between items-center border-b border-[#EEF0EF] dark:border-[#2E3133] pb-3">
                          <div>
                            <h3 className="text-sm font-bold text-[#2F3331] dark:text-[#FAFAFA]">
                              Details for {format(selectedCalendarDate, 'EEEE, MMM d, yyyy')}
                            </h3>
                            <p className="text-[10px] text-[#A3A7A8] dark:text-[#888D8F] uppercase tracking-wider font-semibold">
                              {totalEventsCount} scheduled items
                            </p>
                          </div>
                          {/* Quick Add Task button for selected day */}
                          <button
                            onClick={() => {
                              setCurrentDate(dateStr);
                              router.push('/write');
                            }}
                            className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-[#00DC7D] text-white rounded-xl hover:bg-[#00B866] transition-all cursor-pointer active:scale-95 shadow-sm shadow-[#00DC7D]/10"
                            title="Add task in journal for this day"
                          >
                            <FontAwesomeIcon icon={faPlus} className="mr-1 w-2.5 h-2.5" />
                            Add Journal Bullet
                          </button>
                        </div>

                        <div className="space-y-4">
                          {/* Deadlines Section */}
                          {(dayEvents.goals.length > 0 || dayEvents.subgoals.length > 0) && (
                            <div className="space-y-2.5">
                              <span className="text-[10px] font-bold text-[#8B00D4] dark:text-[#D6B2FF] uppercase tracking-widest block">
                                🏁 Goal Deadlines
                              </span>
                              <div className="space-y-2">
                                {dayEvents.goals.map((g) => (
                                  <div key={g.id} className="flex items-center gap-2.5 bg-[#F8F5FF] dark:bg-[#8B00D4]/12 p-3 rounded-2xl border border-[#F2EDFF] dark:border-[#8B00D4]/25">
                                    <div className="h-6 w-6 rounded-full bg-[#8B00D4] text-white flex items-center justify-center text-xs shrink-0 shadow-sm shadow-[#8B00D4]/20">
                                      <FontAwesomeIcon icon={faCrosshairs} className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-[#2F3331] dark:text-[#FAFAFA] truncate">
                                        {g.content}
                                      </p>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[8px] font-extrabold uppercase tracking-wider text-gray-500 bg-white dark:bg-zinc-800 px-1.5 py-0.2 rounded border border-gray-200 dark:border-zinc-700">
                                          {g.category || 'General'}
                                        </span>
                                        <span className="text-[9px] font-semibold text-[#8B00D4] dark:text-[#D6B2FF]">
                                          {g.progress}% completed
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                
                                {dayEvents.subgoals.map((sub) => (
                                  <div key={sub.id} className="flex items-center gap-2.5 bg-[#F8F5FF] dark:bg-[#8B00D4]/12 p-3 rounded-2xl border border-[#F2EDFF] dark:border-[#8B00D4]/25">
                                    <div className="h-6 w-6 rounded-full bg-[#8B00D4]/15 dark:bg-[#8B00D4]/30 text-[#8B00D4] dark:text-[#E2D5FF] flex items-center justify-center text-xs shrink-0">
                                      <FontAwesomeIcon icon={faStar} className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-[#2F3331] dark:text-[#FAFAFA] truncate">
                                        {sub.content}
                                      </p>
                                      <p className="text-[9px] text-[#A3A7A8] truncate">
                                        Parent Goal: <span className="font-semibold text-gray-600 dark:text-gray-400">{sub.goalContent}</span>
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Tasks Section */}
                          {visibleDayTasks.length > 0 && (
                            <div className="space-y-2.5">
                              <span className="text-[10px] font-bold text-[#00A963] uppercase tracking-widest block">
                                📋 Tasks on this Day
                              </span>
                              <div className="space-y-2">
                                {visibleDayTasks.map((task) => (
                                  <div key={task.id} className="flex items-center justify-between gap-3 bg-[#FAFAFA] dark:bg-[#202324] p-3 rounded-2xl border border-[#EEF0EF] dark:border-[#2E3133]">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      <button
                                        onClick={() => {
                                          playClickSound();
                                          if (task.isFromNote) {
                                            toggleNoteChecklist(task.noteId, task.text);
                                          } else {
                                            toggleBulletComplete(task.id);
                                          }
                                        }}
                                        className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all cursor-pointer ${
                                          task.isCompleted
                                            ? 'bg-[#00DC7D] border-[#00DC7D] text-white shadow-sm shadow-[#00DC7D]/25 hover:scale-105 active:scale-90'
                                            : 'border-[#CCD0CF] text-transparent hover:border-[#00DC7D] hover:text-[#00DC7D] hover:scale-105 active:scale-90'
                                        }`}
                                      >
                                        <FontAwesomeIcon icon={faCheck} className="w-2.5 h-2.5 text-white" />
                                      </button>
                                      <p className={`text-xs font-semibold leading-relaxed break-words truncate pr-2 ${
                                        task.isCompleted ? 'line-through text-[#A3A7A8] font-normal' : 'text-[#2F3331] dark:text-[#FAFAFA]'
                                      }`}>
                                        <HighlightedText text={task.text} />
                                      </p>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 shrink-0">
                                      {task.scheduledAt && (
                                        <span className="text-[8.5px] font-bold text-[#8C6B00] bg-[#FFF3C4] dark:bg-[#FFA952]/10 dark:text-[#FFA952] px-2 py-0.5 rounded-full select-none">
                                          {format(new Date(task.scheduledAt), 'h:mm a')}
                                        </span>
                                      )}
                                      <span className={`text-[8.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                        task.isFromNote
                                          ? 'bg-[#F2EFFE] border-[#EDD6FF] text-[#8B00D4] dark:bg-[#C494FF]/10 dark:text-[#C494FF] dark:border-transparent'
                                          : 'bg-[#E9FFF4] border-[#D6FADB] text-[#00A963] dark:bg-[#00DC7D]/10 dark:text-[#00DC7D] dark:border-transparent'
                                      }`}>
                                        {task.isFromNote ? 'Note' : 'Journal'}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {totalEventsCount === 0 && (
                            <div className="text-center py-10">
                              <p className="text-xs text-[#A3A7A8] dark:text-[#888D8F] italic">
                                No deadlines or tasks scheduled for this day.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    )}
  </div>
</div>
);
}