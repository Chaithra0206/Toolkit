/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Menu, Sun, Moon, Sparkles, HardDrive } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatBytes } from '../utils/compressor';

export default function Header() {
  const pathname = usePathname();
  const { toggleTheme, theme, setSidebarOpen, stats } = useApp();

  // Route path resolver for header title
  const getPageTitle = () => {
    switch (pathname) {
      case '/':
        return 'Image Compressor';
      case '/converter':
        return 'Image Converter';
      default:
        return 'Image Toolkit';
    }
  };

  return (
    <header className="h-16 w-full bg-white/80 dark:bg-[#0c0d0e]/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-900/80 fixed top-0 right-0 left-0 md:left-72 z-30 px-4 sm:px-6 flex items-center justify-between transition-colors duration-200">
      {/* Left side: Mobile menu toggle and title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-xl border border-slate-200/50 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-650 dark:text-slate-400 md:hidden cursor-pointer"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white">
          {getPageTitle()}
        </h2>
      </div>

      {/* Right side: Session statistics & Dark mode toggle */}
      <div className="flex items-center gap-3">
        {/* Dynamic telemetry stats visible across pages */}
        {stats.filesProcessed > 0 && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-905 border border-slate-200/50 dark:border-slate-800/80 rounded-xl">
            <div className="w-5 h-5 rounded bg-emerald-500/10 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <HardDrive className="w-3 h-3" />
            </div>
            <div className="text-[10px] leading-none">
              <span className="text-slate-400 dark:text-slate-550 block font-bold uppercase tracking-wider scale-90 origin-left">Saved Session</span>
              <span className="font-mono font-bold text-emerald-650 dark:text-emerald-400 block mt-0.5">
                {formatBytes(stats.bytesSaved)} ({stats.filesProcessed} files)
              </span>
            </div>
          </div>
        )}

        {/* Theme Switcher Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl border border-slate-200/50 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-650 dark:text-slate-400 cursor-pointer transition-all duration-200"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 fill-amber-400/10" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-650 fill-indigo-650/10" />
          )}
        </button>
      </div>
    </header>
  );
}
