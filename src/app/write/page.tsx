'use client';

import { useEffect, useMemo, useRef, useState, KeyboardEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { format, isValid } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMoon,
  faFire,
  faPlus,
  faStar,
  faSquare,
  faTrash,
  faLightbulb,
  faBook,
  faWandMagicSparkles,
  faBolt,
  faBrain,
  faCircleInfo,
  faQuoteLeft,
  faBookmark,
  faBookOpen,
  faCheck,
  faExpand,
  faImage,
  faLocationDot,
  faSpinner,
  faXmark,
  faCheckCircle,
  faArrowLeft,
  faArrowRight,
  faVolumeHigh,
  faChevronLeft,
  faChevronRight,
  faPen,
  faCalendar,
  faClock,
  faTree,
  faListCheck,
  faHeartPulse,
  faSun,
  faCloud,
  faCloudRain,
  faWind,
  faSnowflake,
  faBed,
} from '@fortawesome/free-solid-svg-icons';
import { playGoalJingle } from '@/lib/audio';
import dynamic from 'next/dynamic';
import { HighlightedText } from '@/components/ui/HighlightedText';
import { MentionTextarea } from '@/components/ui/MentionTextarea';

const ImageUpload = dynamic(() => import('@/components/ui/ImageUpload'), {
  ssr: false,
});
const ConfirmModal = dynamic(() => import('@/components/ui/ConfirmModal').then(mod => mod.ConfirmModal), {
  ssr: false,
});
const SuggestedTagChips = dynamic(() => import('@/components/ai/SuggestedTagChips'), {
  ssr: false,
});
import { generateStructuredAI } from '@/lib/ai/aiClient';
import { DAILY_INSIGHT_PROMPT } from '@/lib/ai/prompts';
import { getEntryNumberForDate, sortBullets } from '@/lib/entryUtils';
import { Bullet, Entry, LocationItem, MediaItem } from '@/types';

type FormatDateInput = Date | string | { toDate: () => Date } | undefined;

// Custom AI Sparkles Icon (Gemini-style)
const AISparklesIcon = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M9 6Q9 13 16 13Q9 13 9 20Q9 13 2 13Q9 13 9 6Z" />
    <path d="M17 3Q17 7 21 7Q17 7 17 11Q17 7 13 7Q17 7 17 3Z" />
  </svg>
);

const safeFormat = (date: FormatDateInput, fmt: string): string => {
  if (!date) return '';
  const d = typeof date === 'string'
    ? new Date(date)
    : 'toDate' in date
      ? date.toDate()
      : date;
  return isValid(d) ? format(d, fmt) : '';
};

// Helper to parse and render formatted wisdom content beautifully
const renderParsedWisdom = (text: string, isQuote: boolean = false, tagMetaMap?: Record<string, 'more' | 'less' | null>) => {
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
            <HighlightedText text={line} interactive tagMeta={tagMetaMap} />
          </span>
        );
      })}
    </span>
  );
};

// Bullet style toggle component
const BulletStyleToggle = ({
  style,
  onToggle,
  disabled = false
}: {
  style: 'bullet' | 'star' | 'checklist';
  onToggle: () => void;
  disabled?: boolean;
}) => {
  const baseClass = "w-5 h-5 flex-shrink-0 cursor-pointer transition-colors";
  switch (style) {
    case 'star':
      return <FontAwesomeIcon icon={faStar} className={`${baseClass} text-[#F59E0B]`} onClick={disabled ? undefined : onToggle} />;
    case 'checklist':
      return <FontAwesomeIcon icon={faSquare} className={`${baseClass} text-[#22C55E]`} onClick={disabled ? undefined : onToggle} />;
    default:
      return <span className={`${baseClass} flex items-center justify-center`} onClick={disabled ? undefined : onToggle}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#A3A7A8]" />
      </span>;
  }
};

// Bullet item with swipe-to-delete, hover confirm-delete, and in-edit style toggle
const BulletItem = ({
  bullet,
  onToggleComplete,
  onDelete,
  onUpdateText,
  onUpdateStyle,
}: {
  bullet: Bullet;
  onToggleComplete: () => void;
  onDelete: () => void;
  onUpdateText: (id: string, text: string) => void;
  onUpdateStyle: (id: string, style: 'bullet' | 'star' | 'checklist') => void;
}) => {
  const { tags, wisdoms, notes, ideas, currentDate } = useData();
  const isCompleted = bullet.isCompleted;

  const isSourceValid = !bullet.source || (
    bullet.source === 'wisdom' ? wisdoms.some(w => w.id === bullet.sourceId || (w.linkedEntryId === currentDate && w.content === bullet.text)) :
    bullet.source === 'note' ? notes.some(n => n.id === bullet.sourceId || ((n.linkedEntryId === currentDate || n.linkedDate === currentDate) && (n.content === bullet.text || (n.title && `${n.title}: ${n.content}` === bullet.text)))) :
    bullet.source === 'idea' ? ideas.some(i => i.id === bullet.sourceId || (i.linkedEntries?.includes(currentDate) && i.content === bullet.text)) :
    false
  );
  const hasValidSource = bullet.source && isSourceValid;

  const sourceMeta = hasValidSource && bullet.source === 'wisdom'
    ? { label: bullet.sourceType || 'wisdom', text: 'text-[#8B00D4]', badge: 'bg-[#F0D6FF] text-[#8B00D4]', shell: 'border-[#C494FF]/30 bg-[#F8F0FF]' }
    : hasValidSource && bullet.source === 'note'
      ? { label: 'note', text: 'text-[#00875A]', badge: 'bg-[#C8F7E4] text-[#00875A]', shell: 'border-[#00DC7D]/25 bg-[#F2FFF8]' }
      : hasValidSource && bullet.source === 'idea'
        ? { label: 'idea', text: 'text-[#B45309]', badge: 'bg-[#FFE4B5] text-[#B45309]', shell: 'border-[#FF9933]/30 bg-[#FFF8ED]' }
        : null;

  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(bullet.text);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const tagMetaMap = useMemo(() => {
    const map: Record<string, 'more' | 'less' | null> = {};
    (bullet.tags || []).forEach(tag => {
      const meta = tags?.find(t => t.name.toLowerCase() === tag.toLowerCase());
      map[tag.toLowerCase()] = meta?.doMoreLess ?? null;
    });
    return map;
  }, [bullet.tags, tags]);

  // Click outside to close kebab menu
  useEffect(() => {
    if (!menuOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [menuOpen]);

  // Sync text state with bullet prop (for updates like NLP stripping)
  useEffect(() => {
    setText(bullet.text);
  }, [bullet.text]);

  const handleBlur = () => {
    setIsEditing(false);
    if (text !== bullet.text) {
      onUpdateText(bullet.id, text);
    }
  };

  const cycleStyle = () => {
    const next = bullet.style === 'bullet' ? 'star' : bullet.style === 'star' ? 'checklist' : 'bullet';
    onUpdateStyle(bullet.id, next);
  };

  const timeStr = safeFormat(bullet.createdAt, 'h:mm a');

  return (
    <div className={`relative ${sourceMeta ? `-mx-3 rounded-lg border ${sourceMeta.shell}` : ''}`}>
      {/* Main bullet row */}
      <div className="group flex items-start gap-3 py-2 bg-transparent">
        {/* Left icon: checklist toggle OR style cycle icon */}
        {bullet.style === 'checklist' && !isEditing ? (
          <button onClick={() => onToggleComplete?.()} className="shrink-0 mt-0.5">
            {bullet.isCompleted ? (
              <FontAwesomeIcon icon={faCheck} className="w-5 h-5 text-[#22C55E]" />
            ) : (
              <FontAwesomeIcon icon={faSquare} className="w-5 h-5 text-[#CCD0CF] hover:text-[#A3A7A8]" />
            )}
          </button>
        ) : (
          /* When editing, icon becomes a style-cycle button; when not editing, it's static */
          <button
            onClick={isEditing ? (e => { e.stopPropagation(); cycleStyle(); }) : undefined}
            className={`shrink-0 mt-0.5 flex items-center justify-center w-5 h-5 ${isEditing ? 'cursor-pointer active:scale-90 transition-transform' : 'cursor-default'}`}
            title={isEditing ? 'Tap to change style' : undefined}
          >
            {bullet.style === 'star' ? (
              <FontAwesomeIcon icon={faStar} className="w-5 h-5 text-[#F59E0B]" />
            ) : (
              <span className="flex items-center justify-center w-5 h-5">
                <span className={`w-1.5 h-1.5 rounded-full ${isEditing ? 'bg-[#00DC7D] ring-2 ring-[#00DC7D]/30' : 'bg-[#A3A7A8]'}`} />
              </span>
            )}
          </button>
        )}

        <div className="flex-1 min-w-0" onClick={() => !isEditing && setIsEditing(true)}>
          {isEditing ? (
            <MentionTextarea
              value={text}
              onChange={(v) => setText(v)}
              onBlur={handleBlur}
              onEnter={handleBlur}
              className="w-full bg-transparent text-[#2F3331] focus:outline-none resize-none overflow-hidden"
              autoFocus
              style={{ minHeight: '24px', height: 'auto' }}
            />
          ) : (
            <div className={`cursor-pointer leading-relaxed ${sourceMeta ? sourceMeta.text : 'text-[#2F3331]'} ${isCompleted ? 'line-through text-[#A3A7A8]' : ''} ${bullet.isHighlight ? 'font-semibold' : ''}`}>
              {hasValidSource && bullet.source === 'wisdom' ? (
                renderParsedWisdom(bullet.text, bullet.sourceType === 'quote', tagMetaMap)
              ) : (
                <HighlightedText text={bullet.text} interactive tagMeta={tagMetaMap} />
              )}
              {timeStr && (
                <span
                  className="ml-2 align-baseline"
                  style={{
                    fontSize: '10px',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontStyle: 'italic',
                    color: '#B0B8B4',
                    letterSpacing: '0.03em',
                    fontWeight: 400,
                    userSelect: 'none',
                  }}
                >
                  {timeStr}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Kebab action menu — always visible/interactive on hover, very premium */}
        {!isEditing && (
          <div className="relative shrink-0 self-center" ref={menuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#A3A7A8] hover:bg-[#F2F2F3] hover:text-[#2F3331] transition-colors"
              title="Actions"
            >
              <span className="text-base leading-none tracking-[-3px]" style={{ letterSpacing: '-2px' }}>&#8943;</span>
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-9 z-30 min-w-[140px] rounded-2xl bg-white py-1.5 shadow-xl ring-1 ring-[#EEF0EF] overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                {/* Style Quick Picker */}
                <div className="px-3 py-1.5 border-b border-[#EEF0EF] flex items-center justify-between gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#A3A7A8]">Style</span>
                  <div className="flex items-center gap-1 bg-[#F2F2F3] p-0.5 rounded-lg">
                    <button
                      onClick={() => { onUpdateStyle(bullet.id, 'bullet'); setMenuOpen(false); }}
                      className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${bullet.style === 'bullet' ? 'bg-white text-[#2F3331] shadow-sm' : 'text-[#A3A7A8] hover:text-[#2F3331]'}`}
                      title="Bullet"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    </button>
                    <button
                      onClick={() => { onUpdateStyle(bullet.id, 'star'); setMenuOpen(false); }}
                      className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${bullet.style === 'star' ? 'bg-white text-[#F59E0B] shadow-sm' : 'text-[#A3A7A8] hover:text-[#F59E0B]'}`}
                      title="Star"
                    >
                      <FontAwesomeIcon icon={faStar} className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => { onUpdateStyle(bullet.id, 'checklist'); setMenuOpen(false); }}
                      className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${bullet.style === 'checklist' ? 'bg-white text-[#22C55E] shadow-sm' : 'text-[#A3A7A8] hover:text-[#22C55E]'}`}
                      title="Task"
                    >
                      <FontAwesomeIcon icon={faSquare} className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Edit Text Action */}
                <button
                  onClick={() => { setMenuOpen(false); setIsEditing(true); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-[#2F3331] hover:bg-[#F7F8F7] transition-colors"
                >
                  <FontAwesomeIcon icon={faPen} className="w-3.5 h-3.5 text-[#6F7476]" />
                  Edit text
                </button>

                {/* Delete Action */}
                <button
                  onClick={() => { setMenuOpen(false); onDelete(); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-[#FF453A] hover:bg-[#FF453A]/5 transition-colors"
                >
                  <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const wisdomCategories = [
  { type: 'thought' as const, icon: faBolt, label: 'thought', bg: '#F0D6FF', color: '#8B00D4' },
  { type: 'quote' as const, icon: faQuoteLeft, label: 'quote', bg: '#D6E4FF', color: '#1A56C4' },
  { type: 'fact' as const, icon: faCircleInfo, label: 'fact', bg: '#C8F7E4', color: '#00875A' },
  { type: 'excerpt' as const, icon: faBookmark, label: 'excerpt', bg: '#FFE4B5', color: '#B45309' },
  { type: 'lesson' as const, icon: faBookOpen, label: 'lesson', bg: '#EDD6FF', color: '#6B21A8' },
];

type InlinePanel = 'wisdom' | 'note' | 'idea' | 'image' | 'orbit' | null;

type ReverseGeocodeResponse = {
  display_name?: string;
  address?: Partial<Record<
    'city_district' | 'district' | 'suburb' | 'neighbourhood' | 'quarter' | 'village' | 'town' | 'city' | 'county' | 'state',
    string
  >>;
};

const toLocalDate = (date: string) => new Date(`${date}T00:00:00`);

const getMapUrl = (latitude: number, longitude: number) =>
  `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

const reverseGeocodeDistrict = async (latitude: number, longitude: number): Promise<string> => {
  const fallback = `GPS ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${latitude}&lon=${longitude}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!response.ok) return fallback;

    const data = (await response.json()) as ReverseGeocodeResponse;
    const address = data.address || {};
    return (
      address.city_district ||
      address.district ||
      address.suburb ||
      address.neighbourhood ||
      address.quarter ||
      address.village ||
      address.town ||
      address.city ||
      address.county ||
      address.state ||
      data.display_name?.split(',')[0]?.trim() ||
      fallback
    );
  } catch {
    return fallback;
  }
};

const getLocationErrorMessage = (error: unknown) => {
  const maybeGeoError = error as Partial<GeolocationPositionError>;
  if (maybeGeoError.code === 1) return 'location permission was denied';
  if (maybeGeoError.code === 2) return 'location unavailable - check gps is enabled';
  if (maybeGeoError.code === 3) return 'gps request timed out';
  return 'could not capture current location';
};

function WritePageContent() {
  const {
    currentEntry,
    currentDate,
    entries,
    setCurrentDate,
    addBullet,
    updateBullet,
    deleteBullet,
    toggleBulletComplete,
    updateDream,
    saveEntry,
    addWisdom,
    addNote,
    addIdea,
    isOnline,
    currentStreak,
    longestStreak,
    wisdoms,
    notes,
    ideas,
    tags,
  } = useData();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');

  const { userProfile } = useAuth();
  const settings = userProfile?.settings || {
    showStreakWidget: true,
    showWordGoalWidget: true,
    dailyWordGoal: 50,
  };
  const dailyGoal = settings.dailyWordGoal || 50;

  const [dreamInput, setDreamInput] = useState('');
  const [isEditingDream, setIsEditingDream] = useState(false);
  const [bulletInput, setBulletInput] = useState('');
  const [bulletStyle, setBulletStyle] = useState<'bullet' | 'star' | 'checklist'>('bullet');
  const [showFabActions, setShowFabActions] = useState(false);
  const [activeInlinePanel, setActiveInlinePanel] = useState<InlinePanel>(null);
  const [selectedWisdomType, setSelectedWisdomType] = useState<'thought' | 'quote' | 'fact' | 'excerpt' | 'lesson'>('thought');
  const [wisdomContent, setWisdomContent] = useState('');
  const [wisdomAuthor, setWisdomAuthor] = useState('');
  const [wisdomSource, setWisdomSource] = useState('');
  const [wisdomContext, setWisdomContext] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [ideaContent, setIdeaContent] = useState('');
  const [sleepScoreInput, setSleepScoreInput] = useState<number | ''>('');
  const [energyLevelInput, setEnergyLevelInput] = useState<number>(3);
  const [weatherConditionInput, setWeatherConditionInput] = useState<'sunny' | 'cloudy' | 'rainy' | 'windy' | 'snowy'>('sunny');
  const [weatherTemperatureInput, setWeatherTemperatureInput] = useState<number | ''>('');
  const [moodInput, setMoodInput] = useState<'happy' | 'neutral' | 'sad' | 'anxious' | 'tired' | 'stressed' | 'joyful'>('neutral');
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const [isGeneratingDailyInsight, setIsGeneratingDailyInsight] = useState(false);
  const [dailyInsightError, setDailyInsightError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [dreamInputDate, setDreamInputDate] = useState('');
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [isImageGalleryOpen, setIsImageGalleryOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [goalMetCelebrated, setGoalMetCelebrated] = useState(false);
  const isUserTypingRef = useRef(false);

  useEffect(() => {
    isUserTypingRef.current = false;
  }, [currentDate]);

  useEffect(() => {
    if (currentEntry) {
      setSleepScoreInput(currentEntry.condition?.sleepScore ?? '');
      setEnergyLevelInput(currentEntry.condition?.energyLevel ?? 3);
      setWeatherConditionInput(currentEntry.weather?.condition ?? 'sunny');
      setWeatherTemperatureInput(currentEntry.weather?.temperature ?? '');
      setMoodInput(currentEntry.condition?.mood ?? 'neutral');
    } else {
      setSleepScoreInput('');
      setEnergyLevelInput(3);
      setWeatherConditionInput('sunny');
      setWeatherTemperatureInput('');
      setMoodInput('neutral');
    }
  }, [currentEntry, currentDate]);
  const [widgetsCollapsed, setWidgetsCollapsed] = useState(false);
  const [showTodoDrawer, setShowTodoDrawer] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Aggregate unresolved checklist bullets across all logs for floating to-do inbox
  const pendingTasks = useMemo(() => {
    const list: { id: string; text: string; date: string; createdAt: Date; scheduledAt?: Date; isCompleted?: boolean }[] = [];
    entries.forEach(entry => {
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

  // --- Real-time Word Counter (counts saved text + active inputs) ---
  const currentWordCount = useMemo(() => {
    const bulletText = currentEntry?.bullets.map((b) => b.text).join(' ') || '';
    const dreamText = isEditingDream ? '' : (currentEntry?.dream || '');
    const activeBulletText = bulletInput.trim();
    const activeDreamText = isEditingDream ? (dreamInputDate === currentDate ? dreamInput.trim() : '') : '';
    
    const fullText = `${bulletText} ${dreamText} ${activeBulletText} ${activeDreamText}`.trim();
    return fullText ? fullText.split(/\s+/).filter(Boolean).length : 0;
  }, [currentEntry, bulletInput, dreamInput, dreamInputDate, currentDate, isEditingDream]);

  // --- Automatic Celebration Trigger ---
  useEffect(() => {
    if (currentWordCount >= dailyGoal) {
      if (!goalMetCelebrated) {
        setGoalMetCelebrated(true);
        if (isUserTypingRef.current) {
          setShowConfetti(true);
          playGoalJingle();
        }
      }
    } else {
      setGoalMetCelebrated(false);
    }
  }, [currentWordCount, dailyGoal, goalMetCelebrated]);

  // --- Confetti particle structures interface ---
  interface ConfettiParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    rotation: number;
    rotationSpeed: number;
  }

  // --- HTML5 Canvas Confetti Cannon animation loop ---
  useEffect(() => {
    if (!showConfetti || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#00DC7D', '#00B866', '#FF9933', '#FFCC33', '#8B00D4', '#5D8AFF', '#FF453A'];
    const particles: ConfettiParticle[] = [];
    
    // Shoots 120 particles upwards from bottom corners
    for (let i = 0; i < 120; i++) {
      const isLeft = i % 2 === 0;
      particles.push({
        x: isLeft ? 0 : canvas.width,
        y: canvas.height,
        vx: (isLeft ? 1 : -1) * (Math.random() * 8 + 4),
        vy: -(Math.random() * 15 + 12),
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 6,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
      });
    }

    const gravity = 0.45;
    const drag = 0.98;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let activeParticles = 0;

      particles.forEach((p) => {
        p.vy += gravity;
        p.vx *= drag;
        p.vy *= drag;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size / 2);
        ctx.restore();

        if (p.y < canvas.height + 20) {
          activeParticles++;
        }
      });

      if (activeParticles > 0) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        setShowConfetti(false);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [showConfetti]);

  // --- XP & Level gamification calculations for quick popup ---
  const gamificationData = useMemo(() => {
    const entryXP = entries.length * 100;
    const bulletXP = entries.reduce((sum, e) => sum + e.bullets.length, 0) * 10;
    const dreamXP = entries.filter((e) => e.dream?.trim()).length * 50;
    const collectionXP = ((wisdoms?.length || 0) + (notes?.length || 0) + (ideas?.length || 0)) * 50;
    const photoXP = entries.reduce((sum, e) => sum + (e.media?.filter((m) => m.type === 'image').length || 0), 0) * 30;
    const streakBonus = currentStreak * 25;

    const totalXP = entryXP + bulletXP + dreamXP + collectionXP + photoXP + streakBonus;

    let level = 1;
    let xpForNextLevel = 300;
    let prevXPThreshold = 0;
    while (totalXP >= xpForNextLevel) {
      level++;
      prevXPThreshold = xpForNextLevel;
      xpForNextLevel += level * 200;
    }
    const progressXP = totalXP - prevXPThreshold;
    const levelCapacity = xpForNextLevel - prevXPThreshold;
    const progressPercent = Math.min(100, Math.max(0, (progressXP / levelCapacity) * 100));

    let levelTitle = '🌱 Sprout Scribe';
    if (level >= 3 && level < 5) levelTitle = '✍️ Mind Mapper';
    else if (level >= 5 && level < 7) levelTitle = '🧠 Thought Weaver';
    else if (level >= 7 && level < 10) levelTitle = '🌌 Wisdom Alchemist';
    else if (level >= 10) levelTitle = '👑 Master Chronicler';

    return {
      totalXP,
      level,
      progressXP,
      levelCapacity,
      progressPercent,
      levelTitle,
    };
  }, [entries, wisdoms, notes, ideas, currentStreak]);

  const bulletInputRef = useRef<HTMLTextAreaElement>(null);
  const dreamInputRef = useRef<HTMLInputElement>(null);
  const isSavingDreamRef = useRef(false);
  const savedToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedToastTimerRef.current) clearTimeout(savedToastTimerRef.current);
    };
  }, []);

  const isFirstRender = useRef(true);
  const currentDateRef = useRef(currentDate);

  useEffect(() => {
    currentDateRef.current = currentDate;
  }, [currentDate]);

  // Synchronize URL date parameter with currentDate state when dateParam changes
  useEffect(() => {
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const parsedDate = toLocalDate(dateParam);
      if (isValid(parsedDate) && dateParam !== currentDateRef.current) {
        setCurrentDate(dateParam);
      }
    }
  }, [dateParam, setCurrentDate]);

  // Sync state to URL parameter silently when currentDate changes
  useEffect(() => {
    const url = new URL(window.location.href);
    const currentUrlParam = url.searchParams.get('date');
    
    if (isFirstRender.current) {
      isFirstRender.current = false;
      // If URL doesn't have a date parameter, initialize it to currentDate
      if (!currentUrlParam && currentDate) {
        url.searchParams.set('date', currentDate);
        window.history.replaceState(null, '', url.pathname + url.search);
      }
      return;
    }

    if (currentDate && currentUrlParam !== currentDate) {
      url.searchParams.set('date', currentDate);
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  }, [currentDate]);

  const selectedDate = useMemo(() => {
    const parsedDate = toLocalDate(currentDate);
    return isValid(parsedDate) ? parsedDate : new Date();
  }, [currentDate]);

  const todayDate = format(new Date(), 'yyyy-MM-dd');
  const dateStr = format(selectedDate, 'MMMM d');
  const dayStr = format(selectedDate, 'EEEE');
  const yearStr = format(selectedDate, 'yyyy');
  const isToday = currentDate === todayDate;
  const entryNumber = useMemo(() => getEntryNumberForDate(entries, currentDate), [entries, currentDate]);

  const handlePrevDay = () => {
    try {
      const activeDate = currentDate || format(new Date(), 'yyyy-MM-dd');
      const parts = activeDate.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() - 1);
        const newDateStr = format(d, 'yyyy-MM-dd');
        setCurrentDate(newDateStr);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleNextDay = () => {
    try {
      const activeDate = currentDate || format(new Date(), 'yyyy-MM-dd');
      const parts = activeDate.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + 1);
        const newDateStr = format(d, 'yyyy-MM-dd');
        setCurrentDate(newDateStr);
      }
    } catch (e) {
      console.error(e);
    }
  };
  const entryMedia = currentEntry?.media || [];
  const dreamDraft = dreamInputDate === currentDate ? dreamInput : '';
  const setDreamDraft = (value: string) => {
    setDreamInputDate(currentDate);
    setDreamInput(value);
  };
  const showSaved = () => {
    if (savedToastTimerRef.current) clearTimeout(savedToastTimerRef.current);
    setShowSavedToast(true);
    savedToastTimerRef.current = setTimeout(() => {
      setShowSavedToast(false);
      savedToastTimerRef.current = null;
    }, 1400);
  };

  /**
   * FUTURE NLP SCHEDULER ROADMAP SPECIFICATION:
   * 
   * [1] Stabilo/Highlighter Effect:
   *     - As the user types in the journal textarea (`bulletInput`), we will run a regex/match engine
   *       to look for date/time patterns (e.g. "at 3pm", "7pm", "tomorrow", "7 days from now").
   *     - Trigger phrases will be wrapped dynamically inside a glowing, translucent green/yellow
   *       stabilo marker background layer (e.g., bg-[#E9FFF4] shadow-[0_0_8px_#00DC7D] or inline spans).
   * 
   * [2] Submit & Stripping Behavior:
   *     - Upon pressing Enter (triggering `handleAddBullet`):
   *       - The NLP engine parses the highlighted phrase (e.g., "7pm") into a full Date object (e.g., Today at 7:00 PM).
   *       - The trigger phrase (e.g., "7pm" or "tomorrow at 3pm") is stripped and deleted from the final bullet text.
   *       - The bullet is successfully saved (e.g. text "workout") and the parsed Date is registered in metadata
   *         to be rendered as the clean, styled timestamp.
   */
  const handleAddBullet = async () => {
    if (!bulletInput.trim()) return;
    const text = bulletInput.trim();

    setBulletInput('');
    showSaved();
    await addBullet(text, bulletStyle);
    bulletInputRef.current?.focus();
  };

  const handleBulletKeyDown = async (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      await handleAddBullet();
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      setBulletStyle(current => {
        if (current === 'bullet') return 'star';
        if (current === 'star') return 'checklist';
        return 'bullet';
      });
    }
  };

  const handleAddDream = async (shouldShowToast = false) => {
    if (isSavingDreamRef.current) return;
    const nextDream = dreamDraft.trim();
    const existingDream = currentEntry?.dream?.trim() || '';

    if (!currentEntry && !nextDream) {
      setIsEditingDream(false);
      return;
    }

    if (existingDream === nextDream) {
      setIsEditingDream(false);
      return;
    }

    isSavingDreamRef.current = true;
    if (shouldShowToast) showSaved();
    try {
      await updateDream(nextDream);
      setDreamDraft(nextDream);
      setIsEditingDream(false);
    } finally {
      isSavingDreamRef.current = false;
    }
  };

  const handleDreamKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await handleAddDream(true);
    }
    if (e.key === 'Escape') {
      setIsEditingDream(false);
      setDreamDraft(currentEntry?.dream || '');
    }
  };

  const openInlinePanel = (panel: InlinePanel) => {
    setActiveInlinePanel((current) => current === panel ? null : panel);
    setShowFabActions(false);
  };

  const handleAddWisdom = async () => {
    let content = '';
    
    if (selectedWisdomType === 'thought') {
      content = wisdomContent.trim();
    } else if (selectedWisdomType === 'quote') {
      const text = wisdomContent.trim();
      const author = wisdomAuthor.trim();
      if (!text) return;
      content = text + (author ? `\n\n-- ${author}` : '');
    } else if (selectedWisdomType === 'fact') {
      const text = wisdomContent.trim();
      const source = wisdomSource.trim();
      if (!text) return;
      content = text + (source ? `\n\nsource : ${source}` : '');
    } else if (selectedWisdomType === 'excerpt') {
      const text = wisdomContent.trim();
      const author = wisdomAuthor.trim();
      const source = wisdomSource.trim();
      if (!text) return;
      
      const metaParts = [];
      if (author) metaParts.push(`-- ${author}`);
      if (source) metaParts.push(`source : ${source}`);
      content = text + (metaParts.length > 0 ? `\n\n${metaParts.join('\n')}` : '');
    } else if (selectedWisdomType === 'lesson') {
      const text = wisdomContent.trim();
      const context = wisdomContext.trim();
      if (!text) return;
      content = text + (context ? `\n\ncontext : ${context}` : '');
    }
    
    if (!content) return;
    
    const wisdom = await addWisdom(selectedWisdomType, content, currentDate);
    if (!wisdom) return;
    await addBullet(content, 'star', {
      isHighlight: true,
      source: 'wisdom',
      sourceType: selectedWisdomType,
      sourceId: wisdom.id,
    });
    
    // Clear all states
    setWisdomContent('');
    setWisdomAuthor('');
    setWisdomSource('');
    setWisdomContext('');
    setActiveInlinePanel(null);
  };

  const handleAddNote = async () => {
    const title = noteTitle.trim();
    const content = noteContent.trim();
    if (!title && !content) return;
    const note = await addNote(title || 'Untitled', content, [], currentDate);
    if (!note) return;
    setNoteTitle('');
    setNoteContent('');
    setActiveInlinePanel(null);
  };

  const handleAddIdea = async () => {
    const content = ideaContent.trim();
    if (!content) return;
    const idea = await addIdea(content, currentDate);
    if (!idea) return;
    await addBullet(content, 'star', {
      isHighlight: true,
      source: 'idea',
      sourceId: idea.id,
    });
    setIdeaContent('');
    setActiveInlinePanel(null);
  };

  const getEntryDraft = (): Entry => {
    if (!currentEntry) {
      return {
        id: currentDate,
        date: currentDate,
        dream: '',
        bullets: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    const { media, location, ...entryRest } = currentEntry;
    return {
      ...entryRest,
      bullets: [...currentEntry.bullets],
      ...(media && media.length > 0 ? { media: [...media] } : {}),
      ...(location ? { location } : {}),
    };
  };

  const handleEntryMediaUpload = async (media: MediaItem) => {
    const entry = getEntryDraft();
    const updatedEntry: Entry = {
      ...entry,
      media: [...(entry.media || []), media],
      updatedAt: new Date(),
    };
    await saveEntry(updatedEntry);
  };

  const handleRemoveEntryMedia = async (mediaId: string) => {
    if (!currentEntry) return;
    const { media: currentMedia = [], location, ...entryRest } = currentEntry;
    const remainingMedia = currentMedia.filter((media) => media.id !== mediaId);
    const updatedEntry: Entry = {
      ...entryRest,
      ...(remainingMedia.length > 0 ? { media: remainingMedia } : {}),
      ...(location ? { location } : {}),
      updatedAt: new Date(),
    };
    await saveEntry(updatedEntry);
  };

  const handleRemoveLocation = async () => {
    if (!currentEntry) return;
    const { media, location, ...entryRest } = currentEntry;
    const updatedEntry: Entry = {
      ...entryRest,
      ...(media && media.length > 0 ? { media } : {}),
      updatedAt: new Date(),
    };
    await saveEntry(updatedEntry);
  };

  const fetchOpenMeteo = async (lat: number, lon: number) => {
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
      if (!res.ok) return null;
      const data = await res.json();
      const weathercode = data.current_weather?.weathercode;
      const temp = data.current_weather?.temperature;

      let condition: 'sunny' | 'cloudy' | 'rainy' | 'windy' | 'snowy' = 'sunny';
      if (weathercode === 0) {
        condition = 'sunny';
      } else if ([1, 2, 3, 45, 48].includes(weathercode)) {
        condition = 'cloudy';
      } else if ([51, 52, 53, 54, 55, 61, 62, 63, 64, 65, 80, 81, 82, 95, 96, 99].includes(weathercode)) {
        condition = 'rainy';
      } else if ([71, 72, 73, 74, 75, 77, 85, 86].includes(weathercode)) {
        condition = 'snowy';
      }
      return { condition, temperature: temp };
    } catch (e) {
      console.error('Error fetching from Open-Meteo:', e);
      return null;
    }
  };

  const fetchWeatherFromCoords = async (lat: number, lon: number) => {
    try {
      const key = process.env.NEXT_PUBLIC_WEATHER_API_KEY;
      if (key) {
        const res = await fetch(`https://api.weatherapi.com/v1/current.json?key=${key}&q=${lat},${lon}`);
        if (!res.ok) {
          console.warn('WeatherAPI call failed, falling back to Open-Meteo');
          return fetchOpenMeteo(lat, lon);
        }
        const data = await res.json();
        const weathercode = data.current?.condition?.code;
        const temp = data.current?.temp_c;
        const windKph = data.current?.wind_kph;

        let condition: 'sunny' | 'cloudy' | 'rainy' | 'windy' | 'snowy' = 'sunny';
        const condText = (data.current?.condition?.text || '').toLowerCase();

        if (windKph && windKph > 30) {
          condition = 'windy';
        } else if (weathercode === 1000) {
          condition = 'sunny';
        } else if ([1003, 1006, 1009, 1030, 1135, 1147].includes(weathercode)) {
          condition = 'cloudy';
        } else if ([1063, 1150, 1153, 1168, 1171, 1180, 1183, 1186, 1189, 1192, 1195, 1198, 1201, 1240, 1243, 1246, 1087, 1273, 1276].includes(weathercode)) {
          condition = 'rainy';
        } else if ([1066, 1069, 1072, 1114, 1117, 1204, 1207, 1210, 1213, 1216, 1219, 1222, 1225, 1237, 1249, 1252, 1255, 1258, 1261, 1264, 1279, 1282].includes(weathercode)) {
          condition = 'snowy';
        } else {
          if (condText.includes('rain') || condText.includes('drizzle') || condText.includes('shower') || condText.includes('thunder')) {
            condition = 'rainy';
          } else if (condText.includes('snow') || condText.includes('sleet') || condText.includes('ice') || condText.includes('hail') || condText.includes('blizzard')) {
            condition = 'snowy';
          } else if (condText.includes('cloud') || condText.includes('overcast') || condText.includes('fog') || condText.includes('mist')) {
            condition = 'cloudy';
          } else if (condText.includes('wind') || condText.includes('gale')) {
            condition = 'windy';
          } else {
            condition = 'sunny';
          }
        }
        return { condition, temperature: temp };
      } else {
        return fetchOpenMeteo(lat, lon);
      }
    } catch (e) {
      console.error('Error fetching weather:', e);
      return fetchOpenMeteo(lat, lon);
    }
  };

  const handleSaveOrbit = async () => {
    const entry = getEntryDraft();
    const sleepScore = typeof sleepScoreInput === 'number' ? sleepScoreInput : undefined;
    const temperature = typeof weatherTemperatureInput === 'number' ? weatherTemperatureInput : undefined;

    const updatedEntry: Entry = {
      ...entry,
      weather: {
        condition: weatherConditionInput,
        ...(temperature !== undefined ? { temperature } : {}),
      },
      condition: {
        energyLevel: energyLevelInput,
        mood: moodInput,
        ...(sleepScore !== undefined ? { sleepScore } : {}),
      },
      updatedAt: new Date(),
    };

    await saveEntry(updatedEntry);
    setActiveInlinePanel(null);
    setShowFabActions(false);
  };

  const handleAutoDetectWeather = async () => {
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError('gps is not supported in this browser');
      return;
    }

    setIsFetchingWeather(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 300000,
        });
      });

      const { latitude, longitude, accuracy } = position.coords;
      const district = await reverseGeocodeDistrict(latitude, longitude);
      const location: LocationItem = {
        latitude,
        longitude,
        district,
        mapUrl: getMapUrl(latitude, longitude),
        ...(Number.isFinite(accuracy) ? { accuracy } : {}),
        capturedAt: new Date(),
      };

      const weatherData = await fetchWeatherFromCoords(latitude, longitude);

      const entry = getEntryDraft();
      await saveEntry({
        ...entry,
        location,
        ...(weatherData ? { weather: weatherData } : {}),
        updatedAt: new Date(),
      });

      if (weatherData) {
        setWeatherConditionInput(weatherData.condition);
        if (weatherData.temperature !== undefined) {
          setWeatherTemperatureInput(weatherData.temperature);
        }
      }
    } catch (error) {
      setLocationError(getLocationErrorMessage(error));
    } finally {
      setIsFetchingWeather(false);
    }
  };

  const handleGenerateDailyInsight = async () => {
    if (!currentEntry) return;
    setDailyInsightError('');
    setIsGeneratingDailyInsight(true);

    try {
      let dailyInsight: any = null;
      let generateSuccess = false;

      // 1. Coba panggil API route (yang berfungsi di mode dev / server-side hosting)
      try {
        const res = await fetch('/api/ai/daily-insight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userProfile?.uid,
            date: currentDate,
            bullets: currentEntry.bullets,
            dream: currentEntry.dream,
            weather: currentEntry.weather || null,
            condition: currentEntry.condition || null,
            aiConfig: userProfile?.settings?.aiConfig
          })
        });

        const text = await res.text();
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html') || res.status === 404) {
          throw new Error('API route returned HTML or 404. Running client-side fallback.');
        }

        const data = JSON.parse(text);
        if (data.success && data.dailyInsight) {
          dailyInsight = data.dailyInsight;
          generateSuccess = true;
        } else {
          throw new Error(data.message || 'Gagal menganalisis hari ini.');
        }
      } catch (apiErr) {
        console.warn('[handleGenerateDailyInsight] API route unavailable, running client-side fallback:', apiErr);
        
        // 2. Client-side fallback menggunakan SDK langsung
        const bulletsList = Array.isArray(currentEntry.bullets) ? currentEntry.bullets.map((b: any) => b.text || b) : [];
        const aiPayload = {
          date: currentDate,
          bullets: bulletsList,
          dream: currentEntry.dream || '',
          weather: currentEntry.weather || null,
          condition: currentEntry.condition || null
        };

        const aiResult = await generateStructuredAI({
          userId: userProfile?.uid || 'anonymous',
          systemPrompt: DAILY_INSIGHT_PROMPT,
          userPayload: aiPayload,
          feature: 'daily-insight',
          aiConfig: userProfile?.settings?.aiConfig
        });

        dailyInsight = {
          text: aiResult.insightText || 'Analisis harian selesai.',
          moodScore: typeof aiResult.moodScore === 'number' ? aiResult.moodScore : 7,
          sentiment: aiResult.sentiment || 'neutral',
          generatedAt: new Date().toISOString()
        };
        generateSuccess = true;
      }

      if (generateSuccess && dailyInsight) {
        const entry = getEntryDraft();
        await saveEntry({
          ...entry,
          dailyInsight,
          updatedAt: new Date()
        });
      } else {
        throw new Error('Gagal menganalisis hari ini.');
      }
    } catch (err: any) {
      console.error(err);
      setDailyInsightError(err.message || 'Terjadi kesalahan saat memproses analisis harian Anda.');
    } finally {
      setIsGeneratingDailyInsight(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pb-24">
      {!isOnline && (
        <div className="text-center py-2 bg-[#FFCC33]/20 text-[#2F3331] text-sm">
          you are offline, data will sync when back online
        </div>
      )}

      {showSavedToast && (
        <div className="fixed left-1/2 top-6 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#2F3331] px-4 py-2 text-sm font-semibold text-white shadow-lg">
          <FontAwesomeIcon icon={faCheckCircle} className="h-4 w-4 text-[#00DC7D]" />
          saved!
        </div>
      )}

      {/* Collapsible Top Right Widgets & Switcher Tray */}
      {widgetsCollapsed ? (
        <button
          onClick={() => setWidgetsCollapsed(false)}
          className="fixed right-0 top-24 z-40 flex h-14 w-6 items-center justify-center rounded-l-xl bg-white border-y border-l border-[#CCD0CF]/60 shadow-[0_2px_12px_rgba(0,0,0,0.05)] cursor-pointer hover:bg-gray-50 text-[#A3A7A8] hover:text-black transition-all hover:scale-105 active:scale-95 duration-200"
          title="Show Widgets & Switcher"
        >
          <FontAwesomeIcon icon={faChevronLeft} className="w-2.5 h-2.5 animate-pulse" />
        </button>
      ) : (
        <div className="fixed right-6 top-24 z-40 flex flex-col gap-2 items-end">
          {/* Collapse Trigger Chevron */}
          <button
            onClick={() => setWidgetsCollapsed(true)}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-white border border-[#CCD0CF]/60 shadow-sm cursor-pointer hover:bg-[#FAFAFA] text-[#A3A7A8] hover:text-black transition-all mb-1 mr-0.5 hover:scale-105 active:scale-90"
            title="Minimize Tray"
          >
            <FontAwesomeIcon icon={faChevronRight} className="w-2.5 h-2.5" />
          </button>

          {/* Unified Physical Ticket Container */}
          <div className="pointer-events-auto flex flex-col items-center bg-white border border-[#E4E7E6] shadow-[0_4px_16px_rgba(0,0,0,0.06)] rounded-2xl p-2 w-[82px] z-50">
            {/* Top Widgets Section */}
            <div className="flex flex-col items-center w-full gap-3.5 pb-1">
              {/* Streak Widget */}
              {settings.showStreakWidget !== false && currentStreak > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowStreakModal(true);
                  }}
                  className="pointer-events-auto flex flex-col items-center justify-center w-full py-1 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                  title="View Stats & Gamification"
                >
                  <FontAwesomeIcon icon={faFire} className="w-4 h-4 text-[#FF9933] animate-pulse pointer-events-none" />
                  <span className="text-[10px] font-black text-[#2F3331] mt-0.5 leading-none pointer-events-none">{currentStreak}d</span>
                </button>
              )}

              {/* Daily Word Goal (Battery Progress) */}
              {settings.showWordGoalWidget !== false && (
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (currentWordCount >= dailyGoal) {
                      setShowConfetti(true);
                      playGoalJingle();
                    }
                  }}
                  className={`pointer-events-auto flex flex-col items-center w-full p-1 rounded-xl transition-all duration-300 select-none cursor-pointer ${
                    currentWordCount >= dailyGoal 
                      ? 'bg-[#E9FFF4] border border-[#00DC7D]' 
                      : 'hover:bg-gray-50'
                  }`}
                  title={currentWordCount >= dailyGoal ? "Daily Goal Met! Tap to replay jingle 🎉" : `Daily Word Goal: ${currentWordCount}/${dailyGoal} words`}
                >
                  {/* Battery Cap */}
                  <div className={`w-2 h-0.5 rounded-none transition-colors duration-300 pointer-events-none ${
                    currentWordCount >= dailyGoal ? 'bg-[#00B866]' : 'bg-[#CCD0CF]'
                  }`} />
                  
                  {/* Battery Body */}
                  <div className={`w-6 h-9 border border-2 rounded-sm p-[1px] flex flex-col justify-end overflow-hidden transition-colors duration-300 relative pointer-events-none ${
                    currentWordCount >= dailyGoal ? 'border-[#00B866] bg-[#E9FFF4]/40' : 'border-[#CCD0CF] bg-gray-50/50'
                  }`}>
                    {/* Fill */}
                    <div 
                      className={`w-full rounded-none transition-all duration-500 origin-bottom ${
                        currentWordCount >= dailyGoal 
                          ? 'bg-gradient-to-t from-[#00DC7D] to-[#00B866] animate-pulse' 
                          : 'bg-[#00DC7D]'
                      }`}
                      style={{ height: `${Math.min(100, (currentWordCount / dailyGoal) * 100)}%` }}
                    />
                    
                    {/* Percentage inside Battery */}
                    <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black tracking-tighter text-[#2F3331] z-10 pointer-events-none mix-blend-difference">
                      {Math.round(Math.min(100, (currentWordCount / dailyGoal) * 100))}%
                    </span>
                  </div>

                  {/* Word count text below */}
                  <span className="mt-1 text-[9px] font-extrabold text-[#2F3331] leading-none text-center pointer-events-none">
                    {currentWordCount}w
                  </span>
                  <span className="text-[7px] text-[#A3A7A8] font-bold uppercase tracking-wider leading-none mt-0.5 pointer-events-none">
                    /{dailyGoal}
                  </span>
                </div>
              )}

              {/* To-Do List button with count badge */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTodoDrawer(!showTodoDrawer);
                }}
                className={`pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 relative ${
                  showTodoDrawer
                    ? 'bg-[#E9FFF4] border border-[#00DC7D] text-[#00DC7D]'
                    : 'bg-gray-50 hover:bg-[#FAFAFA] border border-gray-150 text-[#A3A7A8] hover:text-[#2F3331]'
                }`}
                title="Active To-Do Inbox"
              >
                <FontAwesomeIcon icon={faListCheck} className="w-4 h-4 pointer-events-none" />
                {pendingTasks.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[#FF453A] text-[8px] font-black text-white shadow-sm shadow-[#FF453A]/20 animate-pulse pointer-events-none">
                    {pendingTasks.length}
                  </span>
                )}
              </button>
            </div>

            {/* Perforated dashed tear separator */}
            <div className="border-t border-dashed border-[#CCD0CF]/70 my-2.5 w-full pointer-events-none" />

            {/* Navigation Block (Simple Date Switcher) */}
            <div className="pointer-events-auto flex items-center justify-between gap-1 w-full select-none">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevDay();
                }}
                className="pointer-events-auto flex h-6 w-6 items-center justify-center rounded-full text-[#6F7476] hover:bg-[#F2F2F3] hover:text-black transition-colors cursor-pointer active:scale-90"
                title="Previous Day"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="w-2.5 h-2.5 pointer-events-none" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentDate(todayDate);
                }}
                className="pointer-events-auto flex h-5 w-5 items-center justify-center cursor-pointer"
                title="Go to Today"
              >
                <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-250 pointer-events-none ${isToday ? 'bg-[#00DC7D]' : 'bg-[#6F7476]/55 animate-pulse'}`} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextDay();
                }}
                className="pointer-events-auto flex h-6 w-6 items-center justify-center rounded-full text-[#6F7476] hover:bg-[#F2F2F3] hover:text-black transition-colors cursor-pointer active:scale-90"
                title="Next Day"
              >
                <FontAwesomeIcon icon={faArrowRight} className="w-2.5 h-2.5 pointer-events-none" />
              </button>
            </div>
          </div>

          {/* Floating To-Do Inbox Drawer (slides out next to the tray) */}
          {showTodoDrawer && (
            <div className="absolute right-[86px] top-0 z-50 w-[260px] max-h-[360px] rounded-2xl bg-white/95 border border-[#E4E7E6] shadow-xl p-4 flex flex-col overflow-hidden backdrop-blur-md animate-in fade-in slide-in-from-right-5 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#EEF0EF] pb-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-[#2F3331] uppercase tracking-wider">To-Do Inbox</span>
                  {pendingTasks.length > 0 && (
                    <span className="inline-flex h-4 min-w-4 px-1 rounded-full bg-[#FF453A]/10 text-[#FF453A] text-[9px] font-black items-center justify-center">
                      {pendingTasks.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowTodoDrawer(false)}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[#A3A7A8] hover:bg-[#F2F2F3] hover:text-[#2F3331] transition-colors"
                  title="Close"
                >
                  <FontAwesomeIcon icon={faXmark} className="w-3 h-3" />
                </button>
              </div>

              {/* Tasks List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 select-none scrollbar-none">
                {pendingTasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-2.5 py-0.5 text-left">
                    <button
                      onClick={() => toggleBulletComplete(task.id)}
                      className="shrink-0 mt-0.5 cursor-pointer animate-none"
                    >
                      <FontAwesomeIcon icon={faSquare} className="w-4 h-4 text-[#CCD0CF] hover:text-[#00DC7D] transition-colors" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#2F3331] leading-relaxed break-words line-clamp-2">
                        {task.text}
                      </p>
                      <button
                        onClick={() => {
                          setCurrentDate(task.date);
                          setShowTodoDrawer(false);
                        }}
                        className={`mt-1 inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors cursor-pointer text-[8px] font-bold ${
                          task.scheduledAt
                            ? 'bg-[#E9FFF4] hover:bg-[#D6FADB] text-[#00A963]'
                            : 'bg-[#F2F2F3] hover:bg-[#E8E9EA] text-[#6F7476] hover:text-[#2F3331]'
                        }`}
                        title={`Go to ${task.date}`}
                      >
                        <FontAwesomeIcon icon={faCalendar} className={`w-2 h-2 ${task.scheduledAt ? 'text-[#00DC7D]' : 'text-[#A3A7A8]'}`} />
                        {task.scheduledAt 
                          ? format(new Date(task.scheduledAt), 'MMM d')
                          : format(new Date(task.date), 'MMM d')}
                      </button>
                      
                      {task.scheduledAt && (
                        <span className="mt-1 ml-1 inline-flex items-center gap-1 rounded bg-[#FFF3C4] text-[8px] font-bold text-[#8C6B00] px-1 py-0.5 select-none shadow-sm border border-[#FFE082]/20">
                          <FontAwesomeIcon icon={faClock} className="w-2 h-2 text-[#B58900]" />
                          {format(new Date(task.scheduledAt), 'h:mm a')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {pendingTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <FontAwesomeIcon icon={faListCheck} className="w-8 h-8 text-[#CCD0CF] mb-2" />
                    <p className="text-xs font-bold text-[#6F7476]">all caught up!</p>
                    <p className="text-[10px] text-[#A3A7A8]">your journal inbox is empty</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="max-w-[600px] mx-auto px-6 py-8">
        <div className="min-h-[34vh] flex flex-col justify-center">
          <div className="font-sans tracking-normal">
            <h1 className="text-2xl font-bold font-sans text-[#2F3331] tracking-normal">
              {dateStr}
            </h1>
            <span className="mt-1 inline-flex rounded-md bg-[#F2F2F3] px-2 py-1 align-middle text-xs font-bold text-[#6F7476]">
              {yearStr}
            </span>
          </div>

          <div className="my-1 flex items-center gap-4 font-sans tracking-normal">
            <h2 className="text-5xl font-bold font-sans text-[#2F3331] tracking-normal">
              {dayStr}
            </h2>
          </div>

          <p className="mt-1 font-sans text-base text-[#6F7476] tracking-normal">
            <span className="font-bold text-[#2F3331]">#{entryNumber}</span> / <span className="text-[#FF9933] font-semibold">{isToday ? 'Today' : currentDate}</span>
          </p>

          {/* BIO Sensor bar */}
          {(currentEntry?.weather || currentEntry?.condition) && (
            <div className="mt-2.5 flex items-center gap-3.5 text-xs text-[#6F7476] select-none">
              {currentEntry.condition?.sleepScore !== undefined && (
                <div className="flex items-center gap-1" title={`Sleep score: ${currentEntry.condition.sleepScore}`}>
                  <FontAwesomeIcon icon={faBed} className="w-3.5 h-3.5 text-[#5D8AFF]" />
                  <span className="font-bold font-mono text-[#2F3331]">{currentEntry.condition.sleepScore}</span>
                </div>
              )}
              {currentEntry.condition?.energyLevel !== undefined && (
                <div className="flex items-center gap-1" title={`Energy level: ${currentEntry.condition.energyLevel}/5`}>
                  <FontAwesomeIcon icon={faHeartPulse} className="w-3.5 h-3.5 text-[#00DC7D]" />
                  <span className="font-bold text-[#2F3331] text-[10px] bg-gray-50 border border-[#EEF0EF] px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">
                    Energy: {currentEntry.condition.energyLevel}/5
                  </span>
                </div>
              )}
              {currentEntry.condition?.mood !== undefined && (
                <div className="flex items-center gap-1.5" title={`Mood: ${currentEntry.condition.mood}`}>
                  {(() => {
                    const mood = currentEntry.condition.mood;
                    let icon = faTree;
                    let iconColor = 'text-[#00DC7D]';
                    if (mood === 'stressed') { icon = faBolt; iconColor = 'text-red-500'; }
                    else if (mood === 'anxious') { icon = faWind; iconColor = 'text-purple-500'; }
                    else if (mood === 'sad') { icon = faCloudRain; iconColor = 'text-blue-500'; }
                    else if (mood === 'tired') { icon = faMoon; iconColor = 'text-gray-500'; }
                    else if (mood === 'neutral') { icon = faTree; iconColor = 'text-emerald-500'; }
                    else if (mood === 'happy') { icon = faSun; iconColor = 'text-amber-500'; }
                    else if (mood === 'joyful') { icon = faStar; iconColor = 'text-pink-500'; }

                    return (
                      <>
                        <FontAwesomeIcon icon={icon} className={`w-3.5 h-3.5 ${iconColor}`} />
                        <span className="font-bold text-[#2F3331] text-[10px] bg-gray-50 border border-[#EEF0EF] px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">
                          {mood}
                        </span>
                      </>
                    );
                  })()}
                </div>
              )}
              {currentEntry.weather?.condition !== undefined && (
                <div className="flex items-center gap-1" title={`Weather: ${currentEntry.weather.condition}`}>
                  <FontAwesomeIcon
                    icon={
                      currentEntry.weather.condition === 'sunny'
                        ? faSun
                        : currentEntry.weather.condition === 'cloudy'
                        ? faCloud
                        : currentEntry.weather.condition === 'rainy'
                        ? faCloudRain
                        : currentEntry.weather.condition === 'windy'
                        ? faWind
                        : faSnowflake
                    }
                    className="w-3.5 h-3.5 text-[#FFB95C]"
                  />
                  {currentEntry.weather.temperature !== undefined && (
                    <span className="font-bold font-mono text-[#2F3331]">{Math.round(currentEntry.weather.temperature)}°C</span>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowFabActions(current => !current)}
                className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#00DC7D] text-white shadow-sm fab-trigger-transition hover:bg-[#00B866] active:scale-95 ${showFabActions ? 'rotate-135' : ''}`}
                title="add"
              >
                <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
              </button>

              <div className={`flex flex-wrap sm:flex-nowrap items-center gap-2 overflow-hidden whitespace-normal sm:whitespace-nowrap fab-actions-transition origin-left ${
                showFabActions ? 'max-w-[700px] max-h-[200px] opacity-100 scale-100 translate-x-0' : 'max-w-0 max-h-0 opacity-0 scale-75 -translate-x-4 pointer-events-none'
              }`}>
                <button
                  onClick={() => openInlinePanel('wisdom')}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 active:scale-95 ${activeInlinePanel === 'wisdom' ? 'bg-[#F0D6FF] text-[#8B00D4]' : 'bg-[#F2F2F3] text-[#2F3331] hover:bg-[#E8E9EA]'}`}
                  title="add wisdom"
                >
                  <FontAwesomeIcon icon={faTree} className="w-4 h-4" />
                  wisdom
                </button>
                <button
                  onClick={() => openInlinePanel('note')}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 active:scale-95 ${activeInlinePanel === 'note' ? 'bg-[#C8F7E4] text-[#00875A]' : 'bg-[#F2F2F3] text-[#2F3331] hover:bg-[#E8E9EA]'}`}
                  title="add note"
                >
                  <FontAwesomeIcon icon={faBook} className="w-4 h-4" />
                  note
                </button>
                <button
                  onClick={() => openInlinePanel('idea')}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 active:scale-95 ${activeInlinePanel === 'idea' ? 'bg-[#FFE4B5] text-[#B45309]' : 'bg-[#F2F2F3] text-[#2F3331] hover:bg-[#E8E9EA]'}`}
                  title="add idea"
                >
                  <FontAwesomeIcon icon={faLightbulb} className="w-4 h-4" />
                  idea
                </button>
                <button
                  onClick={() => openInlinePanel('image')}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 active:scale-95 ${activeInlinePanel === 'image' ? 'bg-[#D6E4FF] text-[#1A56C4]' : 'bg-[#F2F2F3] text-[#2F3331] hover:bg-[#E8E9EA]'}`}
                  title="add image"
                >
                  <FontAwesomeIcon icon={faImage} className="w-4 h-4" />
                  image
                </button>
                <button
                  onClick={() => openInlinePanel('orbit')}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 active:scale-95 ${activeInlinePanel === 'orbit' ? 'bg-[#E9FFF4] text-[#00DC7D]' : 'bg-[#F2F2F3] text-[#2F3331] hover:bg-[#E8E9EA]'}`}
                  title="daily vibe status"
                >
                  <FontAwesomeIcon icon={faHeartPulse} className="w-4 h-4 text-[#00DC7D] animate-pulse" />
                  status
                </button>
              </div>
            </div>

            {currentEntry?.location && (
              <div className="group inline-flex max-w-full items-center gap-1 rounded-lg bg-[#F2F2F3] px-3 py-2 text-sm font-semibold text-[#2F3331] transition-colors hover:bg-[#E8E9EA]">
                <a
                  href={currentEntry.location.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-w-0 items-center gap-2"
                  title="open map"
                >
                  <FontAwesomeIcon icon={faLocationDot} className="w-4 h-4 shrink-0 text-[#FF9933]" />
                  <span className="truncate">({currentEntry.location.district})</span>
                </a>
                <button
                  onClick={handleRemoveLocation}
                  className="ml-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[#A3A7A8] opacity-0 transition-opacity hover:bg-white hover:text-[#FF453A] group-hover:opacity-100"
                  title="remove location"
                >
                  <FontAwesomeIcon icon={faXmark} className="w-3 h-3" />
                </button>
              </div>
            )}

            {locationError && (
              <p className="text-sm font-medium text-[#FF453A]">{locationError}</p>
            )}

            {activeInlinePanel === 'wisdom' && (
              <div className="py-3">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[#2F3331]">Wisdom</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveInlinePanel(null)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2F2F3] text-[#6F7476] transition-colors hover:bg-[#E8E9EA] hover:text-[#2F3331]"
                      title="cancel"
                    >
                      <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={handleAddWisdom}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00DC7D] text-white transition-colors hover:bg-[#00B866]"
                      title="save"
                    >
                      <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mb-3 flex flex-wrap gap-2">
                  {wisdomCategories.map(({ type, icon, label, color, bg }) => {
                    const isSelected = selectedWisdomType === type;
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedWisdomType(type)}
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95 border ${
                          isSelected ? 'border-transparent shadow-sm' : 'border-[#EEF0EF] bg-[#F2F2F3] text-[#8E9392] hover:bg-[#E8E9EA] hover:text-[#2F3331]'
                        }`}
                        style={isSelected ? { backgroundColor: bg, color } : undefined}
                      >
                        <FontAwesomeIcon icon={icon} className="w-3.5 h-3.5" />
                        {label}
                      </button>
                    );
                  })}
                </div>
                <div className="mb-3 border-t border-dashed border-[#D7DBDA] pt-3" />
                
                {selectedWisdomType === 'thought' && (
                  <textarea
                    value={wisdomContent}
                    onChange={(e) => setWisdomContent(e.target.value)}
                    placeholder="drop the thing your future self needs..."
                    rows={3}
                    className="w-full resize-none bg-transparent py-1 text-[#2F3331] placeholder-[#A3A7A8] focus:outline-none text-sm leading-relaxed"
                    autoFocus
                  />
                )}
                
                {selectedWisdomType === 'quote' && (
                  <div className="space-y-2.5">
                    <textarea
                      value={wisdomContent}
                      onChange={(e) => setWisdomContent(e.target.value)}
                      placeholder="Quote text..."
                      rows={2}
                      className="w-full resize-none bg-transparent py-1 text-[#2F3331] placeholder-[#A3A7A8] focus:outline-none text-sm leading-relaxed"
                      autoFocus
                    />
                    <input
                      type="text"
                      value={wisdomAuthor}
                      onChange={(e) => setWisdomAuthor(e.target.value)}
                      placeholder="Author..."
                      className="w-full bg-transparent py-1 border-b border-[#EEF0EF] text-[10px] text-[#A3A7A8] placeholder-[#C5C8C7] focus:outline-none focus:border-[#8B00D4]/30"
                    />
                  </div>
                )}
                
                {selectedWisdomType === 'fact' && (
                  <div className="space-y-2.5">
                    <textarea
                      value={wisdomContent}
                      onChange={(e) => setWisdomContent(e.target.value)}
                      placeholder="Fact text..."
                      rows={2}
                      className="w-full resize-none bg-transparent py-1 text-[#2F3331] placeholder-[#A3A7A8] focus:outline-none text-sm leading-relaxed"
                      autoFocus
                    />
                    <input
                      type="text"
                      value={wisdomSource}
                      onChange={(e) => setWisdomSource(e.target.value)}
                      placeholder="Source..."
                      className="w-full bg-transparent py-1 border-b border-[#EEF0EF] text-[10px] text-[#A3A7A8] placeholder-[#C5C8C7] focus:outline-none focus:border-[#8B00D4]/30"
                    />
                  </div>
                )}
                
                {selectedWisdomType === 'excerpt' && (
                  <div className="space-y-2.5">
                    <textarea
                      value={wisdomContent}
                      onChange={(e) => setWisdomContent(e.target.value)}
                      placeholder="Excerpt text..."
                      rows={2}
                      className="w-full resize-none bg-transparent py-1 text-[#2F3331] placeholder-[#A3A7A8] focus:outline-none text-sm leading-relaxed"
                      autoFocus
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={wisdomAuthor}
                        onChange={(e) => setWisdomAuthor(e.target.value)}
                        placeholder="Author..."
                        className="w-full bg-transparent py-1 border-b border-[#EEF0EF] text-[10px] text-[#A3A7A8] placeholder-[#C5C8C7] focus:outline-none focus:border-[#8B00D4]/30"
                      />
                      <input
                        type="text"
                        value={wisdomSource}
                        onChange={(e) => setWisdomSource(e.target.value)}
                        placeholder="Source..."
                        className="w-full bg-transparent py-1 border-b border-[#EEF0EF] text-[10px] text-[#A3A7A8] placeholder-[#C5C8C7] focus:outline-none focus:border-[#8B00D4]/30"
                      />
                    </div>
                  </div>
                )}
                
                {selectedWisdomType === 'lesson' && (
                  <div className="space-y-2.5">
                    <textarea
                      value={wisdomContent}
                      onChange={(e) => setWisdomContent(e.target.value)}
                      placeholder="Lesson text..."
                      rows={2}
                      className="w-full resize-none bg-transparent py-1 text-[#2F3331] placeholder-[#A3A7A8] focus:outline-none text-sm leading-relaxed"
                      autoFocus
                    />
                    <input
                      type="text"
                      value={wisdomContext}
                      onChange={(e) => setWisdomContext(e.target.value)}
                      placeholder="How did you learn this"
                      className="w-full bg-transparent py-1 border-b border-[#EEF0EF] text-[10px] text-[#A3A7A8] placeholder-[#C5C8C7] focus:outline-none focus:border-[#8B00D4]/30"
                    />
                  </div>
                )}
              </div>
            )}

            {activeInlinePanel === 'note' && (
              <div className="py-3">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[#2F3331]">Note</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveInlinePanel(null)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2F2F3] text-[#6F7476] transition-colors hover:bg-[#E8E9EA] hover:text-[#2F3331]"
                      title="cancel"
                    >
                      <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        const qParams = new URLSearchParams();
                        if (noteTitle.trim()) qParams.set('title', noteTitle.trim());
                        if (noteContent.trim()) qParams.set('content', noteContent.trim());
                        qParams.set('linkedDate', currentDate);
                        router.push(`/notes/new?${qParams.toString()}`);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EAD8FF] text-[#7A2EB8] transition-colors hover:bg-[#DBC0FF]"
                      title="fullscreen editor"
                    >
                      <FontAwesomeIcon icon={faExpand} className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={handleAddNote}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00DC7D] text-white transition-colors hover:bg-[#00B866]"
                      title="save"
                    >
                      <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Title (optional)"
                  className="mb-2 w-full bg-transparent text-base font-semibold text-[#2F3331] placeholder-[#A3A7A8] focus:outline-none"
                  autoFocus
                />
                <div className="mb-3 border-t border-dashed border-[#D7DBDA]" />
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="spill it here, keep it useful..."
                  rows={3}
                  className="w-full resize-none bg-transparent py-1 text-[#2F3331] placeholder-[#A3A7A8] focus:outline-none"
                />
              </div>
            )}

            {activeInlinePanel === 'idea' && (
              <div className="py-3">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[#2F3331]">Idea</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveInlinePanel(null)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2F2F3] text-[#6F7476] transition-colors hover:bg-[#E8E9EA] hover:text-[#2F3331]"
                      title="cancel"
                    >
                      <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={handleAddIdea}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF9933] text-white transition-colors hover:bg-[#E68A26]"
                      title="save"
                    >
                      <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mb-3 border-t border-dashed border-[#D7DBDA]" />
                <textarea
                  value={ideaContent}
                  onChange={(e) => setIdeaContent(e.target.value)}
                  placeholder="tiny spark, big maybe..."
                  rows={3}
                  className="w-full resize-none bg-transparent py-1 text-[#2F3331] placeholder-[#A3A7A8] focus:outline-none"
                  autoFocus
                />
              </div>
            )}

            {activeInlinePanel === 'image' && (
              <div className="mt-3 rounded-lg border border-dashed border-[#CCD0CF] bg-[#FAFAFA] p-4 transition-all duration-300">
                <ImageUpload
                  maxFiles={5}
                  showPreview={false}
                  onUploadComplete={handleEntryMediaUpload}
                />
              </div>
            )}

            {activeInlinePanel === 'orbit' && (
              <div className="py-4 border border-[#EEF0EF] bg-[#FAFAFA] rounded-2xl p-5 shadow-sm space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-[#EEF0EF] pb-2">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faHeartPulse} className="h-5 w-5 text-[#00DC7D] animate-pulse" />
                    <h3 className="text-base font-bold text-[#2F3331]">Mind-Body Orbit</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveInlinePanel(null)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-[#CCD0CF] text-[#6F7476] transition-colors hover:bg-[#F2F2F3] hover:text-[#2F3331]"
                      title="cancel"
                    >
                      <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={handleSaveOrbit}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00DC7D] text-white transition-colors hover:bg-[#00B866] shadow-sm"
                      title="save"
                    >
                      <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Weather Section */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#6F7476] uppercase tracking-wider">Weather & Temp</label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(['sunny', 'cloudy', 'rainy', 'windy', 'snowy'] as const).map((cond) => {
                        const icon = cond === 'sunny' ? faSun : cond === 'cloudy' ? faCloud : cond === 'rainy' ? faCloudRain : cond === 'windy' ? faWind : faSnowflake;
                        const isSel = weatherConditionInput === cond;
                        return (
                          <button
                            key={cond}
                            onClick={() => setWeatherConditionInput(cond)}
                            type="button"
                            className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm transition-all ${
                              isSel
                                ? 'bg-white border-[#00DC7D] text-[#00DC7D] shadow-sm scale-105'
                                : 'bg-white border-[#EEF0EF] text-[#6F7476] hover:bg-gray-50'
                            }`}
                            title={cond}
                          >
                            <FontAwesomeIcon icon={icon} className="h-4 w-4" />
                          </button>
                        );
                      })}
                      <button
                        onClick={handleAutoDetectWeather}
                        disabled={isFetchingWeather}
                        type="button"
                        className="flex items-center justify-center h-9 px-2.5 rounded-lg bg-white border border-[#CCD0CF] text-xs font-semibold text-[#2F3331] hover:bg-gray-50 active:scale-95 disabled:opacity-50"
                        title="Auto-detect weather using GPS"
                      >
                        <FontAwesomeIcon icon={isFetchingWeather ? faSpinner : faLocationDot} className={`h-3 w-3 mr-1 ${isFetchingWeather ? 'animate-spin' : ''}`} />
                        GPS
                      </button>
                    </div>
                    {/* Temperature Input */}
                    <div className="relative max-w-[120px] mt-1">
                      <input
                        type="number"
                        placeholder="Temp"
                        value={weatherTemperatureInput}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Math.round(parseFloat(e.target.value) * 10) / 10;
                          setWeatherTemperatureInput(val);
                        }}
                        className="w-full bg-white border border-[#EEF0EF] rounded-xl pl-3 pr-8 py-2 text-xs text-[#2F3331] placeholder-[#A3A7A8] focus:outline-none focus:border-[#00DC7D]/50 focus:ring-1 focus:ring-[#00DC7D]/50 font-mono font-bold"
                      />
                      <span className="absolute right-3 top-2 text-[10px] text-[#A3A7A8] font-bold">°C</span>
                    </div>
                  </div>

                  {/* Sleep Score Section */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#6F7476] uppercase tracking-wider">Smartwatch Sleep Score</label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="e.g. 85"
                          value={sleepScoreInput}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                            setSleepScoreInput(val);
                          }}
                          className="w-full bg-white border border-[#EEF0EF] rounded-xl px-3 py-2 text-sm text-[#2F3331] placeholder-[#A3A7A8] focus:outline-none focus:border-[#00DC7D]/50 focus:ring-1 focus:ring-[#00DC7D]/50"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-[#A3A7A8] font-bold">/ 100</span>
                      </div>
                    </div>
                  </div>

                  {/* Energy Level Section */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-[#6F7476] uppercase tracking-wider">Energy Level</label>
                    <div className="relative pt-2 pb-6 px-1">
                      {/* Custom Track Container */}
                      <div className="relative h-3.5 w-full rounded-full bg-[#EEF0EF] overflow-hidden shadow-inner">
                        {/* Active track with energetic progress animation */}
                        <div
                          className="absolute top-0 left-0 h-full rounded-full energetic-progress-pulsing transition-all duration-300"
                          style={{ width: `calc(10px + ${((energyLevelInput - 1) / 4)} * (100% - 20px))` }}
                        />
                        
                        {/* 5 discrete tick marks / dots inside track */}
                        <div className="absolute top-0 left-0 w-full h-full flex justify-between items-center px-2 pointer-events-none">
                          {[1, 2, 3, 4, 5].map((lvl) => {
                            const isActive = lvl <= energyLevelInput;
                            return (
                              <div
                                key={lvl}
                                className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                                  isActive ? 'bg-white shadow-sm' : 'bg-gray-400'
                                }`}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* Real range input overlayed and styled transparently to capture drag/click */}
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={energyLevelInput}
                        onChange={(e) => setEnergyLevelInput(parseInt(e.target.value))}
                        className="absolute top-2 left-0 w-full h-3.5 opacity-0 cursor-pointer z-10"
                      />

                      {/* Floating Slider Thumb overlay */}
                      <div
                        className="absolute top-1.5 w-5 h-5 rounded-full bg-white border-2 border-[#00DC7D] shadow-md flex items-center justify-center transition-all duration-300 pointer-events-none"
                        style={{
                          left: `calc(${((energyLevelInput - 1) / 4)} * (100% - 20px))`,
                        }}
                      >
                        <span className="text-[10px] font-extrabold text-[#00DC7D]">{energyLevelInput}</span>
                      </div>

                      {/* Tick labels */}
                      <div className="flex justify-between text-[8px] font-extrabold text-[#A3A7A8] mt-2 select-none uppercase tracking-wider">
                        <span>Exhausted (1)</span>
                        <span>Tired (2)</span>
                        <span>Normal (3)</span>
                        <span>Focused (4)</span>
                        <span>Energetic (5)</span>
                      </div>
                    </div>
                  </div>

                  {/* Mood Section */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#6F7476] uppercase tracking-wider">Manual Mood</label>
                    <div className="flex flex-wrap gap-1.5">
                      {([
                        { key: 'stressed', icon: faBolt, color: 'text-red-500 bg-red-50/50 border-red-200' },
                        { key: 'anxious', icon: faWind, color: 'text-purple-500 bg-purple-50/50 border-purple-200' },
                        { key: 'sad', icon: faCloudRain, color: 'text-blue-500 bg-blue-50/50 border-blue-200' },
                        { key: 'tired', icon: faMoon, color: 'text-gray-500 bg-gray-50/50 border-gray-200' },
                        { key: 'neutral', icon: faTree, color: 'text-emerald-500 bg-emerald-50/50 border-emerald-200' },
                        { key: 'happy', icon: faSun, color: 'text-amber-500 bg-amber-50/50 border-amber-200' },
                        { key: 'joyful', icon: faStar, color: 'text-pink-500 bg-pink-50/50 border-pink-200' }
                      ] as const).map((moodObj) => {
                        const isSel = moodInput === moodObj.key;
                        return (
                          <button
                            key={moodObj.key}
                            onClick={() => setMoodInput(moodObj.key)}
                            type="button"
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] transition-all duration-200 active:scale-95 ${
                              isSel
                                ? `bg-white border-[#00DC7D] shadow-sm scale-105 ${moodObj.color.split(' ')[0]} font-extrabold`
                                : 'bg-white border-[#EEF0EF] hover:bg-gray-50 text-[#A3A7A8]'
                            }`}
                            title={moodObj.key}
                          >
                            <FontAwesomeIcon icon={moodObj.icon} className={`h-3.5 w-3.5 ${isSel ? '' : 'text-gray-400'}`} />
                            <span>{moodObj.key}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedImageIndex !== null && isImageGalleryOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setIsImageGalleryOpen(false);
                    setSelectedImageIndex(null);
                  }
                }}
              >
                <button
                  onClick={() => {
                    setIsImageGalleryOpen(false);
                    setSelectedImageIndex(null);
                  }}
                  className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
                </button>

                {entryMedia.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImageIndex(prev => prev !== null ? (prev - 1 + entryMedia.length) % entryMedia.length : 0);
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                    >
                      <FontAwesomeIcon icon={faArrowLeft} className="w-6 h-6" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImageIndex(prev => prev !== null ? (prev + 1) % entryMedia.length : 0);
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                    >
                      <FontAwesomeIcon icon={faArrowRight} className="w-6 h-6" />
                    </button>
                  </>
                )}

                <div className="relative max-w-full max-h-full p-4 animate-in zoom-in-95 duration-300">
                  {entryMedia[selectedImageIndex]?.type === 'image' && (
                    <img
                      src={entryMedia[selectedImageIndex].publicUrl}
                      alt="fullscreen"
                      className="max-h-[85vh] w-auto max-w-full rounded-lg object-contain"
                      style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
                    />
                  )}
                </div>

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const toDelete = selectedImageIndex;
                      if (entryMedia.length <= 1) {
                        setIsImageGalleryOpen(false);
                        setSelectedImageIndex(null);
                        handleRemoveEntryMedia(entryMedia[0].id);
                      } else {
                        handleRemoveEntryMedia(entryMedia[toDelete].id);
                        setSelectedImageIndex(prev => prev !== null ? Math.min(prev, entryMedia.length - 2) : null);
                      }
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-red-500/50"
                    title="delete photo"
                  >
                    <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium text-white/70">
                    {selectedImageIndex + 1} / {entryMedia.length}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-4">
          {currentEntry?.dream && !isEditingDream ? (
            <div className="flex items-start gap-2 group cursor-text" onClick={() => {
              setDreamDraft(currentEntry.dream);
              setIsEditingDream(true);
              setTimeout(() => dreamInputRef.current?.focus(), 0);
            }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#C8F7E4' }}>
                <FontAwesomeIcon icon={faMoon} className="w-3.5 h-3.5" style={{ color: '#00875A' }} />
              </div>
              <p className="text-[#65796E] italic flex-1 pt-0.5">{currentEntry.dream}</p>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#C8F7E4' }}>
                <FontAwesomeIcon icon={faMoon} className="w-3.5 h-3.5" style={{ color: '#00875A' }} />
              </div>
              <input
                ref={dreamInputRef}
                type="text"
                value={dreamDraft}
                onChange={(e) => {
                  isUserTypingRef.current = true;
                  setDreamDraft(e.target.value);
                }}
                onKeyDown={handleDreamKeyDown}
                onBlur={() => handleAddDream()}
                placeholder="what did you dream about?"
                className="w-full bg-transparent text-[#65796E] placeholder-[#A3A7A8] italic focus:outline-none transition-colors"
              />
            </div>
          )}
        </div>

        <div>
          {sortBullets(currentEntry?.bullets || []).map((bullet) => (
            <BulletItem
              key={bullet.id}
              bullet={bullet}
              onToggleComplete={() => toggleBulletComplete(bullet.id)}
              onDelete={() => deleteBullet(bullet.id)}
              onUpdateText={(id, text) => updateBullet(id, { text })}
              onUpdateStyle={(id, style) => updateBullet(id, { style })}
            />
          ))}

          {/* Linked Notes Row (Small icons below) */}
          {notes.filter(n => (n.linkedJournalDate === currentDate || n.linkedDate === currentDate) && n.status !== 'archived' && n.status !== 'deleted').length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2 mb-4">
              {notes
                .filter(n => (n.linkedJournalDate === currentDate || n.linkedDate === currentDate) && n.status !== 'archived' && n.status !== 'deleted')
                .map((note) => (
                  <button
                    key={note.id}
                    onClick={() => router.push(`/notes/new?id=${note.id}`)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#C8F7E4]/40 border border-[#00DC7D]/20 px-2.5 py-1 text-xs font-semibold text-[#00875A] transition-all hover:bg-[#C8F7E4]/60 active:scale-95 cursor-pointer"
                    title={note.title || 'Untitled note'}
                  >
                    <FontAwesomeIcon icon={faBook} className="w-3.5 h-3.5 text-[#00875A]" />
                    <span>{note.title || 'Untitled Note'}</span>
                  </button>
                ))}
            </div>
          )}

          <div className="flex items-start gap-3 py-3">
            <BulletStyleToggle
              style={bulletStyle}
              onToggle={() => setBulletStyle(current => {
                if (current === 'bullet') return 'star';
                if (current === 'star') return 'checklist';
                return 'bullet';
              })}
            />
            <div className="flex-1">
              <MentionTextarea
                value={bulletInput}
                onChange={(v) => {
                  isUserTypingRef.current = true;
                  setBulletInput(v);
                }}
                onKeyDown={handleBulletKeyDown}
                onEnter={() => handleAddBullet()}
                placeholder="drop your thoughts here.. no cap!"
                rows={1}
                className="w-full bg-transparent text-[#2F3331] placeholder-[#A3A7A8] focus:outline-none resize-none overflow-hidden"
                style={{ minHeight: '28px', height: 'auto' }}
              />
            </div>
          </div>

          {/* AI Suggested Tags */}
          {bulletInput.trim().length > 3 && (
            <div className="mt-2 mb-4">
              <SuggestedTagChips
                content={bulletInput}
                userId={userProfile?.uid || ''}
                onAcceptTag={(tag) => setBulletInput(prev => prev.trim() ? `${prev.trim()} #${tag}` : `#${tag}`)}
                onAcceptPerson={(person) => setBulletInput(prev => prev.trim() ? `${prev.trim()} @${person}` : `@${person}`)}
                existingTags={currentEntry?.bullets.flatMap(b => b.tags) || []}
                existingPeople={currentEntry?.bullets.flatMap(b => b.mentions) || []}
              />
            </div>
          )}

          {entryMedia.length > 0 && (
            <div className="mt-4 border-t border-dashed border-[#CCD0CF] pt-4">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {entryMedia.map((media, index) => (
                  <div
                    key={media.id}
                    className="relative shrink-0 overflow-hidden rounded-lg bg-[#F2F2F3] transition-transform group"
                    style={{ width: entryMedia.length === 1 ? 200 : entryMedia.length <= 2 ? 160 : 120, height: entryMedia.length === 1 ? 150 : 90 }}
                  >
                    <div className="w-full h-full cursor-pointer active:scale-95" onClick={() => {
                      setSelectedImageIndex(index);
                      setIsImageGalleryOpen(true);
                    }}>
                      {media.type === 'image' ? (
                        <img src={media.publicUrl} alt="journal image" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[#E8E9EA]">
                          <FontAwesomeIcon icon={faImage} className="w-6 h-6 text-[#6F7476]" />
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteImageId(media.id);
                      }}
                      className="absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/80 z-10"
                      title="delete photo"
                    >
                      <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-1 text-xs text-[#A3A7A8]">{entryMedia.length} {entryMedia.length === 1 ? 'photo' : 'photos'}</p>
            </div>
          )}

          {/* Daily Insight Section */}
          <div className="mt-8 border-t border-[#EEF0EF] pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faSun} className="h-4 w-4 text-[#00DC7D]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6F7476] font-mono">Daily Insight</h4>
              </div>
              
              <button
                onClick={handleGenerateDailyInsight}
                disabled={isGeneratingDailyInsight || (!currentEntry?.dream && (!currentEntry?.bullets || currentEntry.bullets.length === 0))}
                className="inline-flex items-center gap-1.5 rounded-xl text-white bg-gradient-to-r from-[#8B00D4] via-[#6F42C1] to-[#00DC7D] px-3.5 py-1.5 text-xs font-bold shadow-[0_0_12px_rgba(139,0,212,0.25)] hover:shadow-[0_0_18px_rgba(139,0,212,0.45)] hover:scale-103 active:scale-97 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isGeneratingDailyInsight ? (
                  <FontAwesomeIcon icon={faSpinner} className="h-3 w-3 animate-spin text-white" />
                ) : (
                  <AISparklesIcon className="h-3.5 w-3.5 text-white" />
                )}
                {currentEntry?.dailyInsight ? 'Analyze Again' : 'Analyze Day'}
              </button>
            </div>

            {dailyInsightError && (
              <p className="text-xs font-medium text-[#FF453A]">{dailyInsightError}</p>
            )}

            {isGeneratingDailyInsight && (
              <div className="rounded-2xl border border-[#EEF0EF] bg-[#FAFAFA] p-8 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="relative mb-4 flex h-14 w-14 items-center justify-center">
                  <span className="absolute h-full w-full rounded-full border-2 border-[#00DC7D]/10" />
                  <span className="absolute h-full w-full animate-spin rounded-full border-2 border-t-[#00DC7D] border-r-transparent border-b-transparent border-l-transparent" />
                  <div className="h-2.5 w-2.5 animate-ping rounded-full bg-[#00DC7D] opacity-75" />
                </div>
                <h4 className="font-serif text-sm font-bold text-[#2F3331]">Recalling your day's vibes...</h4>
                <p className="mt-1 text-xs text-[#A3A7A8] font-mono animate-pulse">Analyzing your energy, weather, and reflections...</p>
              </div>
            )}

            {!isGeneratingDailyInsight && currentEntry?.dailyInsight && (
              <div className="rounded-2xl border border-[#EEF0EF] bg-[#FAFAFA] p-5 space-y-3 shadow-sm transition-all hover:shadow-md animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-[#EEF0EF] pb-2 text-xs">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="flex items-center gap-1 rounded-full bg-pink-50 px-2 py-0.5 font-bold uppercase tracking-wider text-pink-700">
                      Mood: {currentEntry.dailyInsight.moodScore || 7}/10
                    </span>
                    <span className={`rounded-full px-2 py-0.5 font-bold uppercase tracking-wider ${
                      currentEntry.dailyInsight.sentiment === 'positive'
                        ? 'bg-green-50 text-green-700'
                        : currentEntry.dailyInsight.sentiment === 'negative'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {currentEntry.dailyInsight.sentiment}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#A3A7A8] font-mono">
                    Updated: {new Date(currentEntry.dailyInsight.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                <p className="font-serif text-sm font-light leading-relaxed text-[#2F3331] italic">
                  " {currentEntry.dailyInsight.text} "
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteImageId !== null}
        onClose={() => setDeleteImageId(null)}
        onConfirm={() => {
          if (deleteImageId) handleRemoveEntryMedia(deleteImageId);
        }}
        title="Delete Image"
        message="Are you sure you want to delete this image? This action cannot be undone."
      />

      {showStreakModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowStreakModal(false);
          }}
        >
          <div className="relative w-full max-w-[360px] rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              onClick={() => setShowStreakModal(false)}
              className="absolute right-4 top-4 text-[#A3A7A8] hover:text-[#2F3331] transition-colors p-1.5 rounded-full hover:bg-[#F2F2F3]"
            >
              <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
            </button>

            {/* Content */}
            <div className="flex flex-col items-center text-center">
              {/* Flame Avatar */}
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF4E6] border border-[#FFE4B5] text-[#FF9933] shadow-inner relative">
                <FontAwesomeIcon icon={faFire} className="w-8 h-8 animate-bounce mt-1" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00DC7D] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-[#00DC7D] border-2 border-white"></span>
                </span>
              </div>

              <h3 className="text-2xl font-black text-[#2F3331] font-sans tracking-tight mb-1">
                {currentStreak} Day Streak!
              </h3>
              <p className="text-xs text-[#6F7476] font-light leading-relaxed max-w-[260px] mb-6">
                {currentStreak >= 3 
                  ? "You are absolutely glowing! Keep logging daily to protect your flame. 🔥" 
                  : "Every spark counts. Write a bullet note daily to keep the fire going! 🌱"}
              </p>

              {/* RPG Level Card */}
              <div className="w-full bg-[#FAFAFA] rounded-2xl p-4 border border-[#E4E7E6] text-left mb-6 relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-20 h-20 rounded-full bg-[#E9FFF4]/40 blur-2xl" />
                <div className="flex items-center gap-3 relative z-10">
                  <div className="text-xl">🏆</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="font-bold text-sm text-[#2F3331] font-sans">
                        Level {gamificationData.level}
                      </span>
                      <span className="text-[9px] font-bold text-[#00A963] uppercase tracking-wider bg-[#E9FFF4] px-1.5 py-0.5 rounded">
                        {gamificationData.levelTitle.split(' ').slice(1).join(' ')}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#6F7476] mt-0.5">
                      {gamificationData.progressXP} / {gamificationData.levelCapacity} XP to Level {gamificationData.level + 1}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 relative z-10 h-2 w-full bg-[#EEF0EF] rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#00DC7D] to-[#00B866] transition-all duration-500 shadow-sm"
                    style={{ width: `${gamificationData.progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Extra Stats badges */}
              <div className="grid grid-cols-2 gap-2 w-full mb-6">
                <div className="bg-[#FAFAFA] rounded-xl p-3 border border-[#E4E7E6]">
                  <div className="text-lg font-bold text-[#2F3331]">{longestStreak} days</div>
                  <div className="text-[9px] text-[#A3A7A8] uppercase tracking-wider font-semibold">Longest Streak</div>
                </div>
                <div className="bg-[#FAFAFA] rounded-xl p-3 border border-[#E4E7E6]">
                  <div className="text-lg font-bold text-[#2F3331]">{gamificationData.totalXP}</div>
                  <div className="text-[9px] text-[#A3A7A8] uppercase tracking-wider font-semibold">Total XP</div>
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={() => setShowStreakModal(false)}
                className="w-full rounded-xl bg-[#2F3331] py-3 text-sm font-bold text-white transition-colors hover:bg-black shadow-md shadow-black/10"
              >
                Awesome, Keep Writing
              </button>
            </div>
          </div>
        </div>
      )}
      {showConfetti && (
        <canvas
          ref={canvasRef}
          className="fixed inset-0 z-[100] pointer-events-none w-full h-full"
        />
      )}
    </div>
  );
}

export default function WritePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-[#151719] flex flex-col items-center justify-center transition-colors duration-300">
        <div className="relative mb-6 flex h-16 w-16 items-center justify-center">
          <span className="absolute h-full w-full rounded-full border-2 border-[#00DC7D]/10" />
          <span className="absolute h-full w-full animate-spin rounded-full border-2 border-t-[#00DC7D] border-r-transparent border-b-transparent border-l-transparent" />
          <div className="h-3 w-3 animate-ping rounded-full bg-[#00DC7D] opacity-75" />
        </div>
        <h3 className="font-serif text-base font-bold text-[#2F3331] dark:text-[#FAFAFA]">Loading Editor</h3>
        <p className="mt-1 text-xs text-[#A3A7A8] dark:text-[#6F7476] font-mono animate-pulse">Prepping your workspace...</p>
      </div>
    }>
      <WritePageContent />
    </Suspense>
  );
}
