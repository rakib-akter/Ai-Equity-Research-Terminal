/**
 * Watchlist persistence. A single shared watchlist (the app has no user
 * accounts) stored in the isolated `equity` schema. All functions throw if the
 * database isn't configured/reachable; callers guard or catch as appropriate.
 */

import { prisma } from "./db";

export interface WatchlistInput {
  ticker: string;
  name: string;
  exchange?: string | null;
  sector?: string | null;
}

export async function listWatchlist() {
  return prisma.watchlistItem.findMany({ orderBy: { createdAt: "desc" } });
}

export async function addToWatchlist(data: WatchlistInput) {
  const ticker = data.ticker.toUpperCase();
  return prisma.watchlistItem.upsert({
    where: { ticker },
    create: {
      ticker,
      name: data.name,
      exchange: data.exchange ?? null,
      sector: data.sector ?? null,
    },
    update: {
      name: data.name,
      exchange: data.exchange ?? null,
      sector: data.sector ?? null,
    },
  });
}

export async function removeFromWatchlist(ticker: string) {
  await prisma.watchlistItem.deleteMany({
    where: { ticker: ticker.toUpperCase() },
  });
}

export async function isWatched(ticker: string): Promise<boolean> {
  const count = await prisma.watchlistItem.count({
    where: { ticker: ticker.toUpperCase() },
  });
  return count > 0;
}
