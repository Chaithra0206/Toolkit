/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home,
  ImageIcon, 
  RefreshCw, 
  FileText, 
  Layers, 
  Scissors, 
  ArrowDownToLine, 
  ImagePlay, 
  Settings,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { isSidebarOpen, setSidebarOpen } = useApp();

  const navigationGroups = [
    {
      title: 'CORE',
      items: [
        { name: 'DASHBOARD', href: '/', icon: Home },
      ]
    },
    {
      title: 'IMAGE TOOLS',
      items: [
        { name: 'IMAGE COMPRESSOR', href: '/compressor', icon: ImageIcon },
        { name: 'IMAGE CONVERTER', href: '/converter', icon: RefreshCw },
      ]
    },
    {
      title: 'PDF TOOLS',
      items: [
        { name: 'PDF CONVERTER', href: '/pdf/converter', icon: FileText },
        { name: 'MERGE PDF', href: '/pdf/merge', icon: Layers },
        { name: 'SPLIT PDF', href: '/pdf/split', icon: Scissors },
        { name: 'PDF COMPRESSOR', href: '/pdf/compress', icon: ArrowDownToLine },
        { name: 'IMAGES TO PDF', href: '/pdf/images-to-pdf', icon: ImagePlay },
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { name: 'SETTINGS', href: '/settings', icon: Settings },
      ]
    }
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
        className={`fixed top-0 bottom-0 left-0 w-72 bg-white dark:bg-[#000000] border-r border-neutral-200 dark:border-neutral-800 flex flex-col justify-between z-50 transition-transform duration-200 md:translate-x-0 overflow-y-auto ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1">
          {/* Header Brand */}
          <div className="h-16 px-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0">
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

          {/* Navigation Groups */}
          <div className="flex-1 p-4 flex flex-col gap-6 mt-4 font-mono select-none">
            {navigationGroups.map((group) => (
              <div key={group.title} className="flex flex-col gap-1.5">
                <span className="text-[8px] font-black text-neutral-450 dark:text-neutral-500 tracking-widest px-4 uppercase">
                  {group.title}
                </span>

                <nav className="flex flex-col gap-1">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`w-full flex items-center gap-3 px-4 py-2 border font-extrabold text-[10px] tracking-wider transition-all duration-100 relative rounded-none ${
                          isActive
                            ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                            : 'bg-transparent border-transparent text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-black dark:hover:text-white'
                        }`}
                      >
                        <div className="w-4 h-4 flex items-center justify-center shrink-0">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="flex-1 tracking-widest text-left">{item.name}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Footer telemetry */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-transparent shrink-0">
          <div className="text-center font-mono text-[7px] text-neutral-400 dark:text-neutral-600 tracking-widest uppercase">
            SECURE SANDBOX ISOLATED
          </div>
        </div>

      </aside>
    </>
  );
}
