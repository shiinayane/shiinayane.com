export const SUPPORTED_LOCALES = ["en", "zh", "ja"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LANGUAGE_TAGS: Record<Locale, string> = {
	en: "en",
	zh: "zh-CN",
	ja: "ja",
};

export const LOCALE_LABELS: Record<Locale, string> = {
	en: "English",
	zh: "简体中文",
	ja: "日本語",
};

export function isLocale(value: string | undefined): value is Locale {
	return SUPPORTED_LOCALES.includes(value as Locale);
}

export function normalizeLocale(value: string | undefined): Locale {
	const normalized = value?.trim().toLowerCase().replaceAll("-", "_");
	if (!normalized) return DEFAULT_LOCALE;
	if (normalized === "jp" || normalized.startsWith("ja")) return "ja";
	if (normalized.startsWith("zh")) return "zh";
	return "en";
}

export function localeLanguageTag(locale: Locale): string {
	return LOCALE_LANGUAGE_TAGS[locale];
}
