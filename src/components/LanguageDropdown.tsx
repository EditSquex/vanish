import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";
import { LanguageOption, POPULAR_LANGUAGES, ALL_LANGUAGES } from "../services/languages";

interface LanguageDropdownProps {
  value: string;
  onChange: (code: string) => void;
  isSource?: boolean;
}

export const LanguageDropdown: React.FC<LanguageDropdownProps> = ({
  value,
  onChange,
  isSource = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const availableLanguages = isSource
    ? ALL_LANGUAGES
    : ALL_LANGUAGES.filter((l) => l.code !== "auto");

  const currentLang =
    availableLanguages.find((l) => l.code === value) || availableLanguages[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 40);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  const filtered = availableLanguages.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="custom-dropdown-container" ref={dropdownRef}>
      <button
        type="button"
        className="custom-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="dropdown-trigger-text">
          {currentLang.name} <span className="dropdown-code-pill">{currentLang.code}</span>
        </span>
        <ChevronDown size={13} className={`dropdown-chevron ${isOpen ? "open" : ""}`} />
      </button>

      {isOpen && (
        <div className="custom-dropdown-menu">
          <div className="dropdown-search-wrapper">
            <Search size={12} color="#555" />
            <input
              ref={searchInputRef}
              type="text"
              className="dropdown-search-input"
              placeholder="Search language..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setIsOpen(false);
                }
              }}
            />
          </div>

          <div className="dropdown-list-viewport">
            {!search && (
              <div className="dropdown-group-header">Popular Languages</div>
            )}
            {!search &&
              (isSource ? POPULAR_LANGUAGES : POPULAR_LANGUAGES.filter((l) => l.code !== "auto")).map(
                (lang) => (
                  <div
                    key={`pop-${lang.code}`}
                    className={`dropdown-item ${lang.code === value ? "active" : ""}`}
                    onClick={() => {
                      onChange(lang.code);
                      setIsOpen(false);
                    }}
                  >
                    <span>{lang.name}</span>
                    <span className="dropdown-item-code">{lang.code}</span>
                  </div>
                )
              )}

            <div className="dropdown-group-header">
              {search ? "Matching Languages" : "All Languages (240+)"}
            </div>
            {filtered.map((lang) => (
              <div
                key={`all-${lang.code}`}
                className={`dropdown-item ${lang.code === value ? "active" : ""}`}
                onClick={() => {
                  onChange(lang.code);
                  setIsOpen(false);
                }}
              >
                <span>{lang.name}</span>
                <span className="dropdown-item-code">{lang.code}</span>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="dropdown-empty">No languages found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
