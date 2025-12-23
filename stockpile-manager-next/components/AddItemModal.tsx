"use client";

import { useState, useEffect, useRef } from "react";
import type { Bag, Item } from "@/lib/db/schema";

interface AddItemModalProps {
    bags: Bag[];
    familyId: string;
    onClose: () => void;
    onSuccess: (item: Item & { bag: Bag | null }) => void;
}

export default function AddItemModal({
    bags,
    familyId,
    onClose,
    onSuccess,
}: AddItemModalProps) {
    const [name, setName] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [expiryDate, setExpiryDate] = useState("");
    const [bagId, setBagId] = useState("");
    const [locationNote, setLocationNote] = useState("");
    const [newBagName, setNewBagName] = useState("");
    const [showNewBagInput, setShowNewBagInput] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localBags, setLocalBags] = useState(bags);
    // OCR用
    const [isScanning, setIsScanning] = useState(false);
    const [ocrError, setOcrError] = useState<string | null>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const libraryInputRef = useRef<HTMLInputElement>(null);
    const [showImagePicker, setShowImagePicker] = useState(false);

    // props.bagsが更新されたらlocalBagsにも反映（重複除外）
    useEffect(() => {
        setLocalBags(prev => {
            const prevIds = new Set(prev.map(b => b.id));
            const newBags = bags.filter(b => !prevIds.has(b.id));
            if (newBags.length === 0) return prev;
            return [...prev, ...newBags];
        });
    }, [bags]);

    // 画像を圧縮する（OCR.space APIの1MB制限対応）
    const compressImage = (file: File, maxSizeKB: number = 900): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            img.onload = () => {
                // 最大幅/高さを設定（大きい画像をリサイズ）
                let width = img.width;
                let height = img.height;
                const maxDimension = 1600;

                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = (height / width) * maxDimension;
                        width = maxDimension;
                    } else {
                        width = (width / height) * maxDimension;
                        height = maxDimension;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx?.drawImage(img, 0, 0, width, height);

                // 品質を調整してサイズを制限
                let quality = 0.8;
                let base64 = canvas.toDataURL('image/jpeg', quality);

                // サイズが大きい場合は品質を下げる
                while (base64.length > maxSizeKB * 1024 * 1.37 && quality > 0.1) {
                    quality -= 0.1;
                    base64 = canvas.toDataURL('image/jpeg', quality);
                }

                resolve(base64);
            };

            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    };

    // OCRで賞味期限を読み取る
    const handleOcrScan = async (file: File) => {
        setIsScanning(true);
        setOcrError(null);

        try {
            // 画像を圧縮してBase64に変換
            const base64 = await compressImage(file);

            const formData = new FormData();
            formData.append("base64", base64);

            const res = await fetch("/api/ocr", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (res.ok && data.suggestedDate) {
                setExpiryDate(data.suggestedDate);
                setOcrError(null);
            } else if (res.ok && data.dates && data.dates.length > 0) {
                setExpiryDate(data.dates[0]);
                setOcrError(null);
            } else {
                setOcrError(data.error || "日付を検出できませんでした");
            }
        } catch (error) {
            console.error("OCR error:", error);
            setOcrError("画像の読み取りに失敗しました");
        } finally {
            setIsScanning(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleOcrScan(file);
        }
    };

    const handleAddBag = async () => {
        if (!newBagName.trim()) return;

        const res = await fetch("/api/bags", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newBagName.trim() }),
        });

        const newBag = await res.json();
        setLocalBags(prev => [...prev, newBag]);
        setBagId(newBag.id);
        setNewBagName("");
        setShowNewBagInput(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !expiryDate) return;

        setIsSubmitting(true);

        try {
            let finalBagId = bagId;

            // 新規袋の入力があり、まだ追加されていない（bagIdが空）場合は自動作成
            if (showNewBagInput && newBagName.trim() && !bagId) {
                const bagRes = await fetch("/api/bags", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: newBagName.trim() }),
                });

                if (bagRes.ok) {
                    const newBag = await bagRes.json();
                    setLocalBags(prev => [...prev, newBag]);
                    finalBagId = newBag.id;
                }
            }

            const res = await fetch("/api/items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    quantity,
                    expiryDate,
                    bagId: finalBagId || null,
                    locationNote: locationNote.trim() || null,
                }),
            });

            if (res.ok) {
                const newItem = await res.json();
                console.log('API Response Item:', newItem);

                // bag情報を付加（楽観的更新用）
                let bag = localBags.find(b => b.id === newItem.bagId) || null;

                // localBagsに見つからない場合（同期ズレなど）、APIから取得を試みる
                if (!bag && newItem.bagId) {
                    try {
                        // localBagsを再検索（念のため）または親のbagsを確認したいが、
                        // ここでは単発でfetchする方が確実
                        // ただしGET /api/bags/[id]のエンドポイントがないので、
                        // GET /api/bags から探すか、簡易的に名前だけ解決する手段が必要。
                        // 今回は MVP なので、少し強引だが /api/bags を再取得して探す。
                        const bagsRes = await fetch("/api/bags");
                        if (bagsRes.ok) {
                            const allBags = await bagsRes.json();
                            bag = allBags.find((b: any) => b.id === newItem.bagId) || null;
                            console.log('Found Bag via refetch:', bag);
                        }
                    } catch (e) {
                        console.error("Failed to recover bag info", e);
                    }
                }

                const newItemWithBag = { ...newItem, bag };
                console.log('New Item with Bag:', newItemWithBag);

                onSuccess(newItemWithBag);
            } else {
                const data = await res.json();
                console.error('Error:', data);
                alert('保存に失敗しました: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Fetch error:', error);
            alert('通信エラーが発生しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4 text-gray-900">備蓄品を追加</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            品名
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="例: 水 2L"
                            required
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            数量
                        </label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                            min={1}
                            max={99}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            賞味期限
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="date"
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(e.target.value)}
                                required
                                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                            />
                            {/* カメラ用input（capture属性あり） */}
                            <input
                                type="file"
                                ref={cameraInputRef}
                                accept="image/*"
                                capture="environment"
                                onChange={(e) => {
                                    handleFileChange(e);
                                    setShowImagePicker(false);
                                }}
                                className="hidden"
                            />
                            {/* ライブラリ用input（capture属性なし） */}
                            <input
                                type="file"
                                ref={libraryInputRef}
                                accept="image/*"
                                onChange={(e) => {
                                    handleFileChange(e);
                                    setShowImagePicker(false);
                                }}
                                className="hidden"
                            />
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowImagePicker(!showImagePicker)}
                                    disabled={isScanning}
                                    className="px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 flex items-center gap-1"
                                >
                                    {isScanning ? (
                                        <span className="animate-spin">⏳</span>
                                    ) : (
                                        <span>📷</span>
                                    )}
                                    <span className="hidden sm:inline">{isScanning ? "読取中" : "読取"}</span>
                                </button>
                                {showImagePicker && !isScanning && (
                                    <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-10 min-w-[140px]">
                                        <button
                                            type="button"
                                            onClick={() => cameraInputRef.current?.click()}
                                            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-gray-900"
                                        >
                                            📷 カメラ
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => libraryInputRef.current?.click()}
                                            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 border-t text-gray-900"
                                        >
                                            🖼️ ライブラリ
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        {ocrError && (
                            <p className="text-red-500 text-sm mt-1">{ocrError}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            袋（任意）
                        </label>
                        <div className="flex gap-2">
                            <select
                                value={bagId}
                                onChange={(e) => setBagId(e.target.value)}
                                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                            >
                                <option value="">未指定</option>
                                {localBags.map((bag) => (
                                    <option key={bag.id} value={bag.id}>
                                        {bag.name}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => setShowNewBagInput(!showNewBagInput)}
                                className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                            >
                                +新規
                            </button>
                        </div>
                        {showNewBagInput && (
                            <div className="flex gap-2 mt-2">
                                <input
                                    type="text"
                                    value={newBagName}
                                    onChange={(e) => setNewBagName(e.target.value)}
                                    placeholder="新しい袋の名前"
                                    className="flex-1 px-3 py-2 border rounded-lg text-gray-900"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddBag}
                                    className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                                >
                                    追加
                                </button>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            場所メモ（任意）
                        </label>
                        <input
                            type="text"
                            value={locationNote}
                            onChange={(e) => setLocationNote(e.target.value)}
                            placeholder="例: 外ポケット、上段"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 text-gray-900"
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                        >
                            {isSubmitting ? "保存中..." : "保存"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
