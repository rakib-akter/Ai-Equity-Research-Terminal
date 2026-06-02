import { NextResponse } from "next/server";
import { ingestFilings } from "@/lib/ingest";
import { isAiConfigured } from "@/lib/ai";

// Embedding many chunks can take a while; allow a generous budget.
export const maxDuration = 300;

export async function POST(req: Request) {
  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "AI is not configured. Add AI_API_KEY to .env.local." },
      { status: 400 }
    );
  }
  try {
    const { ticker } = await req.json();
    if (!ticker || typeof ticker !== "string") {
      return NextResponse.json({ error: "Missing ticker." }, { status: 400 });
    }
    const result = await ingestFilings(ticker);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Indexing failed: ${err.message}. Is the database (DATABASE_URL/DIRECT_URL) configured and migrated?`
            : "Indexing failed.",
      },
      { status: 500 }
    );
  }
}
