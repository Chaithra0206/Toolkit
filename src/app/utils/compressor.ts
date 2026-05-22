/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CompressionSettings } from '../types';

/**
 * Format bytes into human-readable strings (KB, MB, etc.)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

interface CompressionResult {
  blob: Blob;
  format: string;
  width: number;
  height: number;
}

/**
 * Helper to convert HEIC/HEIF blobs to standard JPEG blobs using heic2any
 */
async function convertHeicToJpeg(file: File): Promise<Blob> {
  // Dynamically import heic2any since it requires window/document browser context
  const heic2any = (await import('heic2any')).default;
  const converted = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.9,
  });
  
  if (Array.isArray(converted)) {
    return converted[0];
  }
  return converted;
}

/**
 * Performs local client-side image compression and resizing using HTML5 Canvas
 */
export async function compressImage(
  file: File,
  settings: CompressionSettings
): Promise<CompressionResult> {
  return new Promise(async (resolve, reject) => {
    try {
      let activeBlob: Blob = file;
      const lowerName = file.name.toLowerCase();

      // Check if image is HEIC/HEIF
      if (lowerName.endsWith('.heic') || lowerName.endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif') {
        try {
          activeBlob = await convertHeicToJpeg(file);
        } catch (heicError) {
          reject(new Error('Failed to convert HEIC format. Ensure the image is valid.'));
          return;
        }
      }

      const objectUrl = URL.createObjectURL(activeBlob);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        // Get initial dimensions
        let { naturalWidth: width, naturalHeight: height } = img;
        
        // Calculate new scaled dimensions
        if (settings.resizeMode === 'percentage') {
          const factor = settings.resizeValue / 100;
          width = Math.round(width * factor);
          height = Math.round(height * factor);
        } else if (settings.resizeMode === 'width') {
          const targetWidth = settings.resizeWidth;
          const factor = targetWidth / width;
          width = targetWidth;
          height = Math.round(height * factor);
        } else if (settings.resizeMode === 'height') {
          const targetHeight = settings.resizeHeight;
          const factor = targetHeight / height;
          width = Math.round(width * factor);
          height = targetHeight;
        } else if (settings.resizeMode === 'fit') {
          const maxWidth = settings.resizeWidth;
          const maxHeight = settings.resizeHeight;
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          if (ratio < 1) {
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
        }

        // Keep layout constraints positive
        width = Math.max(1, width);
        height = Math.max(1, height);

        // Render onto Canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not instantiate Canvas 2D graphic rendering context.'));
          return;
        }

        // Enable high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image onto canvas boundary
        ctx.drawImage(img, 0, 0, width, height);

        // Determine output mime-type
        let outputMime = activeBlob.type || 'image/jpeg';
        if (settings.format !== 'original') {
          outputMime = settings.format;
        }

        if (settings.autoFormat) {
          // Suggest modern WebP if original is JPG/PNG
          if (activeBlob.type === 'image/jpeg' || activeBlob.type === 'image/png') {
            outputMime = 'image/webp';
          }
        }

        // Determine quality coefficient
        const qualityLevel = settings.lossless ? 1.0 : settings.quality;

        // Extract compressed blob
        canvas.toBlob(
          (resultBlob) => {
            if (resultBlob) {
              resolve({
                blob: resultBlob,
                format: outputMime,
                width,
                height,
              });
            } else {
              reject(new Error('Canvas compilation returned null memory chunk.'));
            }
          },
          outputMime,
          qualityLevel
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Unable to read graphic frame source from file buffer.'));
      };

      img.src = objectUrl;
    } catch (e) {
      reject(e);
    }
  });
}
