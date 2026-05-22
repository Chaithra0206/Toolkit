/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CompressionSettings {
  quality: number;
  format: 'original' | 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif';
  resizeMode: 'none' | 'percentage' | 'width' | 'height' | 'fit';
  resizeValue: number;
  resizeWidth: number;
  resizeHeight: number;
  lossless: boolean;
  preserveMetadata: boolean;
  autoFormat: boolean;
}

export interface ImageItem {
  id: string;
  name: string;
  file: File;
  originalType: string;
  originalSize: number;
  originalWidth: number;
  originalHeight: number;
  originalUrl: string;
  compressedType: string;
  compressedSize: number | null;
  compressedWidth: number | null;
  compressedHeight: number | null;
  compressedUrl: string | null;
  percentage: number | null;
  status: 'idle' | 'compressing' | 'completed' | 'error';
  errorMsg: string | null;
}
