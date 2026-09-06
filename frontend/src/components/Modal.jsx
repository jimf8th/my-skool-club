import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, onClose, children, size = 'max-w-2xl' }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`max-h-[92vh] w-full ${size} overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6`}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label={`Close ${title}`}>
            <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
