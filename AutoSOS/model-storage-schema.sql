-- =====================================================
-- ML MODEL STORAGE SCHEMA FOR SUPABASE
-- =====================================================

-- Create model type enum
do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'model_type' and n.nspname = 'public') then
    create type public.model_type as enum ('yolov8', 'facenet', 'custom');
  end if;
end $$;

-- Create model status enum
do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'model_status' and n.nspname = 'public') then
    create type public.model_status as enum ('active', 'inactive', 'deprecated', 'training');
  end if;
end $$;

-- Create ML models table
create table if not exists public.ml_models (
  id bigserial primary key,
  model_name text not null,
  model_type public.model_type not null,
  version text not null,
  description text,
  file_path text not null, -- Storage path in models bucket
  file_size bigint, -- File size in bytes
  file_hash text, -- SHA256 hash for integrity verification
  model_config jsonb, -- Model configuration (input size, classes, etc.)
  performance_metrics jsonb, -- Accuracy, precision, recall, etc.
  status public.model_status not null default 'active',
  is_default boolean not null default false, -- Default model for this type
  created_by uuid references public.profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Ensure only one default model per type
  constraint unique_default_per_type unique (model_type, is_default)
);

-- Create model usage tracking table
create table if not exists public.model_usage_logs (
  id bigserial primary key,
  model_id bigint not null references public.ml_models(id) on delete cascade,
  user_id uuid references public.profiles(user_id),
  inference_time_ms integer, -- Time taken for inference
  input_size text, -- Input image/video dimensions
  confidence_score numeric, -- Average confidence score
  success boolean not null default true,
  error_message text,
  created_at timestamptz not null default now()
);

-- Create indexes for better performance
create index if not exists ml_models_type_status_idx on public.ml_models(model_type, status);
create index if not exists ml_models_default_idx on public.ml_models(model_type, is_default) where is_default = true;
create index if not exists model_usage_logs_model_id_idx on public.model_usage_logs(model_id);
create index if not exists model_usage_logs_created_at_idx on public.model_usage_logs(created_at);

-- Set up updated_at triggers
drop trigger if exists ml_models_set_updated_at on public.ml_models;
create trigger ml_models_set_updated_at
  before update on public.ml_models
  for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.ml_models enable row level security;
alter table public.model_usage_logs enable row level security;

-- RLS Policies for ml_models
-- Everyone can read active models
create policy "Anyone can read active models"
on public.ml_models for select
to public
using (status = 'active');

-- Authenticated users can read all models
create policy "Authenticated users can read all models"
on public.ml_models for select
to authenticated
using (true);

-- Only admins can insert/update/delete models
create policy "Admins can manage models"
on public.ml_models for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

-- RLS Policies for model_usage_logs
-- Users can insert their own usage logs
create policy "Users can insert their own usage logs"
on public.model_usage_logs for insert
to authenticated
with check (user_id = auth.uid() or user_id is null);

-- Users can read their own usage logs
create policy "Users can read their own usage logs"
on public.model_usage_logs for select
to authenticated
using (user_id = auth.uid() or public.current_user_role() = 'admin');

-- Function to get active model by type
create or replace function public.get_active_model(p_model_type public.model_type)
returns table (
  id bigint,
  model_name text,
  version text,
  file_path text,
  file_size bigint,
  file_hash text,
  model_config jsonb,
  performance_metrics jsonb
) language sql security definer set search_path = public as $$
  select 
    m.id,
    m.model_name,
    m.version,
    m.file_path,
    m.file_size,
    m.file_hash,
    m.model_config,
    m.performance_metrics
  from public.ml_models m
  where m.model_type = p_model_type 
    and m.status = 'active'
    and m.is_default = true
  limit 1;
$$;

-- Function to get latest model by type
create or replace function public.get_latest_model(p_model_type public.model_type)
returns table (
  id bigint,
  model_name text,
  version text,
  file_path text,
  file_size bigint,
  file_hash text,
  model_config jsonb,
  performance_metrics jsonb
) language sql security definer set search_path = public as $$
  select 
    m.id,
    m.model_name,
    m.version,
    m.file_path,
    m.file_size,
    m.file_hash,
    m.model_config,
    m.performance_metrics
  from public.ml_models m
  where m.model_type = p_model_type 
    and m.status = 'active'
  order by m.created_at desc
  limit 1;
$$;

-- Function to log model usage
create or replace function public.log_model_usage(
  p_model_id bigint,
  p_inference_time_ms integer default null,
  p_input_size text default null,
  p_confidence_score numeric default null,
  p_success boolean default true,
  p_error_message text default null
) returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_log_id bigint;
begin
  insert into public.model_usage_logs (
    model_id,
    user_id,
    inference_time_ms,
    input_size,
    confidence_score,
    success,
    error_message
  ) values (
    p_model_id,
    auth.uid(),
    p_inference_time_ms,
    p_input_size,
    p_confidence_score,
    p_success,
    p_error_message
  ) returning id into v_log_id;
  
  return v_log_id;
end;
$$;

-- Function to set default model (admin only)
create or replace function public.set_default_model(
  p_model_id bigint
) returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_model_type public.model_type;
begin
  -- Check if user is admin
  if public.current_user_role() != 'admin' then
    raise exception 'Access denied: Admin role required';
  end if;

  -- Get model type
  select model_type into v_model_type
  from public.ml_models
  where id = p_model_id and status = 'active';
  
  if not found then
    raise exception 'Model not found or not active';
  end if;

  -- Clear existing default for this model type
  update public.ml_models 
  set is_default = false 
  where model_type = v_model_type and is_default = true;

  -- Set new default
  update public.ml_models 
  set is_default = true 
  where id = p_model_id;

  return true;
exception
  when others then
    raise exception 'Error setting default model: %', sqlerrm;
end;
$$;

-- Grant execute permissions
grant execute on function public.get_active_model(public.model_type) to public;
grant execute on function public.get_latest_model(public.model_type) to public;
grant execute on function public.log_model_usage(bigint, integer, text, numeric, boolean, text) to authenticated;
grant execute on function public.set_default_model(bigint) to authenticated;

-- Insert default YOLOv8 model record (placeholder)
insert into public.ml_models (
  model_name,
  model_type,
  version,
  description,
  file_path,
  model_config,
  performance_metrics,
  status,
  is_default
) values (
  'YOLOv8 Motorcycle Diagnostic',
  'yolov8',
  '1.0.0',
  'YOLOv8 model for motorcycle diagnostic detection',
  'models/yolov8/motorcycle_diagnostic_v1.pt',
  '{"input_size": [640, 640], "classes": ["engine_issue", "brake_issue", "tire_issue", "battery_low"], "confidence_threshold": 0.5}',
  '{"accuracy": 0.92, "precision": 0.89, "recall": 0.91, "f1_score": 0.90}',
  'active',
  true
) on conflict do nothing;

-- Insert default FaceNet model record (placeholder)
insert into public.ml_models (
  model_name,
  model_type,
  version,
  description,
  file_path,
  model_config,
  performance_metrics,
  status,
  is_default
) values (
  'FaceNet Mobile Payment Auth',
  'facenet',
  '1.0.0',
  'FaceNet model for facial recognition payment authentication',
  'models/facenet/mobile_payment_auth_v1.tflite',
  '{"input_size": [112, 112], "embedding_size": 128, "threshold": 0.6}',
  '{"accuracy": 0.95, "precision": 0.94, "recall": 0.96, "f1_score": 0.95}',
  'active',
  true
) on conflict do nothing;
