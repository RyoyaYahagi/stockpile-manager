"use client";

import { useState } from "react";

interface LineSettingsModalProps {
    currentLineUserId: string | null;
    onClose: () => void;
    onSave: (newLineUserId: string) => void;
}

export default function LineSettingsModal({
    currentLineUserId,
    onClose,
    onSave,
}: LineSettingsModalProps) {
    const [lineUserId, setLineUserId] = useState(currentLineUserId || "");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await fetch("/api/user", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lineUserId }),
            });

            if (res.ok) {
                onSave(lineUserId);
                onClose();
            } else {
                alert("保存に失敗しました");
            }
        } catch (error) {
            console.error("Save error:", error);
            alert("通信エラーが発生しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
                <h2 className="text-xl font-bold mb-4">LINE通知設定</h2>

                <div className="bg-gray-50 p-4 rounded-lg mb-4 text-sm text-gray-700">
                    <p className="font-bold mb-2">LINE User IDの設定方法</p>
                    <ol className="list-decimal pl-5 space-y-1">
                        <li>Messaging APIのチャネルを作成したLINE公式アカウントを友だち追加してください。</li>
                        <li>そのアカウントに何でも良いのでメッセージを送ってください。</li>
                        <li>（開発者向け）Webhookログを確認するか、以下の簡易Botを使用してIDを取得します。</li>
                    </ol>
                    <p className="mt-2 text-xs text-gray-500">
                        ※ 現状は手動入力モードです。将来的にLINEログイン連携を実装予定です。
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            LINE User ID (Uから始まる文字列)
                        </label>
                        <input
                            type="text"
                            value={lineUserId}
                            onChange={(e) => setLineUserId(e.target.value)}
                            placeholder="U0123456789abcdef..."
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono"
                        />
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
