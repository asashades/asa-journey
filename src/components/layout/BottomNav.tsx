'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, BookOpenIcon, SparklesIcon, ChartBarIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import { HomeIcon as HomeIconSolid, BookOpenIcon as BookOpenIconSolid, SparklesIcon as SparklesIconSolid, ChartBarIcon as ChartBarIconSolid, EllipsisHorizontalIcon as EllipsisHorizontalIconSolid } from '@heroicons/react/24/solid';

const navItems = [
  { href: '/write', label: 'Write', icon: HomeIcon, activeIcon: HomeIconSolid },
  { href: '/journal', label: 'Journal', icon: BookOpenIcon, activeIcon: BookOpenIconSolid },
  { href: '/reflect', label: 'Reflect', icon: SparklesIcon, activeIcon: SparklesIconSolid },
  { href: '/insights', label: 'Insights', icon: ChartBarIcon, activeIcon: ChartBarIconSolid },
  { href: '/other', label: 'Other', icon: EllipsisHorizontalIcon, activeIcon: EllipsisHorizontalIconSolid },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#1E1A2B] border-t border-[#4A4560] px-4 py-2 safe-area-pb z-50">
      <div className="flex justify-around items-center max-w-lg mx-auto">
        {navItems.map(({ href, label, icon: Icon, activeIcon: ActiveIcon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 ${
                isActive ? 'text-[#C049FF]' : 'text-[#8B8AA0] hover:text-white'
              }`}
            >
              {isActive ? (
                <ActiveIcon className="w-6 h-6" />
              ) : (
                <Icon className="w-6 h-6" />
              )}
              <span className="text-xs mt-1 font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
