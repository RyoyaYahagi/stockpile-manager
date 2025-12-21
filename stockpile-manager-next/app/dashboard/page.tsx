"use client";

import { useUser } from "@stackframe/stack";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ItemList from "@/components/ItemList";
import Header from "@/components/Header";
import type { Item, Bag } from "@/lib/db/schema";

export default function Dashboard() {
    const user = useUser();
    const router = useRouter();
    const [items, setItems] = useState<(Item & { bag: Bag | null })[]>([]);
    const [bags, setBags] = useState<Bag[]>([]);
    const [familyId, setFamilyId] = useState<string | null>(null);
    const [familyName, setFamilyName] = useState("家族");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            router.push("/login");
            return;
        }

        const fetchData = async () => {
            try {
                // ユーザーデータを取得
                const userRes = await fetch("/api/user");
                const userData = await userRes.json();

                if (!userData.familyId) {
                    router.push("/family/setup");
                    return;
                }

                setFamilyId(userData.familyId);
                setFamilyName(userData.familyName || "家族");

                // 備蓄品と袋を取得
                const [itemsRes, bagsRes] = await Promise.all([
                    fetch("/api/items"),
                    fetch("/api/bags"),
                ]);

                const itemsData = await itemsRes.json();
                const bagsData = await bagsRes.json();

                setItems(itemsData);
                setBags(bagsData);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [user, router]);

    if (!user || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header
                displayName={user.displayName || user.primaryEmail || "ユーザー"}
                familyName={familyName}
            />
            <main className="max-w-2xl mx-auto px-4 py-6">
                {familyId && (
                    <ItemList items={items} bags={bags} familyId={familyId} />
                )}
            </main>
        </div>
    );
}
