-- Create profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Create role enum
create type public.app_role as enum ('admin', 'user');

-- Create user_roles table (CRITICAL: separate from profiles for security)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Create attendance_records table
create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  check_in_time timestamptz not null default now(),
  photo_url text not null,
  location text,
  notes text,
  status text default 'pending',
  created_at timestamptz default now()
);

alter table public.attendance_records enable row level security;

-- Security definer function to check roles (prevents RLS recursion)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  
  -- Assign default 'user' role
  insert into public.user_roles (user_id, role)
  values (new.id, 'user');
  
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS Policies for profiles
create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- RLS Policies for user_roles
create policy "Users can view own roles"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins can view all roles"
  on public.user_roles for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can manage roles"
  on public.user_roles for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for attendance_records
create policy "Users can view own attendance"
  on public.attendance_records for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create own attendance"
  on public.attendance_records for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Admins can view all attendance"
  on public.attendance_records for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update attendance status"
  on public.attendance_records for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for attendance photos
insert into storage.buckets (id, name, public) 
values ('attendance-photos', 'attendance-photos', false);

-- Storage policies
create policy "Users can upload own attendance photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'attendance-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can view own attendance photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'attendance-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Admins can view all attendance photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'attendance-photos' AND
    public.has_role(auth.uid(), 'admin')
  );