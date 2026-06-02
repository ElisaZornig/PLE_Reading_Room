import { describe, expect, it } from "vitest";
import { getMonthlyReadingStats } from "./monthlyReadingStats";
import { Book } from "@/src/types/book";

const referenceDate = new Date("2026-06-15T12:00:00.000Z");

function makeBook(overrides: Partial<Book>): Book {
    return {
        id: "book-1",
        title: "Test book",
        author: "Test author",
        status: "toRead",
        ...overrides,
    };
}

describe("getMonthlyReadingStats", () => {
    it("counts finished books updated in the selected month", () => {
        const books = [
            makeBook({
                id: "1",
                status: "finished",
                updatedAt: "2026-06-02T10:00:00.000Z",
            }),
            makeBook({
                id: "2",
                status: "finished",
                updatedAt: "2026-05-20T10:00:00.000Z",
            }),
        ];

        const result = getMonthlyReadingStats(books, referenceDate);

        expect(result.finishedCount).toBe(1);
    });

    it("counts all currently reading books", () => {
        const books = [
            makeBook({ id: "1", status: "reading" }),
            makeBook({ id: "2", status: "reading" }),
            makeBook({ id: "3", status: "finished" }),
        ];

        const result = getMonthlyReadingStats(books, referenceDate);

        expect(result.readingCount).toBe(2);
    });

    it("returns the most used genre from books updated this month", () => {
        const books = [
            makeBook({
                id: "1",
                updatedAt: "2026-06-02T10:00:00.000Z",
                genres: ["fantasy", "romance"],
            }),
            makeBook({
                id: "2",
                updatedAt: "2026-06-05T10:00:00.000Z",
                genres: ["Fantasy"],
            }),
            makeBook({
                id: "3",
                updatedAt: "2026-05-05T10:00:00.000Z",
                genres: ["thriller"],
            }),
        ];

        const result = getMonthlyReadingStats(books, referenceDate);

        expect(result.topGenre).toBe("Fantasy");
    });

    it("returns null when no genre is available", () => {
        const books = [
            makeBook({
                id: "1",
                updatedAt: "2026-06-02T10:00:00.000Z",
                genres: [],
            }),
        ];

        const result = getMonthlyReadingStats(books, referenceDate);

        expect(result.topGenre).toBeNull();
    });
});