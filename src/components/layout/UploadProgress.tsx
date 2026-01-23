'use client';

import React from 'react';
import { useFinderStore } from '@/store/useFinderStore';
import { X, ChevronDown, ChevronUp, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function UploadProgress() {
  const { 
    uploadTasks, 
    isUploadPanelOpen, 
    toggleUploadPanel, 
    removeUploadTask, 
    clearCompletedTasks 
  } = useFinderStore();

  if (uploadTasks.length === 0) return null;

  const completedCount = uploadTasks.filter(t => t.status === 'completed').length;
  const inProgressCount = uploadTasks.filter(t => t.status === 'uploading' || t.status === 'pending').length;
  const errorCount = uploadTasks.filter(t => t.status === 'error').length;
  
  // Calculate total progress (simple average for now)
  const totalProgress = uploadTasks.length > 0 
    ? Math.round(uploadTasks.reduce((acc, t) => acc + t.progress, 0) / uploadTasks.length)
    : 0;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden transition-all duration-300">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        onClick={toggleUploadPanel}
      >
        <div className="flex items-center gap-2">
          {inProgressCount > 0 ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          ) : errorCount > 0 ? (
            <AlertCircle className="w-4 h-4 text-red-500" />
          ) : (
            <CheckCircle className="w-4 h-4 text-green-500" />
          )}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {inProgressCount > 0 
              ? `Uploading ${inProgressCount} item${inProgressCount !== 1 ? 's' : ''}...` 
              : 'Upload complete'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isUploadPanelOpen ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronUp className="w-4 h-4 text-gray-500" />}
        </div>
      </div>

      {/* Progress Bar (Global) */}
      {inProgressCount > 0 && (
        <div className="h-1 w-full bg-gray-100 dark:bg-gray-700">
          <div 
            className="h-full bg-blue-500 transition-all duration-300" 
            style={{ width: `${totalProgress}%` }}
          />
        </div>
      )}

      {/* Body */}
      {isUploadPanelOpen && (
        <div className="max-h-60 overflow-y-auto p-2 space-y-2 bg-white dark:bg-gray-800">
          <div className="flex justify-between items-center px-1 pb-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-xs text-gray-500">
              {completedCount} / {uploadTasks.length} completed
            </span>
            {completedCount > 0 && (
              <button 
                onClick={(e) => { e.stopPropagation(); clearCompletedTasks(); }}
                className="text-xs text-blue-500 hover:text-blue-600"
              >
                Clear completed
              </button>
            )}
          </div>
          
          {uploadTasks.map(task => (
            <div key={task.id} className="group flex items-center gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate block max-w-[180px]">
                    {task.name}
                  </span>
                  <span className={cn(
                    "text-[10px]",
                    task.status === 'error' ? "text-red-500" : "text-gray-400"
                  )}>
                    {task.status === 'error' ? 'Failed' : `${task.progress}%`}
                  </span>
                </div>
                <div className="h-1 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-300 rounded-full",
                      task.status === 'completed' ? "bg-green-500" :
                      task.status === 'error' ? "bg-red-500" : "bg-blue-500"
                    )}
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); removeUploadTask(task.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              >
                <X className="w-3 h-3 text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
