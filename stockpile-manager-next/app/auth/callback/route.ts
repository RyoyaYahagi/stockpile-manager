import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/dashboard';

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // ユーザーがまだusersテーブルに存在しない場合は作成
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: existingUser } = await supabase
                    .from('users')
                    .select('id')
                    .eq('id', user.id)
                    .single();

                if (!existingUser) {
                    await supabase.from('users').insert({
                        id: user.id,
                        display_name: user.user_metadata?.full_name || user.email,
                    });
                }
            }

            return NextResponse.redirect(new URL(next, request.url));
        }
    }

    // エラーの場合はログインページへ
    return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
}
