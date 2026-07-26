import { type CollectionEntry, getCollection } from "astro:content";
import {
	DEFAULT_LOCALE,
	type Locale,
	normalizeLocale,
	SUPPORTED_LOCALES,
} from "@i18n/config";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { getCategoryUrl } from "@utils/url-utils.ts";

export type PostEntry = CollectionEntry<"posts">;

export function getPostLocale(post: PostEntry): Locale {
	return normalizeLocale(post.data.lang);
}

export function getPostTranslationKey(post: PostEntry): string {
	return post.data.translationKey.trim() || post.slug;
}

function sortPosts(posts: PostEntry[]): PostEntry[] {
	return posts.sort((a, b) => {
		const dateA = new Date(a.data.published).getTime();
		const dateB = new Date(b.data.published).getTime();
		if (dateA !== dateB) return dateB - dateA;

		const sameSeries = !!a.data.series && a.data.series === b.data.series;
		if (
			sameSeries &&
			a.data.seriesOrder != null &&
			b.data.seriesOrder != null
		) {
			return b.data.seriesOrder - a.data.seriesOrder;
		}

		return getPostTranslationKey(a).localeCompare(getPostTranslationKey(b));
	});
}

function connectAdjacentPosts(posts: PostEntry[]): PostEntry[] {
	for (const post of posts) {
		post.data.nextSlug = "";
		post.data.nextTitle = "";
		post.data.prevSlug = "";
		post.data.prevTitle = "";
	}
	for (let i = 1; i < posts.length; i++) {
		posts[i].data.nextSlug = getPostTranslationKey(posts[i - 1]);
		posts[i].data.nextTitle = posts[i - 1].data.title;
	}
	for (let i = 0; i < posts.length - 1; i++) {
		posts[i].data.prevSlug = getPostTranslationKey(posts[i + 1]);
		posts[i].data.prevTitle = posts[i + 1].data.title;
	}
	return posts;
}

async function getVisiblePosts(): Promise<PostEntry[]> {
	const allBlogPosts = await getCollection("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});
	return allBlogPosts;
}

// Retrieve every post for the legacy, language-neutral routes.
async function getRawSortedPosts() {
	const selected = new Map<string, PostEntry>();
	for (const post of await getVisiblePosts()) {
		const key = getPostTranslationKey(post);
		const current = selected.get(key);
		if (!current || getPostLocale(post) === DEFAULT_LOCALE) {
			selected.set(key, post);
		}
	}
	return sortPosts(Array.from(selected.values()));
}

export async function getSortedPosts() {
	const sorted = await getRawSortedPosts();
	return connectAdjacentPosts(sorted);
}

export async function getLocalizedPosts(locale: Locale): Promise<PostEntry[]> {
	const localized = (await getVisiblePosts()).filter(
		(post) => getPostLocale(post) === locale,
	);
	return connectAdjacentPosts(sortPosts(localized));
}

// Build a language-inclusive view while showing only one version of each
// translation group. Prefer the current UI language when it exists, otherwise
// fall back deterministically without changing the chronological order.
export async function getPreferredPosts(locale: Locale): Promise<PostEntry[]> {
	const groups = new Map<string, Partial<Record<Locale, PostEntry>>>();
	for (const post of await getVisiblePosts()) {
		const key = getPostTranslationKey(post);
		const group = groups.get(key) ?? {};
		group[getPostLocale(post)] = post;
		groups.set(key, group);
	}

	const selected = Array.from(groups.values()).flatMap((group) => {
		const preferred =
			group[locale] ??
			group[DEFAULT_LOCALE] ??
			SUPPORTED_LOCALES.map((candidate) => group[candidate]).find(Boolean);
		return preferred ? [preferred] : [];
	});

	return sortPosts(selected);
}

export async function getHomepagePosts(locale: Locale): Promise<PostEntry[]> {
	return getPreferredPosts(locale);
}

export async function getPostTranslations(
	translationKey: string,
): Promise<Partial<Record<Locale, PostEntry>>> {
	const translations: Partial<Record<Locale, PostEntry>> = {};
	for (const post of await getVisiblePosts()) {
		if (getPostTranslationKey(post) !== translationKey) continue;
		translations[getPostLocale(post)] = post;
	}
	return translations;
}

export async function getTranslationManifest(): Promise<
	Record<string, Locale[]>
> {
	const manifest: Record<string, Locale[]> = {};
	for (const post of await getVisiblePosts()) {
		const key = getPostTranslationKey(post);
		const locale = getPostLocale(post);
		manifest[key] ??= [];
		if (!manifest[key].includes(locale)) manifest[key].push(locale);
	}
	for (const locales of Object.values(manifest)) {
		locales.sort(
			(a, b) => SUPPORTED_LOCALES.indexOf(a) - SUPPORTED_LOCALES.indexOf(b),
		);
	}
	return manifest;
}
export type PostForList = {
	slug: string;
	locale: Locale;
	data: CollectionEntry<"posts">["data"];
};
export async function getSortedPostsList(): Promise<PostForList[]> {
	const sortedFullPosts = await getRawSortedPosts();

	// delete post.body
	const sortedPostsList = sortedFullPosts.map((post) => ({
		slug: getPostTranslationKey(post),
		locale: getPostLocale(post),
		data: post.data,
	}));

	return sortedPostsList;
}

export async function getPreferredPostsList(
	locale: Locale,
): Promise<PostForList[]> {
	return (await getPreferredPosts(locale)).map((post) => ({
		slug: getPostTranslationKey(post),
		locale: getPostLocale(post),
		data: post.data,
	}));
}
export type Tag = {
	name: string;
	count: number;
};

export async function getTagList(locale?: Locale): Promise<Tag[]> {
	const allBlogPosts = locale
		? await getPreferredPosts(locale)
		: await getRawSortedPosts();

	const countMap: { [key: string]: number } = {};
	allBlogPosts.forEach((post) => {
		post.data.tags.forEach((tag: string) => {
			if (!countMap[tag]) countMap[tag] = 0;
			countMap[tag]++;
		});
	});

	// sort tags
	const keys: string[] = Object.keys(countMap).sort((a, b) => {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	return keys.map((key) => ({ name: key, count: countMap[key] }));
}

export type SeriesEntry = {
	slug: string;
	data: CollectionEntry<"posts">["data"];
};

// All posts belonging to one series, ordered by seriesOrder (falling back to
// publication date). Drafts follow the same PROD-hiding rule as the rest of
// the site, so unpublished entries only appear in dev.
export async function getSeriesPosts(
	series: string,
	locale?: Locale,
): Promise<SeriesEntry[]> {
	const allBlogPosts = await getCollection<"posts">("posts", ({ data }) => {
		const visible = import.meta.env.PROD ? data.draft !== true : true;
		return (
			visible &&
			data.series === series &&
			(!locale || normalizeLocale(data.lang) === locale)
		);
	});

	const sorted = allBlogPosts.sort((a, b) => {
		const orderA = a.data.seriesOrder ?? Number.POSITIVE_INFINITY;
		const orderB = b.data.seriesOrder ?? Number.POSITIVE_INFINITY;
		if (orderA !== orderB) return orderA - orderB;
		return (
			new Date(a.data.published).getTime() -
			new Date(b.data.published).getTime()
		);
	});

	return sorted.map((post) => ({ slug: post.slug, data: post.data }));
}

// Distinct series slugs present across all posts.
export async function getSeriesList(locale?: Locale): Promise<string[]> {
	const allBlogPosts = await getCollection<"posts">("posts", ({ data }) => {
		const visible = import.meta.env.PROD ? data.draft !== true : true;
		return (
			visible &&
			!!data.series &&
			(!locale || normalizeLocale(data.lang) === locale)
		);
	});
	const set = new Set<string>();
	for (const post of allBlogPosts) set.add(post.data.series);
	return Array.from(set).sort();
}

export type Category = {
	name: string;
	count: number;
	url: string;
};

export async function getCategoryList(locale?: Locale): Promise<Category[]> {
	const allBlogPosts = locale
		? await getPreferredPosts(locale)
		: await getRawSortedPosts();
	const count: { [key: string]: number } = {};
	allBlogPosts.forEach((post) => {
		if (!post.data.category) {
			const ucKey = i18n(I18nKey.uncategorized);
			count[ucKey] = count[ucKey] ? count[ucKey] + 1 : 1;
			return;
		}

		const categoryName =
			typeof post.data.category === "string"
				? post.data.category.trim()
				: String(post.data.category).trim();

		count[categoryName] = count[categoryName] ? count[categoryName] + 1 : 1;
	});

	const lst = Object.keys(count).sort((a, b) => {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	const ret: Category[] = [];
	for (const c of lst) {
		ret.push({
			name: c,
			count: count[c],
			url: getCategoryUrl(c, locale),
		});
	}
	return ret;
}
