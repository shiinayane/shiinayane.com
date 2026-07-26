import type { AstroIntegration } from "@swup/astro";

interface PagefindApi {
	search: (
		query: string,
		options?: {
			filters?: Record<string, string | string[]>;
		},
	) => Promise<{
		results: Array<{
			data: () => Promise<SearchResult>;
		}>;
	}>;
	options?: (options: {
		excerptLength?: number;
		language?: string;
	}) => Promise<void>;
}

declare global {
	interface Window {
		// type from '@swup/astro' is incorrect
		swup: AstroIntegration;
		pagefind: PagefindApi;
		getPagefind?: (locale: "en" | "zh" | "ja") => Promise<PagefindApi>;
	}
}

interface SearchResult {
	url: string;
	meta: {
		title: string;
	};
	excerpt: string;
	content?: string;
	word_count?: number;
	filters?: Record<string, unknown>;
	anchors?: Array<{
		element: string;
		id: string;
		text: string;
		location: number;
	}>;
	weighted_locations?: Array<{
		weight: number;
		balanced_score: number;
		location: number;
	}>;
	locations?: number[];
	raw_content?: string;
	raw_url?: string;
	sub_results?: SearchResult[];
}
