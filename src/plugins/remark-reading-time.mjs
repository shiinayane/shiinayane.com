// biome-ignore lint/suspicious/noShadowRestrictedNames: <toString from mdast-util-to-string>
import { toString } from "mdast-util-to-string";
import getReadingTime from "reading-time";

export function remarkReadingTime() {
	return (tree, { data }) => {
		const textOnPage = toString(tree);
		const language = String(data.astro.frontmatter.lang || "")
			.toLowerCase()
			.replaceAll("-", "_");
		const isCjk =
			language.startsWith("zh") ||
			language === "jp" ||
			language.startsWith("ja");
		// reading-time counts each Han/Hiragana/Hangul character as one word.
		// Use a character-oriented rate for CJK instead of the English 200 WPM.
		const readingTime = getReadingTime(textOnPage, {
			wordsPerMinute: isCjk ? 400 : 200,
		});
		data.astro.frontmatter.minutes = Math.max(
			1,
			Math.round(readingTime.minutes),
		);
		data.astro.frontmatter.words = readingTime.words;
	};
}
