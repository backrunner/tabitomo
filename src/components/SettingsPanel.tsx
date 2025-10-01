import React, { useState } from 'react';
import { X, Save, Trash2, Globe, Sparkles } from 'lucide-react';
import { AISettings, saveSettings, loadSettings, clearSettings, DEFAULT_SETTINGS, OPENAI_ENDPOINT } from '../utils/settings';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: AISettings) => void;
  isInitialSetup?: boolean;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose, onSave, isInitialSetup = false }) => {
  const [settings, setSettings] = useState<AISettings>(() => loadSettings() || DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    saveSettings(settings);
    onSave(settings);

    setTimeout(() => {
      setIsSaving(false);
      // Don't call onClose here, parent handles closing after save
    }, 300);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset to default settings?')) {
      setSettings(DEFAULT_SETTINGS);
      clearSettings();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl cute-shadow">
              {isInitialSetup ? <Sparkles className="w-5 h-5 text-white" /> : <Globe className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                {isInitialSetup ? 'Welcome to TabiTomo!' : 'AI Settings'}
              </h2>
              {isInitialSetup && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Configure your AI provider to get started
                </p>
              )}
            </div>
          </div>
          {!isInitialSetup && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors btn-pop"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Provider
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSettings({ ...settings, provider: 'openai', endpoint: OPENAI_ENDPOINT })}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${settings.provider === 'openai' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 cute-shadow' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
              >
                <div className="text-sm font-bold text-gray-800 dark:text-white">OpenAI</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Official API</div>
              </button>
              <button
                onClick={() => setSettings({ ...settings, provider: 'custom', endpoint: '' })}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${settings.provider === 'custom' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 cute-shadow' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
              >
                <div className="text-sm font-bold text-gray-800 dark:text-white">Custom</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Your endpoint</div>
              </button>
            </div>
          </div>

          {/* Endpoint URL */}
          {settings.provider === 'custom' && (
            <div className="space-y-2">
              <label htmlFor="endpoint" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                API Endpoint
              </label>
              <input
                id="endpoint"
                type="text"
                value={settings.endpoint}
                onChange={(e) => setSettings({ ...settings, endpoint: e.target.value })}
                placeholder="https://api.example.com/v1"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>
          )}

          {/* Model Name */}
          <div className="space-y-2">
            <label htmlFor="model" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Model Name
            </label>
            <input
              id="model"
              type="text"
              value={settings.modelName}
              onChange={(e) => setSettings({ ...settings, modelName: e.target.value })}
              placeholder="gpt-5"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <label htmlFor="apiKey" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={settings.apiKey}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Info Box */}
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-200 dark:border-indigo-800">
            <p className="text-sm text-indigo-800 dark:text-indigo-200">
              <strong>Note:</strong> Your API key is stored locally and never sent to our servers.
              It's only used for direct communication with your chosen AI provider.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-3xl">
          {!isInitialSetup ? (
            <>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors btn-pop"
              >
                <Trash2 className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={handleSave}
                disabled={!settings.apiKey || !settings.modelName || !settings.endpoint}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-xl cute-shadow hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 btn-pop"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </>
          ) : (
            <button
              onClick={handleSave}
              disabled={!settings.apiKey || !settings.modelName || !settings.endpoint}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-base font-bold rounded-xl cute-shadow hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 btn-pop"
            >
              {isSaving ? 'Starting...' : 'Start Translating'}
              <Sparkles className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
