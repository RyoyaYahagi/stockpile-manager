import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    // 公開ページはスキップ
    const publicPaths = ['/handler', '/api'];
    const isPublicPath = publicPaths.some(path =>
        request.nextUrl.pathname.startsWith(path)
    );

    if (isPublicPath) {
        return NextResponse.next();
    }

    // Stack Auth はクライアントサイドで認証状態を管理するため、
    // ミドルウェアでは特別な処理は不要
    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
