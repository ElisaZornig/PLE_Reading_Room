# The Reading Room / Book Club App

An Expo / React Native MVP for personal book tracking and physical book clubs. The app helps readers track their own books and helps book clubs choose a next book, share progress and prepare discussions in one place.

## What this project does

The MVP has two connected parts:

1. **Personal book tracking**: users can search for books, save them to their personal list, set a reading status, update progress, add a rating and write a short private note or review.
2. **Book club support**: users can create or join a club, view club recommendations, build a shortlist, vote or spin a wheel, set a current club book, share progress, add discussion questions and plan a simple meeting.

The main value is not just tracking books. The app is meant to make the shared book club process easier: choosing, reading, preparing and meeting.

## Tech stack

| Part | Choice |
| --- | --- |
| Frontend | Expo / React Native |
| Routing | Expo Router |
| Language | TypeScript |
| Backend/database | Supabase |
| External book data | Open Library API |
| Styling | Central theme files in `src/theme/` and shared styles in `src/styles/` |
| Localization | i18n files in `src/i18n/` for Dutch and English |
| Deployment | Expo web export + GitHub Pages workflow |

## Prerequisites

Before installing the project, make sure you have:

- Node.js 20 or newer recommended. The GitHub Pages workflow uses Node 20.
- npm.
- Expo Go if you want to test on a physical phone.

## Installation

Clone the repository and install the dependencies:

```bash
git clone <repository-url>
cd Boekenclub-app
npm install
```

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Fill in the Supabase values:

```bash
EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

The Open Library API does not need an API key in this MVP.

> Do not commit real `.env` files. The repository should only contain `.env.example`.

## Running the app

Start the development server:

```bash
npm run start
```

Run directly for web:

```bash
npm run web
```

Run directly for iOS or Android:

```bash
npm run ios
npm run android
```

Run linting:

```bash
npm run lint
```

## Project structure

```text
app/
  (tabs)/
    _layout.tsx             Tab navigation
    index.tsx               Home/dashboard
    books.tsx               Personal book list
    club.tsx                Club dashboard
  _layout.tsx               App root layout
  add-book.tsx              Search and add a book
  auth.tsx                  Log in
  sign-up.tsx               Sign up
  book/[id].tsx             Book detail/progress page
  create-club.tsx           Create a club
  join-club.tsx             Join a club
  recommendations.tsx       Club recommendations
  choose-next-book.tsx      Shortlist and selection flow
  spin-the-wheel.tsx        Wheel for choosing a book
  set-current-book.tsx      Set current club book
  discussion.tsx            Discussion questions and replies
  plan-meeting.tsx          Plan a meeting

src/
  components/               Reusable UI components
  data/                     Mock or temporary data
  i18n/                     Dutch and English translations
  services/                 Supabase, API and business logic
  styles/                   Reusable page styles
  theme/                    Colors, spacing, typography and theme values
  types/                    TypeScript types
  utils/                    Small helper functions
```

## Important files

| File | Purpose |
| --- | --- |
| `src/services/supabase.ts` | Creates the Supabase client and handles platform-specific auth storage. |
| `src/services/booksApi.ts` | Searches books through the Open Library API and maps raw book data. |
| `src/services/clubRecommendations.ts` | Contains the rule-based recommendation logic for clubs. |
| `src/services/supabaseBooks.ts` | Saves and retrieves book metadata in Supabase. |
| `src/services/supabaseUserBooks.ts` | Manages personal book lists, status, progress, rating and notes. |
| `src/services/supabaseClub.ts` | Manages clubs, members, current book, meetings and discussion. |
| `src/services/supabaseClubShortlist.ts` | Manages shortlist items and the next-book selection flow. |
| `src/utils/appAlert.ts` | Handles alerts differently for web and mobile. |
| `src/utils/openLibrary.ts` | Normalizes Open Library work IDs. |
| `src/theme/` | Stores shared visual choices so styling stays consistent. |
| `.github/workflows/deploy-web.yml` | Builds the web version and deploys it to GitHub Pages. |
| `app.json` | Expo configuration, including static web output and GitHub Pages base URL. |

## Database tables used by the app

The app expects these Supabase tables:

- `profiles`
- `books`
- `user_books`
- `book_clubs`
- `book_club_members`
- `club_book_options`
- `club_meetings`
- `discussion_questions`
- `discussion_replies`

There is a database.example.sql you can run in Supabase

## Coding standards

- Components use `PascalCase`, for example `BookCover` and `ScreenTopBar`.
- Functions and variables use `camelCase`, for example `handleSearch` and `loadBooks`.
- Route files in `app/` use clear screen names, for example `add-book.tsx` and `plan-meeting.tsx`.
- Data fetching and saving belongs in `src/services/`.
- Shared types belong in `src/types/`.
- Shared styling belongs in `src/theme/` or `src/styles/`.
- Text that appears in the UI should be added to `src/i18n/nl.ts` and `src/i18n/en.ts`.
- Keep platform differences in mind. Web, iOS and Android do not always handle alerts, inputs, keyboards and storage in the same way.
