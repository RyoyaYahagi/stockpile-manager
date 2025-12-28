"use client";

import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";

interface LineSettingsModalProps {
    currentLineUserId: string | null;
    currentLineGroupId: string | null;
    onClose: () => void;
    onSave: (newLineUserId: string, newLineGroupId: string | null) => void;
}

// LINE公式アカウントの友だち追加URL
const RAW_LINE_BOT_ID = process.env.NEXT_PUBLIC_LINE_BOT_ID || "stockpile-manager";
// @が付いていない場合は自動追加
const LINE_BOT_ID = RAW_LINE_BOT_ID.startsWith('@') ? RAW_LINE_BOT_ID : `@${RAW_LINE_BOT_ID}`;
const LINE_BOT_URL = `https://line.me/R/ti/p/${LINE_BOT_ID}`;

// 簡易的な紙吹雪アニメーション用のCSSクラス
const pulseAnimation = `
@keyframes pulse-once {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}
.animate-pulse-once {
  animation: pulse-once 0.5s ease-in-out;
}
`;

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

    // QRコード連携用の状態
    const [linkCode, setLinkCode] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLinked, setIsLinked] = useState(!!currentLineUserId || !!currentLineGroupId);
    const [showManualInput, setShowManualInput] = useState(false);

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

    // リンクコードを生成
    const generateLinkCode = async () => {
        setIsGenerating(true);
        try {
            const res = await fetch("/api/line/link", { method: "POST" });
            if (res.ok) {
                const data = await res.json();
                setLinkCode(data.token);
                setExpiresAt(new Date(data.expiresAt));
            } else {
                alert("コードの生成に失敗しました");
            }
        } catch {
            alert("通信エラーが発生しました");
        } finally {
            setIsGenerating(false);
        }
    };

    // 連携状態をポーリングで確認
    const checkLinkStatus = useCallback(async () => {
        try {
            const res = await fetch("/api/line/link");
            if (res.ok) {
                const data = await res.json();
                if (data.linked) {
                    setIsLinked(true);
                    setLineUserId(data.lineUserId || "");
                    setLineGroupId(data.lineGroupId || "");

                    // 以前リンクされていなかった場合、保存処理を実行
                    if (!currentLineUserId && !currentLineGroupId) {
                        onSave(data.lineUserId || "", data.lineGroupId || null);
                    }
                }
            }
        } catch {
            // エラーは無視
        }
    }, [currentLineUserId, currentLineGroupId, onSave]);

    // 有効期限の残り時間を計算
    const getRemainingTime = () => {
        if (!expiresAt) return null;
        const now = new Date();
        const diff = expiresAt.getTime() - now.getTime();
        if (diff <= 0) return "期限切れ";
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // ポーリング
    useEffect(() => {
        if (!linkCode || isLinked) return;

        const interval = setInterval(() => {
            checkLinkStatus();
            // 有効期限切れチェック
            if (expiresAt && new Date() > expiresAt) {
                setLinkCode(null);
                setExpiresAt(null);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [linkCode, isLinked, expiresAt, checkLinkStatus]);

    // 残り時間の表示を更新
    const [remainingTime, setRemainingTime] = useState<string | null>(null);
    useEffect(() => {
        if (!expiresAt) return;
        const interval = setInterval(() => {
            setRemainingTime(getRemainingTime());
        }, 1000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expiresAt]);

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
                <h2 className="text-xl font-bold mb-4 text-gray-900">LINE通知設定</h2>

                {/* 連携済みの場合 */}
                {isLinked && (
                    <div className="bg-green-100 border-2 border-green-500 p-6 rounded-xl mb-6 text-center animate-pulse-once shadow-sm">
                        <style>{pulseAnimation}</style>
                        <div className="text-4xl mb-3">🎉</div>
                        <p className="text-green-800 font-bold text-xl mb-2">LINE連携完了！</p>
                        <p className="text-green-700 font-medium mb-1">
                            {lineGroupId
                                ? "家族グループと連携されています"
                                : "個人アカウントと連携されています"}
                        </p>
                        <p className="text-sm text-green-600 font-mono bg-green-50 inline-block px-3 py-1 rounded-full mt-2">
                            {lineGroupId || lineUserId || "Connecting..."}
                        </p>
                        <p className="text-xs text-green-600 mt-4">
                            期限が近づいたら通知がLINEに届きます。<br />変更したい場合は再度連携を行ってください。
                        </p>
                    </div>
                )}

                {/* QRコード連携セクション */}
                {!isLinked && (
                    <div className="bg-blue-50 p-4 rounded-lg mb-4">
                        <p className="font-bold mb-2 text-blue-900">📱 QRコードで簡単連携</p>

                        {!linkCode ? (
                            <button
                                onClick={generateLinkCode}
                                disabled={isGenerating}
                                className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 font-bold"
                            >
                                {isGenerating ? "生成中..." : "連携コードを発行"}
                            </button>
                        ) : (
                            <div className="space-y-4">
                                {/* QRコード */}
                                <div className="flex justify-center bg-white p-4 rounded-lg">
                                    <QRCodeSVG
                                        value={LINE_BOT_URL}
                                        size={160}
                                        level="M"
                                    />
                                </div>

                                <p className="text-sm text-blue-800 text-center">
                                    ①上のQRコードでLINEボットを友だち追加
                                </p>

                                {/* リンクコード表示 */}
                                <div className="bg-white p-4 rounded-lg text-center">
                                    <p className="text-sm text-gray-600 mb-2">②LINEでこのコードを送信</p>
                                    <p className="text-3xl font-mono font-bold tracking-widest text-gray-900">
                                        {linkCode}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-2">
                                        有効期限: {remainingTime || "計算中..."}
                                    </p>
                                </div>

                                <button
                                    onClick={generateLinkCode}
                                    className="w-full py-2 text-sm text-blue-600 hover:underline"
                                >
                                    🔄 新しいコードを発行
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* 手動入力セクション（折りたたみ） */}
                <div className="border-t pt-4">
                    <button
                        onClick={() => setShowManualInput(!showManualInput)}
                        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                        {showManualInput ? "▼" : "▶"} 詳細設定（手動入力）
                    </button>

                    {showManualInput && (
                        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                                <p className="font-bold mb-1">💡 グループ通知がおすすめ！</p>
                                <p>
                                    LINEグループに通知を送ると、家族全員が同時に期限切れ情報を確認できます。
                                </p>
                            </div>

                            {validationError && (
                                <div className="bg-red-50 p-3 rounded-lg text-sm text-red-700">
                                    ⚠️ {validationError}
                                </div>
                            )}

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

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                            >
                                {isSubmitting ? "保存中..." : "保存"}
                            </button>
                        </form>
                    )}
                </div>

                <div className="flex gap-3 pt-4 mt-4 border-t">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                        閉じる
                    </button>
                </div>
            </div>
        </div >
    );
}
