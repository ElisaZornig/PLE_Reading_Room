import { describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({
    supabase: {
        from: vi.fn(),
    },
}));

vi.mock("./supabaseUserBooks", () => ({
    getCurrentSupabaseUserId: vi.fn(),
}));

import { __testing } from "./clubRecommendations";

describe("clubRecommendations recommendation rules", () => {
    it("normaliseert taalvoorkeuren naar OpenLibrary taalcodes", () => {
        expect(__testing.normalizeLanguage("English")).toBe("eng");
        expect(__testing.normalizeLanguage("en")).toBe("eng");
        expect(__testing.normalizeLanguage("Nederlands")).toBe("dut");
        expect(__testing.normalizeLanguage("nl")).toBe("dut");
    });

    it("zet taalcodes om naar leesbare labels voor de recommendation reason", () => {
        expect(__testing.formatLanguageLabel("eng")).toBe("English");
        expect(__testing.formatLanguageLabel("dut")).toBe("Dutch");
        expect(__testing.formatLanguageLabel("spa")).toBe("SPA");
    });

    it("canonicaliseert genres en verwijdert te algemene subjects", () => {
        expect(__testing.canonicalizeSubject("sci-fi")).toBe("science fiction");
        expect(__testing.canonicalizeSubject("love stories")).toBe("romance");
        expect(__testing.canonicalizeSubject("detective and mystery stories")).toBe(
            "mystery"
        );

        expect(__testing.canonicalizeSubject("fiction")).toBeNull();
        expect(__testing.canonicalizeSubject("general")).toBeNull();
        expect(__testing.canonicalizeSubject("")).toBeNull();
    });

    it("maakt fallback subjects vanuit lokale genres", () => {
        const subjects = __testing.fallbackSubjectsFromGenres([
            "Fantasy",
            "SciFi",
            "Young Adult",
            "Love Stories",
            "fiction",
        ]);

        expect(subjects).toContain("fantasy");
        expect(subjects).toContain("science fiction");
        expect(subjects).toContain("young adult");
        expect(subjects).toContain("romance");
        expect(subjects).not.toContain("fiction");
    });

    it("geeft statuswegingen aan persoonlijke boeken", () => {
        expect(__testing.getStatusWeight("finished")).toBe(3.5);
        expect(__testing.getStatusWeight("reading")).toBe(1.5);
        expect(__testing.getStatusWeight("toRead")).toBe(0.9);
        expect(__testing.getStatusWeight("dnf")).toBe(-2);
        expect(__testing.getStatusWeight(null)).toBe(0);
    });

    it("sluit boeken uit die al gelezen, bezig of DNF zijn", () => {
        expect(__testing.shouldExcludeFromRecommendations("finished")).toBe(true);
        expect(__testing.shouldExcludeFromRecommendations("reading")).toBe(true);
        expect(__testing.shouldExcludeFromRecommendations("dnf")).toBe(true);

        expect(__testing.shouldExcludeFromRecommendations("toRead")).toBe(false);
        expect(__testing.shouldExcludeFromRecommendations(null)).toBe(false);
    });

    it("geeft nieuwere boeken een hogere year fit score", () => {
        expect(__testing.getYearFitScore(2024, 2018)).toBe(5);
        expect(__testing.getYearFitScore(2019, 2018)).toBe(4);
        expect(__testing.getYearFitScore(2015, 2018)).toBe(3);
        expect(__testing.getYearFitScore(2008, 2018)).toBe(1);
    });

    it("geeft oude of onwaarschijnlijke jaartallen een negatieve score", () => {
        expect(__testing.getYearFitScore(1998, null)).toBe(-8);
        expect(__testing.getYearFitScore(1490, null)).toBe(-100);
    });

    it("herkent latere delen uit een serie", () => {
        expect(
            __testing.isLikelyLaterSeriesBook({
                title: "The Ballad of Songbirds and Snakes (Book 2)",
            })
        ).toBe(true);

        expect(
            __testing.isLikelyLaterSeriesBook({
                title: "A Fantasy Story Vol. III",
            })
        ).toBe(true);

        expect(
            __testing.isLikelyLaterSeriesBook({
                title: "Dune",
            })
        ).toBe(false);
    });

    it("filtert formats die niet passen bij de boekenclub-aanbevelingen", () => {
        expect(__testing.looksLikeExcludedFormat("Some Manga Story")).toBe(true);
        expect(__testing.looksLikeExcludedFormat("Graphic Novel Edition")).toBe(true);
        expect(__testing.looksLikeExcludedFormat("Romance Book Vol. 2")).toBe(true);

        expect(__testing.looksLikeExcludedFormat("Normal People")).toBe(false);
    });

    it("bouwt een duidelijke recommendation reason met genres, taal, TBR en nieuwere boeken", () => {
        const analysis = {
            memberCount: 4,
            preferredYear: 2018,
            subjectScoreMap: new Map([
                ["fantasy", { score: 8, memberCount: 3 }],
                ["romance", { score: 6, memberCount: 2 }],
            ]),
            languageScoreMap: new Map([
                ["eng", { score: 5, memberCount: 4 }],
            ]),
        };

        const reason = __testing.buildRecommendationReason(
            {
                matchedSubjects: ["romance", "fantasy"],
                matchedLanguages: ["eng"],
                firstPublishYear: 2022,
                tbrMemberCount: 2,
            },
            analysis as never
        );

        expect(reason).toContain("already on 2 members' TBRs");
        expect(reason).toContain("fantasy and romance");
        expect(reason).toContain("English");
        expect(reason).toContain("newer books");
    });

    it("bouwt een recommendation reason voor één matchend genre", () => {
        const analysis = {
            memberCount: 4,
            preferredYear: null,
            subjectScoreMap: new Map([
                ["fantasy", { score: 8, memberCount: 3 }],
            ]),
            languageScoreMap: new Map(),
        };

        const reason = __testing.buildRecommendationReason(
            {
                matchedSubjects: ["fantasy"],
                matchedLanguages: [],
                firstPublishYear: 2019,
                tbrMemberCount: 0,
            },
            analysis as never
        );

        expect(reason).toContain("3/4 members show interest in fantasy");
    });

    it("gebruikt een algemene reason als er geen duidelijke subject match is", () => {
        const analysis = {
            memberCount: 3,
            preferredYear: null,
            subjectScoreMap: new Map(),
            languageScoreMap: new Map(),
        };

        const reason = __testing.buildRecommendationReason(
            {
                matchedSubjects: [],
                matchedLanguages: [],
                firstPublishYear: null,
                tbrMemberCount: 0,
            },
            analysis as never
        );

        expect(reason).toContain("matches your club's reading profile");
    });
});