/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ImageIcon, 
  RefreshCw, 
  FileText, 
  Layers, 
  Scissors, 
  ArrowDownToLine, 
  ImagePlay, 
  Settings, 
  ShieldCheck, 
  Cpu, 
  HardDrive,
  Video,
  Film,
  Sliders
} from 'lucide-react';
import { useApp } from './context/AppContext';
import { formatBytes } from './utils/compressor';

export default function DashboardPage() {
  const { stats } = useApp();

  const toolCategories = [
    {
      title: "IMAGE OPTIMIZATION",
      tools: [
        {
          name: "IMAGE COMPRESSOR",
          description: "Reduce image file sizes up to 90% without losing quality. Support for JPEG, PNG, WEBP, and AVIF.",
          href: "/compressor",
          icon: ImageIcon,
          color: "border-neutral-200 dark:border-neutral-800"
        },
        {
          name: "IMAGE CONVERTER",
          description: "Batch convert images between JPEG, PNG, WEBP, and AVIF formats with custom dimensions.",
          href: "/converter",
          icon: RefreshCw,
          color: "border-neutral-200 dark:border-neutral-800"
        }
      ]
    },
    {
      title: "PDF SUITE",
      tools: [
        {
          name: "PDF CONVERTER",
          description: "Convert PDF documents to PNG, JPG, or raw Text. Batch extract pages instantly.",
          href: "/pdf/converter",
          icon: FileText,
          color: "border-neutral-200 dark:border-neutral-800"
        },
        {
          name: "MERGE PDF",
          description: "Merge multiple PDF documents into a single organized file. Reorder pages dynamically.",
          href: "/pdf/merge",
          icon: Layers,
          color: "border-neutral-200 dark:border-neutral-800"
        },
        {
          name: "SPLIT PDF",
          description: "Extract specific page ranges, split individual pages, or extract custom intervals.",
          href: "/pdf/split",
          icon: Scissors,
          color: "border-neutral-200 dark:border-neutral-800"
        },
        {
          name: "PDF COMPRESSOR",
          description: "Optimize and shrink PDF files client-side while preserving document fidelity.",
          href: "/pdf/compress",
          icon: ArrowDownToLine,
          color: "border-neutral-200 dark:border-neutral-800"
        },
        {
          name: "IMAGES TO PDF",
          description: "Convert images to PDF pages. Customize layout dimensions, margins, and orientation.",
          href: "/pdf/images-to-pdf",
          icon: ImagePlay,
          color: "border-neutral-200 dark:border-neutral-800"
        }
      ]
    },
    {
      title: "VIDEO TOOLS",
      tools: [
        {
          name: "VIDEO COMPRESSOR",
          description: "Compress video files fully offline using FFmpeg WebAssembly. Preserve quality with visual presets.",
          href: "/video/compressor",
          icon: Video,
          color: "border-neutral-200 dark:border-neutral-800"
        },
        {
          name: "VIDEO CONVERTER",
          description: "Convert videos between MP4, MOV, WEBM, AVI, and animated GIFs without server uploads.",
          href: "/video/converter",
          icon: RefreshCw,
          color: "border-neutral-200 dark:border-neutral-800"
        },
        {
          name: "VIDEO TRIMMER",
          description: "Trim start and end ranges using timeline range sliders with real-time browser preview.",
          href: "/video/trimmer",
          icon: Sliders,
          color: "border-neutral-200 dark:border-neutral-800"
        },
        {
          name: "GIF MAKER",
          description: "Transform video sequences into lightweight, looping animated GIFs with custom FPS and scale settings.",
          href: "/video/gif-maker",
          icon: Film,
          color: "border-neutral-200 dark:border-neutral-800"
        }
      ]
    }
  ];

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-8 font-mono">
      
      {/* Hero Welcome Section */}
      <div className="flex flex-col gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-6">
        <h1 className="text-sm font-black tracking-widest text-black dark:text-white uppercase leading-none">
          [ FILE TOOLKIT MAIN DASHBOARD ]
        </h1>
        <p className="text-[10px] text-neutral-450 dark:text-neutral-500 leading-relaxed max-w-xl tracking-wider">
          Browser-native, offline file suite. Files are processed entirely in-memory using Web Assembly and local canvas buffers. No files are uploaded to servers.
        </p>
      </div>

      {/* Real-time Telemetry Stats Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 border border-black dark:border-white p-4 gap-4 bg-transparent select-none">
        <div className="flex flex-col gap-1 p-2">
          <span className="text-[8px] font-extrabold text-neutral-450 dark:text-neutral-500 tracking-widest uppercase">
            COMPLETED OPERATIONS
          </span>
          <span className="text-xl font-black text-black dark:text-white">
            {stats.filesProcessed} <span className="text-[10px] font-normal opacity-50">FILES</span>
          </span>
        </div>
        <div className="flex flex-col gap-1 p-2 border-t sm:border-t-0 sm:border-l border-neutral-200 dark:border-neutral-800">
          <span className="text-[8px] font-extrabold text-neutral-450 dark:text-neutral-500 tracking-widest uppercase">
            LOCAL STORAGE SAVINGS
          </span>
          <span className="text-xl font-black text-black dark:text-white">
            {formatBytes(stats.bytesSaved)}
          </span>
        </div>
        <div className="flex flex-col gap-1 p-2 border-t sm:border-t-0 sm:border-l border-neutral-200 dark:border-neutral-800">
          <span className="text-[8px] font-extrabold text-neutral-450 dark:text-neutral-500 tracking-widest uppercase">
            SECURITY PROFILE
          </span>
          <span className="text-xl font-black text-green-600 dark:text-green-400 flex items-center gap-1.5 leading-none">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            100% OFFLINE
          </span>
        </div>
      </div>

      {/* Grid of Categories and Tool Cards */}
      <div className="flex flex-col gap-8">
        {toolCategories.map((category) => (
          <div key={category.title} className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-neutral-450 dark:text-neutral-500 tracking-widest">
                // {category.title}
              </span>
              <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {category.tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <motion.div
                    key={tool.name}
                    whileHover={{ scale: 0.99, borderColor: "#000" }}
                    className="group border border-neutral-200 dark:border-neutral-800 p-5 rounded-none flex flex-col justify-between gap-4 transition-colors duration-100 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50 relative overflow-hidden"
                  >
                    {/* Corner accent for hover indicator */}
                    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-black dark:border-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-black dark:text-white shrink-0 group-hover:border-black dark:group-hover:border-white transition-colors duration-150">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <h3 className="text-xs font-black text-black dark:text-white tracking-widest uppercase">
                          {tool.name}
                        </h3>
                      </div>
                      <p className="text-[9px] text-neutral-450 dark:text-neutral-500 leading-relaxed tracking-wider mt-1">
                        {tool.description}
                      </p>
                    </div>

                    <div className="mt-2 self-start">
                      <Link 
                        href={tool.href}
                        className="text-[9px] font-black text-black dark:text-white border border-black dark:border-white px-3 py-1 bg-transparent hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all uppercase duration-150 active:scale-95 flex items-center gap-1 cursor-pointer select-none"
                      >
                        Launch Module &rarr;
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Technical Specifications telemetry section */}
      <div className="border border-neutral-200 dark:border-neutral-800 p-4 flex flex-col gap-3 mt-4">
        <span className="text-[9px] font-black text-black dark:text-white tracking-widest uppercase flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-neutral-450" />
          SYSTEM SPECIFICATIONS
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[8px] text-neutral-450 dark:text-neutral-500 tracking-wider">
          <div>
            <span className="block font-bold uppercase">ENGINE STATUS:</span>
            <span className="block font-extrabold text-green-600 dark:text-green-400 mt-0.5">STANDBY / LOCAL</span>
          </div>
          <div>
            <span className="block font-bold uppercase">MEMORY FOOTPRINT:</span>
            <span className="block font-extrabold text-black dark:text-white mt-0.5">&lt; 10 MB STANDBY</span>
          </div>
          <div>
            <span className="block font-bold uppercase">SANDBOX ISOLATION:</span>
            <span className="block font-extrabold text-black dark:text-white mt-0.5">ACTIVE</span>
          </div>
          <div>
            <span className="block font-bold uppercase">FRAMEWORK:</span>
            <span className="block font-extrabold text-black dark:text-white mt-0.5">NEXT.JS 16 / CLIENT-SIDE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
