"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Bag, Item } from "@/lib/db/schema";

interface EditItemModalProps {
    item: Item & { bag: Bag | null };
    bags: Bag[];
    onClose: () => void;
    onSuccess: (updatedItem: Item & { bag: Bag | null }) => void;
    onAddBag: (bag: Bag) => void;
}

export default function EditItemModal({
    item,
    bags,
    onClose,
    onSuccess,
    onAddBag,
}: EditItemModalProps) {
    const [name, setName] = useState(item.name);
    const [quantity, setQuantity] = useState<string>(item.quantity?.toString() || "1");
    const [expiryDate, setExpiryDate] = useState(item.expiryDate || "");
    const [bagId, setBagId] = useState(item.bagId || "");
    const [locationNote, setLocationNote] = useState(item.locationNote || "");
    const [newBagName, setNewBagName] = useState("");
    const [showNewBagInput, setShowNewBagInput] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localBags, setLocalBags] = useState(bags);
    const [isScanning, setIsScanning] = useState(false);
    const [ocrError, setOcrError] = useState<string | null>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const libraryInputRef = useRef<HTMLInputElement>(null);
    const [showImagePicker, setShowImagePicker] = useState(false);

    useEffect(() => {
        setLocalBags(prev => {
            const prevIds = new Set(prev.map(b => b.id));
            const newBags = bags.filter(b => !prevIds.has(b.id));
            if (newBags.length === 0) return prev;
            return [...prev, ...newBags];
        });
    }, [bags]);

    // Escapeキーで閉じる
    const handleClose = useCallback(() => {
        if (!isSubmitting) {
            onClose();
        }
    }, [isSubmitting, onClose]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleClose]);

    const compressImage = (file: File, maxSizeKB: number = 900): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            img.onload = () => {
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

                let quality = 0.8;
                let base64 = canvas.toDataURL('image/jpeg', quality);

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

    const handleOcrScan = async (file: File) => {
        setIsScanning(true);
        setOcrError(null);

        try {
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
        onAddBag(newBag); // 親に通知
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);

        try {
            const res = await fetch("/api/items", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: item.id,
                    name: name.trim(),
                    quantity: parseInt(quantity, 10) || 1,
                    expiryDate: expiryDate || null,
                    bagId: bagId || null,
                    locationNote: locationNote.trim() || null,
                }),
            });

            if (res.ok) {
                const updatedItem = await res.json();
                onSuccess(updatedItem);
            } else {
                const data = await res.json();
                console.error('Error:', data);
                alert('保存に失敗しました: ' + (data.error || 'Unknown error') + (data.details ? `\n詳細: ${data.details}` : ''));
            }
        } catch (error) {
            console.error('Fetch error:', error);
            alert('通信エラーが発生しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 modal-backdrop"
            onClick={handleClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-item-title"
        >
            <div
                className="bg-white rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto modal-content"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="edit-item-title" className="text-xl font-bold mb-4 text-gray-900">備蓄品を編集</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
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
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                            数量
                        </label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            min={1}
                            max={99}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                            賞味期限
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="date"
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(e.target.value)}
                                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                            />
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
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                            収納場所（任意）
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
                                    placeholder="新しい収納場所の名前"
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
                        <label className="block text-sm font-medium text-gray-900 mb-1">
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
                            onClick={handleClose}
                            className="btn-secondary flex-1"
                        >
                            やめる
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-primary flex-1 disabled:opacity-50"
                        >
                            {isSubmitting ? "保存中..." : "保存する"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
