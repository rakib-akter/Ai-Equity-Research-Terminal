import { NextResponse } from "next/server";
import { getCompanyData } from "@/lib/sec";
import { buildAnnualFinancials } from "@/lib/financials";
import { computeRatios } from "@/lib/ratios";
import { generateAiMemo } from "@/lib/memo";
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
    const { ticker } = await req.json();
    if (!ticker || typeof ticker !== "string") {
      return NextResponse.json({ error: "Missing ticker." }, { status: 400 });
    }

    const { profile, facts } = await getCompanyData(ticker);
    const financials = buildAnnualFinancials(facts);
    const ratios = computeRatios(financials);
    const latest = financials[0];
    if (!ratios || !latest) {
      return NextResponse.json(
        { error: "Not enough financial data to summarize." },
        { status: 422 }
      );
    }

    const result = await generateAiMemo(
      profile.ticker,
      profile.name,
      ratios,
      latest
    );
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate memo." },
      { status: 500 }
    );
  }
}
