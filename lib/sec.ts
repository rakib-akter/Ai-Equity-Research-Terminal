/**
 * SEC EDGAR client.
 *
 * EDGAR exposes public company data as JSON with no API key, but it *requires*
 * a descriptive User-Agent header on every request (with a contact email).
 * See https://www.sec.gov/os/accessing-edgar-data. Set SEC_USER_AGENT in your
 * environment; we fall back to a generic value so dev still works.
 *
 * All functions here run server-side only (they're called from Server
 * Components / route handlers), so the User-Agent header is honoured.
 */

const TICKER_URL = "https://www.sec.gov/files/company_tickers.json";
const DATA_BASE = "https://data.sec.gov";

function userAgent(): string {
  return (
    process.env.SEC_USER_AGENT?.trim() ||
    "AI Equity Research Terminal contact@example.com"
  );
}

/** EDGAR keys submissions/facts by a zero-padded 10-digit CIK. */
export function padCik(cik: string | number): string {
  return String(cik).replace(/\D/g, "").padStart(10, "0");
}

async function secFetch<T>(url: string, revalidateSeconds: number): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": userAgent(),
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
    },
    // Cache responses so we stay well under SEC's ~10 req/sec fair-use limit.
    next: { revalidate: revalidateSeconds },
  });

  if (res.status === 404) {
    throw new SecNotFoundError(`SEC resource not found: ${url}`);
  }
  if (!res.ok) {
    throw new Error(`SEC request failed (${res.status}) for ${url}`);
  }
  return (await res.json()) as T;
}

/** Thrown when EDGAR has no record for a ticker/CIK (vs. a transient error). */
export class SecNotFoundError extends Error {}

// ─── Raw EDGAR response shapes (only the fields we use) ──────────────────────

interface TickerEntry {
  cik_str: number;
  ticker: string;
  title: string;
}

export interface SecSubmissions {
  cik: string;
  name: string;
  tickers: string[];
  exchanges: string[];
  sic: string;
  sicDescription: string;
  category: string;
  fiscalYearEnd: string;
  stateOfIncorporation: string;
  ein: string;
  description: string;
  website: string;
  investorWebsite: string;
  phone: string;
  addresses?: {
    business?: {
      street1?: string;
      city?: string;
      stateOrCountry?: string;
      zipCode?: string;
    };
  };
  filings: {
    recent: {
      accessionNumber: string[];
      filingDate: string[];
      reportDate: string[];
      form: string[];
      primaryDocument: string[];
      primaryDocDescription: string[];
    };
  };
}

/** A single XBRL fact value reported for one period. */
export interface XbrlUnitValue {
  start?: string;
  end: string;
  val: number;
  fy: number;
  fp: string;
  form: string;
  frame?: string;
}

export interface CompanyFacts {
  cik: number;
  entityName: string;
  facts: {
    "us-gaap"?: Record<string, XbrlConcept>;
    dei?: Record<string, XbrlConcept>;
  };
}

export interface XbrlConcept {
  label?: string;
  description?: string;
  units: Record<string, XbrlUnitValue[]>;
}

// ─── Public, app-friendly shapes ─────────────────────────────────────────────

export interface CompanyProfile {
  cik: string;
  name: string;
  ticker: string;
  exchange: string;
  sic: string;
  sicDescription: string;
  fiscalYearEnd: string;
  stateOfIncorporation: string;
  website: string;
  description: string;
  location: string;
}

export interface RecentFiling {
  form: string;
  filingDate: string;
  reportDate: string;
  description: string;
  documentUrl: string;
  filingIndexUrl: string;
}

// ─── Lookups ─────────────────────────────────────────────────────────────────

/**
 * Resolve a ticker symbol to its EDGAR CIK. The ticker file is small-ish and
 * changes rarely, so we cache it for a day.
 */
export async function getCikForTicker(
  ticker: string
): Promise<{ cik: string; ticker: string; title: string } | null> {
  const normalized = ticker.trim().toUpperCase();
  if (!normalized) return null;

  const map = await secFetch<Record<string, TickerEntry>>(TICKER_URL, 86_400);
  for (const entry of Object.values(map)) {
    if (entry.ticker.toUpperCase() === normalized) {
      return {
        cik: padCik(entry.cik_str),
        ticker: entry.ticker.toUpperCase(),
        title: entry.title,
      };
    }
  }
  return null;
}

export async function getSubmissions(cik: string): Promise<SecSubmissions> {
  return secFetch<SecSubmissions>(
    `${DATA_BASE}/submissions/CIK${padCik(cik)}.json`,
    3_600
  );
}

export async function getCompanyFacts(cik: string): Promise<CompanyFacts> {
  return secFetch<CompanyFacts>(
    `${DATA_BASE}/api/xbrl/companyfacts/CIK${padCik(cik)}.json`,
    3_600
  );
}

// ─── Derived views ───────────────────────────────────────────────────────────

function buildProfile(sub: SecSubmissions, ticker: string): CompanyProfile {
  const biz = sub.addresses?.business;
  const location = [biz?.city, biz?.stateOrCountry].filter(Boolean).join(", ");
  return {
    cik: padCik(sub.cik),
    name: sub.name,
    ticker,
    exchange: sub.exchanges?.[0] ?? "",
    sic: sub.sic,
    sicDescription: sub.sicDescription,
    fiscalYearEnd: sub.fiscalYearEnd,
    stateOfIncorporation: sub.stateOfIncorporation,
    website: sub.website || sub.investorWebsite || "",
    description: sub.description || "",
    location,
  };
}

/**
 * The most recent material filings (10-K/10-Q/8-K and proxies), with direct
 * links to both the primary document and the EDGAR filing index.
 */
export function extractRecentFilings(
  sub: SecSubmissions,
  limit = 12
): RecentFiling[] {
  const r = sub.filings.recent;
  const cik = String(Number(sub.cik)); // un-padded for the Archives path
  const keepForms = new Set(["10-K", "10-Q", "8-K", "DEF 14A", "20-F", "40-F"]);
  const out: RecentFiling[] = [];

  for (let i = 0; i < r.form.length && out.length < limit; i++) {
    if (!keepForms.has(r.form[i])) continue;
    const accession = r.accessionNumber[i];
    const accessionNoDashes = accession.replace(/-/g, "");
    const base = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNoDashes}`;
    out.push({
      form: r.form[i],
      filingDate: r.filingDate[i],
      reportDate: r.reportDate[i],
      description: r.primaryDocDescription[i] || r.form[i],
      documentUrl: `${base}/${r.primaryDocument[i]}`,
      filingIndexUrl: `${base}/${accession}-index.htm`,
    });
  }
  return out;
}

/**
 * One-call entry point used by the dashboard: resolves the ticker and returns
 * the company profile, recent filings, and raw XBRL facts together.
 */
export async function getCompanyData(ticker: string): Promise<{
  profile: CompanyProfile;
  filings: RecentFiling[];
  facts: CompanyFacts;
}> {
  const match = await getCikForTicker(ticker);
  if (!match) {
    throw new SecNotFoundError(`No SEC filer found for ticker "${ticker}".`);
  }

  const [sub, facts] = await Promise.all([
    getSubmissions(match.cik),
    getCompanyFacts(match.cik),
  ]);

  return {
    profile: buildProfile(sub, match.ticker),
    filings: extractRecentFilings(sub),
    facts,
  };
}
