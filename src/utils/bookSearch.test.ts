import { describe, expect, it } from "vitest";

import {
    createBookSearchVariants,
    getBookSearchScore,
    normalizeBookSearchText,
    rankBookSearchResults,
} from "@/src/utils/bookSearch";

describe("bookSearch", () => {
    it("normaliseert zoektekst", () => {
        expect(normalizeBookSearchText("  Harry   Potter!! ")).toBe("harry potter");
    });

    it("maakt fallback zoekvarianten", () => {
        expect(createBookSearchVariants("Harry Poter")).toEqual([
            "Harry Poter",
            "harry poter",
            "harry",
            "poter",
        ]);
    });

    it("geeft een hogere score aan een bijna-match", () => {
        const harryPotterScore = getBookSearchScore("Hary Potter", {
            id: "/works/OL1W",
            title: "Harry Potter and the Philosopher's Stone",
            author: "J.K. Rowling",
        });

        const hobbitScore = getBookSearchScore("Hary Potter", {
            id: "/works/OL2W",
            title: "The Hobbit",
            author: "J.R.R. Tolkien",
        });

        expect(harryPotterScore).toBeGreaterThan(hobbitScore);
    });

    it("rankt het meest passende boek bovenaan", () => {
        const results = rankBookSearchResults("Hary Potter", [
            {
                id: "/works/OL2W",
                title: "The Hobbit",
                author: "J.R.R. Tolkien",
            },
            {
                id: "/works/OL1W",
                title: "Harry Potter and the Philosopher's Stone",
                author: "J.K. Rowling",
            },
        ]);

        expect(results[0].title).toBe("Harry Potter and the Philosopher's Stone");
    });
});