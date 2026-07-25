import { readFile, readdir } from "node:fs/promises";

const postsDirectory = new URL("../src/content/posts/", import.meta.url);
const planPath = new URL(
	"../src/content/translation-plan.json",
	import.meta.url,
);
const supportedLocales = new Set(["en", "zh", "ja"]);
const plan = JSON.parse(await readFile(planPath, "utf8"));
const sourceLocales = new Map(
	plan.posts.map((item) => [item.key, item.source]),
);

function normalizeLocale(value) {
	const normalized = value.toLowerCase().replaceAll("_", "-");
	if (normalized === "jp" || normalized.startsWith("ja")) return "ja";
	if (normalized.startsWith("zh")) return "zh";
	if (normalized.startsWith("en")) return "en";
	return undefined;
}

function parseFrontmatter(source, file) {
	const match = source.match(/^---\n([\s\S]*?)\n---/);
	if (!match) throw new Error(`${file}: missing frontmatter`);
	const data = {};
	for (const line of match[1].split("\n")) {
		const field = line.match(/^([A-Za-z][A-Za-z0-9]*):\s*(.+?)\s*$/);
		if (!field) continue;
		data[field[1]] = field[2].replace(/^["']|["']$/g, "");
	}
	return data;
}

const files = (await readdir(postsDirectory))
	.filter((file) => file.endsWith(".md"))
	.sort();
const groups = new Map();
const errors = [];

for (const file of files) {
	const source = await readFile(new URL(file, postsDirectory), "utf8");
	const data = parseFrontmatter(source, file);
	const locale = normalizeLocale(data.lang ?? "");
	const key = data.translationKey;
	if (!locale || !supportedLocales.has(locale)) {
		errors.push(`${file}: unsupported or missing lang`);
	}
	if (!key) errors.push(`${file}: missing translationKey`);
	if (!locale || !key) continue;
	const expectedSuffix = `.${locale}.md`;
	if (locale !== sourceLocales.get(key) && !file.endsWith(expectedSuffix)) {
		errors.push(`${file}: ${locale} content must use ${expectedSuffix}`);
	}
	if (
		locale !== sourceLocales.get(key) &&
		/\]\(\/posts\//.test(source)
	) {
		errors.push(`${file}: translated content contains a neutral post link`);
	}
	const locales = groups.get(key) ?? new Map();
	if (locales.has(locale)) {
		errors.push(
			`${file}: duplicate ${locale} translation for ${key} (${locales.get(locale).file})`,
		);
	}
	locales.set(locale, { file, data });
	groups.set(key, locales);
}

const planKeys = new Set();
const knownStatuses = new Set(plan.statuses);
for (const item of plan.posts) {
	if (planKeys.has(item.key)) errors.push(`plan: duplicate key ${item.key}`);
	planKeys.add(item.key);
	const locales = groups.get(item.key);
	if (!locales) {
		errors.push(`plan: ${item.key} has no content`);
		continue;
	}
	if (!locales.has(item.source)) {
		errors.push(`plan: ${item.key} source ${item.source} does not exist`);
	}
	for (const [locale, status] of Object.entries(item.targets)) {
		if (!supportedLocales.has(locale) || locale === item.source) {
			errors.push(`plan: ${item.key} has invalid target ${locale}`);
		}
		if (!knownStatuses.has(status)) {
			errors.push(`plan: ${item.key} has unknown status ${status}`);
		}
		const exists = locales.has(locale);
		if (
			(status === "published" || status === "needs-review") &&
			!exists
		) {
			errors.push(`plan: ${item.key} marks missing ${locale} as ${status}`);
		}
		if (
			status !== "published" &&
			status !== "needs-review" &&
			exists
		) {
			errors.push(
				`plan: ${item.key} has ${locale} content but status is ${status}`,
			);
		}
	}
	const source = locales.get(item.source)?.data;
	for (const [locale, translation] of locales) {
		if (locale === item.source || !source) continue;
		for (const field of ["published", "series", "seriesOrder"]) {
			if ((translation.data[field] ?? "") !== (source[field] ?? "")) {
				errors.push(
					`${translation.file}: ${field} differs from ${item.source} source`,
				);
			}
		}
	}
}

for (const key of groups.keys()) {
	if (!planKeys.has(key)) errors.push(`plan: missing content key ${key}`);
}

const coverage = { en: 0, zh: 0, ja: 0 };
for (const locales of groups.values()) {
	for (const locale of locales.keys()) coverage[locale] += 1;
}

console.log(
	`i18n coverage: ${groups.size} posts; en ${coverage.en}, zh ${coverage.zh}, ja ${coverage.ja}`,
);
if (errors.length > 0) {
	for (const error of errors) console.error(`- ${error}`);
	process.exitCode = 1;
} else {
	console.log("i18n content checks passed");
}
