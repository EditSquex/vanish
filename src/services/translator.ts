export interface TranslationResult {
  translatedText: string;
  detectedLang?: string;
  sourceLang: string;
  targetLang: string;
  durationMs: number;
}

const memoryCache = new Map<string, { text: string; detected?: string }>();

function cleanMistranslations(source: string, result: string, from: string, to: string): string {
  const s = source.trim().toLowerCase();
  let r = result;

  if ((from === "tr" || from === "auto") && to === "en") {
    if (s === "kedi" || s === "bir kedi" || s.startsWith("kedi ")) {
      r = r.replace(/\bpussy\b/gi, "cat").replace(/\bpussies\b/gi, "cats");
    }
  }

  return r;
}

async function fetchSingleChunk(
  chunk: string,
  fromLang: string,
  toLang: string,
  signal?: AbortSignal
): Promise<{ text: string; detected?: string }> {
  const trimmed = chunk.trim();
  if (!trimmed) {
    return { text: chunk };
  }

  const sl = fromLang === "auto" ? "auto" : fromLang;
  const tl = toLang;
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(trimmed)}`;

  const response = await fetch(url, {
    signal,
    headers: { "Accept": "application/json" }
  });

  if (!response.ok) {
    throw new Error(`Translation failed: ${response.statusText}`);
  }

  const data = await response.json();
  let translated = "";

  if (Array.isArray(data[0])) {
    translated = data[0].map((item: any) => item[0] || "").join("");
  } else if (Array.isArray(data.sentences)) {
    translated = data.sentences.map((s: any) => s.trans || "").join("");
  } else {
    translated = trimmed;
  }

  const detected = data[2] || (fromLang !== "auto" ? fromLang : undefined);
  return { text: translated, detected };
}

function splitTextIntoParagraphs(text: string, maxChunkLength = 2000): string[] {
  if (text.length <= maxChunkLength) {
    return [text];
  }

  const paragraphs = text.split(/(\n+)/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const p of paragraphs) {
    if ((currentChunk + p).length <= maxChunkLength) {
      currentChunk += p;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      if (p.length > maxChunkLength) {
        const sentences = p.split(/([.?!]\s+)/);
        let sentenceChunk = "";
        for (const s of sentences) {
          if ((sentenceChunk + s).length <= maxChunkLength) {
            sentenceChunk += s;
          } else {
            if (sentenceChunk) chunks.push(sentenceChunk);
            sentenceChunk = s;
          }
        }
        currentChunk = sentenceChunk;
      } else {
        currentChunk = p;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

export async function translateText(
  text: string,
  fromLang: string,
  toLang: string,
  signal?: AbortSignal
): Promise<TranslationResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      translatedText: "",
      sourceLang: fromLang,
      targetLang: toLang,
      durationMs: 0
    };
  }

  const cacheKey = `${fromLang}:${toLang}:${trimmed.toLowerCase()}`;
  if (memoryCache.has(cacheKey)) {
    const cached = memoryCache.get(cacheKey)!;
    return {
      translatedText: cached.text,
      detectedLang: cached.detected,
      sourceLang: fromLang,
      targetLang: toLang,
      durationMs: 1
    };
  }

  const startTime = performance.now();
  const chunks = splitTextIntoParagraphs(trimmed, 2000);

  let finalTranslated = "";
  let detectedLang: string | undefined = undefined;

  if (chunks.length === 1) {
    const res = await fetchSingleChunk(chunks[0], fromLang, toLang, signal);
    finalTranslated = res.text;
    detectedLang = res.detected;
  } else {
    const results = await Promise.all(
      chunks.map((c) => fetchSingleChunk(c, fromLang, toLang, signal))
    );
    finalTranslated = results.map((r) => r.text).join("");
    detectedLang = results[0]?.detected;
  }

  const cleanedText = cleanMistranslations(trimmed, finalTranslated, detectedLang || fromLang, toLang);
  const durationMs = Math.round(performance.now() - startTime);

  memoryCache.set(cacheKey, { text: cleanedText, detected: detectedLang });

  return {
    translatedText: cleanedText,
    detectedLang,
    sourceLang: fromLang,
    targetLang: toLang,
    durationMs
  };
}
