'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faArrowLeft,
  faWandMagicSparkles,
  faPenNib,
  faFolderOpen,
  faBrain,
  faCrown,
  faTree,
  faBookmark,
  faLightbulb,
} from '@fortawesome/free-solid-svg-icons';

interface Slide {
  title: string;
  subtitle: string;
  content: React.ReactNode;
  gradient: string;
  icon: any;
  iconColor: string;
  iconBg: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides: Slide[] = [
    {
      title: "ASA Journey",
      subtitle: "your premium micro-journaling era.",
      content: (
        <div className="space-y-4">
          <p className="text-base font-semibold leading-7 text-[#2F3331]">
            Tired of boring, clunky diary apps? Welcome to the ultimate aesthetic observatory for your mind. Spill your daily thoughts, log wild dreams, map creative sparks, and level up your life—no cap.
          </p>
          <div className="rounded-2xl bg-white/60 p-4 border border-white/40 backdrop-blur-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-[#00A963] block mb-1">
              Ultra-Fast & Offline-First
            </span>
            <p className="text-xs font-medium text-[#3F4345]">
              Fully optimized PWA. Write seamless logs offline on the go, and we'll auto-sync everything to the cloud the moment you're back online.
            </p>
          </div>
        </div>
      ),
      gradient: "from-[#E9FFF4] to-[#C8F7E4]",
      icon: faCrown,
      iconColor: "#00DC7D",
      iconBg: "#E9FFF4",
    },
    {
      title: "Spill the Tea Instantly",
      subtitle: "Micro-journaling made easy.",
      content: (
        <div className="space-y-4">
          <p className="text-base font-semibold leading-7 text-[#2F3331]">
            Express yourself in seconds. Break down your day into clean, structured bullet points. Cycle bullet formats using <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border rounded">Tab</kbd> to track tasks, star key highlights, or write normal bullets.
          </p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 bg-white/65 rounded-xl border border-white/30">
              <span className="font-bold text-[#2F3331] block">Checklist</span>
              <span className="text-[10px] text-[#3F4345] font-bold mt-0.5 block">to-do tracking</span>
            </div>
            <div className="p-2.5 bg-white/65 rounded-xl border border-white/30">
              <span className="font-bold text-[#FF9933] block">Star</span>
              <span className="text-[10px] text-[#3F4345] font-bold mt-0.5 block">highlights</span>
            </div>
            <div className="p-2.5 bg-white/65 rounded-xl border border-white/30">
              <span className="font-bold text-[#5D8AFF] block">Bullet</span>
              <span className="text-[10px] text-[#3F4345] font-bold mt-0.5 block">standard logs</span>
            </div>
          </div>
          <p className="text-xs font-medium text-[#3F4345] mt-2">
            Attach voice memos, upload pictures, log locations, or write deep dream diaries directly inside your entries. Use <span className="font-bold">#tags</span> and <span className="font-bold">@people</span> tags to map out your life.
          </p>
        </div>
      ),
      gradient: "from-[#E6F0FF] to-[#D6E4FF]",
      icon: faPenNib,
      iconColor: "#5D8AFF",
      iconBg: "#E6F0FF",
    },
    {
      title: "Organize the Brain Rot",
      subtitle: "Declutter your mind, aesthetics style.",
      content: (
        <div className="space-y-4">
          <p className="text-base font-semibold leading-7 text-[#2F3331]">
            Keep your thoughts organized. No more scattered notes or lost quotes. ASA separates independent text logs into specific hubs:
          </p>
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 flex items-center justify-center text-[#00DC7D] shrink-0 mt-0.5 bg-[#E9FFF4] rounded-lg">
                <FontAwesomeIcon icon={faTree} className="w-3.5 h-3.5" />
              </span>
              <div>
                <strong className="text-xs font-bold text-[#2F3331] block">Wisdom (Gems)</strong>
                <span className="text-xs text-[#3F4345] font-semibold leading-tight block mt-0.5">Collect cool quotes, fun facts, or hard-earned lessons, then link them to your journal entries.</span>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 flex items-center justify-center text-[#5D8AFF] shrink-0 mt-0.5 bg-[#E6F0FF] rounded-lg">
                <FontAwesomeIcon icon={faBookmark} className="w-3.5 h-3.5" />
              </span>
              <div>
                <strong className="text-xs font-bold text-[#2F3331] block">Notes</strong>
                <span className="text-xs text-[#3F4345] font-semibold leading-tight block mt-0.5">Draft longer reflections, research logs, or monthly reviews, and link them to journal dates.</span>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 flex items-center justify-center text-[#FFCC33] shrink-0 mt-0.5 bg-[#FFFCE6] rounded-lg">
                <FontAwesomeIcon icon={faLightbulb} className="w-3.5 h-3.5" />
              </span>
              <div>
                <strong className="text-xs font-bold text-[#2F3331] block">Ideas Drawer</strong>
                <span className="text-xs text-[#3F4345] font-semibold leading-tight block mt-0.5">Dump raw brainstorms and creative sparks in a snap before they slip away.</span>
              </div>
            </div>
          </div>
        </div>
      ),
      gradient: "from-[#F6F0FF] to-[#EDD6FF]",
      icon: faFolderOpen,
      iconColor: "#8B00D4",
      iconBg: "#F0D6FF",
    },
    {
      title: "Reflect & AI Helper",
      subtitle: "Introspective vibes to stay grounded.",
      content: (
        <div className="space-y-4">
          <p className="text-base font-semibold leading-7 text-[#2F3331]">
            Take a stroll down <span className="font-semibold">Memory Lane</span> with random throwback logs, review <span className="font-semibold">Yesterday</span>, or check your <span className="font-semibold">Flashback</span> to see exactly what you wrote one year ago.
          </p>
          <div className="rounded-2xl bg-white/60 p-4 border border-white/35 backdrop-blur-sm flex items-start gap-3">
            <span className="text-xl text-[#00DC7D] shrink-0 mt-0.5">
              <FontAwesomeIcon icon={faWandMagicSparkles} className="w-5 h-5 animate-pulse" />
            </span>
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#00A963] block">Cosmic Recap AI</span>
              <p className="text-xs font-medium text-[#3F4345]">
                Let our private AI analyze your past 7 days of writing to capture recurring themes, map emotional patterns, extract lessons, and suggest actionable weekly goals.
              </p>
            </div>
          </div>
        </div>
      ),
      gradient: "from-[#FFEAEF] to-[#FFE4B5]",
      icon: faBrain,
      iconColor: "#E97C9B",
      iconBg: "#FFEAEF",
    },
    {
      title: "Insights & Level Up",
      subtitle: "Gamified tracking, but make it clean.",
      content: (
        <div className="space-y-4">
          <p className="text-base font-semibold leading-7 text-[#2F3331]">
            Visualize your writing journey with interactive habit heatmaps, word-count timelines, and daytime/weekday charts. Earn XP for every bullet logged or media attached, level up your title, and unlock achievements.
          </p>
          <div className="flex gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-[#00A963] bg-[#E9FFF4] px-2 py-0.5 rounded border border-[#00A963]/30">Level Achievements</span>
            <span className="text-[10px] font-bold text-[#FF9933] bg-[#FFF4E6] px-2 py-0.5 rounded border border-[#FF9933]/30">Habit Heatmaps</span>
            <span className="text-[10px] font-bold text-[#5D8AFF] bg-[#E6F0FF] px-2 py-0.5 rounded border border-[#5D8AFF]/30">Dope Badges</span>
          </div>
        </div>
      ),
      gradient: "from-[#FFFCE6] to-[#FFF4E6]",
      icon: faWandMagicSparkles,
      iconColor: "#FFCC33",
      iconBg: "#FFFCE6",
    },
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const completeOnboarding = () => {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    router.push('/auth');
  };

  const activeSlide = slides[currentSlide];

  return (
    <div className={`min-h-screen bg-gradient-to-br ${activeSlide.gradient} transition-all duration-700 ease-out flex flex-col justify-between p-6 overflow-hidden`}>
      {/* Header */}
      <div className="max-w-[540px] mx-auto w-full flex items-center justify-between pt-4">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#2F3331]/80" />
          <span className="text-xs font-bold font-mono tracking-widest text-[#2F3331]/80 uppercase">
            onboarding
          </span>
        </div>
        <button
          onClick={completeOnboarding}
          className="text-xs font-bold text-[#2F3331]/90 hover:text-[#2F3331] transition-colors uppercase tracking-wider"
        >
          skip
        </button>
      </div>

      {/* Slide Content Box */}
      <div className="max-w-[540px] mx-auto w-full bg-white/90 backdrop-blur-md rounded-3xl p-6 border border-white/40 shadow-xl relative overflow-hidden flex flex-col justify-between h-[420px]">
        <div>
          {/* Slide Icon */}
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 shadow-sm border border-white"
            style={{ backgroundColor: activeSlide.iconBg }}
          >
            <FontAwesomeIcon
              icon={activeSlide.icon}
              className="w-5 h-5 animate-pulse"
              style={{ color: activeSlide.iconColor }}
            />
          </div>

          <h2 className="font-serif text-3xl font-bold text-[#2F3331] leading-tight">
            {activeSlide.title}
          </h2>
          <h3 className="text-sm font-semibold text-[#3F4345] mt-1 mb-4 font-sans tracking-wide">
            {activeSlide.subtitle}
          </h3>

          <div className="h-[180px] overflow-y-auto pr-1 select-none">
            {activeSlide.content}
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="max-w-[540px] mx-auto w-full flex items-center justify-between pb-8">
        {/* Back Button */}
        <button
          onClick={handleBack}
          disabled={currentSlide === 0}
          className={`flex h-12 w-12 items-center justify-center rounded-full border border-white bg-white/30 backdrop-blur-sm text-[#2F3331] transition-all hover:bg-white/50 active:scale-95 disabled:opacity-30 disabled:pointer-events-none`}
          aria-label="Previous Slide"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
        </button>

        {/* Indicators */}
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentSlide
                  ? 'w-6 bg-[#2F3331]'
                  : 'w-2 bg-[#2F3331]/20'
              }`}
            />
          ))}
        </div>

        {/* Next/Get Started Button */}
        <button
          onClick={handleNext}
          className="flex h-12 min-w-12 items-center justify-center rounded-full bg-[#2F3331] px-4 text-white font-semibold transition-all hover:opacity-90 active:scale-95 shadow-lg shadow-[#2F3331]/10 gap-2"
        >
          {currentSlide === slides.length - 1 ? (
            <>
              <span>Get Started</span>
              <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4" />
            </>
          ) : (
            <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
