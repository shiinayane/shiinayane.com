export type SeriesMeta = {
	name: string;
	subtitle: string;
};

// Human-readable metadata for known series, keyed by the `series` frontmatter
// slug. Unknown slugs fall back to a title derived from the slug, so adding a
// new series needs only frontmatter — no code change.
export const SERIES_META: Record<string, SeriesMeta> = {
	"sovereign-tools": {
		name: "Sovereign Tools",
		subtitle:
			"Building a clean macOS development environment that survives migrations, upgrades, and your future self.",
	},
};

export function getSeriesMeta(slug: string): SeriesMeta {
	return (
		SERIES_META[slug] ?? {
			name: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
			subtitle: "",
		}
	);
}
