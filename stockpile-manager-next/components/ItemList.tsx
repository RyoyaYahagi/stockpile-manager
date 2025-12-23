"use client";

import { useState } from "react";
import type { Item, Bag } from "@/lib/db/schema";
import AddItemModal from "./AddItemModal";
import EditItemModal from "./EditItemModal";
import ConfirmModal from "./ConfirmModal";

interface ItemListProps {
    items: (Item & { bag: Bag | null })[];
    bags: Bag[];
    familyId: string;
    onAddItem: (item: Item & { bag: Bag | null }) => void;
    onRemoveItem: (id: string) => void;
    onUpdateItem: (updatedItem: Item & { bag: Bag | null }) => void;
}

export default function ItemList({
    items,
    bags,
    familyId,
    onAddItem,
    onRemoveItem,
    onUpdateItem,
}: ItemListProps) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<(Item & { bag: Bag | null }) | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    const getDaysUntilExpiry = (expiryDate: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiry = new Date(expiryDate);
        const diffTime = expiry.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;

        // 楽観的更新
        onRemoveItem(deleteTarget);
        setDeleteTarget(null);

        // バックグラウンドで削除
        try {
            const res = await fetch(`/api/items?id=${deleteTarget}`, { method: "DELETE" });
            if (!res.ok) {
                console.error('Delete failed');
                // エラー時のロールバック処理はMVPでは省略（必要なら再fetch）
            }
        } catch (error) {
            console.error('Delete error', error);
        }
    };

    const handleItemAdded = (newItem: Item & { bag: Bag | null }) => {
        setIsAddModalOpen(false);
        onAddItem(newItem);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                    備蓄品一覧 ({items.length}件)
                </h2>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                    + 追加
                </button>
            </div>

            {items.length === 0 ? (
                <div className="text-center py-12 text-gray-700">
                    <p className="text-4xl mb-4">📦</p>
                    <p>備蓄品がありません</p>
                    <p className="text-sm">「+ 追加」ボタンで備蓄品を登録しましょう</p>
                </div>
            ) : (
                <ul className="space-y-3">
                    {items.map((item) => {
                        const daysLeft = item.expiryDate ? getDaysUntilExpiry(item.expiryDate) : null;
                        let statusClass = "text-gray-800";
                        let statusText = "";

                        if (daysLeft !== null) {
                            if (daysLeft < 0) {
                                statusClass = "text-red-600 font-semibold";
                                statusText = `（${Math.abs(daysLeft)}日経過）`;
                            } else if (daysLeft <= 7) {
                                statusClass = "text-orange-600 font-semibold";
                                statusText = `（あと${daysLeft}日）`;
                            }
                        }

                        return (
                            <li
                                key={item.id}
                                onClick={() => setEditTarget(item)}
                                className="bg-white rounded-lg shadow p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
                            >
                                <div>
                                    <h3 className="font-medium text-gray-900">
                                        {item.name}
                                        {item.quantity && item.quantity > 1 && (
                                            <span className="text-gray-700"> × {item.quantity}</span>
                                        )}
                                    </h3>
                                    <p className={statusClass}>
                                        期限: {item.expiryDate ? `${formatDate(item.expiryDate)} ${statusText}` : "期限なし"}
                                    </p>
                                    <p className="text-sm text-gray-700">
                                        💼 {item.bag?.name || "未指定"}
                                        {item.locationNote && ` / ${item.locationNote}`}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteTarget(item.id);
                                    }}
                                    className="text-red-500 hover:text-red-700 px-3 py-1"
                                >
                                    削除
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            {isAddModalOpen && (
                <AddItemModal
                    bags={bags}
                    familyId={familyId}
                    onClose={() => setIsAddModalOpen(false)}
                    onSuccess={handleItemAdded}
                />
            )}

            {deleteTarget && (
                <ConfirmModal
                    message="この備蓄品を削除しますか？"
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}

            {editTarget && (
                <EditItemModal
                    item={editTarget}
                    bags={bags}
                    onClose={() => setEditTarget(null)}
                    onSuccess={(updatedItem) => {
                        onUpdateItem(updatedItem);
                        setEditTarget(null);
                    }}
                />
            )}
        </div>
    );
}
