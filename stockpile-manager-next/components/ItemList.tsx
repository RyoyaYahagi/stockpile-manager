"use client";

import { useState } from "react";
import type { Item, Bag } from "@/lib/db/schema";
import AddItemModal from "./AddItemModal";
import EditItemModal from "./EditItemModal";
import ConfirmModal from "./ConfirmModal";
import ImportItemsModal from "./ImportItemsModal";

interface ItemListProps {
    items: (Item & { bag: Bag | null })[];
    bags: Bag[];
    familyId: string;
    onAddItem: (item: Item & { bag: Bag | null }) => void;
    onRemoveItem: (id: string) => void;
    onUpdateItem: (updatedItem: Item & { bag: Bag | null }) => void;
    onAddBag: (bag: Bag) => void;
    onRemoveBag: (bagId: string) => void;
}

export default function ItemList({
    items,
    bags,
    familyId,
    onAddItem,
    onRemoveItem,
    onUpdateItem,
    onAddBag,
    onRemoveBag,
}: ItemListProps) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<(Item & { bag: Bag | null }) | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>("ALL");

    // 一括削除用
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    // 袋削除用
    const [deleteBagTarget, setDeleteBagTarget] = useState<string | null>(null);
    const [isDeletingBag, setIsDeletingBag] = useState(false);

    const handleDeleteBag = async () => {
        if (!deleteBagTarget) return;
        setIsDeletingBag(true);

        try {
            const res = await fetch(`/api/bags?id=${deleteBagTarget}`, { method: "DELETE" });
            if (res.ok) {
                onRemoveBag(deleteBagTarget);
                // 現在表示中の袋が削除された場合は「すべて」に戻る
                if (activeTab === deleteBagTarget) {
                    setActiveTab("ALL");
                }
            } else {
                alert("袋の削除に失敗しました");
            }
        } catch (error) {
            console.error("Delete bag error:", error);
            alert("袋の削除に失敗しました");
        } finally {
            setDeleteBagTarget(null);
            setIsDeletingBag(false);
        }
    };

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
            }
        } catch (error) {
            console.error('Delete error', error);
        }
    };

    const handleBulkDelete = async () => {
        setIsBulkDeleting(true);
        const idsToDelete = Array.from(selectedIds);

        // UIから削除（楽観的更新）
        idsToDelete.forEach(id => onRemoveItem(id));
        setSelectedIds(new Set());
        setIsBulkDeleteConfirmOpen(false);

        // APIで削除
        try {
            await Promise.all(idsToDelete.map(id => fetch(`/api/items?id=${id}`, { method: "DELETE" })));
        } catch (error) {
            console.error('Bulk delete error', error);
            alert('一部の削除に失敗した可能性があります');
        } finally {
            setIsBulkDeleting(false);
        }
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const toggleSelectAll = (filteredItems: (Item & { bag: Bag | null })[]) => {
        const allSelected = filteredItems.every(item => selectedIds.has(item.id));
        if (allSelected) {
            // 現在のフィルター内のアイテムを選択解除
            const newSelected = new Set(selectedIds);
            filteredItems.forEach(item => newSelected.delete(item.id));
            setSelectedIds(newSelected);
        } else {
            // 現在のフィルター内のアイテムを全選択
            const newSelected = new Set(selectedIds);
            filteredItems.forEach(item => newSelected.add(item.id));
            setSelectedIds(newSelected);
        }
    };

    const handleItemAdded = (newItem: Item & { bag: Bag | null }) => {
        setIsAddModalOpen(false);
        onAddItem(newItem);
    };

    const handleImportSuccess = (newItems: (Item & { bag: Bag | null })[]) => {
        newItems.forEach((item) => onAddItem(item));
        setIsImportModalOpen(false);
    };

    // タブによるフィルタリング
    const filteredItems = items.filter((item) => {
        if (activeTab === "ALL") return true;
        if (activeTab === "UNASSIGNED") return !item.bagId;
        return item.bagId === activeTab;
    });

    const isAllSelected = filteredItems.length > 0 && filteredItems.every(item => selectedIds.has(item.id));

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                    備蓄品一覧 ({items.length}件)
                </h2>
                <div className="flex gap-2">
                    {selectedIds.size > 0 && (
                        <button
                            onClick={() => setIsBulkDeleteConfirmOpen(true)}
                            className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm"
                        >
                            {selectedIds.size}件を削除
                        </button>
                    )}
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                    >
                        📥 インポート
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        + 追加
                    </button>
                </div>
            </div>

            {/* タブメニュー */}
            <div className="mb-4 overflow-x-auto">
                <div className="flex space-x-2 pb-2">
                    <button
                        onClick={() => setActiveTab("ALL")}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeTab === "ALL"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                    >
                        すべて
                    </button>
                    {bags.map((bag) => (
                        <div key={bag.id} className="relative group flex items-center">
                            <button
                                onClick={() => setActiveTab(bag.id)}
                                className={`px-4 py-2 pr-8 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeTab === bag.id
                                    ? "bg-blue-500 text-white"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                    }`}
                            >
                                {bag.name}
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteBagTarget(bag.id);
                                }}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-red-500 text-white text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                title="この袋を削除"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={() => setActiveTab("UNASSIGNED")}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeTab === "UNASSIGNED"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                    >
                        未指定
                    </button>
                </div>
            </div>

            {filteredItems.length === 0 ? (
                <div className="text-center py-12 text-gray-700">
                    <p className="text-4xl mb-4">📦</p>
                    <p>
                        {activeTab === "ALL"
                            ? "備蓄品がありません"
                            : "この袋には備蓄品がありません"}
                    </p>
                    {activeTab === "ALL" && (
                        <p className="text-sm">「+ 追加」ボタンで備蓄品を登録しましょう</p>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-2 mb-2">
                        <input
                            type="checkbox"
                            checked={isAllSelected}
                            onChange={() => toggleSelectAll(filteredItems)}
                            className="w-5 h-5 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-600">すべて選択</span>
                    </div>

                    <ul className="space-y-3">
                        {filteredItems.map((item) => {
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
                                    className={`bg-white rounded-lg shadow p-4 flex gap-3 items-center cursor-pointer hover:bg-gray-50 transition-colors ${selectedIds.has(item.id) ? "ring-2 ring-blue-500" : ""
                                        }`}
                                >
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleSelect(item.id);
                                        }}
                                        className="flex-shrink-0"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(item.id)}
                                            onChange={() => { }} // 親のdivで制御
                                            className="w-5 h-5 rounded border-gray-300"
                                        />
                                    </div>
                                    <div className="flex-1">
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
                </div>
            )}

            {isAddModalOpen && (
                <AddItemModal
                    bags={bags}
                    familyId={familyId}
                    onClose={() => setIsAddModalOpen(false)}
                    onSuccess={handleItemAdded}
                    onAddBag={onAddBag}
                />
            )}

            {deleteTarget && (
                <ConfirmModal
                    message="この備蓄品を削除しますか？"
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}

            {isBulkDeleteConfirmOpen && (
                <ConfirmModal
                    message={`選択した ${selectedIds.size} 件の備蓄品を削除しますか？`}
                    onConfirm={handleBulkDelete}
                    onCancel={() => setIsBulkDeleteConfirmOpen(false)}
                />
            )}

            {deleteBagTarget && (
                <ConfirmModal
                    message={`この袋を削除しますか？袋に入っている備蓄品は「未指定」に移動します。`}
                    onConfirm={handleDeleteBag}
                    onCancel={() => setDeleteBagTarget(null)}
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

            {isImportModalOpen && (
                <ImportItemsModal
                    onClose={() => setIsImportModalOpen(false)}
                    onSuccess={handleImportSuccess}
                />
            )}
        </div>
    );
}
