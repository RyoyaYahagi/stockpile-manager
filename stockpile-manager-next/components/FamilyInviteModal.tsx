"use client";

import { useState, useEffect } from "react";

interface FamilyMember {
    id: string;
    displayName: string;
    email: string | null;
}

interface FamilyInviteModalProps {
    onClose: () => void;
}

export default function FamilyInviteModal({ onClose }: FamilyInviteModalProps) {
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchFamilyInfo = async () => {
            try {
                const res = await fetch("/api/family");
                if (res.ok) {
                    const data = await res.json();
                    setInviteCode(data.inviteCode);
                    setMembers(data.members);
                }
            } catch (error) {
                console.error("Failed to fetch family info:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchFamilyInfo();
    }, []);

    const handleCopy = async () => {
        if (!inviteCode) return;
        try {
            await navigator.clipboard.writeText(inviteCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy:", error);
        }
    };

    const handleShare = async () => {
        if (!inviteCode) return;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: "備蓄品マネージャー - 家族に参加",
                    text: `招待コード: ${inviteCode}\nこのコードを使って家族に参加してください。`,
                });
            } catch (error) {
                // User cancelled share
                console.log("Share cancelled");
            }
        } else {
            handleCopy();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 modal-backdrop">
            <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl modal-content">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-900">👨‍👩‍👧‍👦 家族を招待</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl"
                        >
                            ×
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                    ) : (
                        <>
                            {/* 招待コード表示 */}
                            <div className="bg-gray-50 rounded-xl p-4 mb-4">
                                <p className="text-sm text-gray-600 mb-2 text-center">招待コード</p>
                                <p className="text-3xl font-mono font-bold text-center tracking-widest text-blue-600">
                                    {inviteCode}
                                </p>
                            </div>

                            {/* アクションボタン */}
                            <div className="flex gap-2 mb-6">
                                <button
                                    onClick={handleCopy}
                                    className={`flex-1 py-3 rounded-lg font-medium transition-colors ${copied
                                        ? "bg-green-500 text-white"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        }`}
                                >
                                    {copied ? "✓ コピーしました" : "📋 コピー"}
                                </button>
                                <button
                                    onClick={handleShare}
                                    className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                                >
                                    📤 共有する
                                </button>
                            </div>

                            {/* 家族メンバー一覧 */}
                            <div>
                                <h3 className="font-medium text-gray-700 mb-2">
                                    家族メンバー ({members.length}人)
                                </h3>
                                <ul className="space-y-2">
                                    {members.map((member) => (
                                        <li
                                            key={member.id}
                                            className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                                        >
                                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
                                                {member.displayName.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{member.displayName}</p>
                                                {member.email && (
                                                    <p className="text-xs text-gray-500 truncate">{member.email}</p>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <p className="text-xs text-gray-400 text-center mt-4">
                                招待コードを共有して家族に参加してもらいましょう
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
