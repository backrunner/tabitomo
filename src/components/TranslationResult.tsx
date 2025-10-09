import { useState } from 'react';
import { Copy, Check, Loader2 } from 'lucide-react';
interface TranslationResultProps {
  inputText: string;
  translatedText: string;
  isLoading: boolean;
}
export function TranslationResult({
  inputText,
  translatedText,
  isLoading
}: TranslationResultProps) {
  const [copied, setCopied] = useState(false);
  const copyToClipboard = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return <div className="h-full">
      <div className="relative p-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 h-56 overflow-auto mb-4">
        {isLoading ? <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
          </div> : translatedText ? <p className="text-gray-800 dark:text-gray-200">{translatedText}</p> : <p className="text-gray-500 dark:text-gray-400 flex items-center justify-center h-full text-center">
            {inputText ? 'Translating...' : 'Translation will appear here'}
          </p>}
      </div>
      {translatedText && <div className="flex justify-end">
          <button onClick={copyToClipboard} className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 transition-colors">
            {copied ? <>
                <Check className="h-4 w-4" />
                <span>Copied!</span>
              </> : <>
                <Copy className="h-4 w-4" />
                <span>Copy</span>
              </>}
          </button>
        </div>}
    </div>;
}