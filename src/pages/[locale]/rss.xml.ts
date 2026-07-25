import rss from "@astrojs/rss";
import {
	type Locale,
	localeLanguageTag,
	SUPPORTED_LOCALES,
} from "@i18n/config";
import { getLocalizedPosts, getPostTranslationKey } from "@utils/content-utils";
import { getPostUrlBySlug } from "@utils/url-utils";
import type { APIContext } from "astro";
import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";
import { siteConfig } from "@/config";

const parser = new MarkdownIt();

function stripInvalidXmlChars(str: string): string {
	return str.replace(
		// biome-ignore lint/suspicious/noControlCharactersInRegex: XML character set
		/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFDD0-\uFDEF\uFFFE\uFFFF]/g,
		"",
	);
}

export function getStaticPaths() {
	return SUPPORTED_LOCALES.map((locale) => ({
		params: { locale },
		props: { locale },
	}));
}

export async function GET(context: APIContext) {
	const { locale } = context.props as { locale: Locale };
	const blog = await getLocalizedPosts(locale);

	return rss({
		title: `${siteConfig.title} (${localeLanguageTag(locale)})`,
		description: siteConfig.subtitle || "No description",
		site: context.site ?? "https://www.shiinayane.com",
		items: blog.map((post) => {
			const content =
				typeof post.body === "string" ? post.body : String(post.body || "");
			return {
				title: post.data.title,
				pubDate: post.data.published,
				description: post.data.description || "",
				link: getPostUrlBySlug(getPostTranslationKey(post), locale),
				content: sanitizeHtml(parser.render(stripInvalidXmlChars(content)), {
					allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
				}),
			};
		}),
		customData: `<language>${localeLanguageTag(locale)}</language>`,
	});
}
