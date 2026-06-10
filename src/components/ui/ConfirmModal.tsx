import React, { useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation, faXmark } from '@fortawesome/free-solid-svg-icons';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isDestructive = true,
}: ConfirmModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-[400px] rounded-2xl bg-white dark:bg-[#1E2022] border border-[#EEF0EF]/10 dark:border-[#2E3133]/60 p-6 shadow-xl animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[#A3A7A8] hover:text-[#2F3331] dark:hover:text-[#FAFAFA] transition-colors"
        >
          <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full ${isDestructive ? 'bg-[#FF453A]/10 text-[#FF453A]' : 'bg-[#FF9933]/10 text-[#FF9933]'}`}>
            <FontAwesomeIcon icon={faTriangleExclamation} className="w-7 h-7" />
          </div>
          
          <h3 className="mb-2 text-xl font-bold font-serif text-[#2F3331] dark:text-[#FAFAFA]">
            {title}
          </h3>
          <p className="mb-8 text-[#6F7476] dark:text-[#A3A7A8] font-light leading-relaxed">
            {message}
          </p>

          <div className="flex w-full gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl bg-[#F2F2F3] dark:bg-[#2E3133] py-3 text-sm font-bold text-[#2F3331] dark:text-[#E4E7E6] transition-colors hover:bg-[#E8E9EA] dark:hover:bg-[#3E4347]"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 rounded-xl py-3 text-sm font-bold text-white transition-colors ${
                isDestructive ? 'bg-[#FF453A] hover:bg-[#E63E34]' : 'bg-[#00DC7D] hover:bg-[#00B866]'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
