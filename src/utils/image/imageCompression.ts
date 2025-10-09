/**
 * Image compression utility using @jsquash/jpeg with lazy WASM loading
 * This improves startup performance by only loading the WASM module when needed
 */

// Type for the encode function
type EncodeFunction = (data: ImageData, options?: { quality?: number }) => Promise<ArrayBuffer>;

// Lazy-loaded encoder - only imported when compress is first called
let encodeJpeg: EncodeFunction | null = null;

/**
 * Lazy load the JPEG encoder WASM module
 */
async function loadEncoder(): Promise<EncodeFunction> {
  if (!encodeJpeg) {
    const module = await import('@jsquash/jpeg/encode');
    encodeJpeg = module.default as EncodeFunction;
  }
  return encodeJpeg;
}

/**
 * Resize canvas while maintaining aspect ratio
 */
function resizeCanvas(
  sourceCanvas: HTMLCanvasElement,
  maxWidth: number,
  maxHeight: number
): HTMLCanvasElement {
  let { width, height } = sourceCanvas;

  // Calculate new dimensions while maintaining aspect ratio
  if (width > maxWidth || height > maxHeight) {
    const aspectRatio = width / height;

    if (width > height) {
      width = maxWidth;
      height = width / aspectRatio;
    } else {
      height = maxHeight;
      width = height * aspectRatio;
    }
  }

  // Create resized canvas
  const resizedCanvas = document.createElement('canvas');
  resizedCanvas.width = Math.round(width);
  resizedCanvas.height = Math.round(height);

  const ctx = resizedCanvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceCanvas, 0, 0, resizedCanvas.width, resizedCanvas.height);
  }

  return resizedCanvas;
}

/**
 * Convert ArrayBuffer to base64 data URL
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:image/jpeg;base64,' + btoa(binary);
}

/**
 * Calculate base64 string size in bytes
 */
function getBase64Size(base64: string): number {
  // Remove data URL prefix if present
  const base64Data = base64.split(',')[1] || base64;
  // Base64 encoding uses 4 chars for every 3 bytes, with padding
  const padding = (base64Data.match(/=/g) || []).length;
  return (base64Data.length * 3) / 4 - padding;
}

export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-100 (mozjpeg quality scale)
}

export interface SmartCompressionOptions extends ImageCompressionOptions {
  maxSizeBytes?: number; // Max file size in bytes before compression
  maxResolution?: number; // Max resolution (width * height) before compression
}

/**
 * Compress an image from a canvas using WASM-based mozjpeg encoder
 * @param canvas Source canvas element
 * @param options Compression options
 * @returns Base64-encoded JPEG image
 */
export async function compressImage(
  canvas: HTMLCanvasElement,
  options: ImageCompressionOptions = {}
): Promise<string> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 85 // mozjpeg default quality (85 is excellent for photos)
  } = options;

  try {
    // Load encoder lazily
    const encode = await loadEncoder();

    // Resize if needed
    const resizedCanvas = resizeCanvas(canvas, maxWidth, maxHeight);

    // Get ImageData from canvas
    const ctx = resizedCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    const imageData = ctx.getImageData(0, 0, resizedCanvas.width, resizedCanvas.height);

    // Compress using mozjpeg WASM
    const compressed = await encode(imageData, { quality });

    // Convert to base64
    return arrayBufferToBase64(compressed);
  } catch (error) {
    console.error('Image compression failed:', error);

    // Fallback to canvas toDataURL if WASM fails
    const fallbackCanvas = resizeCanvas(canvas, maxWidth, maxHeight);
    return fallbackCanvas.toDataURL('image/jpeg', quality / 100);
  }
}

/**
 * Compress an image from a base64 data URL
 * @param base64 Base64 data URL
 * @param options Compression options
 * @returns Compressed base64-encoded JPEG image
 */
export async function compressBase64Image(
  base64: string,
  options: ImageCompressionOptions = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);

      try {
        const compressed = await compressImage(canvas, options);
        resolve(compressed);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = base64;
  });
}

/**
 * Smart compression: Only compress if image exceeds size or resolution thresholds
 * @param base64 Base64 data URL
 * @param options Smart compression options
 * @returns Original or compressed base64-encoded image
 */
export async function smartCompressImage(
  base64: string,
  options: SmartCompressionOptions = {}
): Promise<{
  data: string;
  wasCompressed: boolean;
  originalSize: number;
  finalSize: number;
  compressionRatio?: number;
}> {
  const {
    maxSizeBytes = 1024 * 1024, // Default: 1MB
    maxResolution = 1920 * 1920, // Default: 1920x1920 pixels
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 85
  } = options;

  // Get original size
  const originalSize = getBase64Size(base64);

  // Check image dimensions
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = async () => {
      const resolution = img.width * img.height;
      const needsCompression = originalSize > maxSizeBytes || resolution > maxResolution;

      if (!needsCompression) {
        // Image is small enough, return as-is
        console.log('[Smart Compression] Image is small enough, skipping compression', {
          size: `${(originalSize / 1024).toFixed(2)} KB`,
          resolution: `${img.width}x${img.height}`,
          threshold: `${(maxSizeBytes / 1024).toFixed(2)} KB`
        });

        resolve({
          data: base64,
          wasCompressed: false,
          originalSize,
          finalSize: originalSize
        });
        return;
      }

      // Image needs compression
      console.log('[Smart Compression] Compressing image', {
        originalSize: `${(originalSize / 1024).toFixed(2)} KB`,
        resolution: `${img.width}x${img.height}`,
        reason: originalSize > maxSizeBytes ? 'size' : 'resolution'
      });

      try {
        const compressed = await compressBase64Image(base64, {
          maxWidth,
          maxHeight,
          quality
        });

        const finalSize = getBase64Size(compressed);
        const compressionRatio = ((1 - finalSize / originalSize) * 100);

        console.log('[Smart Compression] Compression complete', {
          originalSize: `${(originalSize / 1024).toFixed(2)} KB`,
          finalSize: `${(finalSize / 1024).toFixed(2)} KB`,
          saved: `${compressionRatio.toFixed(1)}%`
        });

        resolve({
          data: compressed,
          wasCompressed: true,
          originalSize,
          finalSize,
          compressionRatio
        });
      } catch (error) {
        console.error('[Smart Compression] Compression failed, using original', error);
        // On error, return original image
        resolve({
          data: base64,
          wasCompressed: false,
          originalSize,
          finalSize: originalSize
        });
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = base64;
  });
}
