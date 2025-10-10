import { X } from 'lucide-react';

interface UpdateNotificationProps {
  onUpdate: () => void;
  onDismiss: () => void;
}

export function UpdateNotification({ onUpdate, onDismiss }: UpdateNotificationProps) {
  return (
    <div className="fixed bottom-8 left-0 right-0 z-50 animate-fade-in flex justify-center px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-2 border-indigo-200 dark:border-indigo-700 overflow-hidden w-full max-w-2xl">
        {/* Main content */}
        <div className="px-6 py-4">
          <div className="flex items-start gap-4">
            {/* Text content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                New version available!
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                A new version of tabitomo is ready. Reload to update.
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={onDismiss}
              className="flex-shrink-0 w-6 h-6 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors duration-200"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Action button */}
          <button
            onClick={onUpdate}
            className="mt-4 w-full bg-indigo-500 text-white font-semibold py-2.5 px-4 rounded-xl cute-shadow hover:shadow-lg transition-all duration-200 text-sm"
          >
            Reload Now
          </button>
        </div>
      </div>
    </div>
  );
}
