

'use client';

import React, { useState } from 'react';
import { 
  Trash2, 
  RefreshCw, 
  FolderDown, 
  Play
} from 'lucide-react';

import { ImageItem, CompressionSettings } from '../types';
import { compressImage } from '../utils/compressor';
import DropZone from '../components/DropZone';
import ConverterControl from '../components/ConverterControl';
import ImageList from '../components/ImageList';
import SideBySidePreview from '../components/SideBySidePreview';
import { useApp } from '../context/AppContext';

import JSZip from 'jszip';

type TargetFormat = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif';

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

export default function ConverterPage() {
  const { addProcessedStat } = useApp();

  // Target Conversion Format (defaults to WebP)
  const [targetFormat, setTargetFormat] = useState<TargetFormat>('image/webp');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

  // File drop event handler (inserts files in 'idle' state matching the workflow)
  const handleFilesSelected = async (files: FileList | File[]) => {
    const newItems: ImageItem[] = [];
    setIsProcessingBatch(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const objectUrl = URL.createObjectURL(file);
      
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
        console.warn("Could not determine image dimensions.");
      }

      const item = createImageItem(file, objectUrl, width, height);
      newItems.push(item);
    }

    setImages(prev => {
      const updated = [...prev, ...newItems];
      if (newItems.length > 0) {
        setActivePreviewId(newItems[0].id);
      }
      return updated;
    });

    setIsProcessingBatch(false);
  };

  // Triggers single image conversion using the underlying compressor engine with target format settings
  const triggerSingleConversion = async (id: string, file: File, format: TargetFormat) => {
    setImages(prev => prev.map(img => 
      img.id === id ? { ...img, status: 'compressing', errorMsg: null } : img
    ));

    const conversionSettings: CompressionSettings = {
      quality: 0.9, // High quality factor to ensure fidelity remains crystal clear
      format: format,
      resizeMode: 'none',
      resizeValue: 100,
      resizeWidth: 1024,
      resizeHeight: 768,
      lossless: format === 'image/png', // lossy for compression, lossless for PNG trans
      preserveMetadata: true,
      autoFormat: false
    };

    try {
      const result = await compressImage(file, conversionSettings);
      const optimizedUrl = URL.createObjectURL(result.blob);
      
      const reduction = ((result.blob.size - file.size) / file.size) * 100;

      setImages(prev => prev.map(img => {
        if (img.id === id) {
          if (img.compressedUrl) {
            URL.revokeObjectURL(img.compressedUrl);
          }
          
          // Log stats count and size change
          const bytesSaved = file.size - result.blob.size;
          addProcessedStat(bytesSaved > 0 ? bytesSaved : 0);

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
      console.error("Conversion error:", err);
      const errMessage = err instanceof Error ? err.message : "Failed to convert format.";
      setImages(prev => prev.map(img => 
        img.id === id ? { 
          ...img, 
          status: 'error', 
          errorMsg: errMessage 
        } : img
      ));
    }
  };

  // Triggers batch conversion on all idle items in list
  const handleConvertAll = async () => {
    const targetItems = images.filter(img => img.status === 'idle' || img.status === 'error' || img.status === 'completed');
    if (targetItems.length === 0) return;
    
    setIsProcessingBatch(true);
    const promises = targetItems.map(img => 
      triggerSingleConversion(img.id, img.file, targetFormat)
    );

    await Promise.all(promises);
    setIsProcessingBatch(false);
  };

  const handleRecompressSingle = (id: string) => {
    const item = images.find(img => img.id === id);
    if (item) {
      triggerSingleConversion(id, item.file, targetFormat);
    }
  };

  const handleRemoveImage = (id: string) => {
    setImages(prev => {
      const target = prev.find(img => img.id === id);
      if (target) {
        URL.revokeObjectURL(target.originalUrl);
        if (target.compressedUrl) {
          URL.revokeObjectURL(target.compressedUrl);
        }
      }
      const filtered = prev.filter(img => img.id !== id);
      if (activePreviewId === id) {
        setActivePreviewId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

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

  const handleDownloadSingle = (image: ImageItem) => {
    if (image.status !== 'completed' || !image.compressedUrl) return;
    
    const extension = image.compressedType.split('/').pop() || 'png';
    const cleanOrigName = image.name.substring(0, image.name.lastIndexOf('.')) || image.name;
    const a = document.createElement('a');
    a.href = image.compressedUrl;
    a.download = `${cleanOrigName}.${extension}`;
    a.click();
  };

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
        zip.file(`${cleanOrigName}.${extension}`, blob);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const mainZipUrl = URL.createObjectURL(content);

      const a = document.createElement('a');
      a.href = mainZipUrl;
      a.download = `converted-images-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(mainZipUrl);
    } catch (e) {
      console.error("ZIP building failed:", e);
      alert("Encountered error producing ZIP archive.");
    } finally {
      setIsProcessingBatch(false);
    }
  };

  const activeImage = images.find(img => img.id === activePreviewId);
  const hasCompletedImages = images.some(img => img.status === 'completed');

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      
      {/* Workspace Header layout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div>
          <h1 className="text-sm font-black tracking-widest text-slate-900 dark:text-white uppercase font-mono flex items-center gap-2 leading-none">
            [ IMAGE CONVERTER ]
            {isProcessingBatch && (
              <span className="w-1.5 h-1.5 bg-black dark:bg-white animate-pulse" />
            )}
          </h1>
        </div>
      </div>

      {/* Target Format Selector controls */}
      <div className="bg-transparent border border-neutral-200 dark:border-neutral-800 p-5 rounded-none shadow-[none]">
        <ConverterControl 
          targetFormat={targetFormat}
          onChange={setTargetFormat}
        />
      </div>

      {/* Upload Dragzone */}
      <DropZone onFilesSelected={handleFilesSelected} />

      {/* Queue Toolbar and Processing elements */}
      {images.length > 0 ? (
        <div className="flex flex-col gap-6 mt-2">
          
          {/* List action bars */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold font-mono tracking-widest text-neutral-450 dark:text-neutral-500 uppercase">
                WORKSPACE QUEUE ({images.length} ITEMS)
              </span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto font-mono">
              {/* Convert All Action Button (Required Workflow) */}
              <button
                onClick={handleConvertAll}
                disabled={isProcessingBatch || images.length === 0}
                className="px-4 py-2 bg-black hover:bg-neutral-900 dark:bg-white dark:hover:bg-neutral-100 disabled:opacity-35 text-white dark:text-black rounded-none text-[9px] tracking-widest font-extrabold uppercase flex items-center gap-1.5 cursor-pointer shadow-xs select-none border border-black dark:border-white transition-all duration-100 active:scale-98"
                title="Process conversion on all items in queue"
              >
                <Play className="w-3 h-3 fill-current" />
                Convert All
              </button>

              <button
                onClick={handleDownloadAllAsZip}
                disabled={isProcessingBatch || !hasCompletedImages}
                className="px-4 py-2 border border-black dark:border-white bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-900 disabled:opacity-20 text-black dark:text-white rounded-none text-[9px] tracking-widest font-extrabold uppercase flex items-center gap-1.5 cursor-pointer select-none transition-all duration-100"
                title="Download all converted files as a zip archive"
              >
                <FolderDown className="w-3 h-3" />
                Download ZIP
              </button>

              <button
                onClick={handleClearAll}
                disabled={isProcessingBatch}
                className="px-3 py-2 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-450 hover:text-black dark:hover:text-white rounded-none text-[9px] tracking-widest font-extrabold uppercase flex items-center gap-1.5 cursor-pointer select-none transition-all duration-100"
                title="Clear conversion workspace queue"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            </div>
          </div>

          {/* Interactive Comparison slider */}
          {activeImage && activeImage.status === 'completed' && (
            <SideBySidePreview 
              image={activeImage}
              onClose={() => setActivePreviewId(null)}
            />
          )}

          {/* Image Files queue table list */}
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
        /* Empty canvas pristine state screen */
        <div className="py-24 text-center flex flex-col items-center justify-center gap-4 bg-transparent border border-dashed border-neutral-200 dark:border-neutral-800 rounded-none font-mono">
          <div className="w-10 h-10 border border-black dark:border-white flex items-center justify-center text-black dark:text-white shrink-0">
            <RefreshCw className="w-4 h-4" />
          </div>
          <div className="max-w-xs">
            <span className="text-[10px] font-black text-black dark:text-white uppercase tracking-widest block">
              [ QUEUE IS EMPTY ]
            </span>
            <p className="text-[9px] text-neutral-400 dark:text-neutral-500 mt-2 leading-relaxed tracking-wider">
              Drag images here. Select target format above, and click "Convert All" to convert them in bulk.
            </p>
          </div>
        </div>
      )}

      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-5 mt-16 bg-transparent font-mono">
        <div className="text-center">
          <p className="text-[9px] text-neutral-400 dark:text-neutral-600 tracking-wider">
            LOCAL ENGINE: PROCESSES VIA BROWSER CANVAS BUFFER CHUNKS.
          </p>
        </div>
      </footer>
    </div>
  );
}
