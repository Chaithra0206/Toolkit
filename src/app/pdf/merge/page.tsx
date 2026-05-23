/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, 
  Layers, 
  ArrowUp, 
  ArrowDown, 
  FileDown, 
  Play,
  FileCheck
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { useApp } from '../../context/AppContext';
import UploadDropzone from '../../components/UploadDropzone';
import { toast, Toaster } from 'sonner';

interface PdfFileItem {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  file: File;
}

export default function MergePdfPage() {
  const { addProcessedStat } = useApp();
  const [files, setFiles] = useState<PdfFileItem[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergedUrl, setMergedUrl] = useState<string | null>(null);
  const [mergedName, setMergedName] = useState<string>('');

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFilesSelected = async (selectedFiles: File[]) => {
    const toastId = toast.loading("Analyzing uploaded PDF files...", {
      style: {
        fontFamily: "var(--font-geist-mono), monospace",
        fontSize: "10px",
        borderRadius: "0",
        border: "1px solid black"
      }
    });

    try {
      const newItems: PdfFileItem[] = [];
      for (const file of selectedFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const pageCount = pdfDoc.getPageCount();

        newItems.push({
          id: `pdf-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          name: file.name,
          size: file.size,
          pageCount: pageCount,
          file: file
        });
      }

      setFiles(prev => [...prev, ...newItems]);
      toast.success(`Successfully added ${selectedFiles.length} file(s).`, {
        id: toastId,
        style: {
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: "10px",
          borderRadius: "0",
          border: "1px solid black"
        }
      });
      
      // Reset merged state if new files are added
      if (mergedUrl) {
        URL.revokeObjectURL(mergedUrl);
        setMergedUrl(null);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to parse some PDF files. Ensure they are not encrypted or corrupted.", {
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

  const handleRemove = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (mergedUrl) {
      URL.revokeObjectURL(mergedUrl);
      setMergedUrl(null);
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setFiles(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
  };

  const moveDown = (index: number) => {
    if (index === files.length - 1) return;
    setFiles(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      toast.error("Please add at least 2 PDF files to merge.", {
        style: {
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: "10px",
          borderRadius: "0",
          border: "1px solid black"
        }
      });
      return;
    }

    setIsMerging(true);
    const toastId = toast.loading("Merging PDF files offline...", {
      style: {
        fontFamily: "var(--font-geist-mono), monospace",
        fontSize: "10px",
        borderRadius: "0",
        border: "1px solid black"
      }
    });

    try {
      const mergedPdf = await PDFDocument.create();

      for (const item of files) {
        const fileBytes = await item.file.arrayBuffer();
        const srcDoc = await PDFDocument.load(fileBytes);
        const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setMergedUrl(url);
      setMergedName(`merged-${Date.now()}.pdf`);
      
      // Update global session stats
      addProcessedStat(0); // Mark 1 file processed, savings 0 since it is a merge

      toast.success("PDFs merged successfully!", {
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
      toast.error("Failed to merge PDFs. An error occurred during page extraction.", {
        id: toastId,
        style: {
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: "10px",
          borderRadius: "0",
          border: "1px solid black"
        }
      });
    } finally {
      setIsMerging(false);
    }
  };

  const handleClear = () => {
    setFiles([]);
    if (mergedUrl) {
      URL.revokeObjectURL(mergedUrl);
      setMergedUrl(null);
    }
  };

  const totalPages = files.reduce((sum, f) => sum + f.pageCount, 0);

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6 font-mono">
      <Toaster position="bottom-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div>
          <h1 className="text-sm font-black tracking-widest text-black dark:text-white uppercase flex items-center gap-2 leading-none">
            [ MERGE PDF ]
            {isMerging && (
              <span className="w-1.5 h-1.5 bg-black dark:bg-white animate-pulse" />
            )}
          </h1>
        </div>

        {files.length > 0 && (
          <div className="flex items-center gap-3 bg-transparent p-3 py-1.5 border border-black dark:border-white rounded-none shrink-0 font-mono text-[9px] tracking-widest text-black dark:text-white select-none">
            <div>
              <span className="font-extrabold block">TOTAL FILES: {files.length}</span>
              <span className="block mt-0.5 opacity-60">TOTAL PAGES: {totalPages}</span>
            </div>
          </div>
        )}
      </div>

      {/* Upload Dropzone */}
      <UploadDropzone
        onFilesSelected={handleFilesSelected}
        acceptedTypes={['application/pdf']}
        acceptedExtensions={['.pdf']}
        descriptionText="DRAG & DROP PDF FILES HERE"
      />

      {files.length > 0 && (
        <div className="flex flex-col gap-6 mt-2">
          
          {/* Actions Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-3">
            <span className="text-[10px] font-bold tracking-widest text-neutral-450 dark:text-neutral-500 uppercase">
              MERGE QUEUE
            </span>

            <div className="flex items-center gap-2 self-end sm:self-auto font-mono">
              <button
                onClick={handleMerge}
                disabled={isMerging || files.length < 2}
                className="px-4 py-2 bg-black hover:bg-neutral-900 dark:bg-white dark:hover:bg-neutral-100 disabled:opacity-35 text-white dark:text-black rounded-none text-[9px] tracking-widest font-extrabold uppercase flex items-center gap-1.5 cursor-pointer shadow-xs select-none border border-black dark:border-white transition-all duration-100 active:scale-98"
              >
                <Play className="w-3 h-3 fill-current" />
                Merge PDFs
              </button>

              <button
                onClick={handleClear}
                disabled={isMerging}
                className="px-3 py-2 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-450 hover:text-black dark:hover:text-white rounded-none text-[9px] tracking-widest font-extrabold uppercase flex items-center gap-1.5 cursor-pointer select-none transition-all duration-100"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            </div>
          </div>

          {/* Merged Download Result Card */}
          {mergedUrl && (
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
                    MERGE OPERATION COMPLETE
                  </span>
                  <span className="text-[9px] text-neutral-450 dark:text-neutral-500 mt-1.5 truncate max-w-xs sm:max-w-md">
                    {mergedName}
                  </span>
                </div>
              </div>
              
              <a
                href={mergedUrl}
                download={mergedName}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white dark:bg-green-400 dark:hover:bg-green-500 dark:text-black rounded-none text-[9px] tracking-widest font-extrabold uppercase flex items-center gap-1.5 cursor-pointer select-none transition-all duration-100"
              >
                <FileDown className="w-3.5 h-3.5" />
                Download PDF
              </a>
            </motion.div>
          )}

          {/* List of Files to Merge */}
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {files.map((item, idx) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="border border-neutral-200 dark:border-neutral-800 p-4 rounded-none flex items-center justify-between gap-4 bg-transparent transition-colors hover:bg-neutral-50/30 dark:hover:bg-neutral-900/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[9px] font-extrabold text-neutral-400 font-mono w-5">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div className="w-8 h-8 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-neutral-400 shrink-0">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-black text-black dark:text-white truncate max-w-xs sm:max-w-md uppercase tracking-wider">
                        {item.name}
                      </span>
                      <div className="flex items-center gap-2 text-[8px] text-neutral-450 dark:text-neutral-500 mt-1">
                        <span>SIZE: {formatBytes(item.size)}</span>
                        <span>•</span>
                        <span>PAGES: {item.pageCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Reordering and removing controls */}
                  <div className="flex items-center gap-2 font-mono shrink-0">
                    <button
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0 || isMerging}
                      className="p-1 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-20 text-neutral-400 dark:text-neutral-500 cursor-pointer"
                      title="Move file up in merge order"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => moveDown(idx)}
                      disabled={idx === files.length - 1 || isMerging}
                      className="p-1 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-20 text-neutral-400 dark:text-neutral-500 cursor-pointer"
                      title="Move file down in merge order"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleRemove(item.id)}
                      disabled={isMerging}
                      className="p-1 border border-red-200 dark:border-red-950 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-550 cursor-pointer"
                      title="Remove file from merge queue"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

        </div>
      )}

      {files.length === 0 && (
        <div className="py-24 text-center flex flex-col items-center justify-center gap-4 bg-transparent border border-dashed border-neutral-200 dark:border-neutral-800 rounded-none font-mono">
          <div className="w-10 h-10 border border-black dark:border-white flex items-center justify-center text-black dark:text-white shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="max-w-xs">
            <span className="text-[10px] font-black text-black dark:text-white uppercase tracking-widest block">
              [ MERGE QUEUE IS EMPTY ]
            </span>
            <p className="text-[9px] text-neutral-400 dark:text-neutral-500 mt-2 leading-relaxed tracking-wider">
              Upload two or more PDF files. Drag/sort their processing order, and click "Merge PDFs" to stitch them together securely offline.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
