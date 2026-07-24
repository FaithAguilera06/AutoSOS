-- Supabase schema for AutoSOS
do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'user_role' and n.nspname = 'public') then
    create type public.user_role as enum ('client','mechanic','admin');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'booking_status' and n.nspname = 'public') then
    create type public.booking_status as enum ('pending','matched','in_progress','completed','cancelled');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'availability_status' and n.nspname = 'public') then
    create type public.availability_status as enum ('available','not_available');
  end if;
end $$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.user_role not null default 'client',
  approved boolean not null default false,
  availability public.availability_status not null default 'not_available',
  specialization text[] default '{}',
  latitude double precision,
  longitude double precision,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_mechanic_filter_idx on public.profiles(approved, availability);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), 'client')
  on conflict (user_id) do nothing;
  return new;
end$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.bookings (
  id bigserial primary key,
  client_id uuid not null references public.profiles(user_id) on delete restrict,
  mechanic_id uuid references public.profiles(user_id) on delete set null,
  status public.booking_status not null default 'pending',
  required_specialization text not null,
  notes text,
  latitude double precision not null,
  longitude double precision not null,
  mechanic_score numeric,
  distance_km numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_client_idx on public.bookings(client_id);
create index if not exists bookings_status_idx on public.bookings(status);

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

create or replace function public.haversine_km(
  lat1 double precision, lon1 double precision,
  lat2 double precision, lon2 double precision
) returns double precision
language plpgsql immutable as $$
declare
  r  constant double precision := 6371.0;
  dlat double precision := radians(lat2 - lat1);
  dlon double precision := radians(lon2 - lon1);
  a    double precision;
  c    double precision;
begin
  a := sin(dlat/2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)^2;
  c := 2 * atan2(sqrt(a), sqrt(1 - a));
  return r * c;
end$$;

create or replace function public.match_mechanics_for_booking(p_booking_id bigint)
returns table (
  mechanic_id uuid,
  distance_km numeric,
  specialization_match boolean,
  score numeric,
  distance_score numeric,
  specialization_score numeric,
  rating_score numeric,
  availability_score numeric,
  experience_score numeric,
  response_time_score numeric
) language sql stable as $$
  with b as (
    select id, latitude as b_lat, longitude as b_lon, required_specialization
    from public.bookings
    where id = p_booking_id
  ),
  m as (
    select 
      user_id, 
      latitude, 
      longitude, 
      specialization,
      rating,
      availability,
      experience_years,
      avg_response_time
    from public.profiles
    where role = 'mechanic'
      and approved = true
      and availability = 'available'
      and latitude is not null
      and longitude is not null
  )
  select
    m.user_id as mechanic_id,
    public.haversine_km(b.b_lat, b.b_lon, m.latitude, m.longitude) as distance_km,
    (b.required_specialization = any(m.specialization)) as specialization_match,
    
    -- Distance score using formula: 1 - (distance / 5)
    case 
      when public.haversine_km(b.b_lat, b.b_lon, m.latitude, m.longitude) > 5 then 0.0
      else greatest(0.0, 1.0 - (public.haversine_km(b.b_lat, b.b_lon, m.latitude, m.longitude) / 5.0))
    end as distance_score,
    
    -- Specialization score (1 for exact match, 0 for no match)
    case 
      when b.required_specialization = any(m.specialization) then 1.0
      else 0.0
    end as specialization_score,
    
    -- Rating score (0-1, based on 5-star scale)
    case 
      when m.rating is null then 0.0
      else least(m.rating / 5.0, 1.0)
    end as rating_score,
    
    -- Availability score (1.0 for available, 0.5 for busy, 0.0 for offline)
    case 
      when m.availability = 'available' then 1.0
      when m.availability = 'busy' then 0.5
      else 0.0
    end as availability_score,
    
    -- Experience score (0-1, caps at 10 years)
    case 
      when m.experience_years is null then 0.0
      else least(m.experience_years / 10.0, 1.0)
    end as experience_score,
    
    -- Response time score (0-1, lower time = higher score)
    case 
      when m.avg_response_time is null then 0.5
      when m.avg_response_time <= 15 then 1.0
      when m.avg_response_time <= 30 then 0.8
      when m.avg_response_time <= 60 then 0.6
      when m.avg_response_time <= 120 then 0.4
      else 0.2
    end as response_time_score,
    
    -- Total score = Distance Score + Specialization Score
    round((
      case 
        when public.haversine_km(b.b_lat, b.b_lon, m.latitude, m.longitude) > 5 then 0.0
        else greatest(0.0, 1.0 - (public.haversine_km(b.b_lat, b.b_lon, m.latitude, m.longitude) / 5.0))
      end +
      case 
        when b.required_specialization = any(m.specialization) then 1.0
        else 0.0
      end
    )::numeric, 6) as score
  from b, m
  order by score desc, distance_km asc
$$;

alter table public.profiles enable row level security;
alter table public.bookings enable row level security;

create or replace function public.current_user_role()
returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where user_id = auth.uid();
$$;

drop policy if exists profiles_select_any on public.profiles;
create policy profiles_select_any
on public.profiles for select
to authenticated
using (true);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
on public.profiles for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists profiles_admin_approve on public.profiles;
create policy profiles_admin_approve
on public.profiles for update
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists bookings_insert_client on public.bookings;
create policy bookings_insert_client
on public.bookings for insert
to authenticated
with check (
  auth.uid() is not null
  and (select role from public.profiles where user_id = auth.uid()) = 'client'
  and client_id = auth.uid()
);

drop policy if exists bookings_select_own on public.bookings;
create policy bookings_select_own
on public.bookings for select
to authenticated
using (
  client_id = auth.uid() or mechanic_id = auth.uid()
  or (select role from public.profiles where user_id = auth.uid()) = 'admin'
);

drop policy if exists bookings_update_admin on public.bookings;
create policy bookings_update_admin
on public.bookings for update
to authenticated
using (public.current_user_role() = 'admin')
with check (true);

create or replace function public.assign_best_mechanic(p_booking_id bigint)
returns table (booking_id bigint, mechanic_id uuid, score numeric, distance_km numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_mechanic uuid;
  v_score numeric;
  v_distance numeric;
begin
  if public.current_user_role() <> 'admin' then
    raise exception 'Only admin can assign matches';
  end if;

  select mechanic_id, score, distance_km
  into v_mechanic, v_score, v_distance
  from public.match_mechanics_for_booking(p_booking_id)
  limit 1;

  update public.bookings
  set mechanic_id = v_mechanic,
      status = case when v_mechanic is null then status else 'matched' end,
      mechanic_score = v_score,
      distance_km = v_distance
  where id = p_booking_id
  returning id, mechanic_id, mechanic_score, distance_km
  into booking_id, mechanic_id, score, distance_km;

  return next;
end$$;


-- Storage policies for autosos bucket
-- Public can read avatars folder
drop policy if exists "Public read avatars" on storage.objects;
create policy "Public read avatars"
on storage.objects for select
to public
using (bucket_id = 'autosos' and (storage.foldername(name))[1] = 'avatars');

-- Authenticated users can upload only within their own avatar folder avatars/<uid>/...
drop policy if exists "Users can upload their avatar" on storage.objects;
create policy "Users can upload their avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'autosos'
  and (storage.foldername(name))[1] = 'avatars'
  and (storage.foldername(name))[2] = auth.uid()::text
);

-- Authenticated users can update only their own avatar files
drop policy if exists "Users can update their avatar" on storage.objects;
create policy "Users can update their avatar"
on storage.objects for update
to authenticated
using (
  bucket_id = 'autosos'
  and (storage.foldername(name))[1] = 'avatars'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'autosos'
  and (storage.foldername(name))[1] = 'avatars'
  and (storage.foldername(name))[2] = auth.uid()::text
);

-- Authenticated users can delete only their own avatar files
drop policy if exists "Users can delete their avatar" on storage.objects;
create policy "Users can delete their avatar"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'autosos'
  and (storage.foldername(name))[1] = 'avatars'
  and (storage.foldername(name))[2] = auth.uid()::text
);


-- Mechanic documents: table + storage bucket
create table if not exists public.mechanic_documents (
  id bigserial primary key,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  doc_type text not null, -- e.g. 'id_card','certificate','license'
  file_path text not null, -- storage path in mechanic_docs bucket
  public_url text, -- cached for convenience if bucket is public
  status text not null default 'submitted', -- 'submitted','approved','rejected'
  created_at timestamptz not null default now()
);

create index if not exists mechanic_documents_user_idx on public.mechanic_documents(user_id);

alter table public.mechanic_documents enable row level security;

-- RLS: mechanics can see their own docs; admins can see all
drop policy if exists mech_docs_select on public.mechanic_documents;
create policy mech_docs_select on public.mechanic_documents for select
to authenticated using (
  user_id = auth.uid() or (select role from public.profiles where user_id = auth.uid()) = 'admin'
);

drop policy if exists mech_docs_insert_self on public.mechanic_documents;
create policy mech_docs_insert_self on public.mechanic_documents for insert
to authenticated with check (
  user_id = auth.uid()
);

drop policy if exists mech_docs_update_admin on public.mechanic_documents;
create policy mech_docs_update_admin on public.mechanic_documents for update
to authenticated using (
  (select role from public.profiles where user_id = auth.uid()) = 'admin'
)
with check (true);

-- Storage policies for mechanic docs in autosos bucket
-- Only owner and admins can access files; no public reads
drop policy if exists "Mechanic docs: owners read" on storage.objects;
create policy "Mechanic docs: owners read"
on storage.objects for select to authenticated
using (
  bucket_id = 'autosos'
  and (storage.foldername(name))[1] = 'mechanic_docs'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "Mechanic docs: owners insert" on storage.objects;
create policy "Mechanic docs: owners insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'autosos'
  and (storage.foldername(name))[1] = 'mechanic_docs'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "Mechanic docs: owners update" on storage.objects;
create policy "Mechanic docs: owners update"
on storage.objects for update to authenticated
using (
  bucket_id = 'autosos'
  and (storage.foldername(name))[1] = 'mechanic_docs'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'autosos'
  and (storage.foldername(name))[1] = 'mechanic_docs'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "Mechanic docs: owners delete" on storage.objects;
create policy "Mechanic docs: owners delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'autosos'
  and (storage.foldername(name))[1] = 'mechanic_docs'
  and (storage.foldername(name))[2] = auth.uid()::text
);

-- =====================================================
-- WALLET SYSTEM SCHEMA
-- =====================================================

-- Create wallet-related enums
do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'transaction_type' and n.nspname = 'public') then
    create type public.transaction_type as enum ('topup', 'payment', 'refund', 'withdrawal');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'transaction_status' and n.nspname = 'public') then
    create type public.transaction_status as enum ('pending', 'approved', 'rejected', 'completed', 'failed');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'payment_method' and n.nspname = 'public') then
    create type public.payment_method as enum ('gcash', 'facial_recognition', 'bank_transfer', 'cash');
  end if;
end $$;

-- Add wallet balance to profiles table
alter table public.profiles add column if not exists wallet_balance numeric(10,2) default 0.00;

-- Create wallet transactions table
create table if not exists public.wallet_transactions (
  id bigserial primary key,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  transaction_type public.transaction_type not null,
  amount numeric(10,2) not null,
  status public.transaction_status not null default 'pending',
  payment_method public.payment_method,
  reference_number text, -- GCash reference number or booking ID
  description text,
  admin_notes text, -- Admin can add notes when approving/rejecting
  processed_by uuid references public.profiles(user_id), -- Admin who processed
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create wallet topup requests table (for GCash receipts)
create table if not exists public.wallet_topup_requests (
  id bigserial primary key,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  amount numeric(10,2) not null,
  gcash_reference text not null,
  receipt_images text[], -- Array of image URLs
  verification_photo text, -- User's selfie for verification
  status public.transaction_status not null default 'pending',
  admin_notes text,
  processed_by uuid references public.profiles(user_id),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create facial recognition payments table
create table if not exists public.facial_recognition_payments (
  id bigserial primary key,
  booking_id bigint not null references public.bookings(id) on delete cascade,
  client_id uuid not null references public.profiles(user_id) on delete cascade,
  mechanic_id uuid not null references public.profiles(user_id) on delete cascade,
  amount numeric(10,2) not null,
  verification_photo text, -- Base64 encoded photo for verification
  facial_recognition_data jsonb, -- Facial recognition match data
  status public.transaction_status not null default 'pending',
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create admin GCash settings table
create table if not exists public.admin_gcash_settings (
  id bigserial primary key,
  account_name text not null,
  account_number text not null,
  qr_code_image text, -- Base64 encoded QR code image
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create indexes for better performance
create index if not exists wallet_transactions_user_id_idx on public.wallet_transactions(user_id);
create index if not exists wallet_transactions_status_idx on public.wallet_transactions(status);
create index if not exists wallet_topup_requests_user_id_idx on public.wallet_topup_requests(user_id);
create index if not exists wallet_topup_requests_status_idx on public.wallet_topup_requests(status);
create index if not exists facial_payments_booking_id_idx on public.facial_recognition_payments(booking_id);

-- Set up updated_at triggers
drop trigger if exists wallet_transactions_set_updated_at on public.wallet_transactions;
create trigger wallet_transactions_set_updated_at
  before update on public.wallet_transactions
  for each row execute function public.set_updated_at();

drop trigger if exists wallet_topup_requests_set_updated_at on public.wallet_topup_requests;
create trigger wallet_topup_requests_set_updated_at
  before update on public.wallet_topup_requests
  for each row execute function public.set_updated_at();

drop trigger if exists facial_payments_set_updated_at on public.facial_recognition_payments;
create trigger facial_payments_set_updated_at
  before update on public.facial_recognition_payments
  for each row execute function public.set_updated_at();

drop trigger if exists admin_gcash_settings_set_updated_at on public.admin_gcash_settings;
create trigger admin_gcash_settings_set_updated_at
  before update on public.admin_gcash_settings
  for each row execute function public.set_updated_at();

-- Function to get wallet balance
create or replace function public.get_wallet_balance(p_user_id uuid default null)
returns numeric language sql security definer set search_path = public as $$
  select wallet_balance 
  from public.profiles 
  where user_id = coalesce(p_user_id, auth.uid());
$$;

-- Function to get wallet transaction history
create or replace function public.get_wallet_transactions(
  p_user_id uuid default null,
  p_limit int default 50,
  p_offset int default 0
) returns table (
  id bigint,
  transaction_type text,
  amount numeric,
  status text,
  payment_method text,
  reference_number text,
  description text,
  created_at timestamptz
) language sql security definer set search_path = public as $$
  select 
    wt.id,
    wt.transaction_type::text,
    wt.amount,
    wt.status::text,
    wt.payment_method::text,
    wt.reference_number,
    wt.description,
    wt.created_at
  from public.wallet_transactions wt
  where wt.user_id = coalesce(p_user_id, auth.uid())
  order by wt.created_at desc
  limit p_limit offset p_offset;
$$;

-- Storage policies for wallet receipt images
drop policy if exists "Wallet receipts: owners read" on storage.objects;
create policy "Wallet receipts: owners read"
on storage.objects for select to authenticated
using (
  bucket_id = 'autosos'
  and (storage.foldername(name))[1] = 'wallet_receipts'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "Wallet receipts: owners insert" on storage.objects;
create policy "Wallet receipts: owners insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'autosos'
  and (storage.foldername(name))[1] = 'wallet_receipts'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "Wallet receipts: admins read" on storage.objects;
create policy "Wallet receipts: admins read"
on storage.objects for select to authenticated
using (
  bucket_id = 'autosos'
  and (storage.foldername(name))[1] = 'wallet_receipts'
  and public.current_user_role() = 'admin'
);

-- Row Level Security policies for wallet tables
alter table public.wallet_transactions enable row level security;
alter table public.wallet_topup_requests enable row level security;
alter table public.facial_recognition_payments enable row level security;
alter table public.admin_gcash_settings enable row level security;

-- Wallet transactions policies
create policy "Users can view their own transactions"
on public.wallet_transactions for select to authenticated
using (user_id = auth.uid());

create policy "Admins can view all transactions"
on public.wallet_transactions for select to authenticated
using (public.current_user_role() = 'admin');

create policy "System can insert transactions"
on public.wallet_transactions for insert to authenticated
with check (true); -- Will be restricted by application logic

-- Allow system functions to update wallet balances
create policy "System can update wallet balances"
on public.profiles for update to authenticated
using (true)
with check (true); -- Will be restricted by function logic

-- Wallet topup requests policies
create policy "Users can view their own topup requests"
on public.wallet_topup_requests for select to authenticated
using (user_id = auth.uid());

create policy "Users can insert their own topup requests"
on public.wallet_topup_requests for insert to authenticated
with check (user_id = auth.uid());

create policy "Admins can view all topup requests"
on public.wallet_topup_requests for select to authenticated
using (public.current_user_role() = 'admin');

create policy "Admins can update topup requests"
on public.wallet_topup_requests for update to authenticated
using (public.current_user_role() = 'admin');

-- Facial recognition payments policies
create policy "Users can view their own facial payments"
on public.facial_recognition_payments for select to authenticated
using (client_id = auth.uid() or mechanic_id = auth.uid());

create policy "Mechanics can insert facial payments"
on public.facial_recognition_payments for insert to authenticated
with check (mechanic_id = auth.uid() and public.current_user_role() = 'mechanic');

-- Admin GCash settings policies
create policy "Everyone can view active GCash settings"
on public.admin_gcash_settings for select to authenticated
using (is_active = true);

create policy "Admins can manage GCash settings"
on public.admin_gcash_settings for all to authenticated
using (public.current_user_role() = 'admin');

-- Insert default admin GCash settings
insert into public.admin_gcash_settings (account_name, account_number, is_active)
values ('AutoSOS Admin', '09123456789', true)
on conflict do nothing;

-- Function to approve wallet topup request (admin only)
create or replace function public.approve_wallet_topup(
  p_topup_id bigint,
  p_admin_notes text default null
) returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
  v_amount numeric(10,2);
  v_current_balance numeric(10,2);
begin
  -- Check if user is admin
  if public.current_user_role() != 'admin' then
    raise exception 'Access denied: Admin role required';
  end if;

  -- Get topup request details
  select user_id, amount into v_user_id, v_amount
  from public.wallet_topup_requests 
  where id = p_topup_id and status = 'pending';
  
  if not found then
    raise exception 'Topup request not found or already processed';
  end if;

  -- Update topup request status
  update public.wallet_topup_requests 
  set 
    status = 'approved',
    admin_notes = coalesce(p_admin_notes, 'Approved by admin'),
    processed_by = auth.uid(),
    processed_at = now()
  where id = p_topup_id;

  -- Get current user balance
  select wallet_balance into v_current_balance
  from public.profiles 
  where user_id = v_user_id;
  
  -- Update user wallet balance
  update public.profiles 
  set wallet_balance = coalesce(v_current_balance, 0) + v_amount
  where user_id = v_user_id;

  -- Create wallet transaction record
  insert into public.wallet_transactions (
    user_id,
    transaction_type,
    amount,
    status,
    payment_method,
    reference_number,
    description,
    processed_by,
    processed_at
  ) values (
    v_user_id,
    'topup',
    v_amount,
    'completed',
    'gcash',
    'TOPUP-' || p_topup_id,
    'GCash topup approved by admin',
    auth.uid(),
    now()
  );

  return true;
exception
  when others then
    raise exception 'Error approving topup: %', sqlerrm;
end;
$$;

-- Function to reject wallet topup request (admin only)
create or replace function public.reject_wallet_topup(
  p_topup_id bigint,
  p_admin_notes text
) returns boolean language plpgsql security definer set search_path = public as $$
begin
  -- Check if user is admin
  if public.current_user_role() != 'admin' then
    raise exception 'Access denied: Admin role required';
  end if;

  -- Update topup request status
  update public.wallet_topup_requests 
  set 
    status = 'rejected',
    admin_notes = p_admin_notes,
    processed_by = auth.uid(),
    processed_at = now()
  where id = p_topup_id and status = 'pending';
  
  if not found then
    raise exception 'Topup request not found or already processed';
  end if;

  return true;
exception
  when others then
    raise exception 'Error rejecting topup: %', sqlerrm;
end;
$$;

-- Grant execute permissions on wallet functions to authenticated users
grant execute on function public.approve_wallet_topup(bigint, text) to authenticated;
grant execute on function public.reject_wallet_topup(bigint, text) to authenticated;
grant execute on function public.get_wallet_balance(uuid) to authenticated;
grant execute on function public.get_wallet_transactions(uuid, int, int) to authenticated;

    