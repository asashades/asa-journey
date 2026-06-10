'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBolt,
  faLightbulb,
  faBookOpen,
  faBookmark,
  faInfoCircle,
  faExclamationTriangle,
  faQuoteLeft,
  faTree,
  faChevronDown,
  faChevronUp
} from '@fortawesome/free-solid-svg-icons';

interface MarkdownRendererProps {
  content: string;
  onContentChange?: (newContent: string) => void;
}

// Helper to recursively get plain text from React nodes
function getChildrenText(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(getChildrenText).join('');
  if (node.props && node.props.children) return getChildrenText(node.props.children);
  return '';
}

// Helper to check and strip callout tags
interface ParsedCallout {
  isCallout: boolean;
  type?: 'wisdom' | 'idea' | 'lesson' | 'fact' | 'excerpt' | 'note' | 'warning' | 'quote';
  title?: string;
  isFoldable?: boolean;
  defaultOpen?: boolean;
  cleanChildren: React.ReactNode;
}

// Regex to match callout tags with optional fold marker (+/-) and custom title
const CALLOUT_TAG_REGEX = /^\[!(NOTE|WISDOM|IDEA|LESSON|FACT|EXCERPT|WARNING|CAUTION|THOUGHT|QUOTE)\](\+|-)?[ \t]*(.*)/i;
const NOTE_CLEAN_REGEX = /^\[!NOTE\](\+|-)?[ \t]*[^\n]*/i;
const NON_NOTE_CLEAN_REGEX = /^\[!(WISDOM|IDEA|LESSON|FACT|EXCERPT|WARNING|CAUTION|THOUGHT|QUOTE)\](\+|-)?[ \t]*/i;

function parseCallout(children: React.ReactNode): ParsedCallout {
  const text = getChildrenText(children).trim();
  const match = text.match(CALLOUT_TAG_REGEX);

  if (!match) {
    return { isCallout: false, cleanChildren: children };
  }

  const matchedTag = match[1].toUpperCase();
  const foldMarker = match[2]; // '+' or '-' or undefined
  const customTitleText = match[3]?.trim(); // Custom title text after the tag

  let type: ParsedCallout['type'] = 'note';
  let title = 'Note';

  if (matchedTag === 'WISDOM' || matchedTag === 'THOUGHT') {
    type = 'wisdom';
    title = 'Thought';
  } else if (matchedTag === 'QUOTE') {
    type = 'quote';
    title = 'Quote';
  } else if (matchedTag === 'IDEA') {
    type = 'idea';
    title = 'Idea';
  } else if (matchedTag === 'LESSON') {
    type = 'lesson';
    title = 'Lesson Learned';
  } else if (matchedTag === 'FACT') {
    type = 'fact';
    title = 'Fact';
  } else if (matchedTag === 'EXCERPT') {
    type = 'excerpt';
    title = 'Excerpt';
  } else if (matchedTag === 'WARNING' || matchedTag === 'CAUTION') {
    type = 'warning';
    title = 'Warning';
  }

  // Override default title with custom title if provided, ONLY for [!NOTE]
  if (matchedTag === 'NOTE' && customTitleText) {
    title = customTitleText;
  }

  const isFoldable = foldMarker === '+' || foldMarker === '-';
  const defaultOpen = foldMarker !== '-'; // '+' or no marker = open

  // Select appropriate clean regex based on whether it is a NOTE callout
  const isNote = matchedTag === 'NOTE';
  const cleanRegex = isNote ? NOTE_CLEAN_REGEX : NON_NOTE_CLEAN_REGEX;

  // Clean the children using the selected clean regex
  const cleanChildren = React.Children.map(children, (child: any) => {
    if (!child) return null;
    if (typeof child === 'string') {
      return child.replace(cleanRegex, '').trim();
    }
    if (child.props && typeof child.props.children === 'string') {
      const cleaned = child.props.children.replace(cleanRegex, '').trim();
      return React.cloneElement(child, {}, cleaned);
    }
    if (child.props && child.props.children) {
      return React.cloneElement(child, {}, cleanChildrenText(child.props.children, cleanRegex));
    }
    return child;
  });

  return { isCallout: true, type, title, isFoldable, defaultOpen, cleanChildren };
}

function cleanChildrenText(node: any, cleanRegex: RegExp): any {
  if (typeof node === 'string') {
    return node.replace(cleanRegex, '').trim();
  }
  if (Array.isArray(node)) {
    return node.map((n, i) => i === 0 ? cleanChildrenText(n, cleanRegex) : n);
  }
  if (node && node.props && node.props.children) {
    return React.cloneElement(node, {}, cleanChildrenText(node.props.children, cleanRegex));
  }
  return node;
}

// Helper function to scan React children and style metadata lines as muted
function processCalloutNode(node: React.ReactNode): React.ReactNode {
  if (!node) return node;

  if (typeof node === 'string') {
    const lines = node.split('\n');
    if (lines.length <= 1) {
      const trimmed = node.trim();
      if (trimmed.toLowerCase().startsWith('context :') || trimmed.toLowerCase().startsWith('context:')) {
        return (
          <span className="block mt-1 text-[10px] text-[#A3A7A8] font-sans italic leading-normal select-text">
            {node}
          </span>
        );
      }
      if (trimmed.toLowerCase().startsWith('source :') || trimmed.toLowerCase().startsWith('source:')) {
        return (
          <span className="block mt-1 text-[10px] text-[#A3A7A8] font-sans italic leading-normal select-text">
            {node}
          </span>
        );
      }
      if (trimmed.startsWith('--') || trimmed.startsWith('---')) {
        return (
          <span className="block mt-1 text-[10px] text-[#A3A7A8] font-light leading-normal select-text">
            {node}
          </span>
        );
      }
      return node;
    }

    return (
      <>
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (trimmed.toLowerCase().startsWith('context :') || trimmed.toLowerCase().startsWith('context:')) {
            return (
              <span key={idx} className="block mt-1 text-[10px] text-[#A3A7A8] font-sans italic leading-normal select-text">
                {line}
              </span>
            );
          }
          if (trimmed.toLowerCase().startsWith('source :') || trimmed.toLowerCase().startsWith('source:')) {
            return (
              <span key={idx} className="block mt-1 text-[10px] text-[#A3A7A8] font-sans italic leading-normal select-text">
                {line}
              </span>
            );
          }
          if (trimmed.startsWith('--') || trimmed.startsWith('---')) {
            return (
              <span key={idx} className="block mt-1 text-[10px] text-[#A3A7A8] font-light leading-normal select-text">
                {line}
              </span>
            );
          }
          return (
            <span key={idx} className="block leading-relaxed">
              {line}
            </span>
          );
        })}
      </>
    );
  }

  if (Array.isArray(node)) {
    return React.Children.map(node, (child) => processCalloutNode(child));
  }

  if (React.isValidElement(node)) {
    const element = node as React.ReactElement<any>;
    if (element.props && element.props.children) {
      return React.cloneElement(
        element,
        element.props,
        processCalloutNode(element.props.children)
      );
    }
  }

  return node;
}

// Foldable callout component with expand/collapse toggle
function FoldableCallout({ type, colorClasses, title, defaultOpen, children }: {
  type: string;
  colorClasses: { headerBg: string; bodyBg: string; border: string; dashBorder: string; text: string; icon: any };
  title: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`my-5 border rounded-2xl overflow-hidden ${colorClasses.border} callout-block`} data-callout-type={type}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-2 px-4 py-2.5 ${colorClasses.headerBg} cursor-pointer select-none transition-colors callout-header`}
        type="button"
      >
        <FontAwesomeIcon icon={colorClasses.icon} className={`h-4 w-4 ${colorClasses.text}`} />
        <span className={`text-xs font-black uppercase tracking-wider leading-none ${colorClasses.text} flex-1 text-left`}>
          {title}
        </span>
        <FontAwesomeIcon
          icon={isOpen ? faChevronUp : faChevronDown}
          className={`h-3 w-3 ${colorClasses.text} transition-transform duration-200`}
        />
      </button>
      <div className={`border-t border-dashed ${colorClasses.dashBorder} callout-divider`} />
      {isOpen && (
        <div className={`px-4 py-3.5 ${colorClasses.bodyBg} animate-in fade-in slide-in-from-top-1 duration-150 callout-body`}>
          <div className="text-sm text-[#2F3331] dark:text-[#E4E7E6] font-normal leading-relaxed">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

function toggleMarkdownChecklist(content: string, itemText: string, currentChecked: boolean): string {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(\s*(?:[-*+]|\d+\.)\s+\[([ xX])\]\s+)(.*)$/);
    if (match) {
      const prefix = match[1];
      const text = match[3].trim();
      if (text === itemText || stripMarkdown(text) === stripMarkdown(itemText)) {
        const newCheck = currentChecked ? ' ' : 'x';
        const newPrefix = prefix.replace(/\[[ xX]\]/, `[${newCheck}]`);
        lines[i] = newPrefix + match[3];
        break;
      }
    }
  }
  return lines.join('\n');
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~`]/g, '')
    .trim();
}

export default function MarkdownRenderer({ content, onContentChange }: MarkdownRendererProps) {
  const contentRef = useRef(content);
  const onContentChangeRef = useRef(onContentChange);

  useEffect(() => {
    contentRef.current = content;
    onContentChangeRef.current = onContentChange;
  });

  const markdownComponents = useMemo(() => ({
    // Custom Blockquote / Callout Renderer
    blockquote: ({ children }: any) => {
      const { isCallout, type, title, isFoldable, defaultOpen, cleanChildren } = parseCallout(children);

      if (!isCallout) {
        return (
          <blockquote className="relative border-l-4 border-[#00DC7D] bg-[#FAFAFA] dark:bg-[#161B19]/40 pl-6 pr-4 py-4 my-6 rounded-r-2xl text-[#2F3331] dark:text-[#E4E7E6] italic font-serif leading-relaxed">
            <FontAwesomeIcon icon={faQuoteLeft} className="absolute left-2.5 top-3.5 text-xs text-[#00DC7D]/25 dark:text-[#00DC7D]/10 shrink-0" />
            {children}
          </blockquote>
        );
      }

      // Callout styling based on type — colors match wisdomTypeMeta
      let colorClasses = {
        headerBg: 'bg-[#00875A]/15 dark:bg-[#00DC7D]/10',
        bodyBg: 'bg-[#00875A]/5 dark:bg-[#00DC7D]/3',
        border: 'border-[#00875A]/20 dark:border-[#00DC7D]/15',
        dashBorder: 'border-[#00875A]/20 dark:border-[#00DC7D]/15',
        text: 'text-[#00875A] dark:text-[#00DC7D]',
        icon: faInfoCircle
      };

      if (type === 'wisdom') {
        colorClasses = {
          headerBg: 'bg-[#8B00D4]/15 dark:bg-[#C494FF]/10',
          bodyBg: 'bg-[#8B00D4]/5 dark:bg-[#C494FF]/3',
          border: 'border-[#8B00D4]/20 dark:border-[#C494FF]/15',
          dashBorder: 'border-[#8B00D4]/25 dark:border-[#C494FF]/20',
          text: 'text-[#8B00D4] dark:text-[#C494FF]',
          icon: faBolt
        };
      } else if (type === 'quote') {
        colorClasses = {
          headerBg: 'bg-[#1A56C4]/15 dark:bg-[#5D8AFF]/10',
          bodyBg: 'bg-[#1A56C4]/5 dark:bg-[#5D8AFF]/3',
          border: 'border-[#1A56C4]/20 dark:border-[#5D8AFF]/15',
          dashBorder: 'border-[#1A56C4]/25 dark:border-[#5D8AFF]/20',
          text: 'text-[#1A56C4] dark:text-[#5D8AFF]',
          icon: faQuoteLeft
        };
      } else if (type === 'idea') {
        colorClasses = {
          headerBg: 'bg-[#B45309]/15 dark:bg-[#FF9933]/10',
          bodyBg: 'bg-[#B45309]/5 dark:bg-[#FF9933]/3',
          border: 'border-[#B45309]/20 dark:border-[#FF9933]/15',
          dashBorder: 'border-[#B45309]/25 dark:border-[#FF9933]/20',
          text: 'text-[#B45309] dark:text-[#FF9933]',
          icon: faLightbulb
        };
      } else if (type === 'lesson') {
        colorClasses = {
          headerBg: 'bg-[#6B21A8]/15 dark:bg-[#C494FF]/10',
          bodyBg: 'bg-[#6B21A8]/5 dark:bg-[#C494FF]/3',
          border: 'border-[#6B21A8]/20 dark:border-[#C494FF]/15',
          dashBorder: 'border-[#6B21A8]/25 dark:border-[#C494FF]/20',
          text: 'text-[#6B21A8] dark:text-[#C494FF]',
          icon: faBookOpen
        };
      } else if (type === 'fact') {
        colorClasses = {
          headerBg: 'bg-[#00875A]/15 dark:bg-[#00DC7D]/10',
          bodyBg: 'bg-[#00875A]/5 dark:bg-[#00DC7D]/3',
          border: 'border-[#00875A]/20 dark:border-[#00DC7D]/15',
          dashBorder: 'border-[#00875A]/25 dark:border-[#00DC7D]/20',
          text: 'text-[#00875A] dark:text-[#00DC7D]',
          icon: faInfoCircle
        };
      } else if (type === 'excerpt') {
        colorClasses = {
          headerBg: 'bg-[#B45309]/15 dark:bg-[#FF9933]/10',
          bodyBg: 'bg-[#B45309]/5 dark:bg-[#FF9933]/3',
          border: 'border-[#B45309]/20 dark:border-[#FF9933]/15',
          dashBorder: 'border-[#B45309]/25 dark:border-[#FF9933]/20',
          text: 'text-[#B45309] dark:text-[#FF9933]',
          icon: faBookmark
        };
      } else if (type === 'warning') {
        colorClasses = {
          headerBg: 'bg-[#991B1B]/15 dark:bg-[#FF453A]/10',
          bodyBg: 'bg-[#991B1B]/5 dark:bg-[#FF453A]/3',
          border: 'border-[#991B1B]/20 dark:border-[#FF453A]/15',
          dashBorder: 'border-[#991B1B]/25 dark:border-[#FF453A]/20',
          text: 'text-[#991B1B] dark:text-[#FF453A]',
          icon: faExclamationTriangle
        };
      }

      // Foldable callout — uses stateful FoldableCallout component
      if (isFoldable) {
        return (
          <FoldableCallout
            type={type || 'note'}
            colorClasses={colorClasses}
            title={title || 'Note'}
            defaultOpen={defaultOpen ?? true}
          >
            {processCalloutNode(cleanChildren)}
          </FoldableCallout>
        );
      }

      // Standard (non-foldable) callout card
      return (
        <div className={`my-5 border rounded-2xl overflow-hidden ${colorClasses.border} callout-block`} data-callout-type={type}>
          {/* Header: darker bg with icon + title */}
          <div className={`flex items-center gap-2 px-4 py-2.5 ${colorClasses.headerBg} callout-header`}>
            <FontAwesomeIcon icon={colorClasses.icon} className={`h-4 w-4 ${colorClasses.text}`} />
            <span className={`text-xs font-black uppercase tracking-wider leading-none ${colorClasses.text}`}>
              {title}
            </span>
          </div>
          {/* Dashed separator */}
          <div className={`border-t border-dashed ${colorClasses.dashBorder} callout-divider`} />
          {/* Body: lighter bg with content */}
          <div className={`px-4 py-3.5 ${colorClasses.bodyBg} callout-body`}>
            <div className="text-sm text-[#2F3331] dark:text-[#E4E7E6] font-normal leading-relaxed">
              {processCalloutNode(cleanChildren)}
            </div>
          </div>
        </div>
      );
    },

    // Customize standard markdown styles to fit the active theme
    h1: ({ children }: any) => <h1 className="text-2xl font-bold font-sans text-[#2F3331] dark:text-[#E4E7E6] mt-6 mb-3 leading-snug">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-xl font-bold font-sans text-[#2F3331] dark:text-[#E4E7E6] mt-5 mb-2.5 leading-snug">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-lg font-bold font-sans text-[#2F3331] dark:text-[#E4E7E6] mt-4 mb-2 leading-snug">{children}</h3>,
    p: ({ children }: any) => <p className="text-sm text-[#2F3331] dark:text-[#E4E7E6] font-normal leading-relaxed mb-4">{children}</p>,
    ul: ({ children }: any) => <ul className="list-disc pl-5 mb-4 text-sm text-[#2F3331] dark:text-[#E4E7E6] font-normal space-y-1.5">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal pl-5 mb-4 text-sm text-[#2F3331] dark:text-[#E4E7E6] font-normal space-y-1.5">{children}</ol>,
    li: ({ children, checked, ...props }: any) => {
      const childrenArray = React.Children.toArray(children);
      const checkboxChild: any = childrenArray.find(
        (child: any) => child && child.type === 'input' && child.props && child.props.type === 'checkbox'
      );

      if (checkboxChild || typeof checked === 'boolean') {
        const isChecked = checkboxChild ? !!checkboxChild.props.checked : !!checked;
        const text = getChildrenText(children).trim();
        const cleanChildren = childrenArray.filter(
          (child: any) => !(child && child.type === 'input' && child.props && child.props.type === 'checkbox')
        );

        return (
          <li className="list-none flex items-start gap-2.5 my-1.5 leading-relaxed font-normal">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => {
                const onContentChangeFn = onContentChangeRef.current;
                const contentVal = contentRef.current;
                if (onContentChangeFn) {
                  const newContent = toggleMarkdownChecklist(contentVal, text, isChecked);
                  onContentChangeFn(newContent);
                }
              }}
              disabled={!onContentChangeRef.current}
              className="mt-1 h-4 w-4 rounded border-[#CCD0CF] text-[#00DC7D] focus:ring-[#00DC7D] dark:border-[#2E3832] dark:bg-[#111412] dark:focus:ring-offset-[#0F1210] cursor-pointer accent-[#00DC7D] shrink-0"
            />
            <span className={isChecked ? 'line-through text-[#A3A7A8] select-text' : 'select-text'}>
              {cleanChildren}
            </span>
          </li>
        );
      }
      return <li className="leading-relaxed font-normal">{children}</li>;
    },
    a: ({ href, children }: any) => (
      <a href={href} target="_blank" rel="noreferrer" className="text-[#00DC7D] hover:underline font-semibold transition-all">
        {children}
      </a>
    ),
    code: ({ children }: any) => (
      <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800/60 text-red-600 dark:text-[#FF8CC6] px-1.5 py-0.5 rounded border border-black/5 dark:border-white/5">
        {children}
      </code>
    ),
    pre: ({ children }: any) => (
      <pre className="overflow-x-auto bg-gray-50 dark:bg-[#161B19]/50 border border-[#EEF0EF] dark:border-[#2E3832]/30 p-4 rounded-xl text-xs font-mono text-[#2F3331] dark:text-[#E4E7E6] mb-4 scrollbar-thin">
        {children}
      </pre>
    ),
    table: ({ children }: any) => (
      <div className="overflow-x-auto mb-6 rounded-xl border border-[#EEF0EF] dark:border-[#2E3832]/30">
        <table className="min-w-full divide-y divide-[#EEF0EF] dark:divide-[#2E3832]/30 text-left text-sm font-light">
          {children}
        </table>
      </div>
    ),
    th: ({ children }: any) => (
      <th className="bg-gray-50 dark:bg-[#161B19] px-4 py-2.5 font-semibold text-[#2F3331] dark:text-[#E4E7E6]">
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="border-t border-[#EEF0EF] dark:border-[#2E3832]/30 px-4 py-2.5 text-[#2F3331] dark:text-[#E4E7E6] font-normal">
        {children}
      </td>
    ),
  }), []);

  return (
    <div className="asa-markdown-content prose dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
