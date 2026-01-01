"use client";

import { useStackApp } from "@stackframe/stack";
import { useRouter } from "next/navigation";

interface HeaderProps {
    displayName: string;
    familyName: string;
}

export default function Header({ displayName, familyName }: HeaderProps) {
    const router = useRouter();
    const app = useStackApp();

    const handleLogout = async () => {
        await app.signOut();
        router.push("/login");
    };

    return (
        <header className="bg-white shadow-sm border-b">
            <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
                <button
                    onClick={() => router.push("/dashboard")}
                    className="text-left hover:opacity-80 transition-opacity"
                    aria-label="ダッシュボードに戻る"
                >
                    <h1 className="text-xl font-bold text-gray-800">🏠 備蓄品管理</h1>
                    <p className="text-sm text-gray-600">{familyName}</p>
                </button>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-700 font-medium">{displayName}</span>
                    <button
                        onClick={handleLogout}
                        className="text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-2 min-h-[44px] flex items-center"
                    >
                        ログアウト
                    </button>
                </div>
            </div>
        </header>
    );
}
