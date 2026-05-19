import { describe, expect, it, vi } from "vitest";
import { subscribeToRefresh, triggerRefresh } from "./refreshEvents";

describe("refreshEvents", () => {
    it("roept listeners aan voor de juiste refresh key", () => {
        const booksListener = vi.fn();
        const homeListener = vi.fn();

        subscribeToRefresh("books", booksListener);
        subscribeToRefresh("home", homeListener);

        triggerRefresh("books");

        expect(booksListener).toHaveBeenCalledTimes(1);
        expect(homeListener).not.toHaveBeenCalled();
    });

    it("kan een listener weer uitschrijven", () => {
        const listener = vi.fn();

        const unsubscribe = subscribeToRefresh("club", listener);
        unsubscribe();

        triggerRefresh("club");

        expect(listener).not.toHaveBeenCalled();
    });
});