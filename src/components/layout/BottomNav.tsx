'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPen,
  faBook,
  faWandMagicSparkles,
  faChartSimple,
  faEllipsis,
  faLayerGroup,
  faGear,
  faCrosshairs,
  faImages,
  faNoteSticky,
} from '@fortawesome/free-solid-svg-icons';
import { useData } from '@/contexts/DataContext';

const navItems = [
  { href: '/write', label: 'Write', icon: faPen },
  { href: '/journal', label: 'Journal', icon: faBook },
  { href: '/reflect', label: 'Reflect', icon: faWandMagicSparkles },
  { href: '/goals', label: 'Goals', icon: faCrosshairs },
];

export default function BottomNav({ className = '' }: { className?: string }) {
  const pathname = usePathname();
  const { isSpotlightOpen } = useData();
  const [isSpeedDialOpen, setIsSpeedDialOpen] = useState(false);
  const isMoreActive = pathname.startsWith('/collections') || pathname.startsWith('/settings') || pathname.startsWith('/other') || pathname.startsWith('/insights') || pathname.startsWith('/gallery') || pathname.startsWith('/notes');
  const speedDialItems = [
    { href: '/collections', label: 'Collections', icon: faLayerGroup },
    { href: '/notes', label: 'Notes', icon: faNoteSticky },
    { href: '/gallery', label: 'Gallery', icon: faImages },
    { href: '/insights', label: 'Insights', icon: faChartSimple },
    { href: '/settings', label: 'Settings', icon: faGear },
  ];

  return (
    <nav className={`pointer-events-none fixed bottom-3 left-0 right-0 z-40 px-4 safe-area-pb ${className}`}>
      <div className={`pointer-events-auto mx-auto flex max-w-lg items-center justify-around rounded-full border border-[#E4E7E6] bg-white/95 px-3 py-2 shadow-lg backdrop-blur transition-all duration-500 ease-out ${
        isSpotlightOpen ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}>
        {navItems.map(({ href, label, icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`group flex flex-col items-center justify-center rounded-full p-2.5 transition-all duration-300 ${
                isActive ? 'bg-[#E9FFF4] text-[#00A963] px-3.5' : 'text-[#A3A7A8] hover:bg-[#F2F2F3] hover:text-[#6F7476] hover:px-3.5'
              }`}
            >
              <FontAwesomeIcon icon={icon} className="w-5 h-5" />
              <span className="text-[10px] font-semibold max-h-0 opacity-0 overflow-hidden transition-all duration-300 ease-in-out group-hover:max-h-8 group-hover:opacity-100 group-hover:mt-1 group-focus:max-h-8 group-focus:opacity-100 group-focus:mt-1">
                {label}
              </span>
            </Link>
          );
        })}
        <div className="relative">
          {isSpeedDialOpen && (
            <div className="absolute bottom-16 right-0 flex flex-col items-end gap-2">
              {speedDialItems.map(({ href, label, icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsSpeedDialOpen(false)}
                  className="flex items-center gap-2 rounded-full border border-[#CCD0CF] bg-white px-4 py-2 text-sm font-semibold text-[#2F3331] shadow-sm transition-colors hover:bg-[#F2F2F3]"
                >
                  <FontAwesomeIcon icon={icon} className="h-4 w-4 text-[#6F7476]" />
                  {label}
                </Link>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsSpeedDialOpen(current => !current)}
            className={`group flex flex-col items-center justify-center rounded-full p-2.5 transition-all duration-300 ${
              isMoreActive ? 'bg-[#E9FFF4] text-[#00A963] px-3.5' : 'text-[#A3A7A8] hover:bg-[#F2F2F3] hover:text-[#6F7476] hover:px-3.5'
            }`}
            aria-expanded={isSpeedDialOpen}
            aria-label="open collections and settings"
          >
            <FontAwesomeIcon icon={faEllipsis} className="h-5 w-5" />
            <span className="text-[10px] font-semibold max-h-0 opacity-0 overflow-hidden transition-all duration-300 ease-in-out group-hover:max-h-8 group-hover:opacity-100 group-hover:mt-1 group-focus:max-h-8 group-focus:opacity-100 group-focus:mt-1">
              More
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}
