

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadingPromise: Promise<FFmpeg> | null = null;

// Progress parser helper
let progressCallback: ((percentage: number) => void) | null = null;

/**
 * Get or initialize the singleton instance of FFmpeg.wasm
 */
export async function getFFmpeg(
  onLog?: (message: string) => void,
  onProgress?: (percentage: number) => void
): Promise<FFmpeg> {
  if (onProgress) progressCallback = onProgress;

  if (ffmpegInstance) {
    return ffmpegInstance;
  }

  if (ffmpegLoadingPromise) {
    return ffmpegLoadingPromise;
  }

  ffmpegLoadingPromise = (async () => {
    const ffmpeg = new FFmpeg();
    
    ffmpeg.on('log', ({ message }) => {
      if (onLog) {
        onLog(message);
      }
      // Fallback progress parsing from FFmpeg logs if progress events are sparse
      // e.g. "frame=  100 fps= 10 q=28.0 size=   128kB time=00:00:04.50"
      if (message.includes('time=')) {
        console.log('FFmpeg log:', message);
      }
    });

    ffmpeg.on('progress', ({ progress }) => {
      // progress is a float between 0 and 1
      const percent = Math.min(100, Math.max(0, Math.round(progress * 100)));
      if (progressCallback) {
        progressCallback(percent);
      }
    });

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return ffmpegLoadingPromise;
}

/**
 * Register a temporary progress callback
 */
export function setProgressCallback(callback: ((percentage: number) => void) | null) {
  progressCallback = callback;
}

/**
 * Helper to get video extension
 */
export function getExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

/**
 * Helper to strip extension from filename
 */
export function getBaseName(filename: string): string {
  const lastDotIdx = filename.lastIndexOf('.');
  return lastDotIdx !== -1 ? filename.substring(0, lastDotIdx) : filename;
}

/**
 * Run compression on a single video file
 */
export async function compressVideo(
  file: File,
  settings: {
    compressionLevel: 'low' | 'medium' | 'high';
    resolution: '1080p' | '720p' | '480p' | 'original';
  },
  onProgress?: (percentage: number) => void
): Promise<{ blob: Blob; width?: number; height?: number }> {
  const ffmpeg = await getFFmpeg(undefined, onProgress);
  const inputName = `input_${Date.now()}.${getExtension(file.name) || 'mp4'}`;
  const outputName = `output_${Date.now()}.mp4`;

  // Write file to FFmpeg WASM memory
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  // Build FFmpeg command arguments
  const args = ['-i', inputName];

  // Apply Resolution Scaling
  if (settings.resolution !== 'original') {
    let scaleStr = '';
    if (settings.resolution === '1080p') scaleStr = 'scale=1920:-2';
    else if (settings.resolution === '720p') scaleStr = 'scale=1280:-2';
    else if (settings.resolution === '480p') scaleStr = 'scale=854:-2';
    
    if (scaleStr) {
      args.push('-vf', scaleStr);
    }
  }

  // Apply Compression settings (CRF + Preset for x264)
  // CRF governs quality (lower = better quality, larger size; higher = worse quality, smaller size)
  // Preset governs speed/compression efficiency (ultrafast, superfast, veryfast, faster, fast, medium)
  if (settings.compressionLevel === 'high') {
    // High compression = smaller size, lower quality
    args.push('-vcodec', 'libx264', '-crf', '30', '-preset', 'ultrafast', '-acodec', 'aac', '-b:a', '96k');
  } else if (settings.compressionLevel === 'medium') {
    // Medium compression = balanced quality and size
    args.push('-vcodec', 'libx264', '-crf', '26', '-preset', 'superfast', '-acodec', 'aac', '-b:a', '128k');
  } else {
    // Low compression = higher quality, larger size
    args.push('-vcodec', 'libx264', '-crf', '22', '-preset', 'veryfast', '-acodec', 'aac', '-b:a', '192k');
  }

  args.push(outputName);

  console.log('Running FFmpeg with args:', args.join(' '));
  
  // Execute the command
  await ffmpeg.exec(args);

  // Read compressed output file
  const data = await ffmpeg.readFile(outputName);
  const outputBlob = new Blob([data as any], { type: 'video/mp4' });

  // Cleanup files from WASM virtual filesystem
  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
  } catch (e) {
    console.warn('FFmpeg cleanup error:', e);
  }

  return { blob: outputBlob };
}

/**
 * Convert video to different format
 */
export async function convertVideo(
  file: File,
  settings: {
    format: 'mp4' | 'mov' | 'webm' | 'avi' | 'gif';
    quality: 'low' | 'medium' | 'high';
  },
  onProgress?: (percentage: number) => void
): Promise<{ blob: Blob; type: string }> {
  const ffmpeg = await getFFmpeg(undefined, onProgress);
  const inputExt = getExtension(file.name) || 'mp4';
  const inputName = `input_${Date.now()}.${inputExt}`;
  const outputName = `output_${Date.now()}.${settings.format}`;

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  const args = ['-i', inputName];

  let contentType = 'video/mp4';

  if (settings.format === 'gif') {
    contentType = 'image/gif';
    // Optimized high-quality GIF scaling and palette generation
    // Step 1: scale and set fps, Step 2: create custom color palette to avoid grainy GIFs
    const fpsVal = settings.quality === 'high' ? 15 : settings.quality === 'medium' ? 10 : 8;
    const scaleVal = settings.quality === 'high' ? 640 : settings.quality === 'medium' ? 480 : 320;
    args.push(
      '-vf',
      `fps=${fpsVal},scale=${scaleVal}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`
    );
  } else {
    // Video conversion
    if (settings.format === 'mp4') {
      contentType = 'video/mp4';
      args.push('-vcodec', 'libx264', '-acodec', 'aac');
    } else if (settings.format === 'mov') {
      contentType = 'video/quicktime';
      args.push('-vcodec', 'libx264', '-acodec', 'aac');
    } else if (settings.format === 'webm') {
      contentType = 'video/webm';
      // WebM using VP8 codec
      args.push('-vcodec', 'libvpx', '-acodec', 'libvorbis', '-cpu-used', '5', '-deadline', 'realtime');
    } else if (settings.format === 'avi') {
      contentType = 'video/x-msvideo';
      // AVI standard codecs
      args.push('-vcodec', 'mpeg4', '-acodec', 'mp3');
    }

    // Apply quality parameters to control video output bitrates
    if (settings.quality === 'high') {
      args.push('-crf', '20');
    } else if (settings.quality === 'medium') {
      args.push('-crf', '25');
    } else {
      args.push('-crf', '32');
    }
  }

  args.push(outputName);

  console.log('Running FFmpeg convert with args:', args.join(' '));
  await ffmpeg.exec(args);

  const data = await ffmpeg.readFile(outputName);
  const outputBlob = new Blob([data as any], { type: contentType });

  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
  } catch (e) {
    console.warn('FFmpeg cleanup error:', e);
  }

  return { blob: outputBlob, type: contentType };
}

/**
 * Trim video file
 */
export async function trimVideo(
  file: File,
  settings: {
    start: number; // in seconds
    end: number;   // in seconds
  },
  onProgress?: (percentage: number) => void
): Promise<{ blob: Blob }> {
  const ffmpeg = await getFFmpeg(undefined, onProgress);
  const ext = getExtension(file.name) || 'mp4';
  const inputName = `input_${Date.now()}.${ext}`;
  const outputName = `output_${Date.now()}.${ext}`;

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  // Command to trim quickly without re-encoding:
  // -ss before -i is extremely fast (seeks instantly)
  // -to specifies the ending point
  // We re-encode video/audio during trim to ensure frame accuracy at cut boundary
  const args = [
    '-ss', settings.start.toFixed(3),
    '-i', inputName,
    '-to', (settings.end - settings.start).toFixed(3),
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-preset', 'ultrafast',
    outputName
  ];

  console.log('Running FFmpeg trim with args:', args.join(' '));
  await ffmpeg.exec(args);

  const data = await ffmpeg.readFile(outputName);
  const outputBlob = new Blob([data as any], { type: file.type || 'video/mp4' });

  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
  } catch (e) {
    console.warn('FFmpeg cleanup error:', e);
  }

  return { blob: outputBlob };
}

/**
 * Generate animated GIF from video
 */
export async function makeGif(
  file: File,
  settings: {
    start: number;     // in seconds
    duration: number;  // in seconds
    fps: number;       // frames per second (e.g. 10, 15, 24)
    resolution: number; // width in pixels (e.g. 320, 480, 640)
  },
  onProgress?: (percentage: number) => void
): Promise<{ blob: Blob }> {
  const ffmpeg = await getFFmpeg(undefined, onProgress);
  const ext = getExtension(file.name) || 'mp4';
  const inputName = `input_${Date.now()}.${ext}`;
  const outputName = `output_${Date.now()}.gif`;

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  // High quality palette generation + trim
  // Command structures:
  // -ss start -t duration -i input -vf "fps=fps,scale=width:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" output.gif
  const args = [
    '-ss', settings.start.toFixed(3),
    '-t', settings.duration.toFixed(3),
    '-i', inputName,
    '-vf', `fps=${settings.fps},scale=${settings.resolution}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
    outputName
  ];

  console.log('Running FFmpeg GIF maker with args:', args.join(' '));
  await ffmpeg.exec(args);

  const data = await ffmpeg.readFile(outputName);
  const outputBlob = new Blob([data as any], { type: 'image/gif' });

  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
  } catch (e) {
    console.warn('FFmpeg cleanup error:', e);
  }

  return { blob: outputBlob };
}
