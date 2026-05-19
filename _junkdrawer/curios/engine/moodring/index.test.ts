import { describe, it, expect } from "vitest";
import {
	generateMoodLogId,
	isValidMode,
	isValidDisplayStyle,
	isValidColorScheme,
	isValidHexColor,
	sanitizeMoodText,
	sanitizeNote,
	getTimeColor,
	getInterpolatedTimeColor,
	getCurrentSeason,
	getSeasonalColor,
	getRandomColor,
	toDisplayMoodLog,
	lerpHexColors,
	lightenHex,
	darkenHex,
	hexToRgb,
	rgbToHsl,
	hslToHex,
	MODE_OPTIONS,
	DISPLAY_STYLE_OPTIONS,
	COLOR_SCHEME_OPTIONS,
	TIME_COLORS,
	SEASONAL_COLORS,
	RANDOM_PALETTE,
	MAX_MOOD_TEXT_LENGTH,
	MAX_NOTE_LENGTH,
	type MoodLogEntry,
} from "./index";

describe("Mood Ring constants", () => {
	it("has 4 mode options", () => {
		expect(MODE_OPTIONS).toHaveLength(4);
		expect(MODE_OPTIONS.map((m) => m.value)).toEqual(["time", "manual", "seasonal", "random"]);
	});

	it("has 7 display styles", () => {
		expect(DISPLAY_STYLE_OPTIONS).toHaveLength(7);
		expect(DISPLAY_STYLE_OPTIONS.map((s) => s.value)).toEqual([
			"ring",
			"gem",
			"orb",
			"crystal",
			"flame",
			"leaf",
			"moon",
		]);
	});

	it("display styles have descriptions", () => {
		for (const style of DISPLAY_STYLE_OPTIONS) {
			expect(style.description).toBeTruthy();
		}
	});

	it("has 5 color schemes", () => {
		expect(COLOR_SCHEME_OPTIONS).toHaveLength(5);
	});

	it("has time color periods", () => {
		expect(TIME_COLORS.length).toBeGreaterThan(0);
	});

	it("has seasonal colors including midnight", () => {
		expect(SEASONAL_COLORS.spring).toBeDefined();
		expect(SEASONAL_COLORS.autumn).toBeDefined();
		expect(SEASONAL_COLORS.midnight).toBeDefined();
	});

	it("has random palette colors", () => {
		expect(RANDOM_PALETTE.length).toBeGreaterThan(0);
	});
});

describe("generateMoodLogId", () => {
	it("generates ml_ prefixed ID", () => {
		expect(generateMoodLogId()).toMatch(/^ml_/);
	});

	it("generates unique IDs", () => {
		const ids = new Set(Array.from({ length: 20 }, () => generateMoodLogId()));
		expect(ids.size).toBe(20);
	});
});

describe("isValidMode", () => {
	it("accepts valid modes", () => {
		expect(isValidMode("time")).toBe(true);
		expect(isValidMode("manual")).toBe(true);
		expect(isValidMode("seasonal")).toBe(true);
		expect(isValidMode("random")).toBe(true);
	});

	it("rejects invalid modes", () => {
		expect(isValidMode("auto")).toBe(false);
		expect(isValidMode("")).toBe(false);
	});
});

describe("isValidDisplayStyle", () => {
	it("accepts all 7 styles", () => {
		expect(isValidDisplayStyle("ring")).toBe(true);
		expect(isValidDisplayStyle("gem")).toBe(true);
		expect(isValidDisplayStyle("orb")).toBe(true);
		expect(isValidDisplayStyle("crystal")).toBe(true);
		expect(isValidDisplayStyle("flame")).toBe(true);
		expect(isValidDisplayStyle("leaf")).toBe(true);
		expect(isValidDisplayStyle("moon")).toBe(true);
	});

	it("rejects invalid", () => {
		expect(isValidDisplayStyle("square")).toBe(false);
	});
});

describe("isValidColorScheme", () => {
	it("accepts valid schemes", () => {
		expect(isValidColorScheme("default")).toBe(true);
		expect(isValidColorScheme("forest")).toBe(true);
	});

	it("rejects invalid", () => {
		expect(isValidColorScheme("neon")).toBe(false);
	});
});

describe("isValidHexColor", () => {
	it("accepts valid hex colors", () => {
		expect(isValidHexColor("#ff0000")).toBe(true);
		expect(isValidHexColor("#AABBCC")).toBe(true);
	});

	it("rejects invalid formats", () => {
		expect(isValidHexColor("ff0000")).toBe(false);
		expect(isValidHexColor("#fff")).toBe(false);
		expect(isValidHexColor("#gggggg")).toBe(false);
		expect(isValidHexColor("red")).toBe(false);
	});
});

describe("sanitizeMoodText", () => {
	it("returns null for empty/null", () => {
		expect(sanitizeMoodText(null)).toBeNull();
		expect(sanitizeMoodText("")).toBeNull();
	});

	it("strips HTML", () => {
		expect(sanitizeMoodText("<b>Happy</b>")).toBe("Happy");
	});

	it("truncates to max length", () => {
		const long = "x".repeat(100);
		expect(sanitizeMoodText(long)).toHaveLength(MAX_MOOD_TEXT_LENGTH);
	});
});

describe("sanitizeNote", () => {
	it("returns null for empty/null", () => {
		expect(sanitizeNote(null)).toBeNull();
	});

	it("truncates to max length", () => {
		const long = "x".repeat(300);
		expect(sanitizeNote(long)).toHaveLength(MAX_NOTE_LENGTH);
	});
});

// =============================================================================
// Color Utilities
// =============================================================================

describe("hexToRgb", () => {
	it("parses red", () => {
		expect(hexToRgb("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
	});

	it("parses white", () => {
		expect(hexToRgb("#ffffff")).toEqual({ r: 255, g: 255, b: 255 });
	});

	it("parses a mid-tone", () => {
		expect(hexToRgb("#7cb85c")).toEqual({ r: 124, g: 184, b: 92 });
	});
});

describe("rgbToHsl + hslToHex roundtrip", () => {
	it("roundtrips pure red", () => {
		const hsl = rgbToHsl(255, 0, 0);
		expect(hsl.h).toBeCloseTo(0, 1);
		expect(hsl.s).toBeCloseTo(1, 1);
		expect(hsl.l).toBeCloseTo(0.5, 1);
		expect(hslToHex(hsl.h, hsl.s, hsl.l)).toBe("#ff0000");
	});

	it("roundtrips a palette color", () => {
		const hex = "#6b7fb5";
		const { r, g, b } = hexToRgb(hex);
		const hsl = rgbToHsl(r, g, b);
		const result = hslToHex(hsl.h, hsl.s, hsl.l);
		expect(result).toBe(hex);
	});
});

describe("lerpHexColors", () => {
	it("returns first color at t=0", () => {
		expect(lerpHexColors("#ff0000", "#0000ff", 0)).toBe("#ff0000");
	});

	it("returns second color at t=1", () => {
		expect(lerpHexColors("#ff0000", "#0000ff", 1)).toBe("#0000ff");
	});

	it("returns a valid hex at t=0.5", () => {
		const result = lerpHexColors("#ff0000", "#0000ff", 0.5);
		expect(result).toMatch(/^#[0-9a-f]{6}$/);
	});

	it("clamps t outside 0-1", () => {
		expect(lerpHexColors("#ff0000", "#0000ff", -1)).toBe("#ff0000");
		expect(lerpHexColors("#ff0000", "#0000ff", 2)).toBe("#0000ff");
	});

	it("same colors returns same color", () => {
		expect(lerpHexColors("#abcdef", "#abcdef", 0.5)).toBe("#abcdef");
	});
});

describe("lightenHex", () => {
	it("makes dark colors lighter", () => {
		const { r: rOrig } = hexToRgb("#333333");
		const lighter = lightenHex("#333333");
		const { r: rLight } = hexToRgb(lighter);
		expect(rLight).toBeGreaterThan(rOrig);
	});

	it("returns valid hex", () => {
		expect(lightenHex("#8b5eb0")).toMatch(/^#[0-9a-f]{6}$/);
	});

	it("clamps at white", () => {
		const result = lightenHex("#ffffff", 0.5);
		expect(result).toBe("#ffffff");
	});
});

describe("darkenHex", () => {
	it("makes light colors darker", () => {
		const { r: rOrig } = hexToRgb("#cccccc");
		const darker = darkenHex("#cccccc");
		const { r: rDark } = hexToRgb(darker);
		expect(rDark).toBeLessThan(rOrig);
	});

	it("clamps at black", () => {
		const result = darkenHex("#000000", 0.5);
		expect(result).toBe("#000000");
	});
});

// =============================================================================
// Time, Season, Random
// =============================================================================

describe("getTimeColor", () => {
	it("returns dawn for hour 5", () => {
		const c = getTimeColor(5);
		expect(c.name).toBe("Dawn");
	});

	it("returns morning for hour 8", () => {
		const c = getTimeColor(8);
		expect(c.name).toBe("Morning");
	});

	it("returns night for hour 22", () => {
		const c = getTimeColor(22);
		expect(c.name).toBe("Night");
	});

	it("returns deep night for hour 2", () => {
		const c = getTimeColor(2);
		expect(c.name).toBe("Deep Night");
	});

	it("returns a valid color string", () => {
		const c = getTimeColor(12);
		expect(c.color).toMatch(/^#[0-9a-f]{6}$/);
	});
});

describe("getInterpolatedTimeColor", () => {
	it("returns the current period name", () => {
		const c = getInterpolatedTimeColor(5, 0);
		expect(c.name).toBe("Dawn");
	});

	it("returns a valid hex color", () => {
		const c = getInterpolatedTimeColor(12, 30);
		expect(c.color).toMatch(/^#[0-9a-f]{6}$/);
	});

	it("interpolates midway between periods", () => {
		// Dawn starts at 5, Morning at 7 — midpoint is 6:00
		const atDawnStart = getInterpolatedTimeColor(5, 0);
		const midway = getInterpolatedTimeColor(6, 0);
		const atMorningStart = getInterpolatedTimeColor(7, 0);
		// Midway color should differ from both endpoints
		expect(midway.color).not.toBe(atDawnStart.color);
		// At morning start, the color should be close to (but not necessarily equal to) morning
		expect(atMorningStart.color).toMatch(/^#[0-9a-f]{6}$/);
	});

	it("uses current time when no args given", () => {
		const c = getInterpolatedTimeColor();
		expect(c.name).toBeTruthy();
		expect(c.color).toMatch(/^#[0-9a-f]{6}$/);
	});
});

describe("getCurrentSeason", () => {
	it("returns a valid season string", () => {
		const s = getCurrentSeason();
		expect(["spring", "summer", "autumn", "winter"]).toContain(s);
	});
});

describe("getSeasonalColor", () => {
	it("returns a named color object with no args", () => {
		const c = getSeasonalColor();
		expect(c.name).toBeDefined();
		expect(c.color).toMatch(/^#[0-9a-f]{6}$/);
	});

	it("accepts a season override", () => {
		const c = getSeasonalColor("winter");
		expect(c.name).toBe("Winter Rest");
		expect(c.color).toBe("#7ba3c9");
	});

	it("accepts midnight season", () => {
		const c = getSeasonalColor("midnight");
		expect(c.name).toBe("Midnight Dreams");
		expect(c.color).toBe("#6b5eb0");
	});

	it("falls back to autumn for unknown season", () => {
		const c = getSeasonalColor("nonexistent");
		expect(c.name).toBe("Autumn Harvest");
	});
});

describe("getRandomColor", () => {
	it("returns color, nextColor, and driftT", () => {
		const result = getRandomColor("tenant1");
		expect(result).toHaveProperty("color");
		expect(result).toHaveProperty("nextColor");
		expect(result).toHaveProperty("driftT");
		expect(RANDOM_PALETTE).toContain(result.color);
		expect(RANDOM_PALETTE).toContain(result.nextColor);
		expect(result.driftT).toBeGreaterThanOrEqual(0);
		expect(result.driftT).toBeLessThan(1);
	});

	it("returns consistent results for the same tenant within the same call", () => {
		const a = getRandomColor("tenant1");
		const b = getRandomColor("tenant1");
		expect(a.color).toBe(b.color);
	});
});

describe("toDisplayMoodLog", () => {
	it("transforms entry to display format", () => {
		const entry: MoodLogEntry = {
			id: "ml_123",
			tenantId: "t1",
			mood: "Happy",
			color: "#ff0000",
			note: "Good day",
			loggedAt: "2025-01-01",
		};
		const display = toDisplayMoodLog(entry);
		expect(display).toEqual({
			mood: "Happy",
			color: "#ff0000",
			note: "Good day",
			loggedAt: "2025-01-01",
		});
		expect(display).not.toHaveProperty("id");
		expect(display).not.toHaveProperty("tenantId");
	});
});
