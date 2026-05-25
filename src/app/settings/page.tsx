'use client';

import React from 'react';
import { 
  Settings, 
  Trash2, 
  Sun, 
  Moon, 
  ShieldCheck, 
  Info, 
  ServerCrash
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { toast, Toaster } from 'sonner';

export default function SettingsPage() {
  const { theme, toggleTheme, stats, clearStats } = useApp();

  const handleClear = () => {
    clearStats();
    toast.success("Workspace statistics cleared successfully.", {
      style: {
        fontFamily: "var(--font-geist-mono), monospace",
        fontSize: "10px",
        borderRadius: "0",
        border: "1px solid black"
      }
    });
  };

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6 font-mono">
      <Toaster position="bottom-right" />
      
      {/* Settings Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div>
          <h1 className="text-sm font-black tracking-widest text-black dark:text-white uppercase leading-none flex items-center gap-2">
            [ SETTINGS & DIAGNOSTICS ]
          </h1>
        </div>
      </div>

      <div className="flex flex-col gap-6 max-w-2xl">
        
        {/* Settings Box: Interface Style */}
        <div className="border border-neutral-200 dark:border-neutral-800 p-5 rounded-none flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-black dark:text-white uppercase tracking-widest">
                INTERFACE THEME
              </span>
              <span className="text-[9px] text-neutral-450 dark:text-neutral-500 leading-relaxed tracking-wider">
                Select your preferred color scheme. Currently utilizing: <span className="font-extrabold uppercase">{theme}</span>
              </span>
            </div>
            
            <button
              onClick={toggleTheme}
              className="px-4 py-2 border border-black dark:border-white bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-900 text-black dark:text-white rounded-none text-[9px] tracking-widest font-extrabold uppercase flex items-center gap-1.5 cursor-pointer select-none transition-all duration-100"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5" />
                  LIGHT MODE
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5" />
                  DARK MODE
                </>
              )}
            </button>
          </div>
        </div>

        {/* Settings Box: Telemetry Stats */}
        <div className="border border-neutral-200 dark:border-neutral-800 p-5 rounded-none flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-black dark:text-white uppercase tracking-widest">
              WORKSPACE STATS TELEMETRY
            </span>
            <p className="text-[9px] text-neutral-450 dark:text-neutral-500 leading-relaxed tracking-wider">
              Shrink records the quantity of processed files and cumulative storage savings to local browser storage to provide optimization telemetry.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 border-y border-neutral-200 dark:border-neutral-800 py-4 my-2 text-[9px] tracking-widest">
            <div>
              <span className="font-bold text-neutral-450">TOTAL PROCESSED:</span>
              <span className="block text-xs font-black text-black dark:text-white mt-1">{stats.filesProcessed} FILES</span>
            </div>
            <div>
              <span className="font-bold text-neutral-450">ESTIMATED STORAGE SAVED:</span>
              <span className="block text-xs font-black text-black dark:text-white mt-1">
                {stats.bytesSaved > 0 ? (stats.bytesSaved / (1024 * 1024)).toFixed(2) : "0.00"} MB
              </span>
            </div>
          </div>

          <div className="self-start">
            <button
              onClick={handleClear}
              disabled={stats.filesProcessed === 0}
              className="px-4 py-2 border border-red-600 dark:border-red-400 text-red-600 dark:text-red-400 disabled:opacity-20 bg-transparent hover:bg-red-50 dark:hover:bg-red-950/20 rounded-none text-[9px] tracking-widest font-extrabold uppercase flex items-center gap-1.5 cursor-pointer select-none transition-all duration-100"
            >
              <Trash2 className="w-3.5 h-3.5" />
              CLEAR TELEMETRY
            </button>
          </div>
        </div>

        {/* Settings Box: Privacy Isolation Assertions */}
        <div className="border border-neutral-200 dark:border-neutral-800 p-5 rounded-none flex flex-col gap-4">
          <span className="text-[10px] font-black text-black dark:text-white uppercase tracking-widest flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
            OFFLINE SANDBOX STATEMENT
          </span>
          <p className="text-[9px] text-neutral-450 dark:text-neutral-500 leading-relaxed tracking-wider">
            All PDF modules and Image operations are processed client-side. The application does not maintain server databases, API proxies, or backend tracking. Your files are entirely secure and remain on your hard drive at all times.
          </p>
          <div className="flex items-center gap-2 text-[8px] bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3 text-neutral-500 font-mono">
            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>LOCAL ENGINE VERIFIED: JSZIP, PDF-LIB, PDFJS-DIST LOADED Client-Side.</span>
          </div>
        </div>

      </div>

      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-5 mt-16 bg-transparent font-mono">
        <div className="text-center">
          <p className="text-[9px] text-neutral-400 dark:text-neutral-600 tracking-wider">
            SHRINK WORKSPACE ENGINE VERSION 1.1.0 (PRODUCTION)
          </p>
        </div>
      </footer>
    </div>
  );
}
