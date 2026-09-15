-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.profiles (
                                 id uuid NOT NULL,
                                 display_name text NOT NULL,
                                 avatar_id text,
                                 created_at timestamp with time zone NOT NULL DEFAULT now(),
                                 favorite_genres ARRAY,
                                 preferred_languages ARRAY,
                                 avatar_background_color text NOT NULL DEFAULT '#F6D3CB'::text,
                                 app_theme text NOT NULL DEFAULT 'system'::text,
                                 CONSTRAINT profiles_pkey PRIMARY KEY (id)
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
                              description_snippet text,
                              CONSTRAINT books_pkey PRIMARY KEY (id)
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
CREATE TABLE public.book_clubs (
                                   id uuid NOT NULL DEFAULT gen_random_uuid(),
                                   name text NOT NULL,
                                   description text,
                                   created_by uuid,
                                   created_at timestamp with time zone DEFAULT now(),
                                   current_book_id uuid,
                                   invite_code text,
                                   comment_visibility_mode text DEFAULT 'sameProgress'::text,
                                   CONSTRAINT book_clubs_pkey PRIMARY KEY (id),
                                   CONSTRAINT book_clubs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
                                   CONSTRAINT book_clubs_current_book_id_fkey FOREIGN KEY (current_book_id) REFERENCES public.books(id)
);
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
CREATE TABLE public.friendships (
                                    id uuid NOT NULL DEFAULT gen_random_uuid(),
                                    requester_id uuid NOT NULL,
                                    receiver_id uuid NOT NULL,
                                    status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text])),
                                    created_at timestamp with time zone NOT NULL DEFAULT now(),
                                    updated_at timestamp with time zone NOT NULL DEFAULT now(),
                                    CONSTRAINT friendships_pkey PRIMARY KEY (id),
                                    CONSTRAINT friendships_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.profiles(id),
                                    CONSTRAINT friendships_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.club_swipe_sessions (
                                            id uuid NOT NULL DEFAULT gen_random_uuid(),
                                            club_id uuid NOT NULL,
                                            created_by uuid NOT NULL,
                                            status text NOT NULL DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'closed'::text])),
                                            created_at timestamp with time zone DEFAULT now(),
                                            updated_at timestamp with time zone DEFAULT now(),
                                            CONSTRAINT club_swipe_sessions_pkey PRIMARY KEY (id),
                                            CONSTRAINT club_swipe_sessions_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.book_clubs(id),
                                            CONSTRAINT club_swipe_sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.club_swipe_session_options (
                                                   id uuid NOT NULL DEFAULT gen_random_uuid(),
                                                   session_id uuid NOT NULL,
                                                   option_id uuid NOT NULL,
                                                   created_at timestamp with time zone DEFAULT now(),
                                                   CONSTRAINT club_swipe_session_options_pkey PRIMARY KEY (id),
                                                   CONSTRAINT club_swipe_session_options_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.club_swipe_sessions(id),
                                                   CONSTRAINT club_swipe_session_options_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.club_book_options(id)
);
CREATE TABLE public.club_swipe_votes (
                                         id uuid NOT NULL DEFAULT gen_random_uuid(),
                                         session_id uuid NOT NULL,
                                         option_id uuid NOT NULL,
                                         user_id uuid NOT NULL,
                                         vote text NOT NULL CHECK (vote = ANY (ARRAY['like'::text, 'skip'::text])),
                                         created_at timestamp with time zone DEFAULT now(),
                                         CONSTRAINT club_swipe_votes_pkey PRIMARY KEY (id),
                                         CONSTRAINT club_swipe_votes_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.club_swipe_sessions(id),
                                         CONSTRAINT club_swipe_votes_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.club_book_options(id),
                                         CONSTRAINT club_swipe_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.club_meeting_polls (
                                           id uuid NOT NULL DEFAULT gen_random_uuid(),
                                           club_id uuid NOT NULL,
                                           title text,
                                           notes text,
                                           status text NOT NULL DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'confirmed'::text, 'cancelled'::text])),
                                           confirmation_mode text NOT NULL DEFAULT 'ownerOnly'::text CHECK (confirmation_mode = ANY (ARRAY['ownerOnly'::text, 'everyone'::text])),
                                           confirmed_meeting_id uuid,
                                           created_by uuid NOT NULL,
                                           created_at timestamp with time zone NOT NULL DEFAULT now(),
                                           updated_at timestamp with time zone NOT NULL DEFAULT now(),
                                           CONSTRAINT club_meeting_polls_pkey PRIMARY KEY (id),
                                           CONSTRAINT club_meeting_polls_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.book_clubs(id),
                                           CONSTRAINT club_meeting_polls_confirmed_meeting_id_fkey FOREIGN KEY (confirmed_meeting_id) REFERENCES public.club_meetings(id),
                                           CONSTRAINT club_meeting_polls_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.club_meeting_poll_date_options (
                                                       id uuid NOT NULL DEFAULT gen_random_uuid(),
                                                       poll_id uuid NOT NULL,
                                                       option_date date NOT NULL,
                                                       option_time time without time zone,
                                                       created_by uuid NOT NULL,
                                                       created_at timestamp with time zone NOT NULL DEFAULT now(),
                                                       CONSTRAINT club_meeting_poll_date_options_pkey PRIMARY KEY (id),
                                                       CONSTRAINT club_meeting_poll_date_options_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.club_meeting_polls(id),
                                                       CONSTRAINT club_meeting_poll_date_options_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.club_meeting_poll_date_votes (
                                                     id uuid NOT NULL DEFAULT gen_random_uuid(),
                                                     date_option_id uuid NOT NULL,
                                                     user_id uuid NOT NULL,
                                                     availability text NOT NULL CHECK (availability = ANY (ARRAY['available'::text, 'maybe'::text, 'unavailable'::text])),
                                                     created_at timestamp with time zone NOT NULL DEFAULT now(),
                                                     updated_at timestamp with time zone NOT NULL DEFAULT now(),
                                                     CONSTRAINT club_meeting_poll_date_votes_pkey PRIMARY KEY (id),
                                                     CONSTRAINT club_meeting_poll_date_votes_date_option_id_fkey FOREIGN KEY (date_option_id) REFERENCES public.club_meeting_poll_date_options(id),
                                                     CONSTRAINT club_meeting_poll_date_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.club_meeting_poll_location_options (
                                                           id uuid NOT NULL DEFAULT gen_random_uuid(),
                                                           poll_id uuid NOT NULL,
                                                           label text NOT NULL,
                                                           created_by uuid NOT NULL,
                                                           created_at timestamp with time zone NOT NULL DEFAULT now(),
                                                           CONSTRAINT club_meeting_poll_location_options_pkey PRIMARY KEY (id),
                                                           CONSTRAINT club_meeting_poll_location_options_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.club_meeting_polls(id),
                                                           CONSTRAINT club_meeting_poll_location_options_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.club_meeting_poll_location_votes (
                                                         id uuid NOT NULL DEFAULT gen_random_uuid(),
                                                         location_option_id uuid NOT NULL,
                                                         user_id uuid NOT NULL,
                                                         created_at timestamp with time zone NOT NULL DEFAULT now(),
                                                         CONSTRAINT club_meeting_poll_location_votes_pkey PRIMARY KEY (id),
                                                         CONSTRAINT club_meeting_poll_location_votes_location_option_id_fkey FOREIGN KEY (location_option_id) REFERENCES public.club_meeting_poll_location_options(id),
                                                         CONSTRAINT club_meeting_poll_location_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);