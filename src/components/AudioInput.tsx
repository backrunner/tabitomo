import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
interface AudioInputProps {
  onTranslate: (text: string) => void;
}
export function AudioInput({
  onTranslate
}: AudioInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedText, setRecordedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const startRecording = () => {
    setIsRecording(true);
    setRecordedText('');
    // Check if browser supports SpeechRecognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      // @ts-ignore - TypeScript doesn't know about webkitSpeechRecognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'zh-CN'; // Set language to Chinese
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results).map((result: any) => result[0].transcript).join('');
        setRecordedText(transcript);
      };
      recognitionRef.current.start();
    } else {
      // Mock recording for browsers that don't support SpeechRecognition
      setTimeout(() => {
        setRecordedText('这是一个模拟的语音识别结果。实际应用中，这里会显示您的语音转文字内容。');
      }, 2000);
    }
  };
  const stopRecording = () => {
    setIsRecording(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (recordedText) {
      setIsProcessing(true);
      // Simulate processing delay
      setTimeout(() => {
        onTranslate(recordedText);
        setIsProcessing(false);
      }, 1000);
    }
  };
  return <div className="space-y-4">
      <div className="p-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 min-h-[14rem] flex flex-col">
        {recordedText ? <div className="flex-1 mb-4">
            <p className="text-gray-700 dark:text-gray-200">{recordedText}</p>
          </div> : <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400 text-center">
              {isRecording ? 'Listening...' : 'Press the microphone button to start recording'}
            </p>
          </div>}
        <div className="flex justify-center">
          {isRecording ? <button onClick={stopRecording} className="p-4 bg-red-500 text-white rounded-full hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors">
              <Square className="h-6 w-6" />
            </button> : <button onClick={startRecording} disabled={isProcessing} className="p-4 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Mic className="h-6 w-6" />}
            </button>}
        </div>
      </div>
      {recordedText && !isRecording && <button onClick={() => onTranslate(recordedText)} disabled={isProcessing} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {isProcessing ? <span className="flex items-center justify-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </span> : 'Translate'}
        </button>}
    </div>;
}