-- Create the table for Questions
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  syllabus text not null, -- e.g. 'IB', 'A-Level'
  topic text not null,    -- e.g. 'Calculus', 'Algebra'
  month text,             -- e.g. 'January', 'May'
  difficulty text,        -- e.g. 'Easy', 'Medium', 'Hard', 'Challenge'
  year integer not null,
  question_url text not null,
  solution_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Note: The bucket 'math_assets' can be created either through the Supabase Dashboard UI 
-- under Storage -> Create a new bucket -> "math_assets" (Public bucket).
-- Alternatively, if your Supabase Postgres has the storage functions enabled:
insert into storage.buckets (id, name, public) values ('math_assets', 'math_assets', true);

-- Setup Storage Policies for the bucket
create policy "Public Access" 
on storage.objects for select 
using ( bucket_id = 'math_assets' );

create policy "Allow Uploads" 
on storage.objects for insert 
with check ( bucket_id = 'math_assets' );

-- MIGRATION HISTORY: 
-- 1. ALTER TABLE public.questions ADD COLUMN month text;
-- 2. ALTER TABLE public.questions ADD COLUMN difficulty text;
