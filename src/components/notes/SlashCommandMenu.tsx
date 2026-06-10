'use client';

import { useEffect, useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHeading,
  faListUl,
  faListOl,
  faTasks,
  faQuoteRight,
  faInfoCircle,
  faLightbulb,
  faBolt,
  faBookOpen,
  faBookmark,
  faCode,
  faMinus
} from '@fortawesome/free-solid-svg-icons';

interface SlashCommandMenuProps {
  onSelect: (markdown: string) => void;
  onClose: () => void;
  triggerQuery: string;
}

interface CommandItem {
  id: string;
  name: string;
  category: 'Basic' | 'Blocks' | 'ASA Journey';
  icon: any;
  template: string;
  description: string;
}

const commands: CommandItem[] = [
  { id: 'h1', name: 'Heading 1', category: 'Basic', icon: faHeading, template: '# ', description: 'Large section heading' },
  { id: 'h2', name: 'Heading 2', category: 'Basic', icon: faHeading, template: '## ', description: 'Medium section heading' },
  { id: 'h3', name: 'Heading 3', category: 'Basic', icon: faHeading, template: '### ', description: 'Small section heading' },
  { id: 'bullet', name: 'Bullet List', category: 'Basic', icon: faListUl, template: '- ', description: 'Simple bullet list' },
  { id: 'number', name: 'Numbered List', category: 'Basic', icon: faListOl, template: '1. ', description: 'Sequential list' },
  { id: 'todo', name: 'Checklist', category: 'Basic', icon: faTasks, template: '- [ ] ', description: 'Checkbox list for tasks' },
  
  { id: 'quote', name: 'Quote', category: 'Blocks', icon: faQuoteRight, template: '> ', description: 'Blockquote text' },
  { id: 'callout', name: 'Callout Box', category: 'Blocks', icon: faInfoCircle, template: '> [!NOTE]\n> ', description: 'Teal callout block' },
  { id: 'divider', name: 'Divider', category: 'Blocks', icon: faMinus, template: '\n---\n', description: 'Horizontal dividing line' },
  { id: 'code', name: 'Code Block', category: 'Blocks', icon: faCode, template: '\n```ts\n\n```\n', description: 'Syntax-highlighted code' },
  
  { id: 'thought', name: 'Thought Callout', category: 'ASA Journey', icon: faBolt, template: '> [!THOUGHT]\n> Tulis pikiran reflektif Anda di sini...\n', description: 'Extracts as a Thought wisdom' },
  { id: 'asa-quote', name: 'Quote Callout', category: 'ASA Journey', icon: faQuoteRight, template: '> [!QUOTE]\n> "Kutipan Anda..."\n> -- Penulis\n', description: 'Extracts as a Quote wisdom with author' },
  { id: 'idea', name: 'Idea Callout', category: 'ASA Journey', icon: faLightbulb, template: '> [!IDEA]\n> Tulis ide atau rencana aksi Anda di sini...\n', description: 'Extracts as separate Idea item' },
  { id: 'lesson', name: 'Lesson Callout', category: 'ASA Journey', icon: faBookOpen, template: '> [!LESSON]\n> Pelajaran penting yang dipelajari...\n> context: Konteks pelajaran\n', description: 'Extracts as Lesson learned' },
  { id: 'fact', name: 'Fact Callout', category: 'ASA Journey', icon: faInfoCircle, template: '> [!FACT]\n> Fakta menarik...\n> source: Sumber\n', description: 'Extracts as Fact snippet' },
  { id: 'excerpt', name: 'Excerpt Callout', category: 'ASA Journey', icon: faBookmark, template: '> [!EXCERPT]\n> "Kutipan teks..."\n> -- Penulis\n> source: Buku/Artikel\n', description: 'Extracts as book/article quote' }
];

export default function SlashCommandMenu({ onSelect, onClose, triggerQuery }: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter commands based on trigger query (e.g. typing "/h1" or "/wis")
  const filteredCommands = useMemo(() => {
    const q = triggerQuery.toLowerCase().trim();
    if (!q) return commands;
    return commands.filter(cmd => 
      cmd.name.toLowerCase().includes(q) || 
      cmd.category.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q)
    );
  }, [triggerQuery]);

  // Handle keyboard navigation inside textarea when menu is open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredCommands.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSelect(filteredCommands[selectedIndex].template);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [filteredCommands, selectedIndex, onSelect, onClose]);

  // Keep selected item in view
  useEffect(() => {
    if (containerRef.current) {
      const selectedEl = containerRef.current.querySelector('[data-selected="true"]');
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Reset selected index if search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [triggerQuery]);

  if (filteredCommands.length === 0) return null;

  // Group commands by category
  const categories = ['Basic', 'Blocks', 'ASA Journey'] as const;

  return (
    <div
      ref={containerRef}
      className="absolute bottom-16 left-6 right-6 sm:left-auto sm:right-auto sm:w-[280px] max-h-[300px] overflow-y-auto bg-white dark:bg-[#111412] border border-[#EEF0EF] dark:border-[#2E3832] rounded-2xl shadow-xl z-50 p-2.5 animate-in slide-in-from-bottom-2 duration-150 scrollbar-thin select-none"
    >
      <div className="text-[10px] font-black text-[#A3A7A8] uppercase tracking-wider px-2.5 pb-2 border-b border-[#EEF0EF] dark:border-[#2E3832]/30 mb-2">
        Insert Command template
      </div>

      <div className="space-y-3">
        {categories.map(cat => {
          const catCmds = filteredCommands.filter(c => c.category === cat);
          if (catCmds.length === 0) return null;

          return (
            <div key={cat} className="space-y-1">
              <span className="block text-[9px] font-bold text-[#6F7476] dark:text-[#A3A7A8] uppercase tracking-wider px-2.5">
                {cat}
              </span>
              {catCmds.map(cmd => {
                const globalIndex = filteredCommands.findIndex(c => c.id === cmd.id);
                const isSelected = globalIndex === selectedIndex;

                return (
                  <button
                    key={cmd.id}
                    type="button"
                    onClick={() => onSelect(cmd.template)}
                    data-selected={isSelected}
                    className={`w-full flex items-start gap-3 px-2.5 py-2 rounded-xl text-left transition-colors ${
                      isSelected
                        ? 'bg-[#E9FFF4] dark:bg-[#00DC7D]/10 text-[#00A963] dark:text-[#00DC7D]'
                        : 'text-[#2F3331] dark:text-[#E4E7E6] hover:bg-gray-50 dark:hover:bg-[#161B19]/40'
                    }`}
                  >
                    <span className={`p-1.5 rounded-lg border flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-white dark:bg-[#111412] border-[#00DC7D]/20'
                        : 'bg-[#FAFAFA] dark:bg-[#161B19] border-black/5 dark:border-white/5 text-[#6F7476] dark:text-[#A3A7A8]'
                    }`}>
                      <FontAwesomeIcon icon={cmd.icon} className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="block text-xs font-bold leading-tight">{cmd.name}</span>
                      <span className="block text-[10px] text-[#A3A7A8] font-light leading-tight mt-0.5 truncate">{cmd.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useMemo } from 'react';
