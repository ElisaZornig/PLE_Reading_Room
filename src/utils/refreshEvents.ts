export type RefreshKey =
    | "home"
    | "books"
    | "club"
    | "discussion"
    | "recommendations";

type Listener = () => void;

const listeners: Partial<Record<RefreshKey, Set<Listener>>> = {};

export function subscribeToRefresh(key: RefreshKey, listener: Listener) {
    if (!listeners[key]) {
        listeners[key] = new Set();
    }

    listeners[key]!.add(listener);

    return () => {
        listeners[key]?.delete(listener);
    };
}

export function triggerRefresh(...keys: RefreshKey[]) {
    keys.forEach((key) => {
        listeners[key]?.forEach((listener) => listener());
    });
}