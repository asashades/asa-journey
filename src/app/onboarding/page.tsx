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
          <p className="text-base font-semibold leading-7 text-[#A9A59C]">
            Tired of boring, clunky diary apps? Welcome to the ultimate aesthetic observatory for your mind. Spill your daily thoughts, log wild dreams, map creative sparks, and level up your life—no cap.
          </p>
          <div className="rounded-2xl bg-[#181C27]/60 p-4 border border-[#1F2433] backdrop-blur-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-[#9CF6F6] block mb-1">
              Ultra-Fast & Offline-First
            </span>
            <p className="text-xs font-medium text-[#6F6A63]">
              Fully optimized PWA. Write seamless logs offline on the go, and we'll auto-sync everything to the cloud the moment you're back online.
            </p>
          </div>
        </div>
      ),
      gradient: "from-[#08090D] via-[#0E101B] to-[#121626]",
      icon: faCrown,
      iconColor: "#9CF6F6",
      iconBg: "rgba(156,246,246,0.08)",
    },
    {
      title: "Spill the Tea Instantly",
      subtitle: "Micro-journaling made easy.",
      content: (
        <div className="space-y-4">
          <p className="text-base font-semibold leading-7 text-[#A9A59C]">
            Express yourself in seconds. Break down your day into clean, structured bullet points. Cycle bullet formats using <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#181C27] border border-[#1F2433] rounded text-[#F8F4E8]">Tab</kbd> to track tasks, star key highlights, or write normal bullets.
          </p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 bg-[#181C27]/60 rounded-xl border border-[#1F2433]">
              <span className="font-bold text-[#F8F4E8] block">Checklist</span>
              <span className="text-[10px] text-[#6F6A63] font-bold mt-0.5 block">to-do tracking</span>
            </div>
            <div className="p-2.5 bg-[#181C27]/60 rounded-xl border border-[#1F2433]">
              <span className="font-bold text-[#FFD166] block">Star</span>
              <span className="text-[10px] text-[#6F6A63] font-bold mt-0.5 block">highlights</span>
            </div>
            <div className="p-2.5 bg-[#181C27]/60 rounded-xl border border-[#1F2433]">
              <span className="font-bold text-[#8CCBFF] block">Bullet</span>
              <span className="text-[10px] text-[#6F6A63] font-bold mt-0.5 block">standard logs</span>
            </div>
          </div>
          <p className="text-xs font-medium text-[#A9A59C]/80 mt-2">
            Attach voice memos, upload pictures, log locations, or write deep dream diaries directly inside your entries. Use <span className="font-bold text-[#8CCBFF]">#tags</span> and <span className="font-bold text-[#FF8FB3]">@people</span> tags to map out your life.
          </p>
        </div>
      ),
      gradient: "from-[#08090D] via-[#0D1225] to-[#111A33]",
      icon: faPenNib,
      iconColor: "#8CCBFF",
      iconBg: "rgba(140,203,255,0.08)",
    },
    {
      title: "Organize the Brain Rot",
      subtitle: "Declutter your mind, aesthetics style.",
      content: (
        <div className="space-y-4">
          <p className="text-base font-semibold leading-7 text-[#A9A59C]">
            Keep your thoughts organized. No more scattered notes or lost quotes. ASA separates independent text logs into specific hubs:
          </p>
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 flex items-center justify-center text-[#B79CFF] shrink-0 mt-0.5 bg-[#B79CFF]/10 rounded-lg border border-[#B79CFF]/20">
                <FontAwesomeIcon icon={faTree} className="w-3.5 h-3.5" />
              </span>
              <div>
                <strong className="text-xs font-bold text-[#F8F4E8] block">Wisdom (Gems)</strong>
                <span className="text-xs text-[#A9A59C] font-semibold leading-tight block mt-0.5">Collect cool quotes, fun facts, or hard-earned lessons, then link them to your journal entries.</span>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 flex items-center justify-center text-[#9CF6F6] shrink-0 mt-0.5 bg-[#9CF6F6]/10 rounded-lg border border-[#9CF6F6]/20">
                <FontAwesomeIcon icon={faBookmark} className="w-3.5 h-3.5" />
              </span>
              <div>
                <strong className="text-xs font-bold text-[#F8F4E8] block">Notes</strong>
                <span className="text-xs text-[#A9A59C] font-semibold leading-tight block mt-0.5">Draft longer reflections, research logs, or monthly reviews, and link them to journal dates.</span>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 flex items-center justify-center text-[#FFD166] shrink-0 mt-0.5 bg-[#FFD166]/10 rounded-lg border border-[#FFD166]/20">
                <FontAwesomeIcon icon={faLightbulb} className="w-3.5 h-3.5" />
              </span>
              <div>
                <strong className="text-xs font-bold text-[#F8F4E8] block">Ideas Drawer</strong>
                <span className="text-xs text-[#A9A59C] font-semibold leading-tight block mt-0.5">Dump raw brainstorms and creative sparks in a snap before they slip away.</span>
              </div>
            </div>
          </div>
        </div>
      ),
      gradient: "from-[#08090D] via-[#120F24] to-[#1D1236]",
      icon: faFolderOpen,
      iconColor: "#B79CFF",
      iconBg: "rgba(183,156,255,0.08)",
    },
    {
      title: "Reflect & AI Helper",
      subtitle: "Introspective vibes to stay grounded.",
      content: (
        <div className="space-y-4">
          <p className="text-base font-semibold leading-7 text-[#A9A59C]">
            Take a stroll down <span className="font-semibold text-[#F8F4E8]">Memory Lane</span> with random throwback logs, review <span className="font-semibold text-[#F8F4E8]">Yesterday</span>, or check your <span className="font-semibold text-[#F8F4E8]">Flashback</span> to see exactly what you wrote one year ago.
          </p>
          <div className="rounded-2xl bg-[#181C27]/60 p-4 border border-[#1F2433] backdrop-blur-sm flex items-start gap-3">
            <span className="text-xl text-[#FF8FB3] shrink-0 mt-0.5">
              <FontAwesomeIcon icon={faWandMagicSparkles} className="w-5 h-5 animate-pulse" />
            </span>
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#FF8FB3] block">Cosmic Recap AI</span>
              <p className="text-xs font-medium text-[#6F6A63]">
                Let our private AI analyze your past 7 days of writing to capture recurring themes, map emotional patterns, extract lessons, and suggest actionable weekly goals.
              </p>
            </div>
          </div>
        </div>
      ),
      gradient: "from-[#08090D] via-[#160E1A] to-[#241221]",
      icon: faBrain,
      iconColor: "#FF8FB3",
      iconBg: "rgba(255,143,179,0.08)",
    },
    {
      title: "Insights & Level Up",
      subtitle: "Gamified tracking, but make it clean.",
      content: (
        <div className="space-y-4">
          <p className="text-base font-semibold leading-7 text-[#A9A59C]">
            Visualize your writing journey with interactive habit heatmaps, word-count timelines, and daytime/weekday charts. Earn XP for every bullet logged or media attached, level up your title, and unlock achievements.
          </p>
          <div className="flex gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-[#9CF6F6] bg-[#9CF6F6]/10 px-2 py-0.5 rounded border border-[#9CF6F6]/25">Level Achievements</span>
            <span className="text-[10px] font-bold text-[#FFD166] bg-[#FFD166]/10 px-2 py-0.5 rounded border border-[#FFD166]/25">Habit Heatmaps</span>
            <span className="text-[10px] font-bold text-[#8CCBFF] bg-[#8CCBFF]/10 px-2 py-0.5 rounded border border-[#8CCBFF]/25">Dope Badges</span>
          </div>
        </div>
      ),
      gradient: "from-[#08090D] via-[#15140F] to-[#252312]",
      icon: faWandMagicSparkles,
      iconColor: "#FFD166",
      iconBg: "rgba(255,209,102,0.08)",
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
    <div className={`min-h-screen bg-gradient-to-b ${activeSlide.gradient} transition-all duration-1000 ease-out flex flex-col justify-between p-6 overflow-hidden relative`}>
      {/* Background Nebulas */}
      <div className="absolute top-[-10%] left-[-20%] w-[60%] h-[60%] rounded-full bg-[#B79CFF]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#9CF6F6]/5 blur-[120px] pointer-events-none" />
      
      {/* Slide-specific glowing nebula */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full blur-[100px] pointer-events-none transition-all duration-1000"
        style={{
          backgroundColor: activeSlide.iconColor,
          opacity: 0.05
        }}
      />

      {/* Header */}
      <div className="max-w-[540px] mx-auto w-full flex items-center justify-between pt-4 relative z-10">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#9CF6F6] animate-pulse" />
          <span className="text-xs font-bold font-mono tracking-widest text-[#A9A59C] uppercase">
            onboarding
          </span>
        </div>
        <button
          onClick={completeOnboarding}
          className="text-xs font-bold text-[#A9A59C] hover:text-[#F8F4E8] transition-colors uppercase tracking-wider"
        >
          skip
        </button>
      </div>

      {/* Slide Content Box */}
      <div className="max-w-[540px] mx-auto w-full bg-[#11141D]/75 backdrop-blur-xl rounded-3xl p-6 border border-[#1F2433] shadow-2xl relative overflow-hidden flex flex-col justify-between h-[500px] z-10">
        <div>
          {/* Slide Icon */}
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 shadow-inner border border-[#1F2433]"
            style={{ backgroundColor: activeSlide.iconBg }}
          >
            <FontAwesomeIcon
              icon={activeSlide.icon}
              className="w-5 h-5 animate-pulse"
              style={{ color: activeSlide.iconColor }}
            />
          </div>

          <h2 className="font-serif text-3xl font-bold text-[#F8F4E8] leading-tight">
            {activeSlide.title}
          </h2>
          <h3 className="text-sm font-semibold text-[#A9A59C] mt-1 mb-4 font-sans tracking-wide">
            {activeSlide.subtitle}
          </h3>

          <div className="h-[260px] overflow-y-auto pr-1 select-none">
            {activeSlide.content}
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="max-w-[540px] mx-auto w-full flex items-center justify-between pb-8 relative z-10">
        {/* Back Button */}
        <button
          onClick={handleBack}
          disabled={currentSlide === 0}
          className={`flex h-12 w-12 items-center justify-center rounded-full border border-[#1F2433] bg-[#11141D]/50 backdrop-blur-sm text-[#F8F4E8] transition-all hover:bg-[#181C27] active:scale-95 disabled:opacity-35 disabled:pointer-events-none`}
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
                  ? 'w-6 bg-[#9CF6F6]'
                  : 'w-2 bg-[#CCD0CF]/20'
              }`}
            />
          ))}
        </div>

        {/* Next/Get Started Button */}
        <button
          onClick={handleNext}
          className="flex h-12 min-w-12 items-center justify-center rounded-full bg-[#9CF6F6] hover:bg-[#83E1E1] px-4 text-[#08090D] font-extrabold transition-all active:scale-95 shadow-lg shadow-[#9CF6F6]/10 gap-2"
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
