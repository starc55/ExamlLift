-- Supabase schema for the English assessment platform.
-- Run this file in the Supabase SQL Editor before deploying the Vercel app.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text check (role in ('student', 'teacher', 'admin')),
  created_at timestamptz default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  invite_code text unique not null,
  created_at timestamptz default now()
);

create table if not exists public.class_students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  unique (class_id, student_id)
);

create table if not exists public.contents (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.profiles(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  title text not null,
  description text,
  content_type text check (content_type in ('text', 'pdf', 'audio', 'image', 'video')),
  file_url text,
  text_content text,
  created_at timestamptz default now()
);

create table if not exists public.content_details (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null unique references public.contents(id) on delete cascade,
  body text,
  sections jsonb default '[]'::jsonb,
  assignment_title text,
  assignment_instructions text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.profiles(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  title text not null,
  exam_type text check (exam_type in ('midterm', 'final', 'homework', 'practice')),
  section text check (section in ('writing', 'speaking', 'reading', 'listening', 'grammar', 'vocabulary', 'mixed')),
  instructions text,
  data jsonb,
  created_at timestamptz default now()
);

create table if not exists public.homeworks (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.profiles(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  title text not null,
  instructions text,
  homework_type text check (homework_type in ('writing', 'speaking', 'reading', 'listening', 'grammar', 'vocabulary', 'file')),
  data jsonb,
  deadline timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.homework_submissions (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid references public.homeworks(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  answer_text text,
  file_url text,
  audio_url text,
  score numeric,
  percentage numeric,
  cefr_level text,
  ai_feedback text,
  status text default 'submitted',
  submitted_at timestamptz default now()
);

create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  test_id uuid references public.tests(id) on delete set null,
  exam_type text check (exam_type in ('midterm', 'final', 'homework', 'practice')),
  title text,
  sections jsonb,
  overall_score numeric,
  total_score numeric,
  percentage numeric,
  overall_cefr text,
  feedback_language text default 'uz',
  ai_feedback text,
  created_at timestamptz default now()
);

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() = 'admin', false)
$$;

create or replace function public.is_teacher_for_class(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.classes
    where id = target_class_id
      and teacher_id = auth.uid()
  )
$$;

create or replace function public.is_student_in_class(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.class_students
    where class_id = target_class_id
      and student_id = auth.uid()
  )
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'fullname', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'student')
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        role = excluded.role;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.join_class_by_invite_code(raw_invite_code text)
returns public.classes
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_class public.classes;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  if public.current_profile_role() <> 'student' then
    raise exception 'Only students can join a class.';
  end if;

  select *
  into matched_class
  from public.classes
  where upper(invite_code) = upper(trim(raw_invite_code))
  limit 1;

  if matched_class.id is null then
    raise exception 'Class not found for this invite code.';
  end if;

  insert into public.class_students (class_id, student_id)
  values (matched_class.id, auth.uid())
  on conflict (class_id, student_id) do nothing;

  return matched_class;
end;
$$;

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_students enable row level security;
alter table public.contents enable row level security;
alter table public.content_details enable row level security;
alter table public.tests enable row level security;
alter table public.homeworks enable row level security;
alter table public.homework_submissions enable row level security;
alter table public.results enable row level security;

drop policy if exists "profiles_select_visible" on public.profiles;
create policy "profiles_select_visible"
on public.profiles for select
to authenticated
using (
  id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.class_students cs
    join public.classes c on c.id = cs.class_id
    where c.teacher_id = auth.uid()
      and cs.student_id = profiles.id
  )
);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "classes_select_visible" on public.classes;
create policy "classes_select_visible"
on public.classes for select
to authenticated
using (
  teacher_id = auth.uid()
  or public.is_student_in_class(id)
  or public.is_admin()
);

drop policy if exists "classes_insert_teacher" on public.classes;
create policy "classes_insert_teacher"
on public.classes for insert
to authenticated
with check (
  teacher_id = auth.uid()
  and public.current_profile_role() in ('teacher', 'admin')
);

drop policy if exists "classes_update_teacher" on public.classes;
create policy "classes_update_teacher"
on public.classes for update
to authenticated
using (teacher_id = auth.uid() or public.is_admin())
with check (teacher_id = auth.uid() or public.is_admin());

drop policy if exists "classes_delete_teacher" on public.classes;
create policy "classes_delete_teacher"
on public.classes for delete
to authenticated
using (teacher_id = auth.uid() or public.is_admin());

drop policy if exists "class_students_select_visible" on public.class_students;
create policy "class_students_select_visible"
on public.class_students for select
to authenticated
using (
  student_id = auth.uid()
  or public.is_teacher_for_class(class_id)
  or public.is_admin()
);

drop policy if exists "class_students_delete_visible" on public.class_students;
create policy "class_students_delete_visible"
on public.class_students for delete
to authenticated
using (
  student_id = auth.uid()
  or public.is_teacher_for_class(class_id)
  or public.is_admin()
);

drop policy if exists "contents_select_visible" on public.contents;
create policy "contents_select_visible"
on public.contents for select
to authenticated
using (
  teacher_id = auth.uid()
  or public.is_student_in_class(class_id)
  or public.is_admin()
);

drop policy if exists "contents_insert_teacher" on public.contents;
create policy "contents_insert_teacher"
on public.contents for insert
to authenticated
with check (
  teacher_id = auth.uid()
  and public.current_profile_role() in ('teacher', 'admin')
  and (class_id is null or public.is_teacher_for_class(class_id))
);

drop policy if exists "contents_update_teacher" on public.contents;
create policy "contents_update_teacher"
on public.contents for update
to authenticated
using (teacher_id = auth.uid() or public.is_admin())
with check (
  (teacher_id = auth.uid() or public.is_admin())
  and (class_id is null or public.is_teacher_for_class(class_id) or public.is_admin())
);

drop policy if exists "contents_delete_teacher" on public.contents;
create policy "contents_delete_teacher"
on public.contents for delete
to authenticated
using (teacher_id = auth.uid() or public.is_admin());

drop policy if exists "content_details_select_visible" on public.content_details;
create policy "content_details_select_visible"
on public.content_details for select
to authenticated
using (
  exists (
    select 1
    from public.contents c
    where c.id = content_details.content_id
      and (
        c.teacher_id = auth.uid()
        or public.is_student_in_class(c.class_id)
        or public.is_admin()
      )
  )
);

drop policy if exists "content_details_insert_teacher" on public.content_details;
create policy "content_details_insert_teacher"
on public.content_details for insert
to authenticated
with check (
  exists (
    select 1
    from public.contents c
    where c.id = content_id
      and (
        c.teacher_id = auth.uid()
        or public.is_admin()
      )
  )
);

drop policy if exists "content_details_update_teacher" on public.content_details;
create policy "content_details_update_teacher"
on public.content_details for update
to authenticated
using (
  exists (
    select 1
    from public.contents c
    where c.id = content_details.content_id
      and (
        c.teacher_id = auth.uid()
        or public.is_admin()
      )
  )
)
with check (
  exists (
    select 1
    from public.contents c
    where c.id = content_id
      and (
        c.teacher_id = auth.uid()
        or public.is_admin()
      )
  )
);

drop policy if exists "content_details_delete_teacher" on public.content_details;
create policy "content_details_delete_teacher"
on public.content_details for delete
to authenticated
using (
  exists (
    select 1
    from public.contents c
    where c.id = content_details.content_id
      and (
        c.teacher_id = auth.uid()
        or public.is_admin()
      )
  )
);

drop policy if exists "tests_select_visible" on public.tests;
create policy "tests_select_visible"
on public.tests for select
to authenticated
using (
  teacher_id = auth.uid()
  or public.is_student_in_class(class_id)
  or public.is_admin()
);

drop policy if exists "tests_insert_teacher" on public.tests;
create policy "tests_insert_teacher"
on public.tests for insert
to authenticated
with check (
  teacher_id = auth.uid()
  and public.current_profile_role() in ('teacher', 'admin')
  and (class_id is null or public.is_teacher_for_class(class_id))
);

drop policy if exists "tests_update_teacher" on public.tests;
create policy "tests_update_teacher"
on public.tests for update
to authenticated
using (teacher_id = auth.uid() or public.is_admin())
with check (
  (teacher_id = auth.uid() or public.is_admin())
  and (class_id is null or public.is_teacher_for_class(class_id) or public.is_admin())
);

drop policy if exists "tests_delete_teacher" on public.tests;
create policy "tests_delete_teacher"
on public.tests for delete
to authenticated
using (teacher_id = auth.uid() or public.is_admin());

drop policy if exists "homeworks_select_visible" on public.homeworks;
create policy "homeworks_select_visible"
on public.homeworks for select
to authenticated
using (
  teacher_id = auth.uid()
  or public.is_student_in_class(class_id)
  or public.is_admin()
);

drop policy if exists "homeworks_insert_teacher" on public.homeworks;
create policy "homeworks_insert_teacher"
on public.homeworks for insert
to authenticated
with check (
  teacher_id = auth.uid()
  and public.current_profile_role() in ('teacher', 'admin')
  and (class_id is null or public.is_teacher_for_class(class_id))
);

drop policy if exists "homeworks_update_teacher" on public.homeworks;
create policy "homeworks_update_teacher"
on public.homeworks for update
to authenticated
using (teacher_id = auth.uid() or public.is_admin())
with check (
  (teacher_id = auth.uid() or public.is_admin())
  and (class_id is null or public.is_teacher_for_class(class_id) or public.is_admin())
);

drop policy if exists "homeworks_delete_teacher" on public.homeworks;
create policy "homeworks_delete_teacher"
on public.homeworks for delete
to authenticated
using (teacher_id = auth.uid() or public.is_admin());

drop policy if exists "homework_submissions_select_visible" on public.homework_submissions;
create policy "homework_submissions_select_visible"
on public.homework_submissions for select
to authenticated
using (
  student_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.homeworks h
    where h.id = homework_submissions.homework_id
      and h.teacher_id = auth.uid()
  )
);

drop policy if exists "homework_submissions_insert_student" on public.homework_submissions;
create policy "homework_submissions_insert_student"
on public.homework_submissions for insert
to authenticated
with check (
  student_id = auth.uid()
  and exists (
    select 1
    from public.homeworks h
    where h.id = homework_id
      and (h.class_id is null or public.is_student_in_class(h.class_id))
  )
);

drop policy if exists "homework_submissions_update_visible" on public.homework_submissions;
create policy "homework_submissions_update_visible"
on public.homework_submissions for update
to authenticated
using (
  student_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.homeworks h
    where h.id = homework_submissions.homework_id
      and h.teacher_id = auth.uid()
  )
)
with check (
  student_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.homeworks h
    where h.id = homework_id
      and h.teacher_id = auth.uid()
  )
);

drop policy if exists "results_select_visible" on public.results;
create policy "results_select_visible"
on public.results for select
to authenticated
using (
  student_id = auth.uid()
  or public.is_teacher_for_class(class_id)
  or public.is_admin()
);

drop policy if exists "results_insert_student" on public.results;
create policy "results_insert_student"
on public.results for insert
to authenticated
with check (
  student_id = auth.uid()
  and (class_id is null or public.is_student_in_class(class_id))
);

drop policy if exists "results_update_visible" on public.results;
create policy "results_update_visible"
on public.results for update
to authenticated
using (
  student_id = auth.uid()
  or public.is_teacher_for_class(class_id)
  or public.is_admin()
)
with check (
  student_id = auth.uid()
  or public.is_teacher_for_class(class_id)
  or public.is_admin()
);

insert into storage.buckets (id, name, public)
values ('content-files', 'content-files', true)
on conflict (id) do update set public = true;

drop policy if exists "content_files_public_read" on storage.objects;
create policy "content_files_public_read"
on storage.objects for select
to public
using (bucket_id = 'content-files');

drop policy if exists "content_files_teacher_insert" on storage.objects;
create policy "content_files_teacher_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'content-files'
  and public.current_profile_role() in ('teacher', 'admin', 'student')
);

drop policy if exists "content_files_owner_update" on storage.objects;
create policy "content_files_owner_update"
on storage.objects for update
to authenticated
using (bucket_id = 'content-files' and (owner = auth.uid() or public.is_admin()))
with check (bucket_id = 'content-files' and (owner = auth.uid() or public.is_admin()));

drop policy if exists "content_files_owner_delete" on storage.objects;
create policy "content_files_owner_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'content-files' and (owner = auth.uid() or public.is_admin()));
