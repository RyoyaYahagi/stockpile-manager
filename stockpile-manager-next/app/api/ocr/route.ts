import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/lib/auth/stack";

export async function POST(request: NextRequest) {
    // 認証チェック
    const user = await stackServerApp.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.OCR_SPACE_API_KEY) {
        return NextResponse.json({ error: "OCR_SPACE_API_KEY not set" }, { status: 500 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const base64 = formData.get("base64") as string | null;

        if (!file && !base64) {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
        }

        // OCR.space APIにリクエスト
        const ocrFormData = new FormData();
        ocrFormData.append("apikey", process.env.OCR_SPACE_API_KEY);
        ocrFormData.append("language", "jpn"); // 日本語
        ocrFormData.append("isOverlayRequired", "false");
        ocrFormData.append("detectOrientation", "true");
        ocrFormData.append("scale", "true");
        ocrFormData.append("OCREngine", "2"); // Engine 2は日本語に強い

        if (base64) {
            ocrFormData.append("base64Image", base64);
        } else if (file) {
            ocrFormData.append("file", file);
        }

        const ocrRes = await fetch("https://api.ocr.space/parse/image", {
            method: "POST",
            body: ocrFormData,
        });

        if (!ocrRes.ok) {
            console.error("OCR API error:", await ocrRes.text());
            return NextResponse.json({ error: "OCR API error" }, { status: 500 });
        }

        const ocrData = await ocrRes.json();

        if (ocrData.IsErroredOnProcessing) {
            console.error("OCR processing error:", ocrData.ErrorMessage);
            return NextResponse.json({ error: ocrData.ErrorMessage || "OCR processing failed" }, { status: 500 });
        }

        // テキストを抽出
        const parsedResults = ocrData.ParsedResults || [];
        const fullText = parsedResults.map((r: any) => r.ParsedText).join("\n");

        // 日付パターンを検出
        const dates = extractDates(fullText);

        return NextResponse.json({
            text: fullText,
            dates,
            suggestedDate: dates.length > 0 ? dates[0] : null,
        });
    } catch (error) {
        console.error("OCR error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// 日付パターンを抽出する関数
function extractDates(text: string): string[] {
    const dates: string[] = [];

    // 様々な日付フォーマットに対応
    const patterns = [
        // 2025.12.22 or 2025/12/22 or 2025-12-22
        /(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})/g,
        // 25.12.22 or 25/12/22 (年が2桁)
        /(\d{2})[.\/-](\d{1,2})[.\/-](\d{1,2})/g,
        // 2025年12月22日
        /(\d{4})年(\d{1,2})月(\d{1,2})日/g,
        // 25年12月22日
        /(\d{2})年(\d{1,2})月(\d{1,2})日/g,
    ];

    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            let year = parseInt(match[1]);
            const month = parseInt(match[2]);
            const day = parseInt(match[3]);

            // 2桁の年を4桁に変換
            if (year < 100) {
                year += 2000;
            }

            // 有効な日付かチェック
            if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2020 && year <= 2100) {
                const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                if (!dates.includes(dateStr)) {
                    dates.push(dateStr);
                }
            }
        }
    }

    // 日付を昇順でソート
    dates.sort();

    return dates;
}
