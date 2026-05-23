/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ImageIcon, 
  RefreshCw, 
  X, 
  Sparkles,
  Zap
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { isSidebarOpen, setSidebarOpen } = useApp();

  const navItems = [
    { name: 'Image Compressor', href: '/', icon: ImageIcon },
    { name: 'Image Converter', href: '/converter', icon: RefreshCw },
  ];

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Navigation Drawer Container */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 w-72 bg-white dark:bg-[#0e1012] border-r border-slate-200/60 dark:border-slate-900/80 flex flex-col justify-between z-50 transition-transform duration-300 md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1">
          {/* Header Brand */}
          <div className="h-16 px-6 border-b border-slate-100 dark:border-slate-905 flex items-center justify-between">
            <Link 
              href="/" 
              className="flex items-center gap-2.5 group"
              onClick={() => setSidebarOpen(false)}
            >
              <div className="w-8 h-8 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold tracking-tight shadow-md group-hover:scale-105 duration-200">
                <Zap className="w-4 h-4 fill-current" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 leading-none">
                  Shrink
                  <span className="px-1.5 py-0.5 rounded text-[8px] bg-indigo-500/10 text-indigo-500 font-extrabold uppercase tracking-widest">
                    v2
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium font-mono mt-0.5">
                  Offline Image Toolkit
                </span>
              </div>
            </Link>

            {/* Mobile Close Button */}
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg border border-slate-200/50 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-900 md:hidden cursor-pointer"
            >
              <X className="w-4 h-4 text-slate-500 dark:text-slate-455" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 flex flex-col gap-1.5 mt-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-bold text-xs transition-all duration-150 relative select-none ${
                    isActive
                      ? 'bg-black dark:bg-white text-white dark:text-black shadow-[0_4px_12px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_12px_rgba(255,255,255,0.05)]'
                      : 'text-slate-505 dark:text-slate-405 hover:bg-slate-100/50 dark:hover:bg-slate-905 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive 
                      ? 'bg-white/10 dark:bg-black/10' 
                      : 'bg-slate-100 dark:bg-slate-900 group-hover:bg-slate-200'
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="flex-1 tracking-wide">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Brand/Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-905 bg-slate-50/50 dark:bg-[#0c0d0e]/30">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-white dark:bg-slate-905 border border-slate-150 dark:border-slate-900/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 block truncate leading-none">
                Private Sandbox
              </span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 block leading-tight mt-0.5 font-mono">
                100% Local Processing
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
