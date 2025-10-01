import React, { useState, useEffect } from 'react';
import { TranslationTool } from './components/TranslationTool';
import { SettingsPanel } from './components/SettingsPanel';
import { hasSettings, loadSettings, AISettings } from './utils/settings';

export function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [currentSettings, setCurrentSettings] = useState<AISettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialSetup, setIsInitialSetup] = useState(false);

  useEffect(() => {
    // Check if user has completed setup
    const hasCompletedSetup = hasSettings();
    if (!hasCompletedSetup) {
      setShowSettings(true);
      setIsInitialSetup(true);
    } else {
      setCurrentSettings(loadSettings());
    }
    setIsLoading(false);
  }, []);

  const handleSettingsSave = (settings: AISettings) => {
    setCurrentSettings(settings);
    setIsInitialSetup(false);
    setShowSettings(false);
  };

  const handleSettingsClose = () => {
    // Don't allow closing if initial setup not completed
    if (isInitialSetup && !currentSettings) {
      return;
    }
    setShowSettings(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600 font-medium">Loading TabiTomo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950 flex items-center justify-center p-4">
      {/* Main Content */}
      {currentSettings && (
        <TranslationTool
          settings={currentSettings}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={handleSettingsClose}
        onSave={handleSettingsSave}
        isInitialSetup={isInitialSetup}
      />
    </div>
  );
}