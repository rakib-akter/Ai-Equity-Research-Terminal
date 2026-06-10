import { NextResponse } from "next/server";
import {
  addToWatchlist,
  listWatchlist,
  removeFromWatchlist,
} from "@/lib/watchlist";

function errorMessage(err: unknown): string {
  const base = err instanceof Error ? err.message : "Watchlist request failed.";
  return `${base} (Is the database configured and the WatchlistItem table created?)`;
}

export async function GET() {
  try {
    return NextResponse.json({ items: await listWatchlist() });
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { ticker, name, exchange, sector } = await req.json();
    if (!ticker || !name) {
      return NextResponse.json(
        { error: "Missing ticker or name." },
        { status: 400 }
      );
    }
    const item = await addToWatchlist({ ticker, name, exchange, sector });
    return NextResponse.json({ item });
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const ticker = new URL(req.url).searchParams.get("ticker");
    if (!ticker) {
      return NextResponse.json({ error: "Missing ticker." }, { status: 400 });
    }
    await removeFromWatchlist(ticker);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}
