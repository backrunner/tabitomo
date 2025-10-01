import React, { useState } from 'react';
interface TextInputProps {
  onTranslate: (text: string) => void;
}
export function TextInput({
  onTranslate
}: TextInputProps) {
  const [text, setText] = useState('');
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    // Auto translate after a short delay
    if (newText.trim()) {
      const timeoutId = setTimeout(() => {
        onTranslate(newText);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  };
  return <div className="space-y-4">
      <textarea value={text} onChange={handleChange} placeholder="Type Chinese text here..." className="w-full h-56 p-4 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 resize-none" />
      <button onClick={() => onTranslate(text)} disabled={!text.trim()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
        Translate
      </button>
    </div>;
}