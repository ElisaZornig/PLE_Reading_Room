export function normalizeBookDescription(input: unknown, maxLength = 220) {
    let rawText = "";

    if (typeof input === "string") {
        rawText = input;
    } else if (
        typeof input === "object" &&
        input !== null &&
        "value" in input &&
        typeof input.value === "string"
    ) {
        rawText = input.value;
    }

    const cleaned = rawText
        .replace(/\s+/g, " ")
        .replace(/\[[^\]]*\]/g, "")
        .trim();

    if (!cleaned) {
        return "";
    }

    if (cleaned.length <= maxLength) {
        return cleaned;
    }

    return `${cleaned.slice(0, maxLength).trim()}...`;
}