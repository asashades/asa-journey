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
  faBolt,
} from '@fortawesome/free-solid-svg-icons';
import { WisdomType } from '@/types';
import { HighlightedText } from '@/components/ui/HighlightedText';

type TargetType = 'journal' | 'wisdom' | 'idea' | 'note';
type FormatType = 'bullet' | 'checklist' | 'star';

export default function QuickEntrySpotlight() {
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
  const [isTargetMenuOpen, setIsTargetMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [textareaHeight, setTextareaHeight] = useState(36);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const targetMenuRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleScrollSync = () => {
    if (inputRef.current && overlayRef.current) {
      overlayRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  };

  // Adjust textarea height on input change
  useEffect(() => {
    if (!isSpotlightOpen) {
      setTextareaHeight(36);
      return;
    }
    // When there's no text, force single-line height (no scrollHeight measurement)
    if (!inputText) {
      setTextareaHeight(36);
      if (inputRef.current) {
        inputRef.current.style.height = '36px';
      }
      return;
    }
    const el = inputRef.current;
    if (el) {
      // Temporarily collapse to 1px to get true content scrollHeight
      el.style.height = '1px';
      const sh = el.scrollHeight;
      // Only expand if content actually overflows single line
      const newHeight = sh > 40 ? Math.min(120, sh) : 36;
      setTextareaHeight(newHeight);
      el.style.height = `${newHeight}px`;
    }
  }, [inputText, isSpotlightOpen]);

  const cycleFormat = () => {
    setFormat((prev) => {
      if (prev === 'bullet') return 'checklist';
      if (prev === 'checklist') return 'star';
      return 'bullet';
    });
  };

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
      setIsTargetMenuOpen(false);
    }
  }, [isSpotlightOpen]);

  // Click outside to close menus
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
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
  }, [isTargetMenuOpen]);

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
            <span className="hidden md:inline">Wisdom</span>
          </>
        );
      case 'idea':
        return (
          <>
            <FontAwesomeIcon icon={faLightbulb} className="text-amber-500 w-3.5 h-3.5" />
            <span className="hidden md:inline">Ideas</span>
          </>
        );
      case 'note':
        return (
          <>
            <FontAwesomeIcon icon={faNoteSticky} className="text-blue-500 w-3.5 h-3.5" />
            <span className="hidden md:inline">Note</span>
          </>
        );
      default:
        return (
          <>
            <FontAwesomeIcon icon={faBook} className="text-emerald-500 w-3.5 h-3.5" />
            <span className="hidden md:inline">Journal</span>
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

  const handleFormClick = (e: React.MouseEvent) => {
    if (!isSpotlightOpen) {
      e.preventDefault();
      setIsSpotlightOpen(true);
    }
  };

  const getContainerHeight = () => {
    if (!isSpotlightOpen) return 56; // 14 * 4px = 56px (w-14 h-14)
    
    let baseHeight = 56;
    if (target === 'wisdom') {
      if (wisdomType === 'thought') {
        baseHeight = 96;
      } else if (wisdomType === 'excerpt') {
        baseHeight = 212;
      } else {
        baseHeight = 162;
      }
    }
    
    const extraHeight = Math.max(0, textareaHeight - 36);
    return baseHeight + extraHeight;
  };

  let morphClasses = '';
  if (!isSpotlightOpen) {
    morphClasses = 'absolute bottom-20 left-[calc(100%-72px)] md:bottom-0 md:left-[calc(50%-320px)] w-14 h-14 rounded-full shadow-md bg-white/95 dark:bg-neutral-900/95 border border-[#E4E7E6] dark:border-neutral-800 transition-all duration-500 ease-out pointer-events-auto cursor-pointer hover:scale-105 active:scale-95 group z-50 flex items-center justify-center overflow-hidden';
  } else {
    let paddingAndGapClass = 'gap-2';
    let borderClass = 'rounded-full';
    if (target === 'wisdom') {
      borderClass = 'rounded-3xl';
      if (wisdomType === 'thought') {
        paddingAndGapClass = 'py-3 gap-3';
      } else if (wisdomType === 'excerpt') {
        paddingAndGapClass = 'py-3.5 gap-3';
      } else {
        paddingAndGapClass = 'py-3.5 gap-3';
      }
    }
    morphClasses = `absolute bottom-0 left-4 md:left-[calc(50%-275px)] w-[calc(100%-2rem)] md:w-[550px] ${borderClass} ${paddingAndGapClass} shadow-2xl bg-white/95 dark:bg-neutral-900/95 border border-[#E4E7E6] dark:border-neutral-800 transition-all duration-500 ease-out pointer-events-auto z-50 flex flex-col px-4 justify-center focus-within:border-emerald-500/50 dark:focus-within:border-emerald-500/30 focus-within:shadow-[0_20px_50px_rgba(16,185,129,0.1)] overflow-visible`;
  }

  return (
    <>
      {/* Toast Notification */}
      <div
        className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-neutral-900/90 dark:bg-white/95 text-white dark:text-neutral-900 text-xs font-semibold rounded-full shadow-lg border border-neutral-800 dark:border-neutral-200 transition-all duration-300 transform pointer-events-auto ${
          toastMessage ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95 pointer-events-none'
        }`}
      >
        {toastMessage}
      </div>

      <form
        onSubmit={handleSubmit}
        onClick={handleFormClick}
        className={morphClasses}
        style={{ height: `${getContainerHeight()}px` }}
      >
        {/* Close Button (X) - Floating outside/above the pill on the top right */}
        {isSpotlightOpen && (
          <button
            type="button"
            onClick={() => setIsSpotlightOpen(false)}
            className="absolute -top-7 right-2 w-6 h-6 rounded-full bg-white/90 dark:bg-neutral-900/90 border border-[#E4E7E6] dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-all cursor-pointer z-50 shadow-md active:scale-95"
            aria-label="Close spotlight"
          >
            <FontAwesomeIcon icon={faXmark} className="w-3 h-3" />
          </button>
        )}
        {/* Closed state: Circular Floating Capture Button content */}
        <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-300 ${
          isSpotlightOpen ? 'opacity-0 pointer-events-none scale-75' : 'opacity-100 scale-100'
        }`}>
          <FontAwesomeIcon icon={faBolt} className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
          <span className="text-[8px] font-semibold max-h-0 opacity-0 overflow-hidden transition-all duration-300 ease-in-out group-hover:max-h-8 group-hover:opacity-100 group-hover:mt-0.5 text-neutral-500 dark:text-neutral-400">
            Capture
          </span>
        </div>

        {/* Open state: Form contents (delayed fade-in) */}
        <div className={`w-full flex flex-col transition-all duration-500 ${
          isSpotlightOpen ? 'opacity-100 scale-100 delay-200 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
        }`}>
          {/* Top Row: Input and controls */}
          <div className="flex items-center w-full gap-2 flex-shrink-0">
            {/* Format Selector (Left Group) */}
            <div className="relative flex-shrink-0">
              {target === 'journal' ? (
                <button
                  type="button"
                  onClick={cycleFormat}
                  disabled={!isSpotlightOpen}
                  tabIndex={isSpotlightOpen ? 0 : -1}
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-600 dark:text-neutral-400 active:scale-95 duration-200"
                  title={`Current Format: ${format.toUpperCase()}. Click to change.`}
                >
                  {getFormatIcon(format)}
                </button>
              ) : (
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-300 dark:text-neutral-700 opacity-60">
                  <FontAwesomeIcon icon={faCircle} className="w-2.5 h-2.5" />
                </div>
              )}
            </div>

            {/* Input Box (Center) */}
            <div className="relative flex-1 h-full flex items-center min-w-0">
              {isSpotlightOpen && inputText && target === 'journal' && format === 'checklist' && (
                <div
                  ref={overlayRef}
                  className="pointer-events-none absolute left-0 right-0 top-0 bottom-0 py-2 text-sm md:text-base overflow-hidden whitespace-pre-wrap break-words text-neutral-800 dark:text-neutral-100 font-sans select-none"
                  style={{ height: `${textareaHeight}px` }}
                >
                  <HighlightedText text={inputText} variant="editor" />
                </div>
              )}
              <textarea
                ref={inputRef}
                rows={1}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  setTimeout(handleScrollSync, 0);
                }}
                onScroll={handleScrollSync}
                onKeyUp={handleScrollSync}
                onKeyDown={handleScrollSync}
                onSelect={handleScrollSync}
                placeholder={getPlaceholder()}
                disabled={!isSpotlightOpen}
                tabIndex={isSpotlightOpen ? 0 : -1}
                className={`w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-sm md:text-base placeholder-neutral-400 dark:placeholder-neutral-600 py-2 resize-none overflow-hidden caret-[#2F3331] dark:caret-[#FAFAFA] ${
                  isSpotlightOpen && inputText && target === 'journal' && format === 'checklist'
                    ? 'text-transparent'
                    : 'text-neutral-800 dark:text-neutral-100'
                }`}
                style={{ height: `${textareaHeight}px`, boxShadow: 'none' }}
              />
            </div>

            {/* Target Selector (Right Group) */}
            <div className="relative flex-shrink-0" ref={targetMenuRef}>
              <button
                type="button"
                onClick={() => setIsTargetMenuOpen(!isTargetMenuOpen)}
                disabled={!isSpotlightOpen}
                tabIndex={isSpotlightOpen ? 0 : -1}
                className={`h-9 px-2 md:px-3.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 md:gap-1.5 active:scale-95 cursor-pointer ${getTargetBtnClasses(target)}`}
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
                    disabled={!isSpotlightOpen}
                    tabIndex={isSpotlightOpen ? 0 : -1}
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
                    disabled={!isSpotlightOpen}
                    tabIndex={isSpotlightOpen ? 0 : -1}
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
                    disabled={!isSpotlightOpen}
                    tabIndex={isSpotlightOpen ? 0 : -1}
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
                  disabled={!isSpotlightOpen}
                  tabIndex={isSpotlightOpen ? 0 : -1}
                  className="w-full bg-neutral-50/50 dark:bg-neutral-800/20 border border-[#E4E7E6] rounded-xl px-3.5 py-1.5 text-xs text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 outline-none focus:border-purple-500/50 dark:focus:border-purple-500/30"
                />
              )}
              {(wisdomType === 'fact' || wisdomType === 'excerpt') && (
                <input
                  type="text"
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder="Source..."
                  disabled={!isSpotlightOpen}
                  tabIndex={isSpotlightOpen ? 0 : -1}
                  className="w-full bg-neutral-50/50 dark:bg-neutral-800/20 border border-[#E4E7E6] rounded-xl px-3.5 py-1.5 text-xs text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 outline-none focus:border-purple-500/50 dark:focus:border-purple-500/30"
                />
              )}
              {wisdomType === 'lesson' && (
                <input
                  type="text"
                  value={contextText}
                  onChange={(e) => setContextText(e.target.value)}
                  placeholder="Context..."
                  disabled={!isSpotlightOpen}
                  tabIndex={isSpotlightOpen ? 0 : -1}
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
                  disabled={!isSpotlightOpen}
                  tabIndex={isSpotlightOpen ? 0 : -1}
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
        </div>
      </form>
    </>
  );
}
