"use client";

import { useState, useRef } from "react";
import type { Item, Bag } from "@/lib/db/schema";

interface ImportItemsModalProps {
    onClose: () => void;
    onSuccess: (items: (Item & { bag: Bag | null })[]) => void;
}

interface PreviewItem {
    name: string;
    quantity: number;
    expiryDate: string;
    bagName?: string;
    locationNote?: string;
}

export default function ImportItemsModal({
    onClose,
    onSuccess,
}: ImportItemsModalProps) {
    const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setError(null);
        setPreviewItems([]);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const data = JSON.parse(text);

                // 配列でない場合はitemsプロパティを確認
                const items = Array.isArray(data) ? data : data.items;

                if (!Array.isArray(items)) {
                    setError("JSONは配列形式、または { items: [...] } 形式で指定してください");
                    return;
                }

                // ローカルバリデーション
                const validated: PreviewItem[] = [];
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];

                    if (!item.name || typeof item.name !== "string") {
                        setError(`アイテム${i + 1}: 品名（name）は必須です`);
                        return;
                    }

                    if (item.expiryDate && typeof item.expiryDate === "string") {
                        const dateMatch = item.expiryDate.match(/^\d{4}-\d{2}-\d{2}$/);
                        if (!dateMatch) {
                            setError(`アイテム${i + 1}: 賞味期限はYYYY-MM-DD形式で指定してください`);
                            return;
                        }
                    }

                    validated.push({
                        name: item.name.trim(),
                        quantity: item.quantity || 1,
                        expiryDate: item.expiryDate || null,
                        bagName: item.bagName?.trim() || undefined,
                        locationNote: item.locationNote?.trim() || undefined,
                    });
                }

                setPreviewItems(validated);
            } catch {
                setError("JSONの解析に失敗しました。正しいJSON形式か確認してください。");
            }
        };

        reader.readAsText(file);
    };

    const handleImport = async () => {
        if (previewItems.length === 0) return;

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/items/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items: previewItems }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "インポートに失敗しました");
                return;
            }

            // 成功時
            onSuccess(data.items);
            onClose();
        } catch {
            setError("インポート中にエラーが発生しました");
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* ヘッダー */}
                <div className="px-6 py-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-semibold">📥 JSONインポート</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                        ×
                    </button>
                </div>

                {/* コンテンツ */}
                <div className="p-6 overflow-y-auto flex-1">
                    {/* ファイル選択 */}
                    <div className="mb-4">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors"
                        >
                            <span className="text-3xl block mb-2">📄</span>
                            {fileName ? (
                                <span className="text-gray-700">{fileName}</span>
                            ) : (
                                <span className="text-gray-500">JSONファイルを選択</span>
                            )}
                        </button>
                    </div>

                    {/* エラー表示 */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                            ⚠️ {error}
                        </div>
                    )}

                    {/* プレビュー */}
                    {previewItems.length > 0 && (
                        <div>
                            <h3 className="font-medium text-gray-700 mb-2">
                                プレビュー ({previewItems.length}件)
                            </h3>
                            <ul className="space-y-2 max-h-60 overflow-y-auto">
                                {previewItems.map((item, index) => (
                                    <li
                                        key={index}
                                        className="bg-gray-50 rounded-lg p-3 text-sm"
                                    >
                                        <div className="font-medium text-gray-800">
                                            {item.name}
                                            {item.quantity > 1 && (
                                                <span className="text-gray-500"> × {item.quantity}</span>
                                            )}
                                        </div>
                                        <div className="text-gray-600">
                                            期限: {item.expiryDate ? formatDate(item.expiryDate) : "なし"}
                                            {item.bagName && ` / 💼 ${item.bagName}`}
                                            {item.locationNote && ` / ${item.locationNote}`}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* JSONフォーマット説明 */}
                    {previewItems.length === 0 && !error && (
                        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
                            <p className="font-medium mb-2">対応フォーマット:</p>
                            <pre className="bg-white p-2 rounded border text-xs overflow-x-auto">
                                {`[
  {
    "name": "カップラーメン",
    "quantity": 5,
    "expiryDate": "2025-12-31",
    "bagName": "非常持ち出し袋"
  }
]`}
                            </pre>
                            <p className="mt-2 text-xs">
                                ※ quantity, expiryDate, bagName, locationNote はオプション
                            </p>
                        </div>
                    )}
                </div>

                {/* フッター */}
                <div className="px-6 py-4 border-t flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={previewItems.length === 0 || isLoading}
                        className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        {isLoading ? "インポート中..." : `インポート (${previewItems.length}件)`}
                    </button>
                </div>
            </div>
        </div>
    );
}
