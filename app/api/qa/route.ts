import { NextResponse } from "next/server";
import { answerQuestion } from "@/lib/qa";
import { isAiConfigured } from "@/lib/ai";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "AI is not configured. Add AI_API_KEY to .env.local." },
      { status: 400 }
    );
  }
  try {
    const { ticker, question } = await req.json();
    if (!ticker || !question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Missing ticker or question." },
        { status: 400 }
      );
    }
    const result = await answerQuestion(ticker, question);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Q&A failed: ${err.message}. Is the database configured and are filings indexed?`
            : "Q&A failed.",
      },
      { status: 500 }
    );
  }
}
