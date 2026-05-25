'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Trash2, 
  Play, 
  FileDown, 
  FileCheck,
  ImageIcon,
  Settings,
  HelpCircle,
  Loader2
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { useApp } from '../../context/AppContext';
import UploadDropzone from '../../components/UploadDropzone';
import { toast, Toaster } from 'sonner';

type ConversionType = 'pdf-to-png' | 'pdf-to-jpg' | 'pdf-to-txt' | 'img-to-pdf';

interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
  previewUrl?: string;
}

export default function PdfConverterPage() {
  const { addProcessedStat } = useApp();
  
  // States
  const [conversionType, setConversionType] = useState<ConversionType>('pdf-to-png');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);

  // Results
  const [convertedUrl, setConvertedUrl] = useState<string | null>(null);
  const [convertedName, setConvertedName] = useState<string>('');
  const [isZipResult, setIsZipResult] = useState(false);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Load PDFJS on mount
  useEffect(() => {
    const initPdfjs = async () => {
      try {
        // Dynamically configure worker source
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        setPdfjsLoaded(true);
      } catch (e) {
        console.error("Failed to load PDF.js engine dynamically", e);
      }
    };
    initPdfjs();
  }, []);

  const handleFilesSelected = (selectedFiles: File[]) => {
    const newItems = selectedFiles.map(file => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      file: file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }));

    setFiles(prev => [...prev, ...newItems]);
    toast.success(`Successfully uploaded ${selectedFiles.length} file(s).`);

    // Reset old result
    if (convertedUrl) {
      URL.revokeObjectURL(convertedUrl);
      setConvertedUrl(null);
    }
  };

  const handleRemove = (id: string, previewUrl?: string) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFiles(prev => prev.filter(f => f.id !== id));
    if (convertedUrl) {
      URL.revokeObjectURL(convertedUrl);
      setConvertedUrl(null);
    }
  };

  const handleClear = () => {
    files.forEach(f => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    setFiles([]);
    if (convertedUrl) {
      URL.revokeObjectURL(convertedUrl);
      setConvertedUrl(null);
    }
  };

  // Processing triggers
  const executeConversion = async () => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    const toastId = toast.loading(`Converting documents to ${conversionType.split('-').pop()?.toUpperCase()}...`, {
      style: {
        fontFamily: "var(--font-geist-mono), monospace",
        fontSize: "10px",
        borderRadius: "0",
        border: "1px solid black"
      }
    });

    try {
      if (conversionType === 'img-to-pdf') {
        await runImageToPdf(toastId);
      } else {
        await runPdfToImageOrText(toastId);
      }
    } catch (e) {
      console.error(e);
      const errMsg = e instanceof Error ? e.message : "Conversion encountered an error.";
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
      setIsProcessing(false);
    }
  };

  // Convert Images to PDF via pdf-lib
  const runImageToPdf = async (toastId: string | number) => {
    const pdfDoc = await PDFDocument.create();

    for (const item of files) {
      const arrayBuffer = await item.file.arrayBuffer();
      let embeddedImg;

      if (item.file.type === 'image/png') {
        embeddedImg = await pdfDoc.embedPng(arrayBuffer);
      } else if (item.file.type === 'image/jpeg' || item.file.type === 'image/jpg') {
        embeddedImg = await pdfDoc.embedJpg(arrayBuffer);
      } else {
        // Transcode WebP or other to JPEG via canvas helper
        const transcoded = await transcodeToJpgBuffer(item.file);
        embeddedImg = await pdfDoc.embedJpg(transcoded);
      }

      const page = pdfDoc.addPage([embeddedImg.width, embeddedImg.height]);
      page.drawImage(embeddedImg, {
        x: 0,
        y: 0,
        width: embeddedImg.width,
        height: embeddedImg.height
      });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    setConvertedUrl(url);
    setIsZipResult(false);
    setConvertedName(`compiled-${Date.now()}.pdf`);

    addProcessedStat(0);
    toast.success("Images converted to PDF successfully!", {
      id: toastId,
      style: {
        fontFamily: "var(--font-geist-mono), monospace",
        fontSize: "10px",
        borderRadius: "0",
        border: "1px solid black"
      }
    });
  };

  const transcodeToJpgBuffer = async (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error("Transcode failed."));
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result instanceof ArrayBuffer) resolve(reader.result);
            else reject(new Error("Buffer load failed."));
          };
          reader.readAsArrayBuffer(blob);
        }, 'image/jpeg', 0.9);
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Load failed."));
      };
      img.src = url;
    });
  };

  // Convert PDF to Images or Text via pdfjs-dist
  const runPdfToImageOrText = async (toastId: string | number) => {
    if (!pdfjsLoaded) {
      throw new Error("PDF processing engine is loading. Please wait 2 seconds and retry.");
    }

    const pdfjs = await import('pdfjs-dist');
    const zip = new JSZip();
    const isTextMode = conversionType === 'pdf-to-txt';
    
    // Process the first PDF file uploaded
    const item = files[0];
    const arrayBuffer = await item.file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;

    const cleanBaseName = item.name.replace('.pdf', '');

    if (isTextMode) {
      // PDF to TXT Mode
      let accumulatedText = "";
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((t: any) => t.str)
          .join(' ');
        accumulatedText += `--- PAGE ${i} OF ${totalPages} ---\n${pageText}\n\n`;
      }

      const blob = new Blob([accumulatedText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      setConvertedUrl(url);
      setIsZipResult(false);
      setConvertedName(`${cleanBaseName}-extracted.txt`);
    } else {
      // PDF to PNG/JPG Images Mode
      const format = conversionType === 'pdf-to-png' ? 'image/png' : 'image/jpeg';
      const ext = conversionType === 'pdf-to-png' ? 'png' : 'jpg';

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 }); // Crisp 1.5x zoom factor

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) continue;

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
          canvas: canvas
        };
        await page.render(renderContext).promise;

        const dataUrl = canvas.toDataURL(format);
        const base64Data = dataUrl.split(',')[1];
        zip.file(`${cleanBaseName}_page-${i}.${ext}`, base64Data, { base64: true });
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);

      setConvertedUrl(url);
      setIsZipResult(true);
      setConvertedName(`${cleanBaseName}-converted-${ext}.zip`);
    }

    addProcessedStat(0);
    toast.success("PDF converted successfully!", {
      id: toastId,
      style: {
        fontFamily: "var(--font-geist-mono), monospace",
        fontSize: "10px",
        borderRadius: "0",
        border: "1px solid black"
      }
    });
  };

  // Adjust file selection accept type depending on conversion selection
  const isImageToPdfMode = conversionType === 'img-to-pdf';

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6 font-mono">
      <Toaster position="bottom-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div>
          <h1 className="text-sm font-black tracking-widest text-black dark:text-white uppercase flex items-center gap-2 leading-none">
            [ PDF CONVERTER ]
            {isProcessing && (
              <span className="w-1.5 h-1.5 bg-black dark:bg-white animate-pulse" />
            )}
          </h1>
        </div>

        {!pdfjsLoaded && (
          <div className="flex items-center gap-1.5 text-[8px] text-neutral-450 dark:text-neutral-500 uppercase tracking-widest leading-none border border-neutral-200 dark:border-neutral-800 p-2">
            <Loader2 className="w-3 h-3 animate-spin text-neutral-400" />
            Loading Engine...
          </div>
        )}
      </div>

      {/* Format Configuration Controls */}
      <div className="border border-neutral-200 dark:border-neutral-800 p-5 rounded-none flex flex-col gap-5 bg-neutral-50/20 dark:bg-neutral-950/20">
        <span className="text-[10px] font-black text-black dark:text-white uppercase tracking-widest flex items-center gap-1.5">
          <Settings className="w-4 h-4 text-neutral-400" />
          CONVERSION CONFIGURATIONS
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-mono">
          <div className="flex flex-col gap-2">
            <span className="text-[8px] font-extrabold text-neutral-450 dark:text-neutral-500 tracking-widest uppercase">
              CONVERSION TYPE DIRECTION
            </span>
            <select
              value={conversionType}
              onChange={(e) => {
                setConversionType(e.target.value as ConversionType);
                handleClear(); // Clear workspace on layout shift
              }}
              className="bg-transparent border border-neutral-300 dark:border-neutral-800 p-2.5 text-xs text-black dark:text-white font-mono focus:outline-none rounded-none w-full"
            >
              <option value="pdf-to-png" className="bg-white dark:bg-black">PDF to PNG Images (ZIP bundle)</option>
              <option value="pdf-to-jpg" className="bg-white dark:bg-black">PDF to JPG Images (ZIP bundle)</option>
              <option value="pdf-to-txt" className="bg-white dark:bg-black">PDF to Raw Text (.txt document)</option>
              <option value="img-to-pdf" className="bg-white dark:bg-black">Images to single PDF Document</option>
            </select>
          </div>

          <div className="flex items-center gap-2 border border-dashed border-neutral-250 dark:border-neutral-800 p-3.5 text-[8px] text-neutral-450 dark:text-neutral-500 leading-relaxed font-mono">
            <HelpCircle className="w-4 h-4 text-blue-500 shrink-0" />
            {isImageToPdfMode ? (
              <span>* IMAGE-TO-PDF: Drops multiple photo assets (JPG/PNG/WEBP) in queue, converts them in order, and bundles them into a combined PDF file.</span>
            ) : (
              <span>* PDF-TO-IMAGE/TEXT: Processes the uploaded PDF completely local, loops pages, and exports them page-by-page as image blocks or character streams.</span>
            )}
          </div>
        </div>
      </div>

      {/* Upload dropzone custom selector */}
      <UploadDropzone
        onFilesSelected={handleFilesSelected}
        acceptedTypes={isImageToPdfMode ? ['image/*'] : ['application/pdf']}
        acceptedExtensions={isImageToPdfMode ? ['.png', '.jpg', '.jpeg', '.webp'] : ['.pdf']}
        descriptionText={isImageToPdfMode ? "UPLOAD BATCH IMAGES TO CONVERT" : "UPLOAD PDF FILE TO CONVERT"}
        maxSizeMB={150}
      />

      {files.length > 0 && (
        <div className="flex flex-col gap-6 mt-2">
          
          {/* Action trigger button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-3">
            <span className="text-[10px] font-bold tracking-widest text-neutral-450 dark:text-neutral-500 uppercase">
              WORKSPACE CONVERSION QUEUE ({files.length} ITEMS)
            </span>

            <div className="flex items-center gap-2 self-end sm:self-auto font-mono">
              <button
                onClick={executeConversion}
                disabled={isProcessing || files.length === 0}
                className="px-4 py-2 bg-black hover:bg-neutral-900 dark:bg-white dark:hover:bg-neutral-100 disabled:opacity-35 text-white dark:text-black rounded-none text-[9px] tracking-widest font-extrabold uppercase flex items-center gap-1.5 cursor-pointer shadow-xs select-none border border-black dark:border-white transition-all duration-100 active:scale-98"
              >
                <Play className="w-3 h-3 fill-current" />
                CONVERT NOW
              </button>

              <button
                onClick={handleClear}
                disabled={isProcessing}
                className="px-3 py-2 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-450 hover:text-black dark:hover:text-white rounded-none text-[9px] tracking-widest font-extrabold uppercase flex items-center gap-1.5 cursor-pointer select-none transition-all duration-100"
              >
                <Trash2 className="w-3 h-3" />
                Clear Queue
              </button>
            </div>
          </div>

          {/* Download Results Action Bar */}
          {convertedUrl && (
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
                    CONVERSION OPERATION FINISHED
                  </span>
                  <span className="text-[9px] text-neutral-450 dark:text-neutral-500 mt-1.5 truncate max-w-xs sm:max-w-md">
                    {convertedName}
                  </span>
                </div>
              </div>
              
              <a
                href={convertedUrl}
                download={convertedName}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white dark:bg-green-400 dark:hover:bg-green-500 dark:text-black rounded-none text-[9px] tracking-widest font-extrabold uppercase flex items-center gap-1.5 cursor-pointer select-none transition-all duration-100"
              >
                <FileDown className="w-3.5 h-3.5" />
                Download Results
              </a>
            </motion.div>
          )}

          {/* Files grid layout list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence initial={false}>
              {files.map((f, idx) => (
                <motion.div
                  key={f.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="border border-neutral-200 dark:border-neutral-800 p-4 rounded-none flex items-center justify-between gap-4 bg-transparent"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[8px] font-extrabold text-neutral-400 w-4">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    
                    {/* Thumbnail view */}
                    {f.previewUrl ? (
                      <div className="w-10 h-10 border border-neutral-200 dark:border-neutral-800 rounded-none bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center overflow-hidden shrink-0">
                        <img 
                          src={f.previewUrl} 
                          alt="preview" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-neutral-400 shrink-0">
                        <FileText className="w-5 h-5 text-black dark:text-white" />
                      </div>
                    )}

                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-black text-black dark:text-white truncate max-w-[120px] sm:max-w-[160px] uppercase tracking-wider">
                        {f.name}
                      </span>
                      <span className="text-[8px] text-neutral-450 dark:text-neutral-500 mt-0.5">
                        SIZE: {formatBytes(f.size)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemove(f.id, f.previewUrl)}
                    disabled={isProcessing}
                    className="p-1 border border-red-200 dark:border-red-950 text-red-555 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

        </div>
      )}

      {files.length === 0 && (
        <div className="py-24 text-center flex flex-col items-center justify-center gap-4 bg-transparent border border-dashed border-neutral-200 dark:border-neutral-800 rounded-none font-mono">
          <div className="w-10 h-10 border border-black dark:border-white flex items-center justify-center text-black dark:text-white shrink-0">
            {isImageToPdfMode ? (
              <ImageIcon className="w-4 h-4" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
          </div>
          <div className="max-w-xs">
            <span className="text-[10px] font-black text-black dark:text-white uppercase tracking-widest block">
              [ WORKSPACE QUEUE IS EMPTY ]
            </span>
            <p className="text-[9px] text-neutral-450 dark:text-neutral-500 mt-2 leading-relaxed tracking-wider">
              {isImageToPdfMode ? (
                "Upload batch images above. Select 'Images to single PDF Document' as the conversion layout and trigger compile."
              ) : (
                "Upload a PDF document. Select your target format above (PNG/JPG Images or Raw Text), and click 'Convert Now' to begin."
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
