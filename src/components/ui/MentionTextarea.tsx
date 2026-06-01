'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { InlinePopup } from './InlinePopup';
import { HighlightedText } from './HighlightedText';

interface MentionTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
}

export function MentionTextarea({
  value,
  onChange,
  onEnter,
  onKeyDown: externalKeyDown,
  onScroll: externalOnScroll,
  className = '',
  style,
  ...restProps
}: MentionTextareaProps) {
  const { tags, people } = useData();
  const [popupState, setPopupState] = useState<{
    type: 'mention' | 'tag' | null;
    query: string;
    position: { top: number; left: number } | null;
    triggerIdx: number;
  }>({ type: null, query: '', position: null, triggerIdx: -1 });

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Auto-resize the textarea height to fit all content (no scroll)
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  // Re-run auto-resize when value changes from outside (e.g. cleared after submit)
  useEffect(() => {
    autoResize();
  }, [value, autoResize]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    autoResize();

    const cursor = e.target.selectionStart || 0;
    const textBeforeCursor = newValue.slice(0, cursor);
    const segments = textBeforeCursor.split(/\s/);
    const currentWord = segments[segments.length - 1];

    if (currentWord.startsWith('@')) {
      setPopupState({
        type: 'mention',
        query: currentWord.slice(1),
        position: { top: 32, left: 0 },
        triggerIdx: textBeforeCursor.lastIndexOf('@'),
      });
    } else if (currentWord.startsWith('#')) {
      setPopupState({
        type: 'tag',
        query: currentWord.slice(1),
        position: { top: 32, left: 0 },
        triggerIdx: textBeforeCursor.lastIndexOf('#'),
      });
    } else {
      setPopupState({ type: null, query: '', position: null, triggerIdx: -1 });
    }
  };

  const handleSelect = (selectedValue: string) => {
    if (popupState.triggerIdx === -1) return;

    const cursor = textareaRef.current?.selectionStart ?? value.length;
    const textBefore = value.slice(0, popupState.triggerIdx);
    const textAfter = value.slice(cursor);
    const prefix = popupState.type === 'tag' ? '#' : '@';
    const newValue = `${textBefore}${prefix}${selectedValue} ${textAfter}`;

    onChange(newValue);
    setPopupState({ type: null, query: '', position: null, triggerIdx: -1 });

    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If popup is open, intercept Enter/Escape/Tab to close popup ONLY
    if (popupState.type) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        setPopupState({ type: null, query: '', position: null, triggerIdx: -1 });
        return;
      }
    }

    // Call external onKeyDown (e.g. Tab to cycle bullet style)
    if (externalKeyDown) {
      externalKeyDown(e);
    }

    if (e.defaultPrevented) return;

    // Enter (no shift) = save/submit bullet
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (onEnter) {
        onEnter();
      }
      return;
    }
    // Shift+Enter = native newline (do nothing, let textarea handle it)
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.currentTarget.scrollTop;
      highlightRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
    externalOnScroll?.(e);
  };

  const handleTokenRemove = (start: number, end: number) => {
    const nextValue = `${value.slice(0, start)}${value.slice(end)}`.replace(/\s{2,}/g, ' ');
    onChange(nextValue);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const textareaStyle: React.CSSProperties = value
    ? {
        ...style,
        color: 'transparent',
        WebkitTextFillColor: 'transparent',
        caretColor: '#2F3331',
      }
    : (style || {});

  return (
    <div className="relative w-full" ref={containerRef}>
      {value && (
        <div
          ref={highlightRef}
          className={`pointer-events-none absolute inset-0 z-20 overflow-hidden whitespace-pre-wrap break-words ${className}`}
          style={style}
        >
          <HighlightedText
            text={value}
            variant="editor"
            interactive
            onTokenRemove={handleTokenRemove}
          />
          {value.endsWith('\n') ? ' ' : null}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        className={`relative z-10 ${className}`}
        style={textareaStyle}
        {...restProps}
      />

      {popupState.type && (
        <InlinePopup
          type={popupState.type}
          query={popupState.query}
          tags={tags}
          people={people}
          onSelect={handleSelect}
          onCreateNew={handleSelect}
          position={popupState.position}
        />
      )}
    </div>
  );
}
