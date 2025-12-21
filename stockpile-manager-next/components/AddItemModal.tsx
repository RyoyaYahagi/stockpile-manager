"use client";

import { useState } from "react";
import type { Bag } from "@/lib/db/schema";

interface AddItemModalProps {
    bags: Bag[];
    familyId: string;
    onClose: () => void;
    onSuccess: () => void;
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

    const handleAddBag = async () => {
        if (!newBagName.trim()) return;

        const res = await fetch("/api/bags", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newBagName.trim() }),
        });

        const newBag = await res.json();
        setLocalBags([...localBags, newBag]);
        setBagId(newBag.id);
        setNewBagName("");
        setShowNewBagInput(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !expiryDate) return;

        setIsSubmitting(true);

        try {
            console.log('Submitting item:', { name, quantity, expiryDate, bagId, locationNote });
            const res = await fetch("/api/items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    quantity,
                    expiryDate,
                    bagId: bagId || null,
                    locationNote: locationNote.trim() || null,
                }),
            });

            console.log('Response status:', res.status);
            const data = await res.json();
            console.log('Response data:', data);

            if (res.ok) {
                onSuccess();
            } else {
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
                <h2 className="text-xl font-bold mb-4">備蓄品を追加</h2>

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
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            賞味期限
                        </label>
                        <input
                            type="date"
                            value={expiryDate}
                            onChange={(e) => setExpiryDate(e.target.value)}
                            required
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            袋（任意）
                        </label>
                        <div className="flex gap-2">
                            <select
                                value={bagId}
                                onChange={(e) => setBagId(e.target.value)}
                                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                    className="flex-1 px-3 py-2 border rounded-lg"
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
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
