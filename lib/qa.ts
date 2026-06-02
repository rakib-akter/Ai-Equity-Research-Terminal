/**
 * Source-backed Q&A over a company's filings.
 *
 * Retrieves the most relevant filing chunks via pgvector, then asks the model
 * to answer *only* from those excerpts with inline [n] citations. The returned
 * sources let the UI link each citation back to the SEC document.
 */

import { searchFilings } from "./search";
import { chatComplete } from "./ai";

export interface QaSource {
  ref: number;
  form: string;
  filingDate: string;
  url: string;
  snippet: string;
}

export interface QaAnswer {
  answer: string;
  sources: QaSource[];
}

const SYSTEM = [
  "You are an equity research assistant answering questions about a company using excerpts from its SEC filings.",
  "Answer ONLY from the provided excerpts. Cite the excerpts you use inline as [1], [2], etc.",
  "If the excerpts do not contain the answer, say you couldn't find it in the indexed filings — do not guess.",
  "Be concise, specific, and neutral. Do not give investment advice.",
].join(" ");

export async function answerQuestion(
  ticker: string,
  question: string
): Promise<QaAnswer> {
  const chunks = await searchFilings(ticker, question, 6);
  if (chunks.length === 0) {
    return {
      answer:
        "This company's filings haven't been indexed yet. Index the filings, then ask again.",
      sources: [],
    };
  }

  const context = chunks
    .map(
      (c, i) =>
        `[${i + 1}] (${c.form}, filed ${c.filingDate})\n${c.content}`
    )
    .join("\n\n");

  const answer = await chatComplete(
    [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Question: ${question}\n\nFiling excerpts:\n${context}`,
      },
    ],
    { temperature: 0.1, maxTokens: 700 }
  );

  const sources: QaSource[] = chunks.map((c, i) => ({
    ref: i + 1,
    form: c.form,
    filingDate: c.filingDate,
    url: c.primaryDocUrl,
    snippet: c.content.slice(0, 220).trim() + "…",
  }));

  return { answer, sources };
}
