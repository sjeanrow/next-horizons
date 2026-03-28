
create table if not exists users (
  id bigint generated always as identity primary key,
  first_name text not null,
  last_name text not null,
  previous_names text[],
  email text unique not null,
  password_hash text not null,
  phone text,
  pronouns text,
  role text not null check (role in ('candidate', 'employer')),
  job_type text,
  desired_titles text[],
  desired_duties text[]
);

create table if not exists jobs (
  id bigint generated always as identity primary key,
  employer_id bigint references users(id) on delete cascade,
  company text,
  title text not null,
  duties text[],
  education_req text[],
  experience_req text[],
  work_location text,
  remote_scope text,
  timezone_hiring_for text,
  timezone_hiring_from text,
  days_shifts text[],
  pay_rate text,
  job_type text,
  verified boolean default true,
  created_at timestamptz default now()
);

create table if not exists applications (
  id bigint generated always as identity primary key,
  job_id bigint references jobs(id) on delete cascade,
  candidate_id bigint references users(id) on delete cascade,
  applied_at timestamptz default now(),
  status text default 'Pending',
  auto_applied boolean default false,
  unique(job_id, candidate_id)
);

create table if not exists notifications (
  id bigint generated always as identity primary key,
  user_id bigint references users(id) on delete cascade,
  message text not null,
  read boolean default false,
  created_at timestamptz default now()
);
