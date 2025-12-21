import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ItemList from '@/components/ItemList';
import Header from '@/components/Header';

export default async function Dashboard() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // ユーザー情報を取得
    const { data: userData } = await supabase
        .from('users')
        .select('*, family:families(*)')
        .eq('id', user.id)
        .single();

    // 家族に所属していない場合は家族作成・参加ページへ
    if (!userData?.family_id) {
        redirect('/family/setup');
    }

    // 備蓄品を取得
    const { data: items } = await supabase
        .from('items')
        .select('*, bag:bags(*)')
        .eq('family_id', userData.family_id)
        .order('expiry_date', { ascending: true });

    // 袋を取得
    const { data: bags } = await supabase
        .from('bags')
        .select('*')
        .eq('family_id', userData.family_id)
        .order('name');

    return (
        <div className="min-h-screen bg-gray-50">
            <Header
                user={userData}
                familyName={userData.family?.name || '家族'}
            />
            <main className="max-w-2xl mx-auto px-4 py-6">
                <ItemList
                    items={items || []}
                    bags={bags || []}
                    familyId={userData.family_id}
                />
            </main>
        </div>
    );
}
