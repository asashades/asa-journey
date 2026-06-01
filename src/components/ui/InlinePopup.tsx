import React from 'react';
import { Tag, Person } from '@/types';

interface InlinePopupProps {
  type: 'mention' | 'tag' | null;
  query: string;
  tags: Tag[];
  people: Person[];
  onSelect: (value: string) => void;
  onCreateNew: (value: string) => void;
  position: { top: number; left: number } | null;
}

export function InlinePopup({ type, query, tags, people, onSelect, onCreateNew, position }: InlinePopupProps) {
  if (!type || !position) return null;

  const filteredItems = type === 'tag'
    ? tags.filter(t => t.name.toLowerCase().includes(query.toLowerCase()))
    : people.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));

  const showCreateOption = query.length > 0 && !filteredItems.some(item => item.name.toLowerCase() === query.toLowerCase());

  return (
    <div
      className="absolute z-50 bg-white rounded-xl shadow-lg border border-[#CCD0CF] py-2 min-w-[200px] max-w-[300px] max-h-[250px] overflow-y-auto"
      style={{ top: position.top, left: position.left }}
    >
      <div className="px-3 pb-2 text-xs font-semibold text-[#A3A7A8] uppercase tracking-wider border-b border-[#F2F2F3] mb-1">
        {type === 'tag' ? 'Tags' : 'Mentions'}
      </div>
      
      {filteredItems.map(item => (
        <button
          key={item.id}
          onClick={() => onSelect(item.name)}
          className="w-full text-left px-4 py-2 hover:bg-[#F2F2F3] text-sm text-[#2F3331] transition-colors flex items-center justify-between"
        >
          <span>{type === 'tag' ? '#' : '@'}{item.name}</span>
          <span className="text-xs text-[#A3A7A8]">
            {type === 'tag' ? (item as Tag).count : (item as Person).mentions} uses
          </span>
        </button>
      ))}

      {showCreateOption && (
        <button
          onClick={() => onCreateNew(query)}
          className="w-full text-left px-4 py-2 hover:bg-[#F2F2F3] text-sm text-[#00DC7D] font-medium transition-colors border-t border-[#F2F2F3] mt-1"
        >
          Create {type === 'tag' ? '#' : '@'}{query}
        </button>
      )}

      {filteredItems.length === 0 && !showCreateOption && (
        <div className="px-4 py-3 text-sm text-[#A3A7A8] text-center">
          Type to search or create
        </div>
      )}
    </div>
  );
}
