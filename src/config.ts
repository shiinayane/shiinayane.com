import type {
	ExpressiveCodeConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
	title: "SHIINAYANE",
	subtitle: "YK's Blog",
	lang: "en", // Language code, e.g. 'en', 'zh_CN', 'ja', etc.
	themeColor: {
		hue: 280, // Default hue for the theme color, from 0 to 360. e.g. red: 0, teal: 200, cyan: 250, pink: 345
		fixed: true, // Hide the theme color picker for visitors
	},
	banner: {
		enable: true,
		src: "assets/images/banner.png", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
		position: "top", // Equivalent to object-position, only supports 'top', 'center', 'bottom'. 'center' by default
		credit: {
			enable: true, // Display the credit text of the banner image
			text: "Re:LieF 〜親愛なるあなたへ〜", // Credit text to be displayed
			url: "http://rask-soft.com", // (Optional) URL link to the original artwork or artist's page
		},
	},
	toc: {
		enable: true, // Display the table of contents on the right side of the post
		depth: 2, // Maximum heading depth to show in the table, from 1 to 3
	},
	favicon: [
		// Leave this array empty to use the default favicon
		// {
		//   src: '/favicon/icon.png',    // Path of the favicon, relative to the /public directory
		//   theme: 'light',              // (Optional) Either 'light' or 'dark', set only if you have different favicons for light and dark mode
		//   sizes: '32x32',              // (Optional) Size of the favicon, set only if you have favicons of different sizes
		// }
		{
			src: "/favicon/avatar-32.png",
			sizes: "32x32",
		},
		{
			src: "/favicon/avatar-64.png",
			sizes: "64x64",
		},
		{
			src: "/favicon/avatar-128.png",
			sizes: "128x128",
		},
		{
			src: "/favicon/avatar-256.png",
			sizes: "256x256",
		},
	],
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,
		LinkPreset.About,
		LinkPreset.Contact,
		{
			name: "GitHub",
			url: "https://github.com/shiinayane", // Internal links should not include the base path, as it is automatically added
			external: true, // Show an external link icon and will open in a new tab
		},
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "assets/images/avatar.png", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
	name: "YANKAI WANG",
	bio: "どこにいったって、人が繋がっているのよ。",
	links: [
		// {
		// 	name: "Twitter",
		// 	icon: "fa6-brands:twitter", // Visit https://icones.js.org/ for icon codes
		// 	// You will need to install the corresponding icon set if it's not already included
		// 	// `pnpm add @iconify-json/<icon-set-name>`
		// 	url: "https://twitter.com",https://music.apple.com/profile/shiinayane
		// },
		{
			name: "GitHub",
			icon: "simple-icons:github",
			url: "https://github.com/shiinayane",
		},
		{
			name: "Steam",
			icon: "simple-icons:steam",
			url: "https://steamcommunity.com/profiles/76561198092391831",
		},
		{
			name: "Apple Music",
			icon: "simple-icons:applemusic",
			url: "https://music.apple.com/profile/shiinayane",
		},
		{
			name: "bilibili",
			icon: "simple-icons:bilibili",
			url: "https://space.bilibili.com/3284596",
		},
		{
			name: "zhihu",
			icon: "simple-icons:zhihu",
			url: "https://www.zhihu.com/people/huan-ying-misaki",
		},
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// Note: Some styles (such as background color) are being overridden, see the astro.config.mjs file.
	// Please select a dark theme, as this blog theme currently only supports dark background color
	theme: "github-dark",
};
