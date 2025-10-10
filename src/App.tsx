import { useState, useEffect, lazy, Suspense } from 'react';
import { TranslationTool } from './components/TranslationTool';
import { UpdateNotification } from './components/UpdateNotification';
import { Toaster } from './components/ui/toaster';
import { loadSettings, saveSettings, AISettings, DEFAULT_SETTINGS } from './utils/config/settings';
import { usePWAUpdate } from './hooks/usePWAUpdate';

// Lazy load SettingsPanel - only loaded when user opens settings
const SettingsPanel = lazy(() => import('./components/SettingsPanel').then(module => ({ default: module.SettingsPanel })));

export function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [currentSettings, setCurrentSettings] = useState<AISettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialSetup, setIsInitialSetup] = useState(false);

  // PWA update management
  const { showUpdatePrompt, handleUpdate, handleDismiss } = usePWAUpdate();

  useEffect(() => {
    // Load settings or use defaults
    const loaded = loadSettings();
    if (loaded) {
      // Ensure generalAI and vlm exist for backward compatibility
      if (!loaded.generalAI) {
        loaded.generalAI = DEFAULT_SETTINGS.generalAI;
      }
      if (!loaded.vlm) {
        loaded.vlm = DEFAULT_SETTINGS.vlm;
      }
      setCurrentSettings(loaded);
    } else {
      // First launch: use default settings (no forced setup)
      setCurrentSettings(DEFAULT_SETTINGS);
      // Save defaults to localStorage
      saveSettings(DEFAULT_SETTINGS);
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
          <p className="text-gray-600 font-medium">Loading tabitomo...</p>
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

      {/* Settings Panel - Lazy Loaded */}
      <Suspense fallback={null}>
        <SettingsPanel
          isOpen={showSettings}
          onClose={handleSettingsClose}
          onSave={handleSettingsSave}
          isInitialSetup={isInitialSetup}
        />
      </Suspense>

      {/* Toast Notifications */}
      <Toaster />

      {/* PWA Update Notification */}
      {showUpdatePrompt && (
        <UpdateNotification onUpdate={handleUpdate} onDismiss={handleDismiss} />
      )}
    </div>
  );
}