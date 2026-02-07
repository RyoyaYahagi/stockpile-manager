"use client";

import { useState } from "react";
import type { Bag } from "@/lib/db/schema";

interface BulkMoveModalProps {
    bags: Bag[];
    selectedCount: number;
    actionType: 'move' | 'copy';
    onConfirm: (targetBagId: string | null) => void;
    onClose: () => void;
}

export default function BulkMoveModal({
    bags,
    selectedCount,
    actionType,
    onConfirm,
    onClose,
}: BulkMoveModalProps) {
    const [targetBagId, setTargetBagId] = useState<string>("");

    const handleSubmit = () => {
        onConfirm(targetBagId === "" ? null : targetBagId);
    };

    const actionLabel = actionType === 'move' ? '移動' : 'コピー';

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-lg font-semibold mb-4">
                    {selectedCount}件を{actionLabel}
                </h2>

                <div className="mb-6">
                    <label
                        htmlFor="target-storage"
                        className="block text-sm font-medium text-gray-700 mb-2"
                    >
                        {actionLabel}先の収納場所
                    </label>
                    <select
                        id="target-storage"
                        value={targetBagId}
                        onChange={(e) => setTargetBagId(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                        <option value="">未指定</option>
                        {bags.map((bag) => (
                            <option key={bag.id} value={bag.id}>
                                {bag.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 px-4 py-3 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
                    >
                        {actionLabel}する
                    </button>
                </div>
            </div>
        </div>
    );
}
