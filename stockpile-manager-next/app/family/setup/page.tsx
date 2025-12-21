'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function FamilySetup() {
    const [mode, setMode] = useState<'create' | 'join'>('create');
    const [familyName, setFamilyName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const generateInviteCode = () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!familyName.trim()) return;

        setIsSubmitting(true);
        setError('');

        // 家族を作成
        const code = generateInviteCode();
        const { data: family, error: familyError } = await supabase
            .from('families')
            .insert({ name: familyName.trim(), invite_code: code })
            .select()
            .single();

        if (familyError) {
            setError('家族の作成に失敗しました');
            setIsSubmitting(false);
            return;
        }

        // ユーザーを家族に紐付け
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase
                .from('users')
                .update({ family_id: family.id })
                .eq('id', user.id);
        }

        router.push('/dashboard');
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteCode.trim()) return;

        setIsSubmitting(true);
        setError('');

        // 招待コードで家族を検索
        const { data: family, error: familyError } = await supabase
            .from('families')
            .select('id')
            .eq('invite_code', inviteCode.trim().toUpperCase())
            .single();

        if (familyError || !family) {
            setError('招待コードが見つかりません');
            setIsSubmitting(false);
            return;
        }

        // ユーザーを家族に紐付け
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase
                .from('users')
                .update({ family_id: family.id })
                .eq('id', user.id);
        }

        router.push('/dashboard');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full mx-4">
                <h1 className="text-2xl font-bold text-center mb-6">👨‍👩‍👧‍👦 家族の設定</h1>

                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setMode('create')}
                        className={`flex-1 py-2 rounded-lg font-medium ${mode === 'create'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                    >
                        新規作成
                    </button>
                    <button
                        onClick={() => setMode('join')}
                        className={`flex-1 py-2 rounded-lg font-medium ${mode === 'join'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                    >
                        参加する
                    </button>
                </div>

                {error && (
                    <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
                )}

                {mode === 'create' ? (
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                家族の名前
                            </label>
                            <input
                                type="text"
                                value={familyName}
                                onChange={(e) => setFamilyName(e.target.value)}
                                placeholder="例: 山田家"
                                required
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50"
                        >
                            {isSubmitting ? '作成中...' : '家族を作成'}
                        </button>
                        <p className="text-sm text-gray-500 text-center">
                            作成後、招待コードを家族に共有できます
                        </p>
                    </form>
                ) : (
                    <form onSubmit={handleJoin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                招待コード
                            </label>
                            <input
                                type="text"
                                value={inviteCode}
                                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                placeholder="例: ABC123"
                                required
                                maxLength={6}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50"
                        >
                            {isSubmitting ? '参加中...' : '家族に参加'}
                        </button>
                        <p className="text-sm text-gray-500 text-center">
                            家族メンバーから招待コードをもらってください
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
}
