import { describe, expect, it } from "vitest";
import {
    normalizeOpenLibraryWorkId,
    isValidOpenLibraryWorkId,
    getOpenLibraryWorkId,
} from "./openLibrary";

describe("OpenLibrary utils", () => {
    it("normaliseert een work id uit een OpenLibrary path", () => {
        expect(normalizeOpenLibraryWorkId("/works/OL82563W")).toBe("OL82563W");
    });

    it("normaliseert een volledige OpenLibrary URL", () => {
        expect(
            normalizeOpenLibraryWorkId("https://openlibrary.org/works/OL82563W")
        ).toBe("OL82563W");
    });

    it("zet kleine letters om naar hoofdletters", () => {
        expect(normalizeOpenLibraryWorkId("ol82563w")).toBe("OL82563W");
    });

    it("geeft null terug bij een lege of ongeldige waarde", () => {
        expect(normalizeOpenLibraryWorkId("")).toBeNull();
        expect(normalizeOpenLibraryWorkId("geen-id")).toBeNull();
        expect(normalizeOpenLibraryWorkId("/books/OL123M")).toBeNull();
    });

    it("controleert of een waarde een geldige OpenLibrary work id is", () => {
        expect(isValidOpenLibraryWorkId("/works/OL82563W")).toBe(true);
        expect(isValidOpenLibraryWorkId("geen-id")).toBe(false);
    });

    it("haalt het work id uit een OpenLibrary path", () => {
        expect(getOpenLibraryWorkId("/works/OL82563W")).toBe("OL82563W");
    });
});