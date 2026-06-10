'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faXmark, 
  faWandMagicSparkles, 
  faChevronRight, 
  faBrain, 
  faListCheck 
} from '@fortawesome/free-solid-svg-icons';
import MarkdownRenderer from './MarkdownRenderer';

interface AIPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (finalRefinedText: string) => void;
  originalText: string;
  refinedText: string;
  action: 'beautify' | 'summarize' | 'wisdom';
}

export default function AIPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  originalText,
  refinedText,
  action
}: AIPreviewModalProps) {
  // For summarize & wisdom, default to refined-only since original text isn't modified
  const isAppendOnly = action === 'summarize' || action === 'wisdom';
  const [activeTab, setActiveTab] = useState<'comparison' | 'refined'>(isAppendOnly ? 'refined' : 'comparison');

  // Parse Wisdom Blocks
  const wisdomBlocks = useMemo(() => {
    if (action !== 'wisdom') return [];
    const generatedPart = getGeneratedOnly(refinedText, originalText, 'wisdom');
    return parseWisdomBlocks(generatedPart);
  }, [refinedText, originalText, action]);

  // Parse Summarize Parts
  const { summaryBlock, actionItems } = useMemo(() => {
    if (action !== 'summarize') return { summaryBlock: '', actionItems: [] };
    
    const normRefined = refinedText.replace(/\r\n/g, '\n').trim();
    const normOriginal = originalText.replace(/\r\n/g, '\n').trim();
    const originalIndex = normRefined.indexOf(normOriginal);
    
    let summaryPart = '';
    let actionItemsPart = '';
    
    if (originalIndex !== -1) {
      summaryPart = normRefined.slice(0, originalIndex).trim();
      actionItemsPart = normRefined.slice(originalIndex + normOriginal.length).trim();
    } else {
      // Fallback
      if (normRefined.startsWith('>')) {
        const lines = normRefined.split('\n');
        const summaryLines = [];
        for (const line of lines) {
          if (line.trim().startsWith('>')) {
            summaryLines.push(line);
          } else if (line.trim() !== '') {
            break;
          }
        }
        summaryPart = summaryLines.join('\n').trim();
      }
      const actionHeaderIndex = normRefined.indexOf('### Action Items');
      if (actionHeaderIndex !== -1) {
        actionItemsPart = normRefined.slice(actionHeaderIndex).trim();
      }
    }
    
    const items = parseActionItems(actionItemsPart);
    return { summaryBlock: summaryPart, actionItems: items };
  }, [refinedText, originalText, action]);

  // Selection states
  const [selectedWisdoms, setSelectedWisdoms] = useState<Record<number, boolean>>({});
  const [selectedTasks, setSelectedTasks] = useState<Record<number, boolean>>({});

  // Initialize all to true when parsed items change
  useEffect(() => {
    if (action === 'wisdom') {
      const initial: Record<number, boolean> = {};
      wisdomBlocks.forEach((_, idx) => {
        initial[idx] = true;
      });
      setSelectedWisdoms(initial);
    }
  }, [wisdomBlocks, action]);

  useEffect(() => {
    if (action === 'summarize') {
      const initial: Record<number, boolean> = {};
      actionItems.forEach((_, idx) => {
        initial[idx] = true;
      });
      setSelectedTasks(initial);
    }
  }, [actionItems, action]);

  const getFinalText = () => {
    if (action === 'beautify') {
      return refinedText;
    }
    
    if (action === 'wisdom') {
      const checkedWisdoms = wisdomBlocks.filter((_, idx) => selectedWisdoms[idx]);
      if (checkedWisdoms.length > 0) {
        let header = '### ✨ Extracted Wisdom';
        const normRefined = refinedText.replace(/\r\n/g, '\n').trim();
        const headerMatch = normRefined.match(/(###\s+✨?\s*Extracted Wisdom)/i);
        if (headerMatch) {
          header = headerMatch[1];
        }
        return `${originalText}\n\n---\n\n${header}\n\n${checkedWisdoms.map(w => w.raw).join('\n\n')}`;
      }
      return originalText;
    }
    
    if (action === 'summarize') {
      const checkedTasks = actionItems.filter((_, idx) => selectedTasks[idx]);
      
      const normRefined = refinedText.replace(/\r\n/g, '\n').trim();
      const normOriginal = originalText.replace(/\r\n/g, '\n').trim();
      const originalIndex = normRefined.indexOf(normOriginal);
      
      let summaryPart = '';
      let actionItemsHeader = '### Action Items';
      
      if (originalIndex !== -1) {
        summaryPart = normRefined.slice(0, originalIndex).trim();
        const actionItemsPart = normRefined.slice(originalIndex + normOriginal.length).trim();
        const headerMatch = actionItemsPart.match(/^(###\s+[^\n]+)/);
        if (headerMatch) {
          actionItemsHeader = headerMatch[1];
        }
      } else {
        if (normRefined.startsWith('>')) {
          const lines = normRefined.split('\n');
          const summaryLines = [];
          for (const line of lines) {
            if (line.trim().startsWith('>')) {
              summaryLines.push(line);
            } else if (line.trim() !== '') {
              break;
            }
          }
          summaryPart = summaryLines.join('\n').trim();
        }
        const headerMatch = normRefined.match(/(###\s+[^\n]+)/);
        if (headerMatch) {
          actionItemsHeader = headerMatch[1];
        }
      }
      
      let parts = [];
      if (summaryPart) {
        parts.push(summaryPart);
      }
      parts.push(originalText);
      if (checkedTasks.length > 0) {
        parts.push(actionItemsHeader + '\n' + checkedTasks.map(t => `- [ ] ${t.text}`).join('\n'));
      }
      return parts.join('\n\n');
    }
    
    return refinedText;
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Title and Description based on action
  let title = 'AI Refinement Preview';
  let description = 'Review the changes generated by Cosmic AI.';
  let actionIcon = faWandMagicSparkles;

  if (action === 'beautify') {
    title = '🪄 Beautify & Format Preview';
    description = 'Markdown formatting, structure fixes, and quotation callouts have been applied.';
  } else if (action === 'summarize') {
    title = '📝 Summarize & Tasks Preview';
    description = 'A summary header and checklist tasks have been generated.';
  } else if (action === 'wisdom') {
    title = '🧠 Extract Wisdom Preview';
    description = 'Lessons, ideas, facts, quotes, thoughts, and excerpts have been extracted and appended to your note.';
  }

  // Filter out original text from the preview content for summarize and wisdom to make it compact
  const displayContent = getGeneratedOnly(refinedText, originalText, action);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-5xl h-[85vh] rounded-3xl bg-white dark:bg-[#1E2321] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-[#EEF0EF] dark:border-[#2E3832]/30">
        
        {/* Header */}
        <div className="p-6 border-b border-[#EEF0EF] dark:border-[#2E3832]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400">
              <FontAwesomeIcon icon={actionIcon} className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-serif text-[#2F3331] dark:text-[#E4E7E6]">
                {title}
              </h3>
              <p className="text-xs text-[#6F7476] dark:text-[#A3A7A8] mt-0.5">
                {description}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-[#A3A7A8] hover:bg-[#F2F2F3] dark:hover:bg-[#2E3832]/30 hover:text-[#2F3331] dark:hover:text-[#E4E7E6] transition-all"
          >
            <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector — hidden for append-only actions (summarize/wisdom) since they only show output */}
        <div className="px-6 py-3 border-b border-[#EEF0EF] dark:border-[#2E3832]/20 bg-[#FAFAFA] dark:bg-[#191F1C]/40 flex items-center justify-between">
          <div className="flex gap-2">
            {!isAppendOnly && (
              <>
                <button
                  onClick={() => setActiveTab('comparison')}
                  className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                    activeTab === 'comparison'
                      ? 'bg-white dark:bg-[#2E3832] text-[#2F3331] dark:text-[#E4E7E6] shadow-sm'
                      : 'text-[#6F7476] hover:text-[#2F3331] dark:hover:text-[#E4E7E6]'
                  }`}
                >
                  Side-by-Side View
                </button>
                <button
                  onClick={() => setActiveTab('refined')}
                  className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                    activeTab === 'refined'
                      ? 'bg-white dark:bg-[#2E3832] text-[#2F3331] dark:text-[#E4E7E6] shadow-sm'
                      : 'text-[#6F7476] hover:text-[#2F3331] dark:hover:text-[#E4E7E6]'
                  }`}
                >
                  Refined Preview Only
                </button>
              </>
            )}
            {isAppendOnly && (
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#00DC7D] animate-pulse" />
                {action === 'summarize' ? 'Generated Summary & Tasks' : 'Extracted Wisdom Blocks'}
              </span>
            )}
          </div>
          <span className="text-2xs text-[#A3A7A8] uppercase tracking-wider font-mono hidden sm:inline">
            Press Esc to cancel
          </span>
        </div>

        {/* Content Pane */}
        <div className="flex-1 overflow-hidden flex flex-col p-6 bg-[#FAFAFA] dark:bg-[#1A201D]/20">
          {!isAppendOnly ? (
            activeTab === 'comparison' ? (
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-6">
                {/* Left Column: Original (Plain text) */}
                <div className="flex-1 flex flex-col bg-white dark:bg-[#1E2321] rounded-2xl border border-[#EEF0EF] dark:border-[#2E3832]/30 overflow-hidden shadow-sm">
                  <div className="px-4 py-3 bg-gray-50 dark:bg-[#1E2321] border-b border-[#EEF0EF] dark:border-[#2E3832]/30 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-gray-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-[#6F7476]">Original Text</span>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-[#2F3331] dark:text-[#E4E7E6] whitespace-pre-wrap select-text leading-relaxed">
                    {originalText}
                  </div>
                </div>

                {/* Arrow divider on Desktop */}
                <div className="hidden md:flex items-center justify-center text-[#CCD0CF] dark:text-[#2E3832]">
                  <FontAwesomeIcon icon={faChevronRight} className="w-5 h-5 animate-pulse" />
                </div>

                {/* Right Column: AI Refined (Markdown Rendered) */}
                <div className="flex-1 flex flex-col bg-white dark:bg-[#1E2321] rounded-2xl border border-purple-100 dark:border-purple-950/30 overflow-hidden shadow-sm">
                  <div className="px-4 py-3 bg-purple-50/40 dark:bg-purple-950/10 border-b border-purple-100 dark:border-purple-950/20 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#00DC7D]" />
                    <span className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">AI Refined Output</span>
                  </div>
                  <div className="flex-1 p-5 overflow-y-auto select-text">
                    <MarkdownRenderer content={displayContent} />
                  </div>
                </div>
              </div>
            ) : (
              // Full Width Mapped Output Preview
              <div className="flex-1 flex flex-col bg-white dark:bg-[#1E2321] rounded-2xl border border-purple-100 dark:border-purple-950/30 overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-purple-50/40 dark:bg-purple-950/10 border-b border-purple-100 dark:border-purple-950/20 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#00DC7D]" />
                  <span className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">Refined Output Preview</span>
                </div>
                <div className="flex-1 p-6 overflow-y-auto select-text">
                  <MarkdownRenderer content={displayContent} />
                </div>
              </div>
            )
          ) : (
            // Custom selection list with checkboxes for append-only actions (wisdom/summarize)
            <div className="flex-1 flex flex-col bg-white dark:bg-[#1E2321] rounded-2xl border border-purple-100 dark:border-purple-950/30 overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-purple-50/40 dark:bg-purple-950/10 border-b border-purple-100 dark:border-purple-950/20 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#00DC7D]" />
                <span className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  {action === 'wisdom' ? 'Select Wisdom Items to Append' : 'Select Action Items to Append'}
                </span>
              </div>
              <div className="flex-1 p-6 overflow-y-auto select-text">
                {action === 'wisdom' && (
                  <div className="flex flex-col gap-4">
                    {wisdomBlocks.map((block, idx) => (
                      <div 
                        key={idx} 
                        className={`flex items-start gap-4 p-4 bg-white dark:bg-[#1E2321] rounded-2xl border transition-all ${
                          selectedWisdoms[idx] 
                            ? 'border-purple-200 dark:border-purple-950 bg-purple-50/10 dark:bg-purple-950/5 shadow-sm' 
                            : 'border-[#EEF0EF]/80 dark:border-[#2E3832]/20 opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!selectedWisdoms[idx]}
                          onChange={() => {
                            setSelectedWisdoms(prev => ({
                              ...prev,
                              [idx]: !prev[idx]
                            }));
                          }}
                          className="mt-6 h-5 w-5 rounded-lg border-[#CCD0CF] text-[#00DC7D] focus:ring-[#00DC7D] dark:border-[#2E3832] dark:bg-[#111412] cursor-pointer accent-[#00DC7D]"
                        />
                        <div className="flex-1 min-w-0">
                          <MarkdownRenderer content={block.raw} />
                        </div>
                      </div>
                    ))}
                    {wisdomBlocks.length === 0 && (
                      <div className="text-center py-8 text-xs text-[#A3A7A8] italic">
                        No wisdom blocks extracted.
                      </div>
                    )}
                  </div>
                )}

                {action === 'summarize' && (
                  <div className="flex flex-col gap-6">
                    {summaryBlock && (
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-[#A3A7A8] mb-2 font-sans">
                          Note Summary
                        </div>
                        <MarkdownRenderer content={summaryBlock} />
                      </div>
                    )}
                    
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-[#A3A7A8] mb-3 font-sans">
                        Generated Action Items
                      </div>
                      <div className="flex flex-col gap-2.5">
                        {actionItems.map((item, idx) => (
                          <label 
                            key={idx}
                            className={`flex items-center gap-3 p-3.5 bg-white dark:bg-[#1E2321] rounded-xl border transition-all cursor-pointer select-none ${
                              selectedTasks[idx]
                                ? 'border-emerald-200 dark:border-emerald-950/30 bg-emerald-50/10 dark:bg-emerald-950/5 shadow-sm'
                                : 'border-[#EEF0EF]/80 dark:border-[#2E3832]/20 opacity-60'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={!!selectedTasks[idx]}
                              onChange={() => {
                                setSelectedTasks(prev => ({
                                  ...prev,
                                  [idx]: !prev[idx]
                                }));
                              }}
                              className="h-4.5 w-4.5 rounded border-[#CCD0CF] text-[#00DC7D] focus:ring-[#00DC7D] dark:border-[#2E3832] dark:bg-[#111412] accent-[#00DC7D]"
                            />
                            <span className={`text-sm text-[#2F3331] dark:text-[#E4E7E6] font-semibold ${selectedTasks[idx] ? '' : 'line-through text-[#A3A7A8] font-normal'}`}>
                              {item.text}
                            </span>
                          </label>
                        ))}
                        {actionItems.length === 0 && (
                          <div className="text-center py-4 text-xs text-[#A3A7A8] italic">
                            No action items generated.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-[#EEF0EF] dark:border-[#2E3832]/30 flex justify-end gap-3 bg-white dark:bg-[#1E2321]">
          <button
            onClick={onClose}
            className="rounded-xl border border-[#CCD0CF] dark:border-[#2E3832] px-6 py-2.5 text-sm font-bold text-[#2F3331] dark:text-[#E4E7E6] hover:bg-[#F2F2F3] dark:hover:bg-[#2E3832]/30 transition-all"
          >
            Discard Changes
          </button>
          <button
            onClick={() => {
              onConfirm(getFinalText());
              onClose();
            }}
            className="rounded-xl bg-[#00DC7D] hover:bg-[#00B866] px-6 py-2.5 text-sm font-bold text-white transition-all shadow-md active:scale-98"
          >
            Apply Changes
          </button>
        </div>

      </div>
    </div>
  );
}

function getGeneratedOnly(refined: string, original: string, action: 'beautify' | 'summarize' | 'wisdom'): string {
  if (action === 'beautify') return refined;

  const normRefined = refined.replace(/\r\n/g, '\n').trim();
  const normOriginal = original.replace(/\r\n/g, '\n').trim();

  // Try exact match first
  const originalIndex = normRefined.indexOf(normOriginal);

  if (action === 'wisdom') {
    if (originalIndex !== -1) {
      const afterOriginal = normRefined.slice(originalIndex + normOriginal.length).trim();
      // Remove horizontal divider if present
      if (afterOriginal.startsWith('---')) {
        return afterOriginal.slice(3).trim();
      }
      return afterOriginal;
    }
    // Fallback: look for the header
    const wisdomHeaderIndex = normRefined.indexOf('### ✨ Extracted Wisdom');
    if (wisdomHeaderIndex !== -1) {
      return normRefined.slice(wisdomHeaderIndex).trim();
    }
    const legacyWisdomHeaderIndex = normRefined.indexOf('### Extracted Wisdom');
    if (legacyWisdomHeaderIndex !== -1) {
      return normRefined.slice(legacyWisdomHeaderIndex).trim();
    }
    const dividerIndex = normRefined.lastIndexOf('---');
    if (dividerIndex !== -1) {
      return normRefined.slice(dividerIndex + 3).trim();
    }
    return refined;
  }

  if (action === 'summarize') {
    if (originalIndex !== -1) {
      const summaryPart = normRefined.slice(0, originalIndex).trim();
      const actionItemsPart = normRefined.slice(originalIndex + normOriginal.length).trim();
      return `${summaryPart}\n\n${actionItemsPart}`.trim();
    }
    // Fallback: look for action items header and summary callout
    const actionHeaderIndex = normRefined.indexOf('### Action Items');
    let summaryPart = '';
    let actionPart = '';
    
    if (actionHeaderIndex !== -1) {
      actionPart = normRefined.slice(actionHeaderIndex).trim();
    }
    // Summary is usually at the top in a callout
    if (normRefined.startsWith('>')) {
      const lines = normRefined.split('\n');
      const summaryLines = [];
      for (const line of lines) {
        if (line.trim().startsWith('>')) {
          summaryLines.push(line);
        } else if (line.trim() !== '') {
          break;
        }
      }
      summaryPart = summaryLines.join('\n').trim();
    }
    if (summaryPart || actionPart) {
      return `${summaryPart}\n\n${actionPart}`.trim();
    }
    return refined;
  }

  return refined;
}

function parseActionItems(text: string): { raw: string; text: string }[] {
  const lines = text.split('\n');
  const items: { raw: string; text: string }[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^[-*+]\s*\[([ xX])\]\s*(.*)$/);
    if (match) {
      items.push({
        raw: line,
        text: match[2].trim()
      });
    }
  }
  return items;
}

function parseWisdomBlocks(text: string): { type: string; raw: string }[] {
  const lines = text.split('\n');
  const blocks: { type: string; raw: string }[] = [];
  let currentBlock: string[] = [];
  let currentType = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.trim().match(/^>\s*\[!(WISDOM|THOUGHT|IDEA|LESSON|FACT|EXCERPT|QUOTE)\]/i);
    
    if (match) {
      if (currentBlock.length > 0) {
        blocks.push({ type: currentType, raw: currentBlock.join('\n') });
        currentBlock = [];
      }
      currentType = match[1].toLowerCase();
      currentBlock.push(line);
    } else if (line.trim().startsWith('>')) {
      if (currentBlock.length > 0) {
        currentBlock.push(line);
      }
    } else {
      if (currentBlock.length > 0) {
        blocks.push({ type: currentType, raw: currentBlock.join('\n') });
        currentBlock = [];
        currentType = '';
      }
    }
  }
  
  if (currentBlock.length > 0) {
    blocks.push({ type: currentType, raw: currentBlock.join('\n') });
  }

  return blocks;
}

