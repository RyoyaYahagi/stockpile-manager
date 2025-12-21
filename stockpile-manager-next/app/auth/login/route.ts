import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
    const supabase = await createClient();

    const origin = request.nextUrl.origin;

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${origin}/auth/callback`,
        },
    });

    if (error) {
        return redirect('/login?error=auth_failed');
    }

    return redirect(data.url);
}
