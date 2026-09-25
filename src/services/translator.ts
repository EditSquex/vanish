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
  const sl = fromLang === "auto" ? "auto" : fromLang;
  const tl = toLang;

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(trimmed)}`;

  const response = await fetch(url, {
    signal,
    headers: {
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Translation failed: ${response.statusText}`);
  }

  const data = await response.json();
  
  let translatedText = "";
  if (Array.isArray(data[0])) {
    translatedText = data[0].map((item: any) => item[0] || "").join("");
  } else if (Array.isArray(data.sentences)) {
    translatedText = data.sentences.map((s: any) => s.trans || "").join("");
  } else {
    translatedText = trimmed;
  }

  const detectedLang = data[2] || (fromLang !== "auto" ? fromLang : undefined);
  const cleanedText = cleanMistranslations(trimmed, translatedText, detectedLang || fromLang, toLang);
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
