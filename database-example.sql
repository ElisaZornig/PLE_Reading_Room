-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.book_club_members (
                                          id uuid NOT NULL DEFAULT gen_random_uuid(),
                                          club_id uuid NOT NULL,
                                          user_id uuid NOT NULL,
                                          role text NOT NULL DEFAULT 'member'::text CHECK (role = ANY (ARRAY['owner'::text, 'member'::text])),
                                          joined_at timestamp with time zone DEFAULT now(),
                                          CONSTRAINT book_club_members_pkey PRIMARY KEY (id),
                                          CONSTRAINT book_club_members_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.book_clubs(id),
                                          CONSTRAINT book_club_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.book_clubs (
                                   id uuid NOT NULL DEFAULT gen_random_uuid(),
                                   name text NOT NULL,
                                   description text,
                                   created_by uuid,
                                   created_at timestamp with time zone DEFAULT now(),
                                   current_book_id uuid,
                                   invite_code text,
                                   CONSTRAINT book_clubs_pkey PRIMARY KEY (id),
                                   CONSTRAINT book_clubs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
                                   CONSTRAINT book_clubs_current_book_id_fkey FOREIGN KEY (current_book_id) REFERENCES public.books(id)
);
CREATE TABLE public.books (
                              id uuid NOT NULL DEFAULT gen_random_uuid(),
                              open_library_work_id text NOT NULL UNIQUE,
                              title text NOT NULL,
                              author text NOT NULL,
                              cover_url text,
                              first_publish_year integer,
                              created_at timestamp with time zone NOT NULL DEFAULT now(),
                              updated_at timestamp with time zone NOT NULL DEFAULT now(),
                              genres ARRAY,
                              languages ARRAY,
                              CONSTRAINT books_pkey PRIMARY KEY (id)
);
CREATE TABLE public.club_book_options (
                                          id uuid NOT NULL DEFAULT gen_random_uuid(),
                                          club_id uuid NOT NULL,
                                          book_id uuid NOT NULL,
                                          added_by uuid,
                                          source text NOT NULL DEFAULT 'manual'::text CHECK (source = ANY (ARRAY['algorithm'::text, 'manual'::text])),
                                          reason text,
                                          status text NOT NULL DEFAULT 'suggested'::text CHECK (status = ANY (ARRAY['suggested'::text, 'shortlisted'::text, 'selected'::text, 'removed'::text])),
                                          created_at timestamp with time zone DEFAULT now(),
                                          CONSTRAINT club_book_options_pkey PRIMARY KEY (id),
                                          CONSTRAINT club_book_options_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.book_clubs(id),
                                          CONSTRAINT club_book_options_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id),
                                          CONSTRAINT club_book_options_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.club_meetings (
                                      id uuid NOT NULL DEFAULT gen_random_uuid(),
                                      club_id uuid NOT NULL,
                                      title text,
                                      meeting_date timestamp with time zone NOT NULL,
                                      location text,
                                      notes text,
                                      created_by uuid,
                                      created_at timestamp with time zone DEFAULT now(),
                                      CONSTRAINT club_meetings_pkey PRIMARY KEY (id),
                                      CONSTRAINT club_meetings_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.book_clubs(id),
                                      CONSTRAINT club_meetings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.discussion_questions (
                                             id uuid NOT NULL DEFAULT gen_random_uuid(),
                                             club_id uuid NOT NULL,
                                             book_id uuid,
                                             question text NOT NULL,
                                             created_by uuid,
                                             created_at timestamp with time zone DEFAULT now(),
                                             CONSTRAINT discussion_questions_pkey PRIMARY KEY (id),
                                             CONSTRAINT discussion_questions_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.book_clubs(id),
                                             CONSTRAINT discussion_questions_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id),
                                             CONSTRAINT discussion_questions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.discussion_replies (
                                           id uuid NOT NULL DEFAULT gen_random_uuid(),
                                           question_id uuid NOT NULL,
                                           club_id uuid NOT NULL,
                                           reply text NOT NULL,
                                           created_by uuid,
                                           created_at timestamp with time zone DEFAULT now(),
                                           progress_at_reply integer DEFAULT 0,
                                           CONSTRAINT discussion_replies_pkey PRIMARY KEY (id),
                                           CONSTRAINT discussion_replies_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.discussion_questions(id),
                                           CONSTRAINT discussion_replies_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.book_clubs(id),
                                           CONSTRAINT discussion_replies_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
                                 id uuid NOT NULL,
                                 display_name text NOT NULL,
                                 avatar_url text,
                                 created_at timestamp with time zone NOT NULL DEFAULT now(),
                                 favorite_genres ARRAY,
                                 preferred_languages ARRAY,
                                 CONSTRAINT profiles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_books (
                                   id uuid NOT NULL DEFAULT gen_random_uuid(),
                                   user_id uuid NOT NULL,
                                   book_id uuid NOT NULL,
                                   status text NOT NULL CHECK (status = ANY (ARRAY['toRead'::text, 'reading'::text, 'finished'::text, 'dnf'::text])),
                                   progress integer CHECK (progress >= 0 AND progress <= 100 OR progress IS NULL),
                                   progress_mode text CHECK ((progress_mode = ANY (ARRAY['percentage'::text, 'pages'::text])) OR progress_mode IS NULL),
                                   current_page integer,
                                   total_pages integer,
                                   rating numeric CHECK (rating >= 0::numeric AND rating <= 5::numeric OR rating IS NULL),
  review text,
  dnf_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_books_pkey PRIMARY KEY (id),
  CONSTRAINT user_books_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT user_books_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id)
);