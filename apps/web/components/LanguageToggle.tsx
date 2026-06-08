import type { Locale } from "../lib/i18n";
import { localeLabels } from "../lib/i18n";

type LanguageToggleProps = {
  locale: Locale;
  onChange: (locale: Locale) => void;
};

export function LanguageToggle({ locale, onChange }: LanguageToggleProps) {
  return (
    <div className="language-toggle" aria-label="Language">
      {(["ko", "en"] as const).map((option) => (
        <button
          key={option}
          type="button"
          className={option === locale ? "active" : ""}
          onClick={() => onChange(option)}
          aria-pressed={option === locale}
        >
          {localeLabels[option]}
        </button>
      ))}
    </div>
  );
}
