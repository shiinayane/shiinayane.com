export type SeriesMeta = {
	name: string;
	subtitle: string;
};

type SeriesTranslations = Partial<
	Record<"en" | "zh" | "ja", SeriesMeta>
>;

// Human-readable metadata for known series, keyed by the `series` frontmatter
// slug. Unknown slugs fall back to a title derived from the slug, so adding a
// new series needs only frontmatter — no code change.
export const SERIES_META: Record<string, SeriesTranslations> = {
	"sovereign-tools": {
		en: {
			name: "Sovereign Tools",
			subtitle:
				"Building a clean macOS development environment that survives migrations, upgrades, and your future self.",
		},
		zh: {
			name: "自主工具",
			subtitle: "构建能够经受迁移、升级和未来自己的 macOS 开发环境。",
		},
		ja: {
			name: "自律的なツール",
			subtitle:
				"移行やアップグレード、将来の自分にも耐えられる macOS 開発環境を作る。",
		},
	},
	"cs-notes": {
		en: {
			name: "Computer Science Study Notes",
			subtitle: "Foundational computer science notes written in Japanese.",
		},
		zh: {
			name: "计算机科学学习笔记",
			subtitle: "用日语整理的计算机科学基础学习笔记。",
		},
		ja: {
			name: "CS 学習ノート",
			subtitle: "コンピュータサイエンスの基礎を日本語でまとめた学習ノート。",
		},
	},
};

export function getSeriesMeta(
	slug: string,
	locale: "en" | "zh" | "ja" = "en",
): SeriesMeta {
	const translations = SERIES_META[slug];
	return (
		translations?.[locale] ??
		translations?.en ??
		translations?.ja ?? {
			name: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
			subtitle: "",
		}
	);
}
