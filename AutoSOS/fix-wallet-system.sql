-- AutoSOS Wallet System Database Schema
-- This script creates the complete wallet system for GCash receipts and facial recognition payments

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
alter table public.profiles add column if not exists phone text;

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
create table if not exists public.facial_payments (
  id bigserial primary key,
  client_id uuid not null references public.profiles(user_id) on delete cascade,
  mechanic_id uuid not null references public.profiles(user_id) on delete cascade,
  booking_id bigint references public.bookings(id) on delete cascade,
  amount numeric(10,2) not null,
  facial_verification_data jsonb, -- Store facial recognition results
  verification_photo text, -- Photo used for verification
  status public.transaction_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create admin GCash account settings table
create table if not exists public.admin_gcash_settings (
  id bigserial primary key,
  account_name text not null,
  account_number text not null,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Insert default admin GCash account (you can update this)
insert into public.admin_gcash_settings (account_name, account_number) 
values ('AutoSOS Admin', '09123456789') 
on conflict do nothing;

-- Create indexes for better performance
create index if not exists wallet_transactions_user_idx on public.wallet_transactions(user_id);
create index if not exists wallet_transactions_status_idx on public.wallet_transactions(status);
create index if not exists wallet_transactions_type_idx on public.wallet_transactions(transaction_type);
create index if not exists wallet_topup_requests_user_idx on public.wallet_topup_requests(user_id);
create index if not exists wallet_topup_requests_status_idx on public.wallet_topup_requests(status);
create index if not exists facial_payments_client_idx on public.facial_payments(client_id);
create index if not exists facial_payments_mechanic_idx on public.facial_payments(mechanic_id);
create index if not exists facial_payments_booking_idx on public.facial_payments(booking_id);

-- Enable RLS on all wallet tables
alter table public.wallet_transactions enable row level security;
alter table public.wallet_topup_requests enable row level security;
alter table public.facial_payments enable row level security;
alter table public.admin_gcash_settings enable row level security;

-- RLS Policies for wallet_transactions
drop policy if exists wallet_transactions_select_own on public.wallet_transactions;
create policy wallet_transactions_select_own on public.wallet_transactions
  for select to authenticated
  using (user_id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists wallet_transactions_insert_own on public.wallet_transactions;
create policy wallet_transactions_insert_own on public.wallet_transactions
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists wallet_transactions_update_admin on public.wallet_transactions;
create policy wallet_transactions_update_admin on public.wallet_transactions
  for update to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- RLS Policies for wallet_topup_requests
drop policy if exists wallet_topup_select_own on public.wallet_topup_requests;
create policy wallet_topup_select_own on public.wallet_topup_requests
  for select to authenticated
  using (user_id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists wallet_topup_insert_own on public.wallet_topup_requests;
create policy wallet_topup_insert_own on public.wallet_topup_requests
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists wallet_topup_update_admin on public.wallet_topup_requests;
create policy wallet_topup_update_admin on public.wallet_topup_requests
  for update to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- RLS Policies for facial_payments
drop policy if exists facial_payments_select_participants on public.facial_payments;
create policy facial_payments_select_participants on public.facial_payments
  for select to authenticated
  using (client_id = auth.uid() or mechanic_id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists facial_payments_insert_mechanic on public.facial_payments;
create policy facial_payments_insert_mechanic on public.facial_payments
  for insert to authenticated
  with check (mechanic_id = auth.uid() and public.current_user_role() = 'mechanic');

drop policy if exists facial_payments_update_admin on public.facial_payments;
create policy facial_payments_update_admin on public.facial_payments
  for update to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- RLS Policies for admin_gcash_settings (admin only)
drop policy if exists admin_gcash_select_admin on public.admin_gcash_settings;
create policy admin_gcash_select_admin on public.admin_gcash_settings
  for select to authenticated
  using (public.current_user_role() = 'admin');

drop policy if exists admin_gcash_update_admin on public.admin_gcash_settings;
create policy admin_gcash_update_admin on public.admin_gcash_settings
  for update to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Add updated_at triggers
drop trigger if exists wallet_transactions_set_updated_at on public.wallet_transactions;
create trigger wallet_transactions_set_updated_at
  before update on public.wallet_transactions
  for each row execute function public.set_updated_at();

drop trigger if exists wallet_topup_requests_set_updated_at on public.wallet_topup_requests;
create trigger wallet_topup_requests_set_updated_at
  before update on public.wallet_topup_requests
  for each row execute function public.set_updated_at();

drop trigger if exists facial_payments_set_updated_at on public.facial_payments;
create trigger facial_payments_set_updated_at
  before update on public.facial_payments
  for each row execute function public.set_updated_at();

-- Function to process wallet topup approval
create or replace function public.approve_wallet_topup(
  p_topup_id bigint,
  p_admin_notes text default null
) returns table (
  topup_id bigint,
  user_id uuid,
  amount numeric,
  new_balance numeric
) language plpgsql security definer set search_path = public as $$
declare
  v_topup record;
  v_new_balance numeric;
begin
  -- Check if user is admin
  if public.current_user_role() <> 'admin' then
    raise exception 'Only admin can approve topup requests';
  end if;

  -- Get topup request details
  select * into v_topup
  from public.wallet_topup_requests
  where id = p_topup_id and status = 'pending';

  if not found then
    raise exception 'Topup request not found or already processed';
  end if;

  -- Update topup request status
  update public.wallet_topup_requests
  set status = 'approved',
      admin_notes = p_admin_notes,
      processed_by = auth.uid(),
      processed_at = now()
  where id = p_topup_id;

  -- Update user's wallet balance
  update public.profiles
  set wallet_balance = wallet_balance + v_topup.amount
  where user_id = v_topup.user_id
  returning wallet_balance into v_new_balance;

  -- Create wallet transaction record
  insert into public.wallet_transactions (
    user_id, transaction_type, amount, status, payment_method,
    reference_number, description, processed_by, processed_at
  ) values (
    v_topup.user_id, 'topup', v_topup.amount, 'completed', 'gcash',
    v_topup.gcash_reference, 'GCash topup approved', auth.uid(), now()
  );

  -- Return results
  return query select p_topup_id, v_topup.user_id, v_topup.amount, v_new_balance;
end$$;

-- Function to reject wallet topup
create or replace function public.reject_wallet_topup(
  p_topup_id bigint,
  p_admin_notes text
) returns boolean language plpgsql security definer set search_path = public as $$
begin
  -- Check if user is admin
  if public.current_user_role() <> 'admin' then
    raise exception 'Only admin can reject topup requests';
  end if;

  -- Update topup request status
  update public.wallet_topup_requests
  set status = 'rejected',
      admin_notes = p_admin_notes,
      processed_by = auth.uid(),
      processed_at = now()
  where id = p_topup_id and status = 'pending';

  if not found then
    raise exception 'Topup request not found or already processed';
  end if;

  return true;
end$$;

-- Function to process facial recognition payment
create or replace function public.process_facial_payment(
  p_booking_id bigint,
  p_amount numeric,
  p_verification_photo text,
  p_facial_data jsonb default null
) returns table (
  payment_id bigint,
  client_id uuid,
  mechanic_id uuid,
  amount numeric,
  status text
) language plpgsql security definer set search_path = public as $$
declare
  v_booking record;
  v_payment_id bigint;
begin
  -- Check if user is mechanic
  if public.current_user_role() <> 'mechanic' then
    raise exception 'Only mechanics can process facial payments';
  end if;

  -- Get booking details
  select * into v_booking
  from public.bookings
  where id = p_booking_id and mechanic_id = auth.uid() and status = 'completed';

  if not found then
    raise exception 'Booking not found or not completed';
  end if;

  -- Check if client has sufficient balance
  if (select wallet_balance from public.profiles where user_id = v_booking.client_id) < p_amount then
    raise exception 'Insufficient wallet balance';
  end if;

  -- Create facial payment record
  insert into public.facial_payments (
    client_id, mechanic_id, booking_id, amount, verification_photo, facial_verification_data, status
  ) values (
    v_booking.client_id, auth.uid(), p_booking_id, p_amount, p_verification_photo, p_facial_data, 'completed'
  ) returning id into v_payment_id;

  -- Deduct from client's wallet
  update public.profiles
  set wallet_balance = wallet_balance - p_amount
  where user_id = v_booking.client_id;

  -- Add to mechanic's wallet
  update public.profiles
  set wallet_balance = wallet_balance + p_amount
  where user_id = auth.uid();

  -- Create transaction records
  insert into public.wallet_transactions (
    user_id, transaction_type, amount, status, payment_method, reference_number, description
  ) values 
  (v_booking.client_id, 'payment', p_amount, 'completed', 'facial_recognition', p_booking_id::text, 'Payment to mechanic via facial recognition'),
  (auth.uid(), 'payment', p_amount, 'completed', 'facial_recognition', p_booking_id::text, 'Payment received from client via facial recognition');

  -- Return results
  return query select v_payment_id, v_booking.client_id, auth.uid(), p_amount, 'completed'::text;
end$$;

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

-- Storage policies for facial verification photos
drop policy if exists "Facial photos: participants read" on storage.objects;
create policy "Facial photos: participants read"
on storage.objects for select to authenticated
using (
  bucket_id = 'autosos'
  and (storage.foldername(name))[1] = 'facial_verification'
  and (
    (storage.foldername(name))[2] = auth.uid()::text
    or public.current_user_role() = 'admin'
  )
);

drop policy if exists "Facial photos: mechanics insert" on storage.objects;
create policy "Facial photos: mechanics insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'autosos'
  and (storage.foldername(name))[1] = 'facial_verification'
  and (storage.foldername(name))[2] = auth.uid()::text
  and public.current_user_role() = 'mechanic'
);
