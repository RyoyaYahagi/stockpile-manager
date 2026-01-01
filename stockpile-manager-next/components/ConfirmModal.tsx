'use client';

import { useEffect } from 'react';

interface ConfirmModalProps {
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmLabel?: string;
}

export default function ConfirmModal({ message, onConfirm, onCancel, confirmLabel = "削除する" }: ConfirmModalProps) {
    // Escapeキーで閉じる
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onCancel();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onCancel]);

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 modal-backdrop"
            onClick={onCancel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
        >
            <div
                className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 text-center modal-content"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="confirm-title" className="text-lg font-semibold mb-4 text-gray-900">確認</h2>
                <p className="text-gray-800 mb-6">{message}</p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="btn-secondary flex-1"
                    >
                        やめる
                    </button>
                    <button
                        onClick={onConfirm}
                        className="btn-danger flex-1"
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
