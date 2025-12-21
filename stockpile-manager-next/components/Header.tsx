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
                <div>
                    <h1 className="text-xl font-bold text-gray-800">🏠 備蓄品管理</h1>
                    <p className="text-sm text-gray-500">{familyName}</p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">{displayName}</span>
                    <button
                        onClick={handleLogout}
                        className="text-sm text-gray-500 hover:text-gray-700"
                    >
                        ログアウト
                    </button>
                </div>
            </div>
        </header>
    );
}
