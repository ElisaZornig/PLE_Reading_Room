# Read The Room

Read The Room is an Expo / React Native MVP for personal book tracking and physical book clubs. The app helps readers track their own books and helps book clubs choose a next book, share progress and prepare discussions in one place.

## What this project does

The MVP has two connected parts:

1. **Personal book tracking**
   Users can search for books, save them to their personal list, set a reading status, update progress, add a rating and write a short private note or review.

2. **Book club support**
   Users can create or join a club, view club recommendations, build a shortlist, vote or spin a wheel, set a current club book, share progress, add discussion questions and plan a simple meeting.

The main value is not just tracking books. The app is meant to make the shared book club process easier: choosing, reading, preparing and meeting.


## Tech stack

| Part               | Choice                                                                 |
| ------------------ | ---------------------------------------------------------------------- |
| Frontend           | Expo / React Native                                                    |
| Routing            | Expo Router                                                            |
| Language           | TypeScript                                                             |
| Backend/database   | Supabase                                                               |
| External book data | Open Library API                                                       |
| Styling            | Central theme files in `src/theme/` and shared styles in `src/styles/` |
| Localization       | i18n files in `src/i18n/` for Dutch and English                        |
| Testing            | Vitest for technical logic                                             |
| Deployment         | Expo web export + GitHub Pages workflow                                |

## Prerequisites

Before installing the project, make sure you have:

* Node.js 20 or newer recommended. The GitHub Pages workflow uses Node 20.
* npm.
* Expo Go if you want to test on a physical phone.
* A Supabase project.

## Installation

Clone the repository and install the dependencies:

```bash
git clone <repository-url>
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

## Database setup

The app uses Supabase for authentication, user data and book club data.

To set up the database:

1. Create a Supabase project.
2. Open the SQL editor in Supabase.
3. Run the SQL from `database.example.sql`.
4. Add the Supabase project URL and anon key to your `.env` file.
5. Check that the required tables exist.
6. Check that Row Level Security policies are enabled where needed.

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

Run automated tests:

```bash
npm run test
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

| File                                    | Purpose                                                                    |
| --------------------------------------- | -------------------------------------------------------------------------- |
| `src/services/supabase.ts`              | Creates the Supabase client and handles platform-specific auth storage.    |
| `src/services/booksApi.ts`              | Searches books through the Open Library API and maps raw book data.        |
| `src/services/clubRecommendations.ts`   | Contains the rule-based recommendation logic for clubs.                    |
| `src/services/supabaseBooks.ts`         | Saves and retrieves book metadata in Supabase.                             |
| `src/services/supabaseUserBooks.ts`     | Manages personal book lists, status, progress, rating and notes.           |
| `src/services/supabaseClub.ts`          | Manages clubs, members, current book, meetings and discussion.             |
| `src/services/supabaseClubShortlist.ts` | Manages shortlist items and the next-book selection flow.                  |
| `src/utils/appAlert.ts`                 | Handles alerts differently for web and mobile.                             |
| `src/utils/openLibrary.ts`              | Normalizes Open Library work IDs.                                          |
| `src/theme/`                            | Stores shared visual choices so styling stays consistent.                  |
| `src/i18n/`                             | Stores Dutch and English UI text.                                          |
| `.github/workflows/deploy-web.yml`      | Builds the web version and deploys it to GitHub Pages.                     |
| `app.json`                              | Expo configuration, including static web output and GitHub Pages base URL. |

## Coding standards

These standards are used to keep the project maintainable and easier to transfer to another developer.

* Components use `PascalCase`, for example `BookCover` and `ScreenTopBar`.
* Functions and variables use `camelCase`, for example `handleSearch` and `loadBooks`.
* Route files in `app/` use clear screen names, for example `add-book.tsx` and `plan-meeting.tsx`.
* Data fetching and saving belongs in `src/services/`.
* Shared types belong in `src/types/`.
* Shared styling belongs in `src/theme/` or `src/styles/`.
* Text that appears in the UI should be added to `src/i18n/nl.ts` and `src/i18n/en.ts`.
* Reusable UI should be placed in `src/components/`.
* Platform differences should be handled deliberately. Web, iOS and Android do not always handle alerts, inputs, keyboards and storage in the same way.
* Important logic should be kept separate from screen files where possible, so it can be tested and changed more easily.

## Design and theme structure

The app uses central theme files to keep styling consistent.

This makes it easier to:

* adjust colors in one place;
* support light and dark themes;
* keep spacing and typography consistent;
* avoid hardcoded styling across many files.

## Localization

The app uses i18n files for Dutch and English.

This makes the app easier to maintain because UI text is not spread randomly through screen files. It also supports the international direction of the product.

## Deployment

The web version can be built and deployed through the GitHub Pages workflow.

The deployment workflow is stored in:

```text
.github/workflows/deploy-web.yml
```

The Expo configuration is stored in:

```text
app.json
```

When changing routes or deployment settings, check both the Expo configuration and the GitHub Pages workflow.

## Known limitations

This project is an MVP and not a fully finished production app yet.

Known limitations:

* Open Library data can be incomplete, for example missing covers, descriptions or author data.
* Web, iOS and Android can behave differently for alerts, inputs, keyboard behavior and storage.
* The recommendation system is rule-based and intentionally not a complex AI/ML model.
* The app does not include a public social feed, chat system, calendar sync or advanced notification system.
* The app has not yet been tested with a book club over a full reading cycle.
* Some future features, such as advanced privacy settings, better book data and longer book club testing, are part of the backlog.
* The MVP is not yet optimized for large-scale production use.

## Suggested next steps

Possible next steps for development:

* Test the app with a real book club over a full reading cycle.
* Improve privacy settings for personal notes, reviews and club progress.
* Improve recommendation variety and explainability.
* Research a stronger or more complete book data API.
* Improve performance and caching for book search and recommendations.
* Add more automated tests for recommendation logic and data validation.
* Prepare a production-ready app store release.
* Explore a club-first payment model or paid pilot with a library, school or reading organization.

## Transfer notes

For a new developer, the best starting points are:

1. Read this README.
2. Set up Supabase and run `database.example.sql`.
3. Add the required `.env` values.
4. Run the app locally.
5. Read the important files listed above.
6. Check the known limitations and backlog before adding new features.
7. Run the tests before and after changing technical logic.

The project is structured so that the main flows can be understood separately:

* Personal tracking
* Club dashboard
* Recommendations
* Shortlist and selection
* Meeting planning
* Discussion questions
