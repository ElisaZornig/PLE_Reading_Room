import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { searchBooks } from "./booksApi";

describe("searchBooks", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("geeft een lege lijst terug bij een lege zoekopdracht", async () => {
        const result = await searchBooks("   ");

        expect(result).toEqual([]);
        expect(fetch).not.toHaveBeenCalled();
    });

    it("mapt OpenLibrary resultaten naar het interne boekmodel", async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                docs: [
                    {
                        key: "/works/OL82563W",
                        title: "Pride and Prejudice",
                        author_name: ["Jane Austen"],
                        cover_i: 12345,
                        first_publish_year: 1813,
                    },
                ],
            }),
        } as Response);

        const result = await searchBooks("pride");

        expect(result).toEqual([
            {
                id: "/works/OL82563W",
                title: "Pride and Prejudice",
                author: "Jane Austen",
                cover: "https://covers.openlibrary.org/b/id/12345-M.jpg",
                firstPublishYear: 1813,
            },
        ]);
    });

    it("gebruikt fallbacks als auteur of cover ontbreekt", async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                docs: [
                    {
                        key: "/works/OL123W",
                        title: "Unknown Book",
                    },
                ],
            }),
        } as Response);

        const result = await searchBooks("unknown");

        expect(result[0]).toMatchObject({
            id: "/works/OL123W",
            title: "Unknown Book",
            author: "Onbekende auteur",
            cover: undefined,
        });
    });

    it("gooit een foutmelding als OpenLibrary niet goed reageert", async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: false,
        } as Response);

        await expect(searchBooks("test")).rejects.toThrow(
            "Zoeken naar boeken is mislukt."
        );
    });
});