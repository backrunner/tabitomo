import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Loader2 } from 'lucide-react';
import { smartCompressImage } from '../utils/image/imageCompression';
interface ImageInputProps {
  onTranslate: (text: string) => void;
}
export function ImageInput({
  onTranslate
}: ImageInputProps) {
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    const reader = new FileReader();

    reader.onload = async () => {
      const originalBase64 = reader.result as string;

      try {
        setIsCompressing(true);

        // Smart compression: only compress if needed (>1MB or high resolution)
        const result = await smartCompressImage(originalBase64, {
          maxSizeBytes: 1024 * 1024, // 1MB threshold
          maxResolution: 1920 * 1920, // 1920x1920 pixels
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 85
        });

        setImage(result.data);

        // Log compression results for debugging
        if (result.wasCompressed) {
          console.log('[ImageInput] Image compressed:', {
            originalSize: `${(result.originalSize / 1024).toFixed(2)} KB`,
            finalSize: `${(result.finalSize / 1024).toFixed(2)} KB`,
            saved: `${result.compressionRatio?.toFixed(1)}%`
          });
        } else {
          console.log('[ImageInput] Image used as-is (no compression needed)');
        }
      } catch (error) {
        console.error('Image processing failed:', error);
        // Fallback to original if smart compression fails
        setImage(originalBase64);
      } finally {
        setIsCompressing(false);
      }
    };

    reader.readAsDataURL(file);
  }, []);
  const {
    getRootProps,
    getInputProps,
    isDragActive
  } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png']
    },
    maxFiles: 1
  });
  const processImage = () => {
    if (!image) return;
    setIsProcessing(true);
    // Simulate OCR processing
    setTimeout(() => {
      // Mock Chinese text that would be extracted from the image
      const extractedText = '这是从图像中提取的中文文本示例。在实际应用中，这里会显示OCR识别出的文本。';
      onTranslate(extractedText);
      setIsProcessing(false);
    }, 2000);
  };
  const clearImage = () => {
    setImage(null);
  };
  return <div className="space-y-4">
      {!image ? <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center h-56 cursor-pointer transition-colors ${isDragActive ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-400'}`}>
          <input {...getInputProps()} />
          {isCompressing ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-10 w-10 text-indigo-500 mb-2 animate-spin" />
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                Compressing image...
              </p>
            </div>
          ) : (
            <>
              <Upload className="h-10 w-10 text-gray-400 dark:text-gray-500 mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                {isDragActive ? 'Drop the image here' : 'Drag & drop an image here, or click to select'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 text-center">
                Supports JPG, JPEG, PNG
              </p>
            </>
          )}
        </div> : <div className="relative rounded-lg overflow-hidden h-56">
          <img src={image} alt="Uploaded" className="w-full h-full object-cover" />
          <button onClick={clearImage} className="absolute top-2 right-2 p-1 bg-gray-800/70 rounded-full text-white hover:bg-gray-900/70 focus:outline-none">
            <X className="h-4 w-4" />
          </button>
        </div>}
      {image && <button onClick={processImage} disabled={isProcessing} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {isProcessing ? <span className="flex items-center justify-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing Image...
            </span> : 'Extract & Translate Text'}
        </button>}
    </div>;
}