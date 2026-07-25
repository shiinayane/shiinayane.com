import type { Locale } from "@i18n/config";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";

export function pathsEqual(path1: string, path2: string) {
	const normalizedPath1 = path1.replace(/^\/|\/$/g, "").toLowerCase();
	const normalizedPath2 = path2.replace(/^\/|\/$/g, "").toLowerCase();
	return normalizedPath1 === normalizedPath2;
}

function joinUrl(...parts: string[]): string {
	const joined = parts.join("/");
	return joined.replace(/\/+/g, "/");
}

export function getLocaleUrl(locale: Locale, path = "/"): string {
	return url(`/${locale}/${path.replace(/^\/+/, "")}`);
}

export function getPostUrlBySlug(slug: string, locale?: Locale): string {
	return locale
		? getLocaleUrl(locale, `/posts/${slug}/`)
		: url(`/posts/${slug}/`);
}

export function getTagUrl(tag: string, locale?: Locale): string {
	const archive = locale ? getLocaleUrl(locale, "/archive/") : url("/archive/");
	if (!tag) return archive;
	return `${archive}?tag=${encodeURIComponent(tag.trim())}`;
}

export function getCategoryUrl(
	category: string | null,
	locale?: Locale,
): string {
	const archive = locale ? getLocaleUrl(locale, "/archive/") : url("/archive/");
	if (
		!category ||
		category.trim() === "" ||
		category.trim().toLowerCase() === i18n(I18nKey.uncategorized).toLowerCase()
	)
		return `${archive}?uncategorized=true`;
	return `${archive}?category=${encodeURIComponent(category.trim())}`;
}

export function getDir(path: string): string {
	const lastSlashIndex = path.lastIndexOf("/");
	if (lastSlashIndex < 0) {
		return "/";
	}
	return path.substring(0, lastSlashIndex + 1);
}

export function url(path: string) {
	return joinUrl("", import.meta.env.BASE_URL, path);
}
