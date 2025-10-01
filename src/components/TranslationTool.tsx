import React, { useEffect, useState, useRef } from 'react';
import { translateText, SUPPORTED_LANGUAGES, type LanguageCode } from '../utils/translation';
import { addFuriganaAnnotations } from '../utils/japanese';
import { speakText, getSpeechLocale } from '../utils/speech';
import { isSiliconFlowProvider, transcribeAudioSiliconFlow } from '../utils/audioTranscription';
import { Languages, Mic, Image as ImageIcon, ArrowUpDown, X, Copy, Check, Volume2, Camera, Keyboard, Settings } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { AISettings } from '../utils/settings';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

// Language options - generated from SUPPORTED_LANGUAGES
const languageOptions = Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => ({
  value: code,
  label: name
}));

type InputMethod = 'text' | 'audio' | 'image';

interface TranslationToolProps {
  settings: AISettings;
  onOpenSettings: () => void;
}

export const TranslationTool: React.FC<TranslationToolProps> = ({ settings, onOpenSettings }) => {
  // Language state
  const [sourceLang, setSourceLang] = useState<LanguageCode>('zh');
  const [targetLang, setTargetLang] = useState<LanguageCode>('ja');
  // Text state
  const [sourceText, setSourceText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [furiganaHtml, setFuriganaHtml] = useState<string | null>(null);
  // UI state
  const [inputMethod, setInputMethod] = useState<InputMethod>('text');
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  // Image state
  const [image, setImage] = useState<string | null>(null);
  // Animation refs
  const targetInputRef = useRef<HTMLDivElement>(null);
  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Generate furigana HTML when target text changes and target is Japanese
  useEffect(() => {
    if (targetText && targetLang === 'ja') {
      addFuriganaAnnotations(targetText).then(html => {
        setFuriganaHtml(html);
      });
    } else {
      setFuriganaHtml(null);
    }
  }, [targetText, targetLang]);

  // Handle language swap
  const handleSwapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(targetText);
    setTargetText(sourceText);
    // Add a little animation to the swap button
    const swapButton = document.getElementById('swap-button');
    if (swapButton) {
      swapButton.classList.add('rotate-animation');
      setTimeout(() => {
        swapButton.classList.remove('rotate-animation');
      }, 500);
    }
  };
  // Handle translation
  const handleTranslate = async (text: string, from: LanguageCode, to: LanguageCode) => {
    if (!text.trim()) {
      setTargetText('');
      return;
    }

    setIsTranslating(true);
    setError(null);

    try {
      const result = await translateText(text, from, to, settings);
      setTargetText(result);
    } catch (error) {
      console.error('Translation error:', error);
      setError(error instanceof Error ? error.message : 'Translation failed');
      setTargetText('');
    } finally {
      setIsTranslating(false);
    }
  };
  // Handle text input
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setSourceText(newText);

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Auto translate after a short delay
    if (newText.trim()) {
      debounceTimerRef.current = setTimeout(() => {
        handleTranslate(newText, sourceLang, targetLang);
      }, 600);
    } else {
      setTargetText('');
    }
  };
  // Handle copy to clipboard
  const copyToClipboard = () => {
    if (!targetText) return;
    navigator.clipboard.writeText(targetText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  // Handle audio recording
  const startRecording = async () => {
    setIsRecording(true);
    setError(null);

    // Use SiliconFlow transcription if available
    if (isSiliconFlowProvider(settings)) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];

        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

          try {
            const transcribedText = await transcribeAudioSiliconFlow(audioBlob, settings);
            setSourceText(transcribedText);
            if (transcribedText) {
              handleTranslate(transcribedText, sourceLang, targetLang);
            }
          } catch (err) {
            console.error('Transcription error:', err);
            setError(err instanceof Error ? err.message : 'Transcription failed');
          }

          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
      } catch (err) {
        console.error('Failed to start recording:', err);
        setError('Failed to access microphone');
        setIsRecording(false);
      }
    } else {
      // Use Web Speech API
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (SpeechRecognitionAPI) {
        recognitionRef.current = new SpeechRecognitionAPI();

        // Set language using proper locale
        recognitionRef.current.lang = getSpeechLocale(sourceLang);
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.maxAlternatives = 1;

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = Array.from(event.results)
            .map((result: SpeechRecognitionResult) => result[0].transcript)
            .join('');
          setSourceText(transcript);
        };

        recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error);
          setError(`Voice recognition error: ${event.error}`);
          setIsRecording(false);
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };

        try {
          recognitionRef.current.start();
        } catch (err) {
          console.error('Failed to start recognition:', err);
          setError('Failed to start voice recognition');
          setIsRecording(false);
        }
      } else {
        setError('Voice recognition is not supported in this browser');
        setIsRecording(false);
      }
    }
  };

  const stopRecording = () => {
    setIsRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error('Failed to stop recognition:', err);
      }
    }

    // Translate after stopping (only for Web Speech API)
    if (!isSiliconFlowProvider(settings) && sourceText) {
      handleTranslate(sourceText, sourceLang, targetLang);
    }
  };
  // Handle image upload
  const {
    getRootProps,
    getInputProps
  } = useDropzone({
    onDrop: acceptedFiles => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
        // Simulate OCR processing
        setTimeout(() => {
          const mockText = sourceLang === 'zh' ? '这是从图像中提取的文本示例。' : sourceLang === 'ja' ? '画像から抽出されたテキストのサンプルです。' : 'This is a sample text extracted from the image.';
          setSourceText(mockText);
          handleTranslate(mockText, sourceLang, targetLang);
          // Clear the image after processing
          setTimeout(() => setImage(null), 1500);
        }, 1500);
      };
      reader.readAsDataURL(file);
    },
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png']
    },
    maxFiles: 1
  });
  // Add animation styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes rotate {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .rotate-animation {
        animation: rotate 0.5s ease;
      }
      @keyframes fadeIn {
        0% { opacity: 0.7; transform: translateY(5px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      .fade-in {
        animation: fadeIn 0.3s ease forwards;
      }
      .cute-shadow {
        box-shadow: 0 4px 0 rgba(0,0,0,0.1);
        transform: translateY(0);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .cute-shadow:active {
        box-shadow: 0 2px 0 rgba(0,0,0,0.1);
        transform: translateY(2px);
      }
      .btn-pop {
        transition: transform 0.2s ease;
      }
      .btn-pop:active {
        transform: scale(0.95);
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  return <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-indigo-500 text-white flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Languages className="h-5 w-5" />
          <h1 className="text-lg font-bold">TabiTomo</h1>
        </div>
        <button
          onClick={onOpenSettings}
          className="p-2 text-white/80 hover:text-white hover:bg-indigo-600 rounded-lg transition-all duration-200 btn-pop"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
      {/* Language Selection */}
      <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-gray-700">
        <div className="flex-1">
          <Select value={sourceLang} onValueChange={(value) => setSourceLang(value as LanguageCode)}>
            <SelectTrigger className="w-full text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languageOptions.map(lang => (
                <SelectItem key={`source-${lang.value}`} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <button id="swap-button" onClick={handleSwapLanguages} className="mx-2 p-2 bg-white dark:bg-gray-600 rounded-full shadow-md btn-pop">
          <ArrowUpDown className="h-4 w-4 text-indigo-500 dark:text-white" />
        </button>
        <div className="flex-1">
          <Select value={targetLang} onValueChange={(value) => setTargetLang(value as LanguageCode)}>
            <SelectTrigger className="w-full text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languageOptions.map(lang => (
                <SelectItem key={`target-${lang.value}`} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Main Content Area */}
      <div className="p-4">
        {/* Source Input */}
        <div className="relative">
            {inputMethod === 'text' ? <textarea value={sourceText} onChange={handleTextChange} placeholder={`Type in ${languageOptions.find(l => l.value === sourceLang)?.label}...`} className="w-full h-32 p-3 rounded-2xl border-2 border-indigo-100 dark:border-gray-600 focus:ring-2 focus:ring-indigo-300 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 resize-none cute-shadow" /> : inputMethod === 'audio' ? <div className="w-full h-32 p-3 rounded-2xl border-2 border-indigo-100 dark:border-gray-600 bg-white dark:bg-gray-700 flex flex-col items-center justify-center cute-shadow">
                {isRecording ? <>
                    <div className="text-indigo-500 dark:text-indigo-400 text-center mb-2">
                      Listening...
                    </div>
                    <div className="flex space-x-1 mb-3">
                      <div className="w-2 h-2 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce" style={{
                animationDelay: '0ms'
              }}></div>
                      <div className="w-2 h-2 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce" style={{
                animationDelay: '150ms'
              }}></div>
                      <div className="w-2 h-2 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce" style={{
                animationDelay: '300ms'
              }}></div>
                    </div>
                    <button onClick={stopRecording} className="p-2 bg-red-500 text-white rounded-full btn-pop">
                      <X className="h-4 w-4" />
                    </button>
                  </> : <>
                    <p className="text-gray-500 dark:text-gray-400 text-center mb-3">
                      Tap the mic to start recording
                    </p>
                    <button onClick={startRecording} className="p-3 bg-indigo-500 text-white rounded-full shadow-md btn-pop">
                      <Mic className="h-5 w-5" />
                    </button>
                  </>}
                {sourceText && <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                    {sourceText}
                  </p>}
              </div> : <div {...getRootProps()} className="w-full h-32 p-3 rounded-2xl border-2 border-indigo-100 dark:border-gray-600 border-dashed bg-white dark:bg-gray-700 flex flex-col items-center justify-center cursor-pointer cute-shadow">
                <input {...getInputProps()} />
                {image ? <div className="relative w-full h-full">
                    <img src={image} alt="Uploaded" className="w-full h-full object-contain rounded" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded">
                      <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full"></div>
                    </div>
                  </div> : <>
                    <ImageIcon className="h-8 w-8 text-indigo-300 dark:text-indigo-400 mb-2" />
                    <p className="text-gray-500 dark:text-gray-400 text-center text-sm">
                      Tap to upload an image
                    </p>
                  </>}
              </div>}
            {/* Input Method Controls */}
            <div className="flex items-center justify-center mt-3 space-x-2">
              <button onClick={() => setInputMethod('text')} className={`p-2 rounded-xl ${inputMethod === 'text' ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'} btn-pop`}>
                <Keyboard className="h-4 w-4" />
              </button>
              <button onClick={() => setInputMethod('audio')} className={`p-2 rounded-xl ${inputMethod === 'audio' ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'} btn-pop`}>
                <Mic className="h-4 w-4" />
              </button>
              <button onClick={() => setInputMethod('image')} className={`p-2 rounded-xl ${inputMethod === 'image' ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'} btn-pop`}>
                <Camera className="h-4 w-4" />
              </button>
            </div>
            {/* Translation Result */}
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {languageOptions.find(l => l.value === targetLang)?.label}{' '}
                  Translation
                </h3>
                {targetText && <div className="flex space-x-2">
                    <button
                      onClick={() => speakText(targetText, targetLang)}
                      className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors btn-pop"
                      title="Play audio"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={copyToClipboard}
                      className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors btn-pop"
                      title="Copy to clipboard"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>}
              </div>
              <div className="mt-2 p-3 min-h-[80px] bg-indigo-50 dark:bg-gray-700 rounded-2xl cute-shadow flex items-center justify-center" ref={targetInputRef}>
                {isTranslating ? <div className="flex items-center justify-center py-4">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce" style={{
                  animationDelay: '0ms'
                }}></div>
                      <div className="w-2 h-2 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce" style={{
                  animationDelay: '150ms'
                }}></div>
                      <div className="w-2 h-2 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce" style={{
                  animationDelay: '300ms'
                }}></div>
                    </div>
                  </div> : error ? <p className="text-red-500 dark:text-red-400 text-center py-6 text-sm">
                    {error}
                  </p> : targetText ? (
                    furiganaHtml ? (
                      <div
                        className="text-gray-800 dark:text-gray-200 w-full leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: furiganaHtml }}
                      />
                    ) : (
                      <p className="text-gray-800 dark:text-gray-200 w-full">
                        {targetText}
                      </p>
                    )
                  ) : <p className="text-gray-400 dark:text-gray-500 text-center py-6">
                    Translation will appear here
                  </p>}
              </div>
            </div>
          </div>
      </div>
    </div>;
};