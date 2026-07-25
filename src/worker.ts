const SUPPORTED_LOCALES = ["en", "zh", "ja"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

interface Env {
	ASSETS: {
		fetch(request: Request): Promise<Response>;
	};
}

function isLocale(value: string | null | undefined): value is Locale {
	return SUPPORTED_LOCALES.includes(value as Locale);
}

function normalizeLanguage(value: string): Locale | undefined {
	const language = value.trim().toLowerCase().replaceAll("_", "-");
	if (language === "jp" || language === "ja" || language.startsWith("ja-")) {
		return "ja";
	}
	if (language === "zh" || language.startsWith("zh-")) return "zh";
	if (language === "en" || language.startsWith("en-")) return "en";
	return undefined;
}

export function parseAcceptLanguage(header: string | null): Locale[] {
	if (!header) return [];
	const ranked = header
		.split(",")
		.map((part, index) => {
			const [rawLanguage, ...parameters] = part.trim().split(";");
			let quality = 1;
			for (const parameter of parameters) {
				const match = parameter.trim().match(/^q=(0(?:\.\d+)?|1(?:\.0+)?)$/i);
				if (match) quality = Number(match[1]);
			}
			return {
				locale: normalizeLanguage(rawLanguage),
				quality,
				index,
			};
		})
		.filter(
			(item): item is { locale: Locale; quality: number; index: number } =>
				item.locale !== undefined && item.quality > 0,
		)
		.sort((a, b) => b.quality - a.quality || a.index - b.index);

	return [...new Set(ranked.map((item) => item.locale))];
}

function readLocaleCookie(request: Request): Locale | undefined {
	const cookie = request.headers.get("Cookie");
	if (!cookie) return undefined;
	for (const part of cookie.split(";")) {
		const [name, ...valueParts] = part.trim().split("=");
		if (name !== "locale") continue;
		const value = decodeURIComponent(valueParts.join("="));
		return isLocale(value) ? value : undefined;
	}
	return undefined;
}

function preferredLocales(request: Request): Locale[] {
	const cookieLocale = readLocaleCookie(request);
	const accepted = parseAcceptLanguage(request.headers.get("Accept-Language"));
	return [
		...(cookieLocale ? [cookieLocale] : []),
		...accepted,
		"en",
		...SUPPORTED_LOCALES,
	].filter(
		(locale, index, all): locale is Locale =>
			isLocale(locale) && all.indexOf(locale) === index,
	);
}

function redirect(location: string, extraHeaders?: HeadersInit): Response {
	const headers = new Headers(extraHeaders);
	headers.set("Location", location);
	headers.set("Cache-Control", "private, no-store");
	headers.set("Vary", "Accept-Language, Cookie");
	return new Response(null, { status: 302, headers });
}

function isSafeNextPath(value: string | null): value is string {
	if (!value || !value.startsWith("/") || value.startsWith("//")) return false;
	try {
		const url = new URL(value, "https://example.invalid");
		return (
			url.origin === "https://example.invalid" &&
			!url.pathname.split("/").includes("..")
		);
	} catch {
		return false;
	}
}

async function assetExists(
	env: Env,
	request: Request,
	pathname: string,
): Promise<boolean> {
	const url = new URL(request.url);
	url.pathname = pathname;
	url.search = "";
	const response = await env.ASSETS.fetch(
		new Request(url, { method: "HEAD" }),
	);
	return response.ok;
}

async function redirectNeutralPost(
	request: Request,
	env: Env,
	pathname: string,
): Promise<Response> {
	const match = pathname.match(/^\/posts\/(.+?)\/?$/);
	if (!match) return env.ASSETS.fetch(request);
	const translationKey = match[1];
	if (
		translationKey.includes("..") ||
		translationKey.includes("\\") ||
		translationKey.includes("//")
	) {
		return new Response("Not found", { status: 404 });
	}

	for (const locale of preferredLocales(request)) {
		const target = `/${locale}/posts/${translationKey}/`;
		if (await assetExists(env, request, target)) return redirect(target);
	}

	return env.ASSETS.fetch(request);
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		if (request.method !== "GET" && request.method !== "HEAD") {
			return env.ASSETS.fetch(request);
		}

		if (url.pathname === "/set-language") {
			const locale = url.searchParams.get("locale");
			const next = url.searchParams.get("next");
			if (!isLocale(locale) || !isSafeNextPath(next)) {
				return new Response("Invalid language selection", { status: 400 });
			}
			return redirect(next, {
				"Set-Cookie": `locale=${locale}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`,
			});
		}

		if (url.pathname === "/") {
			return redirect(`/${preferredLocales(request)[0]}/`);
		}

		if (url.pathname.startsWith("/posts/")) {
			return redirectNeutralPost(request, env, url.pathname);
		}

		return env.ASSETS.fetch(request);
	},
};
