import React, { useState, useEffect, useRef, useTransition } from "react";
import { Copy, Check, ArrowRightLeft, Sparkles, X, Minus, Plus, Pin } from "lucide-react";
import { LanguageDropdown } from "./LanguageDropdown";
import { translateText, TranslationResult } from "../services/translator";

declare global {
  interface Window {
    vanishDesktop?: {
      platform: string;
      version: string;
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      setAlwaysOnTop: (flag: boolean) => void;
    };
  }
}

export const TerminalPrompt: React.FC = () => {
  const [sourceText, setSourceText] = useState("");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("en");
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(() => {
    try {
      return localStorage.getItem("vanish_always_on_top") === "true";
    } catch {
      return false;
    }
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    if (alwaysOnTop && window.vanishDesktop?.setAlwaysOnTop) {
      window.vanishDesktop.setAlwaysOnTop(true);
    }
  }, []);

  const triggerTranslation = (text: string, sLang: string, tLang: string, instant = false) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setResult(null);
      setLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    const delay = instant ? 0 : trimmed.length > 500 ? 120 : 40;

    const timeoutId = setTimeout(async () => {
      try {
        const res = await translateText(trimmed, sLang, tLang, controller.signal);
        setResult(res);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error(err);
        }
      } finally {
        setLoading(false);
      }
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  };

  useEffect(() => {
    const cancel = triggerTranslation(sourceText, sourceLang, targetLang);
    return () => {
      if (cancel) cancel();
    };
  }, [sourceText, sourceLang, targetLang]);

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (pasted) {
      setTimeout(() => {
        triggerTranslation(sourceText + pasted, sourceLang, targetLang, true);
      }, 0);
    }
  };

  const handleCopy = async () => {
    const textToCopy = result?.translatedText || "";
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSwap = () => {
    setSwapping(true);
    setTimeout(() => setSwapping(false), 350);

    const currentDetected = result?.detectedLang;
    const newTarget =
      sourceLang === "auto"
        ? currentDetected && currentDetected !== targetLang
          ? currentDetected
          : "tr"
        : sourceLang;
    const newSource = targetLang;

    setSourceLang(newSource);
    setTargetLang(newTarget);

    if (result?.translatedText) {
      setSourceText(result.translatedText);
    }
  };

  const handleToggleAlwaysOnTop = () => {
    const nextState = !alwaysOnTop;
    setAlwaysOnTop(nextState);
    try {
      localStorage.setItem("vanish_always_on_top", String(nextState));
    } catch {}

    if (window.vanishDesktop?.setAlwaysOnTop) {
      window.vanishDesktop.setAlwaysOnTop(nextState);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (result?.translatedText) {
        handleCopy();
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      handleSwap();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setSourceText("");
      setResult(null);
    }
  };

  const handleWindowClose = () => {
    if (window.vanishDesktop) {
      window.vanishDesktop.close();
    }
  };

  const handleWindowMinimize = () => {
    if (window.vanishDesktop) {
      window.vanishDesktop.minimize();
    }
  };

  const handleWindowMaximize = () => {
    if (window.vanishDesktop) {
      window.vanishDesktop.maximize();
    }
  };

  const wordCount = sourceText.trim() ? sourceText.trim().split(/\s+/).length : 0;

  return (
    <div className="terminal-shell">
      <div className="terminal-header">
        <div className="macos-traffic-lights">
          <button
            type="button"
            className="traffic-dot dot-close"
            onClick={handleWindowClose}
            title="Close"
          >
            <X size={8} className="dot-icon" />
          </button>
          <button
            type="button"
            className="traffic-dot dot-minimize"
            onClick={handleWindowMinimize}
            title="Minimize"
          >
            <Minus size={8} className="dot-icon" />
          </button>
          <button
            type="button"
            className="traffic-dot dot-maximize"
            onClick={handleWindowMaximize}
            title="Maximize"
          >
            <Plus size={8} className="dot-icon" />
          </button>
        </div>

        <div className="terminal-title">
          <img src="./icon.png" alt="Vanish" className="terminal-title-img" />
          <span>vanish</span>
        </div>

        <div className="terminal-header-actions">
          <button
            type="button"
            className={`pin-toggle-btn ${alwaysOnTop ? "active" : ""}`}
            onClick={handleToggleAlwaysOnTop}
            title={alwaysOnTop ? "Always on top: Enabled (Click to disable)" : "Always on top: Disabled (Click to enable)"}
          >
            <Pin size={11} className={alwaysOnTop ? "pin-icon-active" : "pin-icon"} />
            <span>{alwaysOnTop ? "PINNED" : "PIN"}</span>
          </button>

          {result && (
            <div className="latency-badge">
              <div className="pulse-dot" />
              <span>{result.durationMs}ms</span>
            </div>
          )}
        </div>
      </div>

      <div className="terminal-body">
        <div className="prompt-block">
          <div className="prompt-meta">
            <div className="prompt-label">
              <span className="prompt-label-icon">INPUT</span>
              {result?.detectedLang && sourceLang === "auto" && (
                <span className="detected-pill">
                  Detected: {result.detectedLang}
                </span>
              )}
            </div>
            {sourceText && (
              <span className="clear-trigger" onClick={() => setSourceText("")}>
                Clear (Esc)
              </span>
            )}
          </div>

          <div className="prompt-input-wrapper">
            <span className="prompt-glyph">&gt;</span>
            <textarea
              ref={textareaRef}
              className="prompt-textarea"
              placeholder="Type or paste sentences or multi-line paragraphs in real-time... (Shift + Enter for new lines)"
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              spellCheck={false}
              rows={2}
            />
            {sourceText.length > 0 && (
              <span className="char-counter">
                {wordCount} words · {sourceText.length} chars
              </span>
            )}
          </div>
        </div>

        <div className="output-block">
          <div className="prompt-meta">
            <div className="prompt-label">
              <span style={{ color: "#2ecc71" }}>TRANSLATION</span>
            </div>
            {result?.translatedText && (
              <span style={{ fontSize: 10, color: "#666" }}>
                Press Enter to copy
              </span>
            )}
          </div>

          <div className={`output-card ${result?.translatedText ? "has-content" : ""}`}>
            <span className="output-glyph">↳</span>
            <div className="output-text">
              {result?.translatedText ? (
                result.translatedText
              ) : (
                <span className="output-placeholder">
                  {loading ? (
                    <>
                      <span>Translating</span>
                      <span className="typing-dots">
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                      </span>
                    </>
                  ) : (
                    "Translation output will appear here instantly..."
                  )}
                </span>
              )}
            </div>

            {result?.translatedText && (
              <button
                className={`output-quick-copy ${copied ? "copied" : ""}`}
                onClick={handleCopy}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                <span>{copied ? "COPIED" : "COPY"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="terminal-footer">
        <div className="lang-selector-group">
          <LanguageDropdown
            value={sourceLang}
            onChange={(code) => setSourceLang(code)}
            isSource={true}
          />

          <button
            className={`swap-btn ${swapping ? "animating" : ""}`}
            onClick={handleSwap}
            title="Swap Languages (Tab)"
          >
            <ArrowRightLeft size={13} />
          </button>

          <LanguageDropdown
            value={targetLang}
            onChange={(code) => setTargetLang(code)}
            isSource={false}
          />
        </div>

        <div className="footer-hints">
          <div className="hint-item" onClick={handleCopy}>
            <span className="kbd-badge">Enter</span>
            <span>Copy</span>
          </div>
          <div className="hint-item" onClick={handleSwap}>
            <span className="kbd-badge">Tab</span>
            <span>Swap</span>
          </div>
          <div className="hint-item" onClick={() => setSourceText("")}>
            <span className="kbd-badge">Esc</span>
            <span>Clear</span>
          </div>
        </div>
      </div>
    </div>
  );
};
