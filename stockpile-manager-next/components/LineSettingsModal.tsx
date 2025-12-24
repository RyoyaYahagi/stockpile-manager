"use client";

import { useState } from "react";

interface LineSettingsModalProps {
    currentLineUserId: string | null;
    currentLineGroupId: string | null;
    onClose: () => void;
    onSave: (newLineUserId: string, newLineGroupId: string | null) => void;
}

export default function LineSettingsModal({
    currentLineUserId,
    currentLineGroupId,
    onClose,
    onSave,
}: LineSettingsModalProps) {
    const [lineUserId, setLineUserId] = useState(currentLineUserId || "");
    const [lineGroupId, setLineGroupId] = useState(currentLineGroupId || "");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    // グループID形式バリデーション（Cから始まる英数字）
    const validateGroupId = (id: string): boolean => {
        if (!id) return true; // 空は許可
        return /^C[0-9a-f]+$/i.test(id);
    };

    // User ID形式バリデーション（Uから始まる英数字）
    const validateUserId = (id: string): boolean => {
        if (!id) return true; // 空は許可
        return /^U[0-9a-f]+$/i.test(id);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError(null);

        // バリデーション
        if (!validateGroupId(lineGroupId)) {
            setValidationError("グループIDはCから始まる文字列である必要があります");
            return;
        }
        if (!validateUserId(lineUserId)) {
            setValidationError("User IDはUから始まる文字列である必要があります");
            return;
        }

        setIsSubmitting(true);

        try {
            // 個人のLine User IDを保存
            const userRes = await fetch("/api/user", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lineUserId }),
            });

            // 家族のLine Group IDを保存
            const familyRes = await fetch("/api/family", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lineGroupId }),
            });

            if (userRes.ok && familyRes.ok) {
                onSave(lineUserId, lineGroupId || null);
                onClose();
            } else {
                alert("保存に失敗しました");
            }
        } catch {
            alert("通信エラーが発生しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">LINE通知設定</h2>

                <div className="bg-blue-50 p-4 rounded-lg mb-4 text-sm text-blue-800">
                    <p className="font-bold mb-2">💡 グループ通知がおすすめ！</p>
                    <p>
                        LINEグループに通知を送ると、家族全員が同時に期限切れ情報を確認できます。
                    </p>
                </div>

                {validationError && (
                    <div className="bg-red-50 p-3 rounded-lg mb-4 text-sm text-red-700">
                        ⚠️ {validationError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* グループID入力 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            👨‍👩‍👧‍👦 LINEグループID（推奨）
                        </label>
                        <input
                            type="text"
                            value={lineGroupId}
                            onChange={(e) => setLineGroupId(e.target.value)}
                            placeholder="C0123456789abcdef..."
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm text-gray-900"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            ※ Cから始まる文字列。ボットをグループに追加してWebhookから取得
                        </p>
                    </div>

                    <div className="border-t pt-4">
                        <p className="text-sm text-gray-500 mb-2">または個人通知</p>
                    </div>

                    {/* 個人User ID入力 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            👤 LINE User ID（個人通知）
                        </label>
                        <input
                            type="text"
                            value={lineUserId}
                            onChange={(e) => setLineUserId(e.target.value)}
                            placeholder="U0123456789abcdef..."
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm text-gray-900"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            ※ Uから始まる文字列。グループIDが設定されている場合は使用されません
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                        >
                            {isSubmitting ? "保存中..." : "保存"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
