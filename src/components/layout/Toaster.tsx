'use client';

import { useFinderStore } from '@/store/useFinderStore';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export function Toaster() {
  const { toasts, removeToast } = useFinderStore();

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg p-3 flex items-center gap-3 animate-in slide-in-from-top-2 fade-in duration-300"
        >
          {toast.type === 'success' && <CheckCircle className="text-green-500 w-5 h-5" />}
          {toast.type === 'error' && <AlertCircle className="text-red-500 w-5 h-5" />}
          {toast.type === 'info' && <Info className="text-blue-500 w-5 h-5" />}
          
          <p className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">{toast.message}</p>
          
          <button onClick={() => removeToast(toast.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
