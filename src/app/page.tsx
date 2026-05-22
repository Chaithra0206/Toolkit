/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, 
  Image as ImageIcon, 
  FolderDown, 
  ChevronRight,
  Sliders
} from 'lucide-react';

import { ImageItem, CompressionSettings } from './types';
import { compressImage, formatBytes } from './utils/compressor';
import DropZone from './components/DropZone';
import ControlPanel from './components/ControlPanel';
import ImageList from './components/ImageList';
import SideBySidePreview from './components/SideBySidePreview';

import JSZip from 'jszip';

function createImageItem(file: File, objectUrl: string, width: number, height: number): ImageItem {
  return {
    id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    name: file.name,
    file: file,
    originalType: file.type,
    originalSize: file.size,
    originalWidth: width,
    originalHeight: height,
    originalUrl: objectUrl,
    compressedType: '',
    compressedSize: null,
    compressedWidth: null,
    compressedHeight: null,
    compressedUrl: null,
    percentage: null,
    status: 'idle',
    errorMsg: null
  };
}

export default function Home() {
  // Theme management: Default to dark, responsive toggle
  const [darkMode, setDarkMode] = useState<boolean>(true);

  // Default initial compression settings
  const [settings, setSettings] = useState<CompressionSettings>({
    quality: 0.8, // 80% default representation
    format: 'original',
    resizeMode: 'none',
    resizeValue: 100,
    resizeWidth: 1024,
    resizeHeight: 768,
    lossless: false,
    preserveMetadata: true,
    autoFormat: false
  });

  // List of state images in the active workspace
  const [images, setImages] = useState<ImageItem[]>([]);
  
  // Selected single image for side-by-side split visual preview
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);

  // Show/hide optimization settings inline
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Global batch compression progress loading indicator
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

  // Sync dark theme mode classes on HTML tag in browser
  useEffect(() => {
    // Read theme preference from localStorage on mount
    const stored = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const prefersDark = stored ? stored === 'dark' : systemPrefersDark;

    // Apply the class directly to prevent a visual flash
    const root = window.document.documentElement;
    if (prefersDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Defer React state update to the next tick to prevent cascading render warning on mount
    setTimeout(() => {
      setDarkMode(prefersDark);
    }, 0);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Handle uploading and auto-processing images
  const handleFilesSelected = async (files: FileList | File[]) => {
    const newItems: ImageItem[] = [];

    setIsProcessingBatch(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const objectUrl = URL.createObjectURL(file);
      
      // Compute original dimensions before state injection
      let width = 0;
      let height = 0;
      try {
        const dummyImg = new Image();
        await new Promise<void>((resolve, reject) => {
          dummyImg.onload = () => resolve();
          dummyImg.onerror = () => reject();
          dummyImg.src = objectUrl;
        });
        width = dummyImg.naturalWidth || dummyImg.width;
        height = dummyImg.naturalHeight || dummyImg.height;
      } catch {
        console.warn("Could not determine image dimensions size, falling back to basic bounds.");
      }

      const item = createImageItem(file, objectUrl, width, height);

      newItems.push(item);
    }

    // Insert newly uploaded files into image array
    setImages(prev => {
      const updated = [...prev, ...newItems];
      // Auto-preview first of the newly uploaded items
      if (newItems.length > 0) {
        setActivePreviewId(newItems[0].id);
      }
      return updated;
    });

    setIsProcessingBatch(false);

    // Auto-trigger compression for each file sequentially
    for (const item of newItems) {
      triggerSingleCompression(item.id, item.file, settings);
    }
  };

  // Perform single-image canvas compression
  const triggerSingleCompression = async (
    id: string, 
    file: File, 
    currentSettings: CompressionSettings
  ) => {
    setImages(prev => prev.map(img => 
      img.id === id ? { ...img, status: 'compressing', errorMsg: null } : img
    ));

    try {
      const result = await compressImage(file, currentSettings);
      const optimizedUrl = URL.createObjectURL(result.blob);
      
      const reduction = ((result.blob.size - file.size) / file.size) * 100;

      setImages(prev => prev.map(img => {
        if (img.id === id) {
          // Free the old compressed URL to avoid browser memory leaks
          if (img.compressedUrl) {
            URL.revokeObjectURL(img.compressedUrl);
          }
          return {
            ...img,
            compressedType: result.format,
            compressedSize: result.blob.size,
            compressedWidth: result.width,
            compressedHeight: result.height,
            compressedUrl: optimizedUrl,
            percentage: parseFloat(reduction.toFixed(1)),
            status: 'completed'
          };
        }
        return img;
      }));
    } catch (err) {
      console.error("Compression error:", err);
      const errMessage = err instanceof Error ? err.message : "Failed to parse image format.";
      setImages(prev => prev.map(img => 
        img.id === id ? { 
          ...img, 
          status: 'error', 
          errorMsg: errMessage 
        } : img
      ));
    }
  };

  // Triggers batch recalculation based on updated settings values
  const handleApplyToAll = async () => {
    if (images.length === 0) return;
    setIsProcessingBatch(true);
    
    // Batch process all images using current control parameters
    const promises = images.map(img => 
      triggerSingleCompression(img.id, img.file, settings)
    );

    await Promise.all(promises);
    setIsProcessingBatch(false);
  };

  // Retry compression for single item
  const handleRecompressSingle = (id: string) => {
    const item = images.find(img => img.id === id);
    if (item) {
      triggerSingleCompression(id, item.file, settings);
    }
  };

  // Remove individual item
  const handleRemoveImage = (id: string) => {
    setImages(prev => {
      const target = prev.find(img => img.id === id);
      if (target) {
        // Clear object URLs to prevent memory leakage
        URL.revokeObjectURL(target.originalUrl);
        if (target.compressedUrl) {
          URL.revokeObjectURL(target.compressedUrl);
        }
      }
      const filtered = prev.filter(img => img.id !== id);
      
      // Reset preview state if target is active
      if (activePreviewId === id) {
        setActivePreviewId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  // Clear all images state
  const handleClearAll = () => {
    images.forEach(img => {
      URL.revokeObjectURL(img.originalUrl);
      if (img.compressedUrl) {
        URL.revokeObjectURL(img.compressedUrl);
      }
    });
    setImages([]);
    setActivePreviewId(null);
  };

  // Download single item file
  const handleDownloadSingle = (image: ImageItem) => {
    if (image.status !== 'completed' || !image.compressedUrl) return;
    
    // Create direct dynamic visual anchor link
    const extension = image.compressedType.split('/').pop() || 'png';
    const cleanOrigName = image.name.substring(0, image.name.lastIndexOf('.')) || image.name;
    const a = document.createElement('a');
    a.href = image.compressedUrl;
    a.download = `${cleanOrigName}-optimized.${extension}`;
    a.click();
  };

  // Zip downloads helper
  const handleDownloadAllAsZip = async () => {
    const completedItems = images.filter(img => img.status === 'completed' && img.compressedUrl);
    if (completedItems.length === 0) return;

    setIsProcessingBatch(true);
    const zip = new JSZip();

    try {
      for (const item of completedItems) {
        const response = await fetch(item.compressedUrl!);
        const blob = await response.blob();
        
        const extension = item.compressedType.split('/').pop() || 'png';
        const cleanOrigName = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
        
        zip.file(`${cleanOrigName}-optimized.${extension}`, blob);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const mainZipUrl = URL.createObjectURL(content);

      const a = document.createElement('a');
      a.href = mainZipUrl;
      a.download = `optimized-images-${Date.now()}.zip`;
      a.click();
      
      // Cleanup
      URL.revokeObjectURL(mainZipUrl);
    } catch (e) {
      console.error("Failed to compile ZIP file:", e);
      alert("Encountered error producing ZIP downscale packet.");
    } finally {
      setIsProcessingBatch(false);
    }
  };

  // Aggregate summary statistics
  const totalOriginalSize = images.reduce((sum, img) => sum + img.originalSize, 0);
  const totalCompressedSize = images.reduce((sum, img) => {
    return sum + (img.compressedSize !== null ? img.compressedSize : img.originalSize);
  }, 0);

  const totalReductionRatio = totalOriginalSize > 0 
    ? ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100 
    : 0;

  const totalBytesSaved = Math.max(0, totalOriginalSize - totalCompressedSize);

  // Active Preview Image target resolver
  const activeImage = images.find(img => img.id === activePreviewId);

  return (
    <div className="min-h-screen bg-[#FBFBFB] dark:bg-[#0C0D0E] font-sans antialiased text-slate-800 dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-200">
      
      {/* LEFT SIDEBAR: Persistent parameters panel on desktop, header on mobile */}
      <aside className="w-full md:w-80 lg:w-90 xl:w-96 md:fixed md:inset-y-0 md:left-0 bg-white dark:bg-[#121315] border-b md:border-b-0 md:border-r border-slate-200/60 dark:border-slate-800/80 flex flex-col justify-between z-30 shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
        
        {/* Sidebar Header: Brand Info */}
        <div className="flex flex-col">
         

          {/* Sidebar Body: Clean navigation & scroll link */}
          <div className="p-4 flex flex-col gap-1">
           
            <button
              id="sidebar-compressor-nav"
              onClick={() => {
                const element = document.getElementById('workspace-queue');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-semibold text-xs transition-all duration-150 shadow-xs hover:opacity-90 active:scale-98 cursor-pointer select-none text-left"
            >
              <div className="w-5 h-5 rounded-lg bg-white/10 dark:bg-black/10 flex items-center justify-center shrink-0">
                <ImageIcon className="w-3.5 h-3.5 text-white dark:text-black" />
              </div>
              <span className="flex-1">Compressor Workspace</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>
          </div>
        </div>
      </aside>

      {/* RIGHT CONTAINER: Workspace, Drag zone and results list */}
      <div className="flex-1 md:pl-80 lg:pl-90 xl:pl-96 flex flex-col justify-between min-h-screen">
        
        {/* Workspace Layout */}
        <main className="max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
          
          {/* Main workspace header layout */}
          <div id="workspace-queue" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-900 pb-5">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Workspace Queue
                {isProcessingBatch && (
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0" />
                )}
              </h1>
              <p className="text-xs text-slate-450 dark:text-slate-500 mt-1">
                Optimized images will replace your targets inside the local heap file lists below.
              </p>
            </div>

            {/* Quick Batch reduction stats */}
            {images.length > 0 && (
              <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 py-1.5 px-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.01)] shrink-0 self-start sm:self-auto">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block leading-none mb-1">
                    Storage Saved
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-605 dark:text-emerald-400 font-mono leading-none">
                      {formatBytes(totalBytesSaved)}
                    </span>
                    <span className="text-[10px] font-mono leading-none text-slate-400 dark:text-slate-600">
                      (-{totalReductionRatio.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Collapsible Compression Options Preferences */}
          <div className="bg-white dark:bg-[#121315] border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-4 transition-all duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
            <button
              id="workspace-settings-toggle"
              onClick={() => setShowSettings(!showSettings)}
              className="w-full flex items-center justify-between text-left cursor-pointer select-none"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800/40 flex items-center justify-center text-slate-800 dark:text-slate-205">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Optimization Preferences
                  </span>
                  <span className="text-[10px] text-slate-405 dark:text-slate-505 font-mono mt-0.5 block">
                    Mode: {settings.lossless ? 'Lossless' : `Quality ${Math.round(settings.quality * 100)}%`} • Format: {settings.autoFormat ? 'Auto Choice' : settings.format === 'original' ? 'Original' : settings.format.replace('image/', '').toUpperCase()} • Resize: {settings.resizeMode === 'none' ? 'None' : settings.resizeMode}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold tracking-wide uppercase text-slate-500 dark:text-slate-405 bg-slate-100/60 dark:bg-slate-900 px-2.5 py-1 rounded-lg">
                  {showSettings ? 'Collapse' : 'Configure Parameters ▾'}
                </span>
              </div>
            </button>

            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 mt-4">
                    <ControlPanel 
                      settings={settings}
                      onChange={setSettings}
                      onApplyToAll={handleApplyToAll}
                      hasImages={images.length > 0}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Simple Drop Uploading Area */}
          <DropZone onFilesSelected={handleFilesSelected} />

          {/* Selected File Details Splitted Comparison View */}
          {images.length > 0 ? (
            <div className="flex flex-col gap-6 mt-2">
              
              {/* Toolbar Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Queue list ({images.length})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="compile-zip-btn"
                    onClick={handleDownloadAllAsZip}
                    disabled={isProcessingBatch || images.filter(img => img.status === 'completed').length === 0}
                    className="px-3.5 py-1.5 bg-black hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 disabled:opacity-35 text-white dark:text-black rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs select-none transition-all duration-150"
                  >
                    <FolderDown className="w-3.5 h-3.5" />
                    Download All as ZIP
                  </button>

                  <button
                    id="clear-all-workspace-btn"
                    onClick={handleClearAll}
                    disabled={isProcessingBatch}
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-550 dark:text-slate-405 hover:text-red-500/90 dark:hover:text-red-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer select-none transition-all duration-150"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear list
                  </button>
                </div>
              </div>

              {/* Core Image Preview Details Splitter */}
              {activeImage && (
                <SideBySidePreview 
                  image={activeImage}
                  onClose={() => setActivePreviewId(null)}
                />
              )}

              {/* Image files processing table list */}
              <ImageList
                images={images}
                onRemove={handleRemoveImage}
                onPreview={(img) => setActivePreviewId(img.id)}
                onDownload={handleDownloadSingle}
                onRecompressSingle={handleRecompressSingle}
                activePreviewId={activePreviewId || undefined}
              />

            </div>
          ) : (
            /* Pristine empty canvas layout state */
            <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-450 dark:text-slate-600">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div className="max-w-xs">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-300 block">
                  Drag files to start optimizing
                </span>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                  Supports JPEG, PNG, WEBP, AVIF, HEIC, SVG, TIFF and more. Images remain secure on your browser.
                </p>
              </div>
            </div>
          )}

        </main>

        {/* Minimal designed footer */}
        <footer className="border-t border-slate-100 dark:border-slate-900/60 py-5 mt-12 bg-white/40 dark:bg-[#121315]/10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
            <p className="text-[10px] text-slate-400 dark:text-slate-600 font-mono">
              Designed simply. Processes offline locally via pure Canvas & buffer streams on your browser window sandbox.
            </p>
          </div>
        </footer>

      </div>

    </div>
  );
}
