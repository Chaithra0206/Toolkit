/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Menu, Sun, Moon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatBytes } from '../utils/compressor';

export default function Header() {
  const pathname = usePathname();
  const { toggleTheme, theme, setSidebarOpen, stats } = useApp();

  const getPageTitle = () => {
    switch (pathname) {
      case '/':
        return 'IMAGE COMPRESSOR';
      case '/converter':
        return 'IMAGE CONVERTER';
      default:
        return 'IMAGE TOOLKIT';
    }
  };

  return (
    <header className="h-16 w-full bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 fixed top-0 right-0 left-0 md:left-72 z-30 px-4 sm:px-6 flex items-center justify-between transition-colors duration-200">
      {/* Left side: Mobile menu toggle and title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-black dark:text-white md:hidden cursor-pointer rounded-none"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <h2 className="text-xs font-black tracking-widest text-black dark:text-white uppercase font-mono">
          {getPageTitle()}
        </h2>
      </div>

      {/* Right side: Session stats & Theme Switcher */}
      <div className="flex items-center gap-4">
        {/* Dynamic telemetry stats stylized as raw monospace telemetry */}
        {stats.filesProcessed > 0 && (
          <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 border border-black dark:border-white bg-transparent rounded-none font-mono text-[9px] tracking-widest text-black dark:text-white select-none">
            <span className="font-extrabold">SAVED: {formatBytes(stats.bytesSaved)}</span>
            <span className="opacity-30">/</span>
            <span className="opacity-70">{stats.filesProcessed} FILES</span>
          </div>
        )}

        {/* Theme Switcher Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-black dark:text-white cursor-pointer transition-all duration-150 rounded-none"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5" />
          ) : (
            <Moon className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </header>
  );
}
