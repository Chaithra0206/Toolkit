'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scissors, 
  Trash2, 
  Play, 
  FileDown, 
  FileCheck,
  HelpCircle
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { useApp } from '../../context/AppContext';
import UploadDropzone from '../../components/UploadDropzone';
import { toast, Toaster } from 'sonner';

type SplitMode = 'range' | 'individual' | 'interval';

interface LoadedPdf {
  name: string;
  size: number;
  pageCount: number;
  file: File;
}

export default function SplitPdfPage() {
  const { addProcessedStat } = useApp();
  const [loadedPdf, setLoadedPdf] = useState<LoadedPdf | null>(null);
  
  // Settings
  const [splitMode, setSplitMode] = useState<SplitMode>('range');
  const [rangeInput, setRangeInput] = useState<string>('1-2, 3-4');
  const [intervalInput, setIntervalInput] = useState<number>(2);

  // States
  const [isSplitting, setIsSplitting] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultName, setResultName] = useState<string>('');
  const [isZipResult, setIsZipResult] = useState(false);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];

    const toastId = toast.loading("Analyzing PDF structure...", {
      style: {
        fontFamily: "var(--font-geist-mono), monospace",
        fontSize: "10px",
        borderRadius: "0",
        border: "1px solid black"
      }
    });

    try {
      const bytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const count = pdf.getPageCount();

      setLoadedPdf({
        name: file.name,
        size: file.size,
        pageCount: count,
        file: file
      });

      // Clear old results
      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
        setResultUrl(null);
      }

      // Pre-fill a sensible page range suggestion
      if (count > 2) {
        setRangeInput(`1-2, 3-${count}`);
      } else if (count === 2) {
        setRangeInput(`1, 2`);
      } else {
        setRangeInput(`1`);
      }

      toast.success("PDF analyzed successfully. Choose split configurations below.", {
        id: toastId,
        style: {
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: "10px",
          borderRadius: "0",
          border: "1px solid black"
        }
      });
    } catch (e) {
      console.error(e);
      toast.error("Failed to read PDF file. Make sure it is not password protected.", {
        id: toastId,
        style: {
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: "10px",
          borderRadius: "0",
          border: "1px solid black"
        }
      });
    }
  };

  const parseRanges = (rangeString: string, maxPages: number): number[][] => {
    const parts = rangeString.split(',');
    const result: number[][] = [];
    
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      
      if (trimmed.includes('-')) {
        const [startStr, endStr] = trimmed.split('-');
        const start = parseInt(startStr.trim(), 10);
        const end = parseInt(endStr.trim(), 10);
        
        if (isNaN(start) || isNaN(end) || start < 1 || end < start || start > maxPages) {
          throw new Error(`Invalid range parameters: "${trimmed}"`);
        }
        
        const range: number[] = [];
        const clampEnd = Math.min(end, maxPages);
        for (let i = start; i <= clampEnd; i++) {
          range.push(i - 1); // 0-indexed
        }
        result.push(range);
      } else {
        const page = parseInt(trimmed, 10);
        if (isNaN(page) || page < 1 || page > maxPages) {
          throw new Error(`Invalid page number: "${trimmed}"`);
        }
        result.push([page - 1]); // 0-indexed
      }
    }
    return result;
  };

  const handleSplit = async () => {
    if (!loadedPdf) return;

    setIsSplitting(true);
    const toastId = toast.loading("Executing split operations offline...", {
      style: {
        fontFamily: "var(--font-geist-mono), monospace",
        fontSize: "10px",
        borderRadius: "0",
        border: "1px solid black"
      }
    });

    try {
      const bytes = await loadedPdf.file.arrayBuffer();
      const srcDoc = await PDFDocument.load(bytes);
      const totalPages = loadedPdf.pageCount;

      let ranges: number[][] = [];

      if (splitMode === 'range') {
        ranges = parseRanges(rangeInput, totalPages);
      } else if (splitMode === 'individual') {
        for (let i = 0; i < totalPages; i++) {
          ranges.push([i]);
        }
      } else if (splitMode === 'interval') {
        const size = Math.max(1, intervalInput);
        for (let i = 0; i < totalPages; i += size) {
          const chunk: number[] = [];
          for (let j = i; j < Math.min(i + size, totalPages); j++) {
            chunk.push(j);
          }
          ranges.push(chunk);
        }
      }

      if (ranges.length === 0) {
        throw new Error("No pages designated to split.");
      }

      const cleanBaseName = loadedPdf.name.replace('.pdf', '');

      if (ranges.length === 1) {
        // Single split - output a single PDF directly
        const destDoc = await PDFDocument.create();
        const copiedPages = await destDoc.copyPages(srcDoc, ranges[0]);
        copiedPages.forEach(p => destDoc.addPage(p));
        const finalBytes = await destDoc.save();

        const blob = new Blob([finalBytes as any], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        setResultUrl(url);
        setIsZipResult(false);
        setResultName(`${cleanBaseName}-split.pdf`);
      } else {
        // Multiple splits - compress into a ZIP file
        const zip = new JSZip();
        
        for (let idx = 0; idx < ranges.length; idx++) {
          const range = ranges[idx];
          const destDoc = await PDFDocument.create();
          const copiedPages = await destDoc.copyPages(srcDoc, range);
          copiedPages.forEach(p => destDoc.addPage(p));
          const finalBytes = await destDoc.save();

          // Generate detailed file part name
          const pageListLabel = range.length === 1 
            ? `page-${range[0] + 1}` 
            : `pages-${range[0] + 1}-to-${range[range.length - 1] + 1}`;
          
          zip.file(`${cleanBaseName}_part-${idx + 1}_(${pageListLabel}).pdf`, finalBytes);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);

        setResultUrl(url);
        setIsZipResult(true);
        setResultName(`${cleanBaseName}-split-documents.zip`);
      }

      // Update telemetry
      addProcessedStat(0);

      toast.success(`PDF split successfully into ${ranges.length} component(s)!`, {
        id: toastId,
        style: {
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: "10px",
          borderRadius: "0",
          border: "1px solid black"
        }
      });
    } catch (e) {
      console.error(e);
      const errMsg = e instanceof Error ? e.message : "Failed to execute split.";
      toast.error(errMsg, {
        id: toastId,
        style: {
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: "10px",
          borderRadius: "0",
          border: "1px solid black"
        }
      });
    } finally {
      setIsSplitting(false);
    }
  };

  const handleClear = () => {
    setLoadedPdf(null);
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
    }
  };

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6 font-mono">
      <Toaster position="bottom-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div>
          <h1 className="text-sm font-black tracking-widest text-black dark:text-white uppercase flex items-center gap-2 leading-none">
            [ SPLIT PDF ]
            {isSplitting && (
              <span className="w-1.5 h-1.5 bg-black dark:bg-white animate-pulse" />
            )}
          </h1>
        </div>
      </div>

      {!loadedPdf ? (
        <UploadDropzone
          onFilesSelected={handleFileSelected}
          acceptedTypes={['application/pdf']}
          acceptedExtensions={['.pdf']}
          descriptionText="UPLOAD PDF FILE TO SPLIT"
          maxSizeMB={150}
        />
      ) : (
        <div className="flex flex-col gap-6 mt-2">
          
          {/* File Card & Control Header */}
          <div className="border border-neutral-200 dark:border-neutral-800 p-5 rounded-none flex flex-col md:flex-row items-center justify-between gap-4 bg-transparent">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-neutral-400 shrink-0">
                <Scissors className="w-5 h-5 text-black dark:text-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-black text-black dark:text-white truncate max-w-xs sm:max-w-md uppercase tracking-wider">
                  {loadedPdf.name}
                </span>
                <div className="flex items-center gap-2 text-[8px] text-neutral-450 dark:text-neutral-500 mt-1">
                  <span>SIZE: {formatBytes(loadedPdf.size)}</span>
                  <span>•</span>
                  <span>TOTAL PAGES: {loadedPdf.pageCount}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleClear}
              disabled={isSplitting}
              className="px-3 py-1.5 border border-red-200 dark:border-red-950 text-red-550 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-none text-[9px] tracking-widest font-extrabold uppercase flex items-center gap-1.5 cursor-pointer transition-all duration-100"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear File
            </button>
          </div>

          {/* Form Settings Box */}
          <div className="border border-neutral-200 dark:border-neutral-800 p-5 rounded-none flex flex-col gap-6">
            <span className="text-[10px] font-black text-black dark:text-white uppercase tracking-widest">
              SPLIT SPECIFICATIONS
            </span>

            {/* Split Mode Selector Tabs */}
            <div className="grid grid-cols-3 border border-neutral-200 dark:border-neutral-800 p-1 bg-neutral-50/50 dark:bg-neutral-900/50">
              {(['range', 'individual', 'interval'] as SplitMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setSplitMode(mode)}
                  className={`py-2 text-[9px] tracking-widest font-extrabold uppercase select-none rounded-none cursor-pointer transition-all ${
                    splitMode === mode 
                      ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs font-black' 
                      : 'text-neutral-450 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {mode === 'range' ? 'Page Ranges' : mode === 'individual' ? 'Extract Pages' : 'Custom Interval'}
                </button>
              ))}
            </div>

            {/* Dynamic Inputs depending on mode */}
            {splitMode === 'range' && (
              <div className="flex flex-col gap-2 font-mono">
                <label className="text-[9px] font-bold text-neutral-450 dark:text-neutral-500 uppercase tracking-widest">
                  DEFINE RANGES (COMMA SEPARATED):
                </label>
                <div className="flex flex-col gap-1.5">
                  <input
                    type="text"
                    value={rangeInput}
                    onChange={(e) => setRangeInput(e.target.value)}
                    placeholder="e.g. 1-2, 3-5, 8"
                    className="w-full bg-transparent border border-neutral-300 dark:border-neutral-800 p-3 rounded-none text-xs text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white font-mono"
                  />
                  <div className="flex items-center gap-1.5 text-[8px] text-neutral-400 dark:text-neutral-550 leading-relaxed">
                    <HelpCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Extract multiple components. E.g. "1-3, 5" splits into Page 1-3 (Part 1) and Page 5 (Part 2).</span>
                  </div>
                </div>
              </div>
            )}

            {splitMode === 'individual' && (
              <div className="flex flex-col gap-1 border border-dashed border-neutral-200 dark:border-neutral-800 p-4 font-mono text-[9px] text-neutral-450 dark:text-neutral-500 leading-relaxed tracking-wider">
                <span className="font-extrabold text-black dark:text-white block uppercase">EXTRACT INDIVIDUAL PAGES MODE ACTIVE</span>
                <p className="mt-1">
                  This action splits your document of {loadedPdf.pageCount} page(s) into {loadedPdf.pageCount} separate single-page PDF files, bundled together inside a downloadable ZIP.
                </p>
              </div>
            )}

            {splitMode === 'interval' && (
              <div className="flex flex-col gap-2 font-mono">
                <label className="text-[9px] font-bold text-neutral-450 dark:text-neutral-500 uppercase tracking-widest">
                  SPLIT EVERY N PAGES:
                </label>
                <input
                  type="number"
                  min={1}
                  max={loadedPdf.pageCount}
                  value={intervalInput}
                  onChange={(e) => setIntervalInput(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-32 bg-transparent border border-neutral-300 dark:border-neutral-800 p-3 rounded-none text-xs text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white font-mono"
                />
                <span className="text-[8px] text-neutral-400 dark:text-neutral-550 block mt-1 tracking-wide">
                  E.g. Setting "2" on a 6-page file creates three PDFs: Part 1 (Pages 1-2), Part 2 (Pages 3-4), Part 3 (Pages 5-6).
                </span>
              </div>
            )}

            {/* Split Trigger Button */}
            <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4 flex justify-end">
              <button
                onClick={handleSplit}
                disabled={isSplitting || (splitMode === 'range' && !rangeInput.trim())}
                className="px-5 py-2 bg-black hover:bg-neutral-900 dark:bg-white dark:hover:bg-neutral-100 disabled:opacity-35 text-white dark:text-black rounded-none text-[9px] tracking-widest font-extrabold uppercase flex items-center gap-1.5 cursor-pointer shadow-xs select-none border border-black dark:border-white transition-all duration-100 active:scale-98"
              >
                <Play className="w-3 h-3 fill-current" />
                SPLIT DOCUMENT
              </button>
            </div>

          </div>

          {/* Result visual card */}
          {resultUrl && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-green-600 dark:border-green-400 p-5 rounded-none flex flex-col sm:flex-row items-center justify-between gap-4 bg-transparent font-mono"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border border-green-600 dark:border-green-400 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest leading-none">
                    SPLIT OPERATIONS FINISHED
                  </span>
                  <span className="text-[9px] text-neutral-450 dark:text-neutral-500 mt-1.5 truncate max-w-xs sm:max-w-md">
                    {resultName} ({isZipResult ? "ZIP Bundle" : "Single PDF"})
                  </span>
                </div>
              </div>
              
              <a
                href={resultUrl}
                download={resultName}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white dark:bg-green-400 dark:hover:bg-green-500 dark:text-black rounded-none text-[9px] tracking-widest font-extrabold uppercase flex items-center gap-1.5 cursor-pointer select-none transition-all duration-100"
              >
                <FileDown className="w-3.5 h-3.5" />
                Download Results
              </a>
            </motion.div>
          )}

        </div>
      )}
    </div>
  );
}
