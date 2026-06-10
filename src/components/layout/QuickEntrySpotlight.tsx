'use client';

import { useState, useEffect, useRef } from 'react';
import { useData } from '@/contexts/DataContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXmark,
  faCircle,
  faCheckSquare,
  faStar,
  faBook,
  faWandMagicSparkles,
  faLightbulb,
  faNoteSticky,
  faChevronUp,
} from '@fortawesome/free-solid-svg-icons';
import { WisdomType } from '@/types';

type TargetType = 'journal' | 'wisdom' | 'idea' | 'note';
type FormatType = 'bullet' | 'checklist' | 'star';

export default function QuickEntrySpotlight({ className = '' }: { className?: string }) {
  const {
    isSpotlightOpen,
    setIsSpotlightOpen,
    addQuickJournalBullet,
    addWisdom,
    addIdea,
    addNote,
  } = useData();

  const [inputText, setInputText] = useState('');
  const [authorText, setAuthorText] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [contextText, setContextText] = useState('');
  const [target, setTarget] = useState<TargetType>('journal');
  const [format, setFormat] = useState<FormatType>('bullet');
  const [wisdomType, setWisdomType] = useState<WisdomType>('thought');
  const [isFormatMenuOpen, setIsFormatMenuOpen] = useState(false);
  const [isTargetMenuOpen, setIsTargetMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const formatMenuRef = useRef<HTMLDivElement>(null);
  const targetMenuRef = useRef<HTMLDivElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isSpotlightOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setInputText('');
      setAuthorText('');
      setSourceText('');
      setContextText('');
      setIsFormatMenuOpen(false);
      setIsTargetMenuOpen(false);
    }
  }, [isSpotlightOpen]);

  // Click outside to close menus
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isFormatMenuOpen &&
        formatMenuRef.current &&
        !formatMenuRef.current.contains(event.target as Node)
      ) {
        setIsFormatMenuOpen(false);
      }
      if (
        isTargetMenuOpen &&
        targetMenuRef.current &&
        !targetMenuRef.current.contains(event.target as Node)
      ) {
        setIsTargetMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFormatMenuOpen, isTargetMenuOpen]);

  if (!isSpotlightOpen) return null;

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      if (target === 'journal') {
        const style = format === 'checklist' ? 'checklist' : 'bullet';
        const isHighlight = format === 'star';
        await addQuickJournalBullet(inputText.trim(), style, isHighlight);
        showToast("Saved to Today's Journal! 📔");
      } else if (target === 'wisdom') {
        let finalContent = inputText.trim();
        if (wisdomType === 'quote') {
          const author = authorText.trim();
          finalContent = finalContent + (author ? `\n\n-- ${author}` : '');
        } else if (wisdomType === 'fact') {
          const source = sourceText.trim();
          finalContent = finalContent + (source ? `\n\nsource : ${source}` : '');
        } else if (wisdomType === 'excerpt') {
          const author = authorText.trim();
          const source = sourceText.trim();
          const metaParts = [];
          if (author) metaParts.push(`-- ${author}`);
          if (source) metaParts.push(`source : ${source}`);
          finalContent = finalContent + (metaParts.length > 0 ? `\n\n${metaParts.join('\n')}` : '');
        } else if (wisdomType === 'lesson') {
          const context = contextText.trim();
          finalContent = finalContent + (context ? `\n\ncontext : ${context}` : '');
        }
        await addWisdom(wisdomType, finalContent);
        showToast('Saved to Wisdoms! 🧠');
      } else if (target === 'idea') {
        await addIdea(inputText.trim());
        showToast('Saved to Ideas! 💡');
      } else if (target === 'note') {
        const titleText = inputText.trim().split('\n')[0];
        const title = titleText.substring(0, 40) + (titleText.length > 40 ? '...' : '');
        await addNote(title, inputText.trim());
        showToast('Saved to Notes! 📝');
      }
      setInputText('');
      setAuthorText('');
      setSourceText('');
      setContextText('');
    } catch (err) {
      console.error(err);
      showToast('Failed to save entry ❌');
    }
  };

  // Get current placeholder text
  const getPlaceholder = () => {
    if (target === 'wisdom') {
      if (wisdomType === 'thought') return 'Capture a thoughts...';
      if (wisdomType === 'lesson') return 'Enter lesson body...';
      if (wisdomType === 'fact') return 'Enter fact body...';
      if (wisdomType === 'excerpt') return 'Enter excerpt body...';
      if (wisdomType === 'quote') return 'Enter quote body...';
      return 'Capture a nugget of wisdom...';
    }
    if (target === 'idea') return 'Log a quick idea...';
    if (target === 'note') return 'Write a quick note...';
    
    // Journal placeholders
    if (format === 'checklist') return 'Add task to today\'s journal...';
    if (format === 'star') return 'Add high-priority highlight to today\'s journal...';
    return 'Add bullet to today\'s journal...';
  };

  // Icon mapping
  const getFormatIcon = (f: FormatType) => {
    switch (f) {
      case 'checklist':
        return <FontAwesomeIcon icon={faCheckSquare} className="text-emerald-500 w-4 h-4" />;
      case 'star':
        return <FontAwesomeIcon icon={faStar} className="text-amber-500 w-4 h-4" />;
      default:
        return <FontAwesomeIcon icon={faCircle} className="text-neutral-400 dark:text-neutral-500 w-3 h-3" />;
    }
  };

  const getTargetLabel = (t: TargetType) => {
    switch (t) {
      case 'wisdom':
        return (
          <>
            <FontAwesomeIcon icon={faWandMagicSparkles} className="text-purple-500 w-3.5 h-3.5" />
            <span>Wisdom</span>
          </>
        );
      case 'idea':
        return (
          <>
            <FontAwesomeIcon icon={faLightbulb} className="text-amber-500 w-3.5 h-3.5" />
            <span>Ideas</span>
          </>
        );
      case 'note':
        return (
          <>
            <FontAwesomeIcon icon={faNoteSticky} className="text-blue-500 w-3.5 h-3.5" />
            <span>Note</span>
          </>
        );
      default:
        return (
          <>
            <FontAwesomeIcon icon={faBook} className="text-emerald-500 w-3.5 h-3.5" />
            <span>Journal</span>
          </>
        );
    }
  };

  const getTargetBtnClasses = (t: TargetType) => {
    switch (t) {
      case 'wisdom':
        return 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40';
      case 'idea':
        return 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40';
      case 'note':
        return 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40';
      default:
        return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40';
    }
  };

  return (
    <div className={`fixed bottom-4 left-0 right-0 z-50 px-4 flex flex-col items-center pointer-events-none ${className}`}>
      
      {/* Toast Notification */}
      <div
        className={`mb-3 px-4 py-2 bg-neutral-900/90 dark:bg-white/95 text-white dark:text-neutral-900 text-xs font-semibold rounded-full shadow-lg border border-neutral-800 dark:border-neutral-200 transition-all duration-300 transform pointer-events-auto ${
          toastMessage ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95 pointer-events-none'
        }`}
      >
        {toastMessage}
      </div>

      {/* Main Spotlight Pill */}
      <div className="w-full max-w-[550px] pointer-events-auto">
        <form
          onSubmit={handleSubmit}
          className={`relative border border-[#E4E7E6] bg-white/95 backdrop-blur-lg shadow-2xl flex flex-col justify-center px-4 transition-all duration-500 ease-out focus-within:border-emerald-500/50 dark:focus-within:border-emerald-500/30 focus-within:shadow-[0_20px_50px_rgba(16,185,129,0.1)] ${
            target === 'wisdom' ? 'h-auto py-3.5 rounded-3xl gap-3' : 'h-14 rounded-full gap-2'
          }`}
        >
          {/* Top Row: Input and controls */}
          <div className="flex items-center w-full gap-2 h-14 flex-shrink-0">
            {/* Format Selector (Left Group) */}
            <div className="relative flex-shrink-0" ref={formatMenuRef}>
              {target === 'journal' ? (
                <button
                  type="button"
                  onClick={() => setIsFormatMenuOpen(!isFormatMenuOpen)}
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-600 dark:text-neutral-400"
                  title="Change Format"
                >
                  {getFormatIcon(format)}
                </button>
              ) : (
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-300 dark:text-neutral-700 opacity-60">
                  <FontAwesomeIcon icon={faCircle} className="w-2.5 h-2.5" />
                </div>
              )}

              {/* Format Floating Option Menu */}
              {isFormatMenuOpen && target === 'journal' && (
                <div className="absolute bottom-16 left-0 bg-white/95 dark:bg-neutral-900/95 border border-[#E4E7E6] rounded-2xl shadow-xl py-1.5 min-w-[140px] backdrop-blur-md animate-fade-in-up flex flex-col z-50">
                  <button
                    type="button"
                    onClick={() => {
                      setFormat('bullet');
                      setIsFormatMenuOpen(false);
                    }}
                    className={`flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left ${
                      format === 'bullet' ? 'text-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' : 'text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    <FontAwesomeIcon icon={faCircle} className="w-2.5 h-2.5" />
                    <span>Bullet •</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormat('checklist');
                      setIsFormatMenuOpen(false);
                    }}
                    className={`flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left ${
                      format === 'checklist' ? 'text-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' : 'text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    <FontAwesomeIcon icon={faCheckSquare} className="text-emerald-500 w-3.5 h-3.5" />
                    <span>Checklist [ ]</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormat('star');
                      setIsFormatMenuOpen(false);
                    }}
                    className={`flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left ${
                      format === 'star' ? 'text-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' : 'text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    <FontAwesomeIcon icon={faStar} className="text-amber-500 w-3.5 h-3.5" />
                    <span>Star ⭐</span>
                  </button>
                </div>
              )}
            </div>

            {/* Input Box (Center) */}
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={getPlaceholder()}
              className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-sm md:text-base text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 py-2 h-full"
              style={{ boxShadow: 'none' }}
            />

            {/* Target Selector (Right Group) */}
            <div className="relative flex-shrink-0" ref={targetMenuRef}>
              <button
                type="button"
                onClick={() => setIsTargetMenuOpen(!isTargetMenuOpen)}
                className={`h-9 px-3.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer ${getTargetBtnClasses(target)}`}
              >
                {getTargetLabel(target)}
                <FontAwesomeIcon icon={faChevronUp} className="w-2.5 h-2.5 opacity-60 ml-0.5" />
              </button>

              {/* Target Floating Option Menu */}
              {isTargetMenuOpen && (
                <div className="absolute bottom-16 right-0 bg-white/95 dark:bg-neutral-900/95 border border-[#E4E7E6] rounded-2xl shadow-xl py-1.5 min-w-[140px] backdrop-blur-md animate-fade-in-up flex flex-col z-50">
                  <button
                    type="button"
                    onClick={() => {
                      setTarget('journal');
                      setIsTargetMenuOpen(false);
                    }}
                    className={`flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left ${
                      target === 'journal' ? 'text-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' : 'text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    <FontAwesomeIcon icon={faBook} className="text-emerald-500 w-3.5 h-3.5" />
                    <span>Journal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTarget('wisdom');
                      setIsTargetMenuOpen(false);
                    }}
                    className={`flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left ${
                      target === 'wisdom' ? 'text-purple-500 bg-purple-50/50 dark:bg-purple-950/20' : 'text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    <FontAwesomeIcon icon={faWandMagicSparkles} className="text-purple-500 w-3.5 h-3.5" />
                    <span>Wisdom</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTarget('idea');
                      setIsTargetMenuOpen(false);
                    }}
                    className={`flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left ${
                      target === 'idea' ? 'text-amber-500 bg-amber-50/50 dark:bg-amber-950/20' : 'text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    <FontAwesomeIcon icon={faLightbulb} className="text-amber-500 w-3.5 h-3.5" />
                    <span>Ideas</span>
                  </button>
                </div>
              )}
            </div>

            {/* Far Right Divider */}
            <div className="w-[1px] h-6 bg-neutral-200 dark:bg-neutral-800 mx-1 flex-shrink-0" />

            {/* Close Button (X) */}
            <button
              type="button"
              onClick={() => setIsSpotlightOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer flex-shrink-0"
              aria-label="Close spotlight"
            >
              <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
            </button>
          </div>

          {/* Subtype fields for wisdom */}
          {target === 'wisdom' && wisdomType !== 'thought' && (
            <div className="flex flex-col gap-2 pb-2 w-full animate-fade-in flex-shrink-0">
              {(wisdomType === 'quote' || wisdomType === 'excerpt') && (
                <input
                  type="text"
                  value={authorText}
                  onChange={(e) => setAuthorText(e.target.value)}
                  placeholder="Author..."
                  className="w-full bg-neutral-50/50 dark:bg-neutral-800/20 border border-[#E4E7E6] rounded-xl px-3.5 py-1.5 text-xs text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 outline-none focus:border-purple-500/50 dark:focus:border-purple-500/30"
                />
              )}
              {(wisdomType === 'fact' || wisdomType === 'excerpt') && (
                <input
                  type="text"
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder="Source..."
                  className="w-full bg-neutral-50/50 dark:bg-neutral-800/20 border border-[#E4E7E6] rounded-xl px-3.5 py-1.5 text-xs text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 outline-none focus:border-purple-500/50 dark:focus:border-purple-500/30"
                />
              )}
              {wisdomType === 'lesson' && (
                <input
                  type="text"
                  value={contextText}
                  onChange={(e) => setContextText(e.target.value)}
                  placeholder="Context..."
                  className="w-full bg-neutral-50/50 dark:bg-neutral-800/20 border border-[#E4E7E6] rounded-xl px-3.5 py-1.5 text-xs text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 outline-none focus:border-purple-500/50 dark:focus:border-purple-500/30"
                />
              )}
            </div>
          )}

          {/* Bottom Row: Wisdom types (Only visible when target is wisdom) */}
          {target === 'wisdom' && (
            <div className="flex items-center gap-1.5 pb-3 pt-0.5 overflow-x-auto no-scrollbar animate-fade-in w-full border-t border-neutral-100 dark:border-neutral-800/40 flex-shrink-0">
              <span className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 mr-1 flex-shrink-0 tracking-wider">TYPE:</span>
              {(['thought', 'quote', 'fact', 'excerpt', 'lesson'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setWisdomType(t)}
                  className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold transition-all duration-200 cursor-pointer ${
                    wisdomType === t
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/45 dark:text-purple-300'
                      : 'bg-neutral-50 dark:bg-neutral-800 text-[#717675] dark:text-[#A3A7A8] hover:bg-neutral-100 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
