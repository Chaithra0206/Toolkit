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
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { isSidebarOpen, setSidebarOpen } = useApp();

  const navItems = [
    { name: 'IMAGE COMPRESSOR', href: '/', icon: ImageIcon },
    { name: 'IMAGE CONVERTER', href: '/converter', icon: RefreshCw },
  ];

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Navigation Drawer Container */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 w-72 bg-white dark:bg-[#000000] border-r border-neutral-200 dark:border-neutral-800 flex flex-col justify-between z-50 transition-transform duration-200 md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1">
          {/* Header Brand */}
          <div className="h-16 px-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <Link 
              href="/" 
              className="flex items-center gap-2 group font-mono"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="text-sm font-black tracking-widest text-black dark:text-white uppercase leading-none">
                SHRINK.
              </span>
            </Link>

            {/* Mobile Close Button */}
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 md:hidden cursor-pointer"
            >
              <X className="w-4 h-4 text-black dark:text-white" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 flex flex-col gap-2 mt-4 font-mono">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`w-full flex items-center gap-3 px-4 py-3 border font-extrabold text-[10px] tracking-wider transition-all duration-100 relative select-none rounded-none ${
                    isActive
                      ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                      : 'bg-transparent border-transparent text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <div className={`w-5 h-5 flex items-center justify-center shrink-0`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="flex-1 tracking-widest">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

      </aside>
    </>
  );
}
