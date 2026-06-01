'use client';

import { Fragment, MouseEvent, ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';

type HighlightVariant = 'display' | 'editor';

// Tag metadata for do-more / do-less coloring
export type TagDoMoreLess = 'more' | 'less' | null;
export type TagMetaMap = Record<string, TagDoMoreLess>; // key = tag name (lowercase, no #)

interface HighlightedTextProps {
  text: string;
  variant?: HighlightVariant;
  interactive?: boolean;
  onTokenRemove?: (start: number, end: number) => void;
  /** Optional map of tag name → doMoreLess value for inline coloring */
  tagMeta?: TagMetaMap;
}

type TextSegment =
  | { type: 'text'; text: string }
  | { type: 'token'; text: string; start: number; end: number }
  | { type: 'nlp'; text: string; start: number; end: number };

const tokenRegex = /[@#][A-Za-z0-9_][A-Za-z0-9_-]*/g;

/** Returns the class for a token in the default (no doMoreLess) state */
const getDefaultTokenClassName = (token: string, variant: HighlightVariant) => {
  const isMention = token.startsWith('@');

  if (variant === 'editor') {
    return isMention
      ? 'relative inline-flex items-center rounded-[3px] bg-[#FFEEAA]/80 text-[#8A5A00]'
      : 'relative inline-flex items-center rounded-[3px] bg-[#EAD8FF]/80 text-[#7A2EB8]';
  }

  return isMention
    ? 'relative inline-flex items-center rounded px-1 py-0.5 font-medium bg-[#FFEEAA] text-[#8A5A00]'
    : 'relative inline-flex items-center rounded px-1 py-0.5 font-medium bg-[#EAD8FF] text-[#7A2EB8]';
};

/** Returns class for #tag tokens with doMoreLess overrides */
const getTagTokenClassName = (doMoreLess: TagDoMoreLess, variant: HighlightVariant) => {
  if (doMoreLess === 'more') {
    return variant === 'editor'
      ? 'relative inline-flex items-center rounded-[3px] bg-[#D4F8E8]/80 text-[#00875A] font-semibold'
      : 'relative inline-flex items-center rounded px-1 py-0.5 font-bold bg-[#E9FFF4] border border-[#00DC7D]/25 text-[#00875A]';
  }
  if (doMoreLess === 'less') {
    return variant === 'editor'
      ? 'relative inline-flex items-center rounded-[3px] bg-[#FFE8E8]/80 text-[#FF453A] font-semibold'
      : 'relative inline-flex items-center rounded px-1 py-0.5 font-bold bg-[#FFF0F0] border border-[#FF453A]/25 text-[#FF453A]';
  }
  return null; // fallback to default
};

const getTokenHref = (token: string) => {
  const name = encodeURIComponent(token.slice(1).toLowerCase());
  return token.startsWith('@')
    ? `/people/${name}`
    : `/tags/${name}`;
};

const getSegments = (text: string): TextSegment[] => {
  const matches: { type: 'token' | 'nlp'; text: string; start: number; end: number }[] = [];

  // Find tag / mention matches
  for (const match of text.matchAll(tokenRegex)) {
    const start = match.index ?? 0;
    matches.push({
      type: 'token',
      text: match[0],
      start,
      end: start + match[0].length
    });
  }

  // Find NLP matches (tomorrow, today, days from now, time expressions including dots & 24h formats)
  const nlpRegex = /\b(?:tomorrow|today|\d+\s+days?\s+from\s+now)\b|\b(?:at\s+)?(?:[0-1]?\d|2[0-3])[.:]\d{2}\s*(?:am|pm)?\b|\b(?:at\s+)?\d{1,2}(?:[.:]\d{2})?\s*(am|pm)\b|\bat\s+\d{1,2}\b/gi;
  for (const match of text.matchAll(nlpRegex)) {
    const start = match.index ?? 0;
    matches.push({
      type: 'nlp',
      text: match[0],
      start,
      end: start + match[0].length
    });
  }

  // Sort by start index
  matches.sort((a, b) => a.start - b.start);

  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const match of matches) {
    // Avoid overlap (e.g. if one matched token overlaps with another)
    if (match.start < lastIndex) continue;

    if (match.start > lastIndex) {
      segments.push({ type: 'text', text: text.slice(lastIndex, match.start) });
    }

    segments.push(match);
    lastIndex = match.end;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return segments;
};

function TokenChip({
  token,
  start,
  end,
  variant,
  interactive,
  onTokenRemove,
  doMoreLess,
}: {
  token: string;
  start: number;
  end: number;
  variant: HighlightVariant;
  interactive?: boolean;
  onTokenRemove?: (start: number, end: number) => void;
  doMoreLess?: TagDoMoreLess;
}) {
  const router = useRouter();
  const [isArmed, setIsArmed] = useState(false);
  const canRemove = Boolean(onTokenRemove);
  const isTag = token.startsWith('#');

  // Resolve class: doMoreLess override takes precedence for #tags
  const tagClass = isTag && doMoreLess ? getTagTokenClassName(doMoreLess, variant) : null;
  const className = tagClass ?? getDefaultTokenClassName(token, variant);

  const handleClick = (event: MouseEvent<HTMLSpanElement>) => {
    if (!interactive) return;

    event.preventDefault();
    event.stopPropagation();

    const isCoarsePointer = typeof window !== 'undefined'
      && window.matchMedia('(pointer: coarse)').matches;

    if (canRemove && isCoarsePointer && !isArmed) {
      setIsArmed(true);
      return;
    }

    router.push(getTokenHref(token));
  };

  const handleRemove = (event: MouseEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onTokenRemove?.(start, end);
  };

  return (
    <span
      className={`${className} ${interactive ? 'pointer-events-auto cursor-pointer hover:brightness-95' : ''}`}
      onClick={handleClick}
      role={interactive ? 'link' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      {token}
      {/* Inline arrow indicator for do-more / do-less */}
      {isTag && doMoreLess === 'more' && variant !== 'editor' && (
        <span className="ml-0.5 text-[10px] font-black leading-none align-middle">↑</span>
      )}
      {isTag && doMoreLess === 'less' && variant !== 'editor' && (
        <span className="ml-0.5 text-[10px] font-black leading-none align-middle">↓</span>
      )}
      {canRemove && isArmed && (
        <span
          className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/80 text-[10px] font-bold leading-none text-[#6F7476]"
          onClick={handleRemove}
          role="button"
          aria-label={`remove ${token}`}
        >
          x
        </span>
      )}
    </span>
  );
}

export const renderHighlightedText = (
  text: string,
  variant: HighlightVariant = 'display',
  options: Pick<HighlightedTextProps, 'interactive' | 'onTokenRemove' | 'tagMeta'> = {}
): ReactNode[] => {
  const segments = getSegments(text);

  return segments.map((segment, index) => {
    if (!segment.text) return null;

    if (segment.type === 'token') {
      const isTag = segment.text.startsWith('#');
      const tagName = segment.text.slice(1).toLowerCase();
      const doMoreLess = isTag && options.tagMeta ? (options.tagMeta[tagName] ?? null) : null;

      return (
        <TokenChip
          key={`${segment.text}-${segment.start}-${index}`}
          token={segment.text}
          start={segment.start}
          end={segment.end}
          variant={variant}
          interactive={options.interactive}
          onTokenRemove={options.onTokenRemove}
          doMoreLess={doMoreLess}
        />
      );
    }

    if (segment.type === 'nlp') {
      const className = variant === 'editor'
        ? 'relative inline-flex items-center rounded-[3px] bg-[#E9FFF4] border border-[#00DC7D]/30 shadow-[0_0_6px_rgba(0,220,125,0.2)] text-[#00875A] font-semibold px-0.5'
        : 'relative inline-flex items-center rounded px-1 py-0.5 font-medium bg-[#E9FFF4] border border-[#00DC7D]/25 text-[#00875A]';

      return (
        <span
          key={`nlp-${segment.text}-${segment.start}-${index}`}
          className={className}
        >
          {segment.text}
        </span>
      );
    }

    return <Fragment key={`${segment.text}-${index}`}>{segment.text}</Fragment>;
  });
};

export function HighlightedText({ text, variant = 'display', interactive, onTokenRemove, tagMeta }: HighlightedTextProps) {
  return <>{renderHighlightedText(text, variant, { interactive, onTokenRemove, tagMeta })}</>;
}
