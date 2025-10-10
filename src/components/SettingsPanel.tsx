import React, { useState } from 'react';
import { X, Save, Settings as SettingsIcon, Sparkles, Mic, Image as ImageIcon, ArrowLeftRight, Languages, Download, CheckCircle } from 'lucide-react';
import { AISettings, saveSettings, loadSettings, DEFAULT_SETTINGS, OPENAI_ENDPOINT, DASHSCOPE_ENDPOINT } from '../utils/config/settings';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import { ImportExportDialog } from './ImportExportDialog';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ConfirmDialog } from './ConfirmDialog';
import { localWhisperService, WhisperModelSize } from '../utils/audio/localWhisper';
import { toast } from './ui/use-toast';

// Network Information API types (not fully standardized)
interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: AISettings) => void;
  isInitialSetup?: boolean;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose, onSave, isInitialSetup = false }) => {
  const [settings, setSettings] = useState<AISettings>(() => {
    const loaded = loadSettings() || DEFAULT_SETTINGS;
    // Ensure generalAI exists for backward compatibility
    if (!loaded.generalAI) {
      loaded.generalAI = DEFAULT_SETTINGS.generalAI;
    }
    if (!loaded.vlm) {
      loaded.vlm = DEFAULT_SETTINGS.vlm;
    }
    return loaded;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);

  // Local Whisper model download state
  const [isDownloadingModel, setIsDownloadingModel] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);
  const [downloadConfirmInfo, setDownloadConfirmInfo] = useState({ networkType: '', modelSize: '', size: '' });
  const [currentModelDownloaded, setCurrentModelDownloaded] = useState(false);

  // Initialize local whisper service on mount
  React.useEffect(() => {
    localWhisperService.initialize();
  }, []);

  // Check if current model is downloaded whenever the model changes
  React.useEffect(() => {
    const checkModelDownloaded = async () => {
      const modelSize = settings.speechRecognition.whisperModel || 'base';
      const isDownloaded = await localWhisperService.isModelDownloadedAsync(modelSize);
      setCurrentModelDownloaded(isDownloaded);
    };

    if (settings.speechRecognition.provider === 'local-whisper') {
      checkModelDownloaded();
    }
  }, [settings.speechRecognition.whisperModel, settings.speechRecognition.provider, settings.speechRecognition.whisperModelDownloaded]);

  const handleSave = () => {
    setIsSaving(true);
    saveSettings(settings);
    onSave(settings);

    setTimeout(() => {
      setIsSaving(false);
      // Don't call onClose here, parent handles closing after save
    }, 300);
  };

  const handleImport = (importedSettings: AISettings) => {
    setSettings(importedSettings);
    saveSettings(importedSettings);
    onSave(importedSettings);
  };

  // Download whisper model
  const handleDownloadModel = async () => {
    const modelSize = settings.speechRecognition.whisperModel || 'base';
    const modelInfo = localWhisperService.getModelInfo(modelSize as WhisperModelSize);

    // Detect if user is on mobile or metered connection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const nav = navigator as NavigatorWithConnection;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    const isMetered = connection?.saveData || connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g' || connection?.effectiveType === '3g';

    // Show confirmation if on mobile or metered network
    if (isMobile || isMetered) {
      const networkType = isMetered ? 'metered/slow' : 'mobile';
      setDownloadConfirmInfo({
        networkType,
        modelSize,
        size: modelInfo.size,
      });
      setShowDownloadConfirm(true);
    } else {
      // Directly download if not on mobile/metered network
      await executeDownload();
    }
  };

  // Execute model download
  const executeDownload = async () => {
    const modelSize = settings.speechRecognition.whisperModel || 'base';

    try {
      setIsDownloadingModel(true);
      setDownloadProgress(0);

      await localWhisperService.downloadModel(modelSize as WhisperModelSize, (progress) => {
        setDownloadProgress(progress.percentage);
      });

      // Update settings to mark model as downloaded
      const updatedSettings = {
        ...settings,
        speechRecognition: {
          ...settings.speechRecognition,
          whisperModelDownloaded: true
        }
      };
      setSettings(updatedSettings);
      saveSettings(updatedSettings);
      setCurrentModelDownloaded(true);

      setDownloadProgress(100);
    } catch (error) {
      console.error('Failed to download model:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to download model. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloadingModel(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500 rounded-xl cute-shadow">
              {isInitialSetup ? <Sparkles className="w-5 h-5 text-white" /> : <SettingsIcon className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-bold text-gray-800 dark:text-white">
                {isInitialSetup ? 'Welcome to tabitomo!' : 'Settings'}
              </h2>
              {isInitialSetup && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Configure your AI provider to get started
                </p>
              )}
            </div>
          </div>
          {!isInitialSetup && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImportExport(true)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors btn-pop"
                title="Import/Export Settings"
              >
                <ArrowLeftRight className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors btn-pop"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <Tabs defaultValue="general">
            {!isInitialSetup && (
              <TabsList className="w-full grid grid-cols-4 mb-6">
                <TabsTrigger value="general" className="flex flex-col items-center gap-1 px-2 py-2">
                  <SettingsIcon className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">General</span>
                </TabsTrigger>
                <TabsTrigger value="translation" className="flex flex-col items-center gap-1 px-2 py-2">
                  <Languages className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">Translate</span>
                </TabsTrigger>
                <TabsTrigger value="speech" className="flex flex-col items-center gap-1 px-2 py-2">
                  <Mic className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">Speech</span>
                </TabsTrigger>
                <TabsTrigger value="image" className="flex flex-col items-center gap-1 px-2 py-2">
                  <ImageIcon className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">Image</span>
                </TabsTrigger>
              </TabsList>
            )}

            {/* General AI Service Tab */}
            <TabsContent value="general">
              <div className="space-y-4">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-200 dark:border-indigo-800">
                  <p className="text-sm text-indigo-800 dark:text-indigo-200">
                    <strong>General AI Service</strong> is used by default for all features (translation, image OCR, VLM) unless you configure them separately in their respective tabs.
                  </p>
                </div>

                {/* API Endpoint */}
                <div className="space-y-1.5">
                  <label htmlFor="generalEndpoint" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    API Endpoint
                  </label>
                  <input
                    id="generalEndpoint"
                    type="text"
                    value={settings.generalAI.endpoint}
                    onChange={(e) => setSettings({ ...settings, generalAI: { ...settings.generalAI, endpoint: e.target.value } })}
                    placeholder="https://api.openai.com/v1"
                    className="w-full px-3 py-2 text-sm rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-indigo-500 focus:outline-none transition-colors"
                  />
                </div>

                {/* Model Name */}
                <div className="space-y-1.5">
                  <label htmlFor="generalModel" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Model Name
                  </label>
                  <input
                    id="generalModel"
                    type="text"
                    value={settings.generalAI.modelName}
                    onChange={(e) => setSettings({ ...settings, generalAI: { ...settings.generalAI, modelName: e.target.value } })}
                    placeholder="gpt-4o"
                    className="w-full px-3 py-2 text-sm rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-indigo-500 focus:outline-none transition-colors"
                  />
                </div>

                {/* API Key */}
                <div className="space-y-1.5">
                  <label htmlFor="generalApiKey" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    API Key
                  </label>
                  <input
                    id="generalApiKey"
                    type="password"
                    value={settings.generalAI.apiKey}
                    onChange={(e) => setSettings({ ...settings, generalAI: { ...settings.generalAI, apiKey: e.target.value } })}
                    placeholder="sk-..."
                    className="w-full px-3 py-2 text-sm rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-indigo-500 focus:outline-none transition-colors"
                  />
                </div>

                {/* Info Box */}
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-200 dark:border-indigo-800">
                  <p className="text-sm text-indigo-800 dark:text-indigo-200">
                    <strong>Note:</strong> Your API key is stored locally and never sent to our servers.
                    It's only used for direct communication with your chosen AI provider.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Translation Tab */}
            <TabsContent value="translation">
              <div className="space-y-4">
                {/* Provider Selection */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Provider
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSettings({ ...settings, provider: 'openai', endpoint: OPENAI_ENDPOINT })}
                      className={`p-3 rounded-xl border-2 transition-all duration-200 ${settings.provider === 'openai' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 cute-shadow' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                    >
                      <div className="text-sm font-bold text-gray-800 dark:text-white">OpenAI</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Official API</div>
                    </button>
                    <button
                      onClick={() => setSettings({ ...settings, provider: 'custom', endpoint: '' })}
                      className={`p-3 rounded-xl border-2 transition-all duration-200 ${settings.provider === 'custom' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 cute-shadow' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                    >
                      <div className="text-sm font-bold text-gray-800 dark:text-white">Custom</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Your endpoint</div>
                    </button>
                  </div>
                </div>

                {/* Endpoint URL */}
                {settings.provider === 'custom' && (
                  <div className="space-y-1.5">
                    <label htmlFor="endpoint" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      API Endpoint
                    </label>
                    <input
                      id="endpoint"
                      type="text"
                      value={settings.endpoint}
                      onChange={(e) => setSettings({ ...settings, endpoint: e.target.value })}
                      placeholder="https://api.example.com/v1"
                      className="w-full px-3 py-2 text-sm rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                  </div>
                )}

                {/* Model Name */}
                <div className="space-y-1.5">
                  <label htmlFor="model" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Model Name
                  </label>
                  <input
                    id="model"
                    type="text"
                    value={settings.modelName}
                    onChange={(e) => setSettings({ ...settings, modelName: e.target.value })}
                    placeholder="gpt-5"
                    className="w-full px-3 py-2 text-sm rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-indigo-500 focus:outline-none transition-colors"
                  />
                </div>

                {/* API Key */}
                <div className="space-y-1.5">
                  <label htmlFor="apiKey" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    API Key
                  </label>
                  <input
                    id="apiKey"
                    type="password"
                    value={settings.apiKey}
                    onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                    placeholder="sk-..."
                    className="w-full px-3 py-2 text-sm rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-indigo-500 focus:outline-none transition-colors"
                  />
                </div>

                {/* Info Box */}
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-200 dark:border-indigo-800">
                  <p className="text-sm text-indigo-800 dark:text-indigo-200">
                    <strong>Note:</strong> Your API key is stored locally and never sent to our servers.
                    It's only used for direct communication with your chosen AI provider.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Speech Tab */}
            <TabsContent value="speech">
              <div className="space-y-4">
                {/* Speech Recognition Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Mic className="w-4 h-4" />
                    Speech Recognition
                  </h3>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Provider
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setSettings({ ...settings, speechRecognition: { ...settings.speechRecognition, provider: 'web-speech' } })}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 ${settings.speechRecognition.provider === 'web-speech' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 cute-shadow' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                      >
                        <div className="text-sm font-bold text-gray-800 dark:text-white">Web Speech</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Browser API</div>
                      </button>
                      <button
                        onClick={() => setSettings({
                          ...settings,
                          speechRecognition: {
                            ...settings.speechRecognition,
                            provider: 'siliconflow',
                            apiKey: settings.apiKey
                          }
                        })}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 ${settings.speechRecognition.provider === 'siliconflow' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 cute-shadow' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                      >
                        <div className="text-sm font-bold text-gray-800 dark:text-white">AI Service</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Cloud-based</div>
                      </button>
                      <button
                        onClick={() => setSettings({
                          ...settings,
                          speechRecognition: {
                            ...settings.speechRecognition,
                            provider: 'local-whisper'
                          }
                        })}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 ${settings.speechRecognition.provider === 'local-whisper' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 cute-shadow' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                      >
                        <div className="text-sm font-bold text-gray-800 dark:text-white">Local Model</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Offline</div>
                      </button>
                    </div>
                  </div>

                  {settings.speechRecognition.provider === 'siliconflow' && (
                    <>
                      <div className="space-y-1.5">
                        <label htmlFor="aiServiceProvider" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                          AI Service Provider
                        </label>
                        <Select value="siliconflow" disabled>
                          <SelectTrigger>
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="siliconflow">SiliconFlow</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="speechModelName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Model Name
                        </label>
                        <input
                          id="speechModelName"
                          type="text"
                          value={settings.speechRecognition.modelName || 'TeleAI/TeleSpeechASR'}
                          onChange={(e) => setSettings({
                            ...settings,
                            speechRecognition: {
                              ...settings.speechRecognition,
                              modelName: e.target.value
                            }
                          })}
                          placeholder="TeleAI/TeleSpeechASR"
                          className="w-full px-3 py-2 text-sm rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-indigo-500 focus:outline-none transition-colors"
                        />
                      </div>
                      <div className="space-y-1.5">
                      <label htmlFor="speechApiKey" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        API Key
                      </label>
                      <input
                        id="speechApiKey"
                        type="password"
                        value={settings.speechRecognition.apiKey || ''}
                        onChange={(e) => setSettings({
                          ...settings,
                          speechRecognition: {
                            ...settings.speechRecognition,
                            apiKey: e.target.value
                          }
                        })}
                        placeholder={settings.apiKey ? 'Using Translation API Key' : 'sk-...'}
                        className="w-full px-3 py-2 text-sm rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-indigo-500 focus:outline-none transition-colors"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Leave empty to use the same API key as translation service
                      </p>
                    </div>
                    </>
                  )}

                  {settings.speechRecognition.provider === 'local-whisper' && (
                    <>
                      <div className="space-y-1.5">
                        <label htmlFor="localModelType" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Local Model Type
                        </label>
                        <Select value="whisper" disabled>
                          <SelectTrigger>
                            <SelectValue placeholder="Select model type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="whisper">Whisper</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Whisper Model Size
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {(['tiny', 'base', 'small'] as WhisperModelSize[]).map((size) => {
                            const modelInfo = localWhisperService.getModelInfo(size);
                            return (
                              <button
                                key={size}
                                onClick={async () => {
                                  // Check if the model is already downloaded
                                  const isDownloaded = await localWhisperService.isModelDownloadedAsync(size);
                                  setSettings({
                                    ...settings,
                                    speechRecognition: {
                                      ...settings.speechRecognition,
                                      whisperModel: size,
                                      whisperModelDownloaded: isDownloaded
                                    }
                                  });
                                }}
                                className={`p-3 rounded-xl border-2 transition-all duration-200 ${settings.speechRecognition.whisperModel === size ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 cute-shadow' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                              >
                                <div className="text-sm font-bold text-gray-800 dark:text-white capitalize">{size}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{modelInfo.size}</div>
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {localWhisperService.getModelInfo(settings.speechRecognition.whisperModel || 'base').description}
                        </p>
                      </div>

                      {/* Model Download Button */}
                      <div className="space-y-1.5">
                        {currentModelDownloaded ? (
                          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/30 rounded-xl border border-green-200 dark:border-green-800">
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-green-800 dark:text-green-200">Model Downloaded</div>
                              <div className="text-xs text-green-600 dark:text-green-400">Ready for offline transcription</div>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={handleDownloadModel}
                            disabled={isDownloadingModel}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-500 text-white font-semibold rounded-xl cute-shadow hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 btn-pop"
                          >
                            {isDownloadingModel ? (
                              <>
                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                <span>Downloading... {Math.round(downloadProgress)}%</span>
                              </>
                            ) : (
                              <>
                                <Download className="w-4 h-4" />
                                <span>Download {settings.speechRecognition.whisperModel || 'base'} Model</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </>
                  )}

                  {/* Realtime Transcription Toggle */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <label htmlFor="realtimeTranscription" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Enable Realtime Transcription
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Transcribe audio in real-time using VAD (Voice Activity Detection)
                        </p>
                      </div>
                      <Switch
                        id="realtimeTranscription"
                        checked={settings.speechRecognition.enableRealtimeTranscription ?? true}
                        onCheckedChange={(checked: boolean) => setSettings({
                          ...settings,
                          speechRecognition: {
                            ...settings.speechRecognition,
                            enableRealtimeTranscription: checked
                          }
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-200 dark:border-indigo-800">
                  <p className="text-sm text-indigo-800 dark:text-indigo-200">
                    <strong>Web Speech:</strong> Uses your browser's built-in speech recognition (free, works offline).
                    <br />
                    <strong>AI Service:</strong> Cloud-based AI providers (SiliconFlow) with better accuracy for multiple languages.
                    <br />
                    <strong>Local Model:</strong> Run speech recognition models (Whisper) locally in your browser (requires model download, fully offline).
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Image Tab */}
            <TabsContent value="image">
              <div className="space-y-4">
                {/* OCR Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    OCR Recognition
                  </h3>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      OCR Provider
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSettings({
                          ...settings,
                          imageOCR: {
                            ...settings.imageOCR,
                            provider: 'qwen',
                            endpoint: settings.imageOCR.endpoint || DASHSCOPE_ENDPOINT
                          }
                        })}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 ${settings.imageOCR.provider === 'qwen' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 cute-shadow' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                      >
                        <div className="text-sm font-bold text-gray-800 dark:text-white">Qwen VL OCR</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Aliyun DashScope</div>
                      </button>
                      <button
                        onClick={() => setSettings({
                          ...settings,
                          imageOCR: {
                            ...settings.imageOCR,
                            provider: 'custom',
                            endpoint: ''
                          }
                        })}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 ${settings.imageOCR.provider === 'custom' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 cute-shadow' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                      >
                        <div className="text-sm font-bold text-gray-800 dark:text-white">Custom</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Your endpoint</div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Region Selection for Qwen */}
                {settings.imageOCR.provider === 'qwen' && (
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Region
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSettings({ ...settings, imageOCR: { ...settings.imageOCR, endpoint: DASHSCOPE_ENDPOINT } })}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 ${settings.imageOCR.endpoint === DASHSCOPE_ENDPOINT ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 cute-shadow' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                      >
                        <div className="text-sm font-bold text-gray-800 dark:text-white">Beijing</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">China Mainland</div>
                      </button>
                      <button
                        onClick={() => setSettings({ ...settings, imageOCR: { ...settings.imageOCR, endpoint: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1' } })}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 ${settings.imageOCR.endpoint !== DASHSCOPE_ENDPOINT ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 cute-shadow' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                      >
                        <div className="text-sm font-bold text-gray-800 dark:text-white">Singapore</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">International</div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Custom OCR Endpoint */}
                {settings.imageOCR.provider === 'custom' && (
                  <>
                    <div className="space-y-1.5">
                      <label htmlFor="ocrEndpoint" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        OCR API Endpoint
                      </label>
                      <input
                        id="ocrEndpoint"
                        type="text"
                        value={settings.imageOCR.endpoint}
                        onChange={(e) => setSettings({ ...settings, imageOCR: { ...settings.imageOCR, endpoint: e.target.value } })}
                        placeholder="https://api.example.com/v1"
                        className="w-full px-3 py-2 text-sm rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-indigo-500 focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="ocrModel" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        OCR Model Name
                      </label>
                      <input
                        id="ocrModel"
                        type="text"
                        value={settings.imageOCR.modelName || ''}
                        onChange={(e) => setSettings({ ...settings, imageOCR: { ...settings.imageOCR, modelName: e.target.value } })}
                        placeholder="model-name"
                        className="w-full px-3 py-2 text-sm rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-indigo-500 focus:outline-none transition-colors"
                      />
                    </div>
                  </>
                )}

                {/* API Key */}
                <div className="space-y-1.5">
                  <label htmlFor="imageApiKey" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {settings.imageOCR.provider === 'qwen' ? 'DashScope API Key' : 'API Key'}
                  </label>
                  <input
                    id="imageApiKey"
                    type="password"
                    value={settings.imageOCR.apiKey}
                    onChange={(e) => setSettings({ ...settings, imageOCR: { ...settings.imageOCR, apiKey: e.target.value } })}
                    placeholder="sk-..."
                    className="w-full px-3 py-2 text-sm rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-indigo-500 focus:outline-none transition-colors"
                  />
                </div>

                {/* VLM Section */}
                <div className="space-y-3 pt-3 border-t-2 border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    VLM Direct Translation
                  </h3>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      VLM Settings
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setSettings({ ...settings, vlm: { ...settings.vlm, useGeneralAI: true, useCustom: false } })}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 ${settings.vlm.useGeneralAI ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 cute-shadow' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                      >
                        <div className="text-sm font-bold text-gray-800 dark:text-white">General AI</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Use General</div>
                      </button>
                      <button
                        onClick={() => setSettings({ ...settings, vlm: { ...settings.vlm, useGeneralAI: false, useCustom: false } })}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 ${!settings.vlm.useGeneralAI && !settings.vlm.useCustom ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 cute-shadow' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                      >
                        <div className="text-sm font-bold text-gray-800 dark:text-white">Use OCR</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Same as OCR</div>
                      </button>
                      <button
                        onClick={() => setSettings({ ...settings, vlm: { ...settings.vlm, useGeneralAI: false, useCustom: true } })}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 ${!settings.vlm.useGeneralAI && settings.vlm.useCustom ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 cute-shadow' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                      >
                        <div className="text-sm font-bold text-gray-800 dark:text-white">Custom</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Custom VLM</div>
                      </button>
                    </div>
                  </div>

                  {!settings.vlm.useGeneralAI && settings.vlm.useCustom && (
                    <>
                      <div className="space-y-1.5">
                        <label htmlFor="vlmEndpoint" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                          VLM API Endpoint
                        </label>
                        <input
                          id="vlmEndpoint"
                          type="text"
                          value={settings.vlm.endpoint || ''}
                          onChange={(e) => setSettings({ ...settings, vlm: { ...settings.vlm, endpoint: e.target.value } })}
                          placeholder="https://api.example.com/v1"
                          className="w-full px-3 py-2 text-sm rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-indigo-500 focus:outline-none transition-colors"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="vlmModel" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                          VLM Model Name
                        </label>
                        <input
                          id="vlmModel"
                          type="text"
                          value={settings.vlm.modelName || ''}
                          onChange={(e) => setSettings({ ...settings, vlm: { ...settings.vlm, modelName: e.target.value } })}
                          placeholder="gpt-4o"
                          className="w-full px-3 py-2 text-sm rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-indigo-500 focus:outline-none transition-colors"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="vlmApiKey" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                          VLM API Key
                        </label>
                        <input
                          id="vlmApiKey"
                          type="password"
                          value={settings.vlm.apiKey || ''}
                          onChange={(e) => setSettings({ ...settings, vlm: { ...settings.vlm, apiKey: e.target.value } })}
                          placeholder="sk-..."
                          className="w-full px-3 py-2 text-sm rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-indigo-500 focus:outline-none transition-colors"
                        />
                      </div>
                    </>
                  )}

                  {/* Thinking Mode Toggle */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <label htmlFor="thinkingMode" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Enable Thinking Mode
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Show model's reasoning process in VLM translations
                        </p>
                      </div>
                      <Switch
                        id="thinkingMode"
                        checked={settings.vlm.enableThinking}
                        onCheckedChange={(checked: boolean) => setSettings({ ...settings, vlm: { ...settings.vlm, enableThinking: checked } })}
                      />
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-200 dark:border-indigo-800">
                  <p className="text-sm text-indigo-800 dark:text-indigo-200">
                    <strong>OCR Mode:</strong> Recognizes text regions and overlays translations on image.
                    <br />
                    <strong>VLM Mode:</strong> Directly translates image content using vision models (text output only).
                    <br />
                    <strong>Tip:</strong> VLM defaults to General AI service. Configure it in the General tab.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-3xl">
          {!isInitialSetup ? (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-indigo-500 text-white text-sm sm:text-base font-semibold rounded-xl cute-shadow hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3.5 bg-indigo-500 text-white text-sm sm:text-base font-bold rounded-xl cute-shadow hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isSaving ? 'Starting...' : 'Start Translating'}
              <Sparkles className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Import/Export Dialog */}
      <ImportExportDialog
        isOpen={showImportExport}
        onClose={() => setShowImportExport(false)}
        currentSettings={settings}
        onImport={handleImport}
      />

      {/* Download Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDownloadConfirm}
        onClose={() => setShowDownloadConfirm(false)}
        onConfirm={executeDownload}
        title="Download Model"
        description={`You are on a ${downloadConfirmInfo.networkType} network. Downloading the "${downloadConfirmInfo.modelSize}" model will use approximately ${downloadConfirmInfo.size} of data. Do you want to continue?`}
        confirmText="Download"
        cancelText="Cancel"
        variant="warning"
        icon="download"
      />
    </div>
  );
};
