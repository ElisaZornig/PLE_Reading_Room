import { supabase } from "./supabase";
import { getCurrentSupabaseUserId } from "./supabaseUserBooks";
import { normalizeOpenLibraryWorkId } from "@/src/utils/openLibrary";

export type ClubGenreScore = {
    genre: string;
    score: number;
    memberCount: number;
    reason: string;
};

export type ClubLanguageScore = {
    language: string;
    score: number;
    memberCount: number;
};

export type ClubRecommendation = {
    openLibraryWorkId: string;
    title: string;
    author: string;
    cover: string;
    matchedGenres: string[];
    matchedLanguages: string[];
    score: number;
    reason: string;
    firstPublishYear: number | null;
    description?: string | null;
};

type BookRecord = {
    genres: string[] | null;
    languages: string[] | null;
    open_library_work_id?: string | null;
};

type UserBookWithMetadata = {
    user_id: string;
    status: string | null;
    books: BookRecord | BookRecord[] | null;
};

type ProfilePreference = {
    id: string;
    favorite_genres: string[] | null;
    preferred_languages: string[] | null;
};

type OpenLibraryWorkResponse = {
    subjects?: string[];
    first_publish_date?: string;
    description?: string | { value?: string };
};

type OpenLibrarySearchDoc = {
    key?: string;
    title?: string;
    author_name?: string[];
    cover_i?: number;
    first_publish_year?: number;
    subject?: string[];
    language?: string[];
};

type OpenLibrarySearchResponse = {
    docs?: OpenLibrarySearchDoc[];
    description?: string | { value?: string };
};

type WorkDetails = {
    subjects: string[];
    firstPublishYear: number | null;
};

type MemberProfile = {
    userId: string;
    subjectScores: Map<string, number>;
    subjectBookCounts: Map<string, number>;
    languageScores: Map<string, number>;
    readYears: number[];
    readWorkIds: Set<string>;
};

type ClubContext = {
    clubId: string;
    userIds: string[];
    memberCount: number;
    userBooks: UserBookWithMetadata[];
    profiles: ProfilePreference[];
    existingWorkIds: Set<string>;
};

type ScoreMeta = {
    score: number;
    memberCount: number;
};

type ClubAnalysis = {
    clubId: string;
    memberCount: number;
    subjectScores: ClubGenreScore[];
    languageScores: ClubLanguageScore[];
    subjectScoreMap: Map<string, ScoreMeta>;
    languageScoreMap: Map<string, ScoreMeta>;
    preferredYear: number | null;
    existingWorkIds: Set<string>;
};

type SearchStrategy = {
    subjects: string[];
    language: string | null;
    weight: number;
    label: string;
};

type CandidateAggregate = {
    openLibraryWorkId: string;
    title: string;
    author: string;
    cover: string;
    firstPublishYear: number | null;
    matchedSubjects: Set<string>;
    matchedLanguages: Set<string>;
    strategyWeight: number;
};

function normalizeDescription(
    description: OpenLibraryWorkResponse["description"]
) {
    if (!description) {
        return null;
    }

    if (typeof description === "string") {
        return description.replace(/\s+/g, " ").trim();
    }

    if (typeof description === "object" && typeof description.value === "string") {
        return description.value.replace(/\s+/g, " ").trim();
    }

    return null;
}

function shortenDescription(text: string, maxLength = 160) {
    const clean = text.replace(/\s+/g, " ").trim();

    if (clean.length <= maxLength) {
        return clean;
    }

    return `${clean.slice(0, maxLength).trimEnd()}...`;
}

async function fetchWorkDescription(workId: string) {
    try {
        const response = await fetch(`https://openlibrary.org/works/${workId}.json`);

        if (!response.ok) {
            return null;
        }

        const data = (await response.json()) as OpenLibraryWorkResponse;
        return normalizeDescription(data.description);
    } catch (error) {
        console.log("description fetch failed", workId, error);
        return null;
    }
}

const DEBUG_RECOMMENDATIONS = true;
const CLUB_ANALYSIS_TTL_MS = 60_000;
const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_LANGUAGE = "eng";
const MIN_RECOMMENDATION_YEAR = 2005;


function isValidRecommendationYear(year: number | null) {
    if (!year) {
        return true;
    }

    return year >= MIN_RECOMMENDATION_YEAR && year <= CURRENT_YEAR + 1;
}


const SUBJECT_STOPLIST = new Set([
    "fiction",
    "novel",
    "general",
    "literature",
    "english fiction",
    "juvenile fiction",
    "stories",
    "translations",
    "social life and customs",
    "new york times bestseller",
    "new york times reviewed",
    "bestseller",
    "bestsellers",
    "award winners",
    "prize winners",
    "film tie in",
    "movie tie in",
    "man woman relationships",
]);

const WEAK_STRATEGY_SUBJECTS = new Set([
    "contemporary",
    "magic",
    "fiction psychological",
    "psychological fiction",
    "relationships",
    "families",
    "schools",
    "identity",
    "coming of age",
]);

const SUBJECT_ALIASES: Record<string, string> = {
    scifi: "science fiction",
    "sci fi": "science fiction",
    "sci-fi": "science fiction",
    ya: "young adult",
    "young-adult": "young adult",
    "romantic fantasy": "fantasy romance",
    "fantasy romance": "fantasy romance",
    "historical romance": "historical romance",
    "love stories": "romance",
    "detective and mystery stories": "mystery",
    "thrillers suspense": "thriller",
};

const LOCAL_GENRE_ALIASES: Record<string, string> = {
    fantasy: "fantasy",
    romance: "romance",
    mystery: "mystery",
    thriller: "thriller",
    horror: "horror",
    contemporary: "contemporary",
    literary: "literary fiction",
    classics: "classics",
    nonfiction: "nonfiction",
    biography: "biography",
    memoir: "memoir",
    "young adult": "young adult",
    "science fiction": "science fiction",
    scifi: "science fiction",
    "historical fiction": "historical fiction",
};

const LANGUAGE_ALIASES: Record<string, string> = {
    english: "eng",
    eng: "eng",
    en: "eng",
    dutch: "dut",
    nederlands: "dut",
    dut: "dut",
    nl: "dut",
};

const LANGUAGE_LABELS: Record<string, string> = {
    eng: "English",
    dut: "Dutch",
};

const clubAnalysisCache = new Map<
    string,
    {
        expiresAt: number;
        promise: Promise<ClubAnalysis>;
    }
>();

const workDetailsCache = new Map<string, Promise<WorkDetails>>();

function debugLog(...args: unknown[]) {
    if (DEBUG_RECOMMENDATIONS) {
        console.log("[clubRecommendations]", ...args);
    }
}

function isWeakStrategySubject(subject: string) {
    return WEAK_STRATEGY_SUBJECTS.has(subject);
}

function normalizeValue(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[_/\\-]+/g, " ")
        .replace(/\s+/g, " ");
}

function normalizeLanguage(value: string) {
    const normalized = normalizeValue(value);
    return LANGUAGE_ALIASES[normalized] ?? normalized;
}

function formatLanguageLabel(language: string) {
    const normalized = normalizeLanguage(language);
    return LANGUAGE_LABELS[normalized] ?? normalized.toUpperCase();
}

function canonicalizeSubject(rawValue: string) {
    let value = normalizeValue(rawValue)
        .replace(/\([^)]*\)/g, " ")
        .replace(/[,:;]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    value = SUBJECT_ALIASES[value] ?? value;

    if (!value || value.length < 3) {
        return null;
    }

    if (
        SUBJECT_STOPLIST.has(value)
    ) {
        return null;
    }

    return value;
}

function fallbackSubjectsFromGenres(genres: string[] | null | undefined) {
    const subjectSet = new Set<string>();

    for (const rawGenre of genres ?? []) {
        const normalized = normalizeValue(rawGenre);
        const mapped = LOCAL_GENRE_ALIASES[normalized] ?? normalized;
        const subject = canonicalizeSubject(mapped);

        if (subject) {
            subjectSet.add(subject);
        }
    }

    return [...subjectSet];
}

function getStatusWeight(status: string | null) {
    if (status === "finished") {
        return 3.5;
    }

    if (status === "reading") {
        return 1.5;
    }

    if (status === "toRead") {
        return 0.35;
    }

    return 0;
}

function getBooksObject(
    books: UserBookWithMetadata["books"]
): BookRecord | null {
    if (!books) {
        return null;
    }

    if (Array.isArray(books)) {
        return books[0] ?? null;
    }

    return books;
}

function buildCoverUrl(coverId?: number) {
    if (!coverId) {
        return "";
    }

    return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
}

function getWorkIdFromKey(key?: string) {
    if (!key) {
        return "";
    }

    return key.replace("/works/", "").trim();
}

function parseYear(value: string | null | undefined) {
    if (!value) {
        return null;
    }

    const match = value.match(/\b(1[5-9]\d{2}|20\d{2}|21\d{2})\b/);
    if (!match) {
        return null;
    }

    const year = Number(match[1]);
    return Number.isFinite(year) ? year : null;
}

function isPlausibleYear(year: number | null) {
    if (!year) {
        return true;
    }

    return year >= 1500 && year <= CURRENT_YEAR + 1;
}

function looksLikeExcludedFormat(title: string) {
    const normalized = title.toLowerCase();

    return (
        normalized.includes("manga") ||
        normalized.includes("graphic novel") ||
        normalized.includes("comic") ||
        normalized.includes("vol.") ||
        normalized.includes("volume ") ||
        normalized.includes("porn") ||
        normalized.includes("pornography") ||
        normalized.includes("erotica") ||
        normalized.includes("erotic") ||
        normalized.includes("bdsm")
    );
}

function hasExcludedContentSubjects(subjects: string[]) {
    return subjects.some((subject) => {
        const normalized = subject.toLowerCase();

        return (
            normalized.includes("porn") ||
            normalized.includes("pornography") ||
            normalized.includes("erotica") ||
            normalized.includes("erotic") ||
            normalized.includes("bdsm")
        );
    });
}

function createEmptyMemberProfile(userId: string): MemberProfile {
    return {
        userId,
        subjectScores: new Map(),
        subjectBookCounts: new Map(),
        languageScores: new Map(),
        readYears: [],
        readWorkIds: new Set(),
    };
}

function getOrCreateMemberProfile(
    map: Map<string, MemberProfile>,
    userId: string
) {
    const existing = map.get(userId);
    if (existing) {
        return existing;
    }

    const created = createEmptyMemberProfile(userId);
    map.set(userId, created);
    return created;
}

function addToNumberMap(map: Map<string, number>, key: string, delta: number) {
    map.set(key, (map.get(key) ?? 0) + delta);
}

function median(values: number[]) {
    if (values.length === 0) {
        return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
    }

    return sorted[middle];
}

async function runInChunks<T>(
    items: T[],
    chunkSize: number,
    worker: (item: T) => Promise<void>
) {
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        await Promise.all(chunk.map(worker));
    }
}

async function fetchWorkDetails(workId: string): Promise<WorkDetails> {
    const normalizedWorkId = normalizeOpenLibraryWorkId(workId);

    if (!normalizedWorkId) {
        return {
            subjects: [],
            firstPublishYear: null,
        };
    }

    const cached = workDetailsCache.get(normalizedWorkId);
    if (cached) {
        return cached;
    }

    const promise = (async (): Promise<WorkDetails> => {
        try {
            const response = await fetch(
                `https://openlibrary.org/works/${normalizedWorkId}.json`
            );

            if (!response.ok) {
                return {
                    subjects: [],
                    firstPublishYear: null,
                };
            }

            const data = (await response.json()) as OpenLibraryWorkResponse;
            const subjectSet = new Set<string>();

            for (const rawSubject of data.subjects ?? []) {
                const subject = canonicalizeSubject(rawSubject);
                if (subject) {
                    subjectSet.add(subject);
                }
            }

            return {
                subjects: [...subjectSet].slice(0, 40),
                firstPublishYear: parseYear(data.first_publish_date),
            };
        } catch (error) {
            debugLog("work details fetch failed", normalizedWorkId, error);

            return {
                subjects: [],
                firstPublishYear: null,
            };
        }
    })();

    workDetailsCache.set(normalizedWorkId, promise);
    return promise;
}

async function loadClubContext(clubId: string): Promise<ClubContext> {
    const trimmedClubId = clubId.trim();

    if (!trimmedClubId) {
        throw new Error("No club found.");
    }

    const { data: memberships, error: membershipError } = await supabase
        .from("book_club_members")
        .select("user_id")
        .eq("club_id", trimmedClubId);

    if (membershipError) {
        throw membershipError;
    }

    const userIds = [...new Set((memberships ?? []).map((row) => row.user_id).filter(Boolean))];

    if (userIds.length === 0) {
        return {
            clubId: trimmedClubId,
            userIds: [],
            memberCount: 0,
            userBooks: [],
            profiles: [],
            existingWorkIds: new Set(),
        };
    }

    const [{ data: userBooks, error: userBooksError }, { data: profiles, error: profilesError }] =
        await Promise.all([
            supabase
                .from("user_books")
                .select(`
          user_id,
          status,
          books (
            genres,
            languages,
            open_library_work_id
          )
        `)
                .in("user_id", userIds),
            supabase
                .from("profiles")
                .select("id, favorite_genres, preferred_languages")
                .in("id", userIds),
        ]);

    if (userBooksError) {
        throw userBooksError;
    }

    if (profilesError) {
        throw profilesError;
    }

    const typedUserBooks = (userBooks ?? []) as UserBookWithMetadata[];
    const typedProfiles = (profiles ?? []) as ProfilePreference[];

    const existingWorkIds = new Set<string>();

    for (const row of typedUserBooks) {
        const book = getBooksObject(row.books);
        const workId = book?.open_library_work_id?.trim();

        const normalizedWorkId = normalizeOpenLibraryWorkId(
            book?.open_library_work_id
        );

        if (normalizedWorkId) {
            existingWorkIds.add(normalizedWorkId);
        }
    }

    return {
        clubId: trimmedClubId,
        userIds,
        memberCount: userIds.length,
        userBooks: typedUserBooks,
        profiles: typedProfiles,
        existingWorkIds,
    };
}

async function buildMemberProfiles(context: ClubContext) {
    const memberProfiles = new Map<string, MemberProfile>();

    for (const userId of context.userIds) {
        memberProfiles.set(userId, createEmptyMemberProfile(userId));
    }

    const uniqueWorkIds = [
        ...new Set(
            context.userBooks
                .map((row) => getBooksObject(row.books)?.open_library_work_id?.trim() ?? "")
                .filter(Boolean)
        ),
    ];

    await runInChunks(uniqueWorkIds, 8, async (workId) => {
        await fetchWorkDetails(workId);
    });

    for (const row of context.userBooks) {
        const member = getOrCreateMemberProfile(memberProfiles, row.user_id);
        const weight = getStatusWeight(row.status);

        if (weight <= 0) {
            continue;
        }

        const book = getBooksObject(row.books);

        if (!book) {
            continue;
        }

        for (const rawLanguage of book.languages ?? []) {
            const language = normalizeLanguage(rawLanguage);
            if (!language) {
                continue;
            }

            addToNumberMap(member.languageScores, language, weight);
        }

        const normalizedWorkId = normalizeOpenLibraryWorkId(
            book.open_library_work_id
        );

        if (normalizedWorkId) {
            member.readWorkIds.add(normalizedWorkId);
        }

        const workDetails = normalizedWorkId
            ? await fetchWorkDetails(normalizedWorkId)
            : null;

        const subjects =
            workDetails?.subjects && workDetails.subjects.length > 0
                ? workDetails.subjects
                : fallbackSubjectsFromGenres(book.genres);

        const uniqueSubjects = [...new Set(subjects)].filter(Boolean);

        if (uniqueSubjects.length > 0) {
            const distributedWeight = weight / Math.sqrt(uniqueSubjects.length);

            for (const subject of uniqueSubjects) {
                addToNumberMap(member.subjectScores, subject, distributedWeight);
                addToNumberMap(member.subjectBookCounts, subject, 1);
            }
        }

        if (workDetails?.firstPublishYear && isPlausibleYear(workDetails.firstPublishYear)) {
            member.readYears.push(workDetails.firstPublishYear);
        }
    }

    for (const profile of context.profiles) {
        const member = getOrCreateMemberProfile(memberProfiles, profile.id);

        for (const rawGenre of profile.favorite_genres ?? []) {
            const normalized = normalizeValue(rawGenre);
            const mapped = LOCAL_GENRE_ALIASES[normalized] ?? normalized;
            const subject = canonicalizeSubject(mapped);

            if (!subject) {
                continue;
            }

            addToNumberMap(member.subjectScores, subject, 1.25);
        }

        for (const rawLanguage of profile.preferred_languages ?? []) {
            const language = normalizeLanguage(rawLanguage);

            if (!language) {
                continue;
            }

            addToNumberMap(member.languageScores, language, 1.25);
        }
    }

    return memberProfiles;
}

function buildClubSubjectScores(
    memberProfiles: Map<string, MemberProfile>,
    memberCount: number
) {
    const subjectScoreMap = new Map<string, number>();
    const subjectMemberMap = new Map<string, Set<string>>();

    for (const member of memberProfiles.values()) {
        for (const [subject, score] of member.subjectScores.entries()) {
            addToNumberMap(subjectScoreMap, subject, score);

            if (!subjectMemberMap.has(subject)) {
                subjectMemberMap.set(subject, new Set());
            }

            subjectMemberMap.get(subject)!.add(member.userId);
        }
    }

    const scoreMetaMap = new Map<string, ScoreMeta>();

    const subjectScores = [...subjectScoreMap.entries()]
        .map(([subject, score]) => {
            const coverage = subjectMemberMap.get(subject)?.size ?? 0;

            scoreMetaMap.set(subject, {
                score,
                memberCount: coverage,
            });

            return {
                genre: subject,
                score: Number(score.toFixed(2)),
                memberCount: coverage,
                reason: `Recommended because ${coverage}/${memberCount} members show interest in ${subject}.`,
            } satisfies ClubGenreScore;
        })
        .sort((a, b) => {
            const aRank = a.score + a.memberCount * 2;
            const bRank = b.score + b.memberCount * 2;
            return bRank - aRank;
        });

    return {
        subjectScores,
        subjectScoreMap: scoreMetaMap,
    };
}

function buildClubLanguageScores(
    memberProfiles: Map<string, MemberProfile>
) {
    const languageScoreMap = new Map<string, number>();
    const languageMemberMap = new Map<string, Set<string>>();

    for (const member of memberProfiles.values()) {
        for (const [language, score] of member.languageScores.entries()) {
            addToNumberMap(languageScoreMap, language, score);

            if (!languageMemberMap.has(language)) {
                languageMemberMap.set(language, new Set());
            }

            languageMemberMap.get(language)!.add(member.userId);
        }
    }

    const scoreMetaMap = new Map<string, ScoreMeta>();

    const languageScores = [...languageScoreMap.entries()]
        .map(([language, score]) => {
            const coverage = languageMemberMap.get(language)?.size ?? 0;

            scoreMetaMap.set(language, {
                score,
                memberCount: coverage,
            });

            return {
                language,
                score: Number(score.toFixed(2)),
                memberCount: coverage,
            } satisfies ClubLanguageScore;
        })
        .sort((a, b) => {
            const aRank = a.score + a.memberCount * 2;
            const bRank = b.score + b.memberCount * 2;
            return bRank - aRank;
        });

    return {
        languageScores,
        languageScoreMap: scoreMetaMap,
    };
}

async function computeClubAnalysis(clubId: string): Promise<ClubAnalysis> {
    const context = await loadClubContext(clubId);

    if (context.memberCount === 0) {
        return {
            clubId: context.clubId,
            memberCount: 0,
            subjectScores: [],
            languageScores: [],
            subjectScoreMap: new Map(),
            languageScoreMap: new Map(),
            preferredYear: null,
            existingWorkIds: new Set(),
        };
    }

    const memberProfiles = await buildMemberProfiles(context);
    const { subjectScores, subjectScoreMap } = buildClubSubjectScores(
        memberProfiles,
        context.memberCount
    );
    const { languageScores, languageScoreMap } =
        buildClubLanguageScores(memberProfiles);

    const allYears = [...memberProfiles.values()].flatMap((member) =>
        member.readYears.filter(isPlausibleYear)
    );

    const preferredYear = median(allYears);

    debugLog(
        "club analysis",
        {
            clubId: context.clubId,
            memberCount: context.memberCount,
            preferredYear,
            topSubjects: subjectScores.slice(0, 8),
            topLanguages: languageScores.slice(0, 5),
            existingWorkCount: context.existingWorkIds.size,
        }
    );

    return {
        clubId: context.clubId,
        memberCount: context.memberCount,
        subjectScores,
        languageScores,
        subjectScoreMap,
        languageScoreMap,
        preferredYear,
        existingWorkIds: context.existingWorkIds,
    };
}

async function getClubAnalysis(clubId: string) {
    const trimmedClubId = clubId.trim();

    const cached = clubAnalysisCache.get(trimmedClubId);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.promise;
    }

    const promise = computeClubAnalysis(trimmedClubId).catch((error) => {
        clubAnalysisCache.delete(trimmedClubId);
        throw error;
    });

    clubAnalysisCache.set(trimmedClubId, {
        expiresAt: Date.now() + CLUB_ANALYSIS_TTL_MS,
        promise,
    });

    return promise;
}

function buildSearchStrategies(analysis: ClubAnalysis) {
    const rankedSubjects = analysis.subjectScores.map((item) => item.genre);

    const strongSubjects = rankedSubjects.filter(
        (subject) => !isWeakStrategySubject(subject)
    );

    const weakSubjects = rankedSubjects.filter((subject) =>
        isWeakStrategySubject(subject)
    );

    const topSubjects = [...strongSubjects, ...weakSubjects].slice(0, 4);
    const topLanguages = analysis.languageScores.slice(0, 2).map((item) => item.language);

    const primaryLanguage = topLanguages[0] ?? DEFAULT_LANGUAGE;
    const secondaryLanguage =
        topLanguages[1] && topLanguages[1] !== primaryLanguage
            ? topLanguages[1]
            : null;

    const strategyMap = new Map<string, SearchStrategy>();

    function pushStrategy(subjects: string[], language: string | null, weight: number) {
        const cleanedSubjects = [...new Set(subjects)].filter(Boolean);

        if (cleanedSubjects.length === 0) {
            return;
        }

        const weakCount = cleanedSubjects.filter(isWeakStrategySubject).length;

        // skip strategies that are only weak / vague subjects
        if (weakCount === cleanedSubjects.length) {
            return;
        }

        const label = `${cleanedSubjects.join(" + ")} | ${language ?? "any"}`;
        if (strategyMap.has(label)) {
            return;
        }

        strategyMap.set(label, {
            subjects: cleanedSubjects,
            language,
            weight,
            label,
        });
    }

    if (topSubjects[0]) pushStrategy([topSubjects[0]], primaryLanguage, 1.0);
    if (topSubjects[1]) pushStrategy([topSubjects[1]], primaryLanguage, 0.9);
    if (topSubjects[2]) pushStrategy([topSubjects[2]], primaryLanguage, 0.8);
    if (topSubjects[3]) pushStrategy([topSubjects[3]], primaryLanguage, 0.7);

    if (topSubjects[0] && topSubjects[1]) {
        pushStrategy([topSubjects[0], topSubjects[1]], primaryLanguage, 1.45);
    }

    if (topSubjects[0] && topSubjects[2]) {
        pushStrategy([topSubjects[0], topSubjects[2]], primaryLanguage, 1.2);
    }

    if (topSubjects[1] && topSubjects[2]) {
        pushStrategy([topSubjects[1], topSubjects[2]], primaryLanguage, 1.05);
    }

    if (secondaryLanguage && topSubjects[0]) {
        pushStrategy([topSubjects[0]], secondaryLanguage, 0.65);
    }

    return [...strategyMap.values()].slice(0, 7);
}

async function searchOpenLibrary(
    subjects: string[],
    language: string | null,
    limit: number
) {
    const resolvedLanguage = language ?? "eng";

    const queryParts = [
        ...subjects.map((subject) => `subject:"${subject}"`),
        `language:${resolvedLanguage}`,
        `readinglog_count:[25 TO *]`,
        `ratings_count:[5 TO *]`,
        `-subject:manga`,
        `-subject:comics`,
        `-subject:"graphic novels"`,
    ];

    const params = new URLSearchParams({
        q: queryParts.join(" "),
        fields:
            "key,title,author_name,cover_i,first_publish_year,subject,language,readinglog_count,ratings_count",
        limit: String(limit),
    });

    const response = await fetch(
        `https://openlibrary.org/search.json?${params.toString()}`
    );

    if (!response.ok) {
        throw new Error(
            `Failed to fetch recommendations for ${subjects.join(", ")} / ${resolvedLanguage}.`
        );
    }

    const data = (await response.json()) as OpenLibrarySearchResponse;
    return data.docs ?? [];
}

async function fetchSearchCandidates(
    strategy: SearchStrategy,
    limit = 40
) {
    const primaryResults = await searchOpenLibrary(
        strategy.subjects,
        strategy.language,
        limit
    );

    if (primaryResults.length > 0 || !strategy.language) {
        return primaryResults;
    }

    debugLog("fallback search without language", strategy.label);

    return searchOpenLibrary(strategy.subjects, null, limit);
}

function getDocSubjects(doc: OpenLibrarySearchDoc) {
    const set = new Set<string>();

    for (const rawSubject of doc.subject ?? []) {
        const subject = canonicalizeSubject(rawSubject);
        if (subject) {
            set.add(subject);
        }
    }

    return [...set];
}

function getDocLanguages(doc: OpenLibrarySearchDoc) {
    const set = new Set<string>();

    for (const rawLanguage of doc.language ?? []) {
        const language = normalizeLanguage(rawLanguage);
        if (language) {
            set.add(language);
        }
    }

    return [...set];
}

function getYearFitScore(
    firstPublishYear: number | null,
    preferredYear: number | null
) {
    if (!firstPublishYear) {
        return 0;
    }

    if (!isPlausibleYear(firstPublishYear)) {
        return -100;
    }

    if (!isValidRecommendationYear(firstPublishYear)) {
        return -8;
    }

    // General recency bonus
    if (firstPublishYear >= 2021) return 5;
    if (firstPublishYear >= 2018) return 4;
    if (firstPublishYear >= 2014) return 3;
    if (firstPublishYear >= 2010) return 2;
    if (firstPublishYear >= 2005) return 1;

    if (!preferredYear) {
        return 0;
    }

    const distance = Math.abs(firstPublishYear - preferredYear);

    if (distance <= 5) return 3;
    if (distance <= 10) return 2;
    if (distance <= 15) return 1;

    return 0;
}

function buildRecommendationReason(
    candidate: {
        matchedSubjects: string[];
        matchedLanguages: string[];
        firstPublishYear: number | null;
    },
    analysis: ClubAnalysis
) {
    const sortedSubjects = [...candidate.matchedSubjects].sort((a, b) => {
        const aScore = analysis.subjectScoreMap.get(a)?.score ?? 0;
        const bScore = analysis.subjectScoreMap.get(b)?.score ?? 0;
        return bScore - aScore;
    });

    const primarySubjects = sortedSubjects.slice(0, 2);
    const reasonParts: string[] = [];

    if (primarySubjects.length >= 2) {
        reasonParts.push(
            `Recommended because your club overlaps on ${primarySubjects[0]} and ${primarySubjects[1]}.`
        );
    } else if (primarySubjects.length === 1) {
        const memberCoverage =
            analysis.subjectScoreMap.get(primarySubjects[0])?.memberCount ?? 0;

        reasonParts.push(
            `Recommended because ${memberCoverage}/${analysis.memberCount} members show interest in ${primarySubjects[0]}.`
        );
    } else {
        reasonParts.push(`Recommended because it matches your club's reading profile.`);
    }

    if (candidate.matchedLanguages.length > 0) {
        reasonParts.push(
            `It also fits ${candidate.matchedLanguages
                .map(formatLanguageLabel)
                .join(" and ")} reading preferences.`
        );
    }

    if (
        candidate.firstPublishYear &&
        analysis.preferredYear &&
        candidate.firstPublishYear >= analysis.preferredYear - 10
    ) {
        reasonParts.push(`It also fits the club's preference for newer books.`);
    }

    return reasonParts.join(" ");
}

export async function generateClubGenreScores(input: {
    clubId: string;
}): Promise<ClubGenreScore[]> {
    const analysis = await getClubAnalysis(input.clubId);
    return analysis.subjectScores;
}

export async function generateClubLanguageScores(input: {
    clubId: string;
}): Promise<ClubLanguageScore[]> {
    const analysis = await getClubAnalysis(input.clubId);
    return analysis.languageScores;
}

export async function generateClubRecommendations(input: {
    clubId: string;
    limit?: number;
    excludeWorkIds?: string[];
}): Promise<ClubRecommendation[]> {
    const clubId = input.clubId.trim();
    const limit = input.limit ?? 5;
    const excludedWorkIds = new Set(input.excludeWorkIds ?? []);

    if (!clubId) {
        throw new Error("No club found.");
    }

    const analysis = await getClubAnalysis(clubId);

    if (analysis.subjectScores.length === 0) {
        debugLog("no subject scores available");
        return [];
    }

    const strategies = buildSearchStrategies(analysis);
    const clubSubjectSet = new Set(analysis.subjectScores.map((item) => item.genre));
    const preferredLanguageSet = new Set(
        analysis.languageScores.length > 0
            ? analysis.languageScores.map((item) => item.language)
            : [DEFAULT_LANGUAGE]
    );

    debugLog("strategies", strategies);

    const candidateMap = new Map<string, CandidateAggregate>();

    for (const strategy of strategies) {

        const docs = await fetchSearchCandidates(strategy, 40);

        debugLog("strategy results", strategy.label, docs.length);

        for (const doc of docs) {
            const openLibraryWorkId = getWorkIdFromKey(doc.key);
            const title = doc.title ?? "Untitled";
            const firstPublishYear = doc.first_publish_year ?? null;

            if (!openLibraryWorkId) {
                continue;
            }

            if (analysis.existingWorkIds.has(openLibraryWorkId)) {
                continue;
            }

            if (looksLikeExcludedFormat(title)) {
                continue;
            }

            if (!isValidRecommendationYear(firstPublishYear)) {
                continue;
            }

            if (excludedWorkIds.has(openLibraryWorkId)) {
                continue;
            }

            if (!isPlausibleYear(firstPublishYear)) {
                continue;
            }

            const docSubjects = getDocSubjects(doc);
            if (hasExcludedContentSubjects(docSubjects)) {
                continue;
            }
            const matchedSubjects = docSubjects.filter((subject) =>
                clubSubjectSet.has(subject)
            );

            const resolvedSubjects =
                matchedSubjects.length > 0
                    ? matchedSubjects
                    : strategy.subjects.filter((subject) => clubSubjectSet.has(subject));

            if (resolvedSubjects.length === 0) {
                continue;
            }

            const docLanguages = getDocLanguages(doc);
            const matchedLanguages = docLanguages.filter((language) =>
                preferredLanguageSet.has(language)
            );

            let aggregate = candidateMap.get(openLibraryWorkId);

            if (!aggregate) {
                aggregate = {
                    openLibraryWorkId,
                    title,
                    author: doc.author_name?.[0] ?? "Unknown author",
                    cover: buildCoverUrl(doc.cover_i),
                    firstPublishYear,
                    matchedSubjects: new Set(),
                    matchedLanguages: new Set(),
                    strategyWeight: 0,
                };

                candidateMap.set(openLibraryWorkId, aggregate);
            }

            for (const subject of resolvedSubjects) {
                aggregate.matchedSubjects.add(subject);
            }

            for (const language of matchedLanguages) {
                aggregate.matchedLanguages.add(language);
            }

            aggregate.strategyWeight += strategy.weight;
        }
    }

    debugLog("candidate count before ranking", candidateMap.size);

    const ranked = [...candidateMap.values()]
        .map((candidate) => {
            const matchedSubjects = [...candidate.matchedSubjects].sort((a, b) => {
                const aScore = analysis.subjectScoreMap.get(a)?.score ?? 0;
                const bScore = analysis.subjectScoreMap.get(b)?.score ?? 0;
                return bScore - aScore;
            });

            const matchedLanguages = [...candidate.matchedLanguages].sort((a, b) => {
                const aScore = analysis.languageScoreMap.get(a)?.score ?? 0;
                const bScore = analysis.languageScoreMap.get(b)?.score ?? 0;
                return bScore - aScore;
            });

            const subjectScore = matchedSubjects.reduce((total, subject) => {
                return total + (analysis.subjectScoreMap.get(subject)?.score ?? 0);
            }, 0);

            const memberCoverageScore = matchedSubjects.reduce((total, subject) => {
                return total + (analysis.subjectScoreMap.get(subject)?.memberCount ?? 0);
            }, 0);

            const languageScore = matchedLanguages.reduce((total, language) => {
                const meta = analysis.languageScoreMap.get(language);
                return total + (meta?.score ?? 0) * 0.6 + (meta?.memberCount ?? 0) * 1.5;
            }, 0);

            const yearFitScore = getYearFitScore(
                candidate.firstPublishYear,
                analysis.preferredYear
            );

            const coverBonus = candidate.cover ? 0.4 : 0;

            const score =
                candidate.strategyWeight * 8 +
                subjectScore * 3 +
                memberCoverageScore * 1.75 +
                languageScore +
                yearFitScore +
                coverBonus;

            return {
                openLibraryWorkId: candidate.openLibraryWorkId,
                title: candidate.title,
                author: candidate.author,
                cover: candidate.cover,
                matchedGenres: matchedSubjects.slice(0, 3),
                matchedLanguages,
                score: Number(score.toFixed(2)),
                reason: buildRecommendationReason(
                    {
                        matchedSubjects,
                        matchedLanguages,
                        firstPublishYear: candidate.firstPublishYear,
                    },
                    analysis
                ),
                firstPublishYear: candidate.firstPublishYear,
            } satisfies ClubRecommendation;
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    debugLog("ranked recommendations", ranked);

    const enriched = await Promise.all(
        ranked.map(async (item) => ({
            ...item,
            description: await fetchWorkDescription(item.openLibraryWorkId),
        }))
    );

    return enriched;
}

export async function addRecommendationToClubShortlist(input: {
    clubId: string;
    recommendation: ClubRecommendation;
}) {
    const userId = await getCurrentSupabaseUserId();
    const clubId = input.clubId.trim();
    const recommendation = input.recommendation;

    if (!clubId) {
        throw new Error("No club found.");
    }

    if (!recommendation.openLibraryWorkId) {
        throw new Error("No recommendation found.");
    }

    const { data: existingBook, error: existingBookError } = await supabase
        .from("books")
        .select("id")
        .eq("open_library_work_id", recommendation.openLibraryWorkId)
        .maybeSingle();

    if (existingBookError) {
        throw existingBookError;
    }

    let bookId = existingBook?.id ?? null;

    if (!bookId) {
        const { data: insertedBook, error: insertBookError } = await supabase
            .from("books")
            .insert({
                open_library_work_id: recommendation.openLibraryWorkId,
                title: recommendation.title,
                author: recommendation.author,
                cover_url: recommendation.cover || null,
                genres: recommendation.matchedGenres,
                languages: recommendation.matchedLanguages,
            })
            .select("id")
            .single();

        if (insertBookError) {
            throw insertBookError;
        }

        bookId = insertedBook.id;
    }

    const { data: existingOption, error: existingOptionError } = await supabase
        .from("club_book_options")
        .select("id")
        .eq("club_id", clubId)
        .eq("book_id", bookId)
        .maybeSingle();

    if (existingOptionError) {
        throw existingOptionError;
    }

    if (existingOption) {
        const { data, error } = await supabase
            .from("club_book_options")
            .update({
                status: "shortlisted",
            })
            .eq("id", existingOption.id)
            .select("id")
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    const { data, error } = await supabase
        .from("club_book_options")
        .insert({
            club_id: clubId,
            book_id: bookId,
            added_by: userId,
            source: "algorithm",
            reason: recommendation.reason,
            status: "shortlisted",
        })
        .select("id")
        .single();

    if (error) {
        throw error;
    }

    return data;
}

export function invalidateClubRecommendationCache(clubId?: string) {
    if (clubId) {
        clubAnalysisCache.delete(clubId.trim());
        return;
    }

    clubAnalysisCache.clear();
}

