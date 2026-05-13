# Book Club App

An Expo / React Native MVP for personal book tracking and book club functionality. The app combines a calm personal reading tracker with features that help book clubs choose a book faster, share reading progress and prepare discussions.

## Project goal

Book clubs often struggle with choosing a book, keeping track of reading progress and starting meaningful conversations during meetings. At the same time, individual readers often want to track their books without using a busy social feed or an overwhelming interface.

This MVP combines two main parts:

1. **Personal book tracking**: users can add books, set a reading status, track progress, add a rating and save a short personal review or note.
2. **Book club functionality**: users can create or join a club, view recommendations, build a shortlist, vote or spin a wheel, set a current club book, share progress and use discussion questions.

The value of the MVP is not only in tracking books, but mainly in making the shared decision-making and reading process within a book club easier and more structured.

## Main features

### Personal book list

- Search books through the Open Library API.
- Add books to a personal reading list.
- Use reading statuses such as `toRead`, `reading`, `finished` and `dnf`.
- Track reading progress by percentage or pages.
- Add a rating and short personal review.

### Book club

- Create a club with an invite code.
- Join an existing club.
- View a club dashboard with members, progress and the current club book.
- Set the current club book.
- Create a shortlist for the next club book.
- Vote or use a spin-the-wheel feature to choose a book.
- Plan a meeting with a date, location and notes.

### Recommendations

- The app uses club member preferences and reading data to generate book recommendations.
- The recommendation logic looks at genres, preferred languages, books that were already read and publication data.
- Each recommendation includes a reason, so users can understand why a book matches the club.

### Discussion

- Users can add discussion questions.
- Club members can reply to questions.
- Questions and replies can be edited or deleted.
- This supports preparation for book club meetings.

## Tech stack

| Part | Choice | Reason |
| --- | --- | --- |
| Frontend | Expo / React Native | One codebase for mobile and web, suitable for fast MVP development. |
| Routing | Expo Router | File-based routing keeps the screen structure clear. |
| Language | TypeScript | Improves control, type safety and maintainability. |
| Backend/database | Supabase | Used for authentication, user data, clubs, personal books and discussion data. |
| External API | Open Library API | Used for searching and retrieving book metadata. |
| Styling | Central theme files | Colors, spacing and typography are managed centrally for consistency. |
| Localization | i18n files | Texts are prepared for Dutch and English. |

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd Boekenclub-app
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the project root:

```bash
EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

Real keys should not be committed to GitHub. Only use public Expo environment variables for values that are safe to expose in a client-side app.

## Running the app

Start the development server:

```bash
npm run start
```

Start directly for web:

```bash
npm run web
```

Start directly for iOS or Android:

```bash
npm run ios
npm run android
```

## Project structure

```text
app/
  (tabs)/
    index.tsx              Home/dashboard
    books.tsx              Personal book list
    club.tsx               Club dashboard
  add-book.tsx             Search and add a book
  auth.tsx                 Log in
  sign-up.tsx              Sign up
  create-club.tsx          Create a club
  join-club.tsx            Join a club
  recommendations.tsx      Club recommendations
  choose-next-book.tsx     Shortlist and selection flow
  spin-the-wheel.tsx       Wheel for choosing a book
  set-current-book.tsx     Set current club book
  discussion.tsx           Discussion questions and replies
  plan-meeting.tsx         Plan a meeting

src/
  components/              Reusable UI components
  services/                API, Supabase and business logic
  theme/                   Colors, spacing, typography and theme values
  styles/                  Reusable page styles
  i18n/                    Dutch and English text files
  types/                   TypeScript types
  utils/                   Small helper functions
  data/                    Mock data or temporary data
```

## Important files

| File | Purpose |
| --- | --- |
| `src/services/supabase.ts` | Creates the connection with Supabase and handles storage per platform. |
| `src/services/booksApi.ts` | Searches books through Open Library and maps raw API data to app data. |
| `src/services/clubRecommendations.ts` | Contains the rule-based recommendation logic for clubs. |
| `src/services/supabaseUserBooks.ts` | Manages personal book lists and reading progress. |
| `src/services/supabaseClub.ts` | Manages clubs, members, meetings and club information. |
| `src/services/supabaseClubShortlist.ts` | Manages shortlist items and the voting/selection flow. |
| `src/theme/` | Contains central visual choices so styling is not spread across the app. |
| `src/i18n/` | Contains translations for Dutch and English. |

## Coding standards

This codebase uses several conventions to keep the project maintainable and transferable.

### Naming

- Components use `PascalCase`, for example `BookCover` and `ScreenTopBar`.
- Functions and variables use `camelCase`, for example `handleSearch` and `loadBooks`.
- Service files clearly describe the part of the logic they manage, for example `supabaseUserBooks.ts` or `clubRecommendations.ts`.
- Routes in the `app/` folder are connected to screens and use clear names such as `add-book.tsx`, `create-club.tsx` and `plan-meeting.tsx`.

### Separation of responsibilities

- Screens in `app/` mainly handle user interaction and display.
- Reusable UI components are stored in `src/components/`.
- Data fetching, saving and business logic are stored in `src/services/`.
- General helper functions are stored in `src/utils/`.
- Types are stored in `src/types/`.
- Styling values are managed centrally in `src/theme/` and `src/styles/`.

This makes the project easier to transfer, because another developer can quickly understand where UI, data and logic are located.

### TypeScript

TypeScript is used to make data structures clearer and reduce mistakes. This is especially important for book data, club data and recommendations, because the app uses data from both Supabase and the Open Library API.

### Styling

The app uses central theme files for colors, spacing and typography. This prevents repeated hard-coded values and makes the interface easier to keep consistent or adjust later.

### Platform-aware development

Because the app runs on multiple platforms through React Native and Expo, platform differences between web and mobile need to be considered. One example is Supabase authentication storage: web uses `localStorage`, while mobile uses `AsyncStorage`. Alerts, keyboard behavior and input fields also need to be tested per platform.

## Data and architecture

The app separates external book metadata from user-specific and club-specific data.

- **Open Library API** provides book information such as title, author, cover and publication year.
- **Supabase** stores users, personal books, clubs, members, book options, meetings, discussion questions and replies.
- Book data is mapped to an internal model before it is used in the interface, so the app is not directly dependent on raw API responses everywhere.
- Recommendation logic is stored separately in a service, so it can be replaced or improved later.

This setup keeps the MVP feasible while leaving room for future features such as stronger personalization, badges, more advanced polls or extra languages.

## Database structure

This project uses Supabase as the backend for authentication, user data, book clubs, personal book tracking and discussion data. Book metadata is retrieved from the Open Library API and stored in the `books` table in a normalized format.

The database is structured around four main parts:

### 1. Users

| Table | Purpose |
| --- | --- |
| `profiles` | Stores profile information linked to a user, such as display name, avatar, favorite genres and preferred languages. |

### 2. Books and personal tracking

| Table | Purpose |
| --- | --- |
| `books` | Stores book metadata such as title, author, cover URL, Open Library work ID, first publication year, genres and languages. |
| `user_books` | Connects users to books and stores personal reading data such as status, progress, progress mode, rating, review and DNF reason. |

### 3. Book clubs

| Table | Purpose |
| --- | --- |
| `book_clubs` | Stores club information, description, creator, invite code and the current selected club book. |
| `book_club_members` | Connects users to clubs and stores their role: `owner` or `member`. |
| `club_book_options` | Stores suggested, shortlisted, selected or removed book options for a club. Options can be added manually or generated by the recommendation logic. |

### 4. Meetings and discussion

| Table | Purpose |
| --- | --- |
| `club_meetings` | Stores simple meeting information such as title, date, location and notes. |
| `discussion_questions` | Stores discussion questions linked to a club and optionally to a specific book. |
| `discussion_replies` | Stores replies to discussion questions, including the user's reading progress at the moment of replying. |

### Database design choices

The database separates external book metadata from personal user data. Open Library data is stored in the `books` table, while personal progress, ratings, reviews, club membership and discussion activity are stored in separate relational tables. This makes the app easier to maintain and prevents personal data from being mixed with external API data.

The database uses UUIDs as primary keys. This makes records unique and suitable for a Supabase/PostgreSQL setup. Foreign keys connect users, books, clubs, meetings and discussion content. This improves data consistency and makes the structure easier to understand for someone who wants to continue the project.

Several fields use check constraints. For example, `book_club_members.role` can only be `owner` or `member`, `user_books.status` can only be `toRead`, `reading`, `finished` or `dnf`, and `club_book_options.status` can only be `suggested`, `shortlisted`, `selected` or `removed`. These constraints prevent invalid values from being saved and support more reliable app behavior.

### Data relationships

- One user can have many personal books through `user_books`.
- One book can appear in many users' personal lists.
- One user can be a member of multiple clubs through `book_club_members`.
- One club can have multiple members.
- One club can have multiple book options in `club_book_options`.
- One club can have one current selected book through `book_clubs.current_book_id`.
- One club can have multiple meetings.
- One discussion question can have multiple replies.

### Security and privacy

Tables with user-specific or club-specific data should use Supabase Row Level Security. Users should only be able to edit their own personal reading data, preferences and reviews. Club data should only be visible or editable by members of that specific club. Private reading data, such as personal progress, ratings or DNF reasons, should not automatically be visible to non-members or unrelated users.

### Future database improvements

The current database structure works for the MVP, but the following improvements could make it more robust:

- Add or document Row Level Security policies for every table with personal or club data.
- Add cascade rules for deleting clubs, meetings, questions or replies.
- Add unique constraints, for example to prevent the same user from joining the same club twice.
- Add indexes on frequently used foreign keys such as `club_id`, `user_id` and `book_id`.
- Use explicit PostgreSQL array types such as `text[]` for `genres`, `languages`, `favorite_genres` and `preferred_languages`.
- Add automatic `updated_at` triggers for tables that can be edited after creation.

## Environment variables

The app expects the following variables:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Without these variables, the app cannot connect to Supabase. The Open Library API does not require a separate API key in this MVP.

## Testing

For this MVP, testing focuses mainly on the core functional flows:

1. Create an account or log in.
2. Search for a book through Open Library.
3. Add a book to the personal book list.
4. Update status, progress, rating or review.
5. Create or join a club.
6. Add books to a shortlist.
7. View recommendations.
8. Choose a book through voting or the spin-the-wheel feature.
9. Set the current club book.
10. Add a discussion question and reply.
11. Plan a meeting.

Testing focuses on:

- **Happy flow**: does the feature work when everything goes as expected?
- **Error flow**: does the user get a clear message when something fails?
- **Empty state**: does the user see a logical message when there is no data yet?
- **Platform differences**: does the flow work on both web and mobile?

Bugs and feedback are used as input for the next iteration.

## Known limitations

This MVP is intentionally limited in scope. The following features are not included yet:

- No public Goodreads-like review community.
- No complex machine-learning recommender.
- No advanced moderation or admin functionality.
- No full calendar integration.
- No advanced availability poll for meetings.
- Open Library data is not always complete, so the app uses fallbacks for missing covers, authors or descriptions.
- Not all platform differences between web and mobile are automatically solved; testing on multiple devices remains necessary.

## Possible future development

- More advanced club roles, such as owner, admin and member.
- A stronger invite flow with expiration dates or limited reuse.
- Automatic reminders for meetings or reading progress.
- More languages in the interface.
- Stronger recommendations based on longer user history.
- Privacy settings per club or per user.
- Export of meeting notes.
- More automated tests for recommendation logic and data mapping.

## Link to PLE learning goal

This README supports the PLE learning goal about documentation and programming standards. It documents choices about the tech stack, project structure, naming, data structure, services, environment variables, testing and known limitations. This makes the MVP more maintainable and easier to transfer to another developer.

The README also shows how someone else can install, run, understand and continue developing the project. In that way, this document is not only an explanation after development, but also part of the technical handover of the MVP.
