-- Arena Beach Park: esquema inicial Supabase
create extension if not exists pgcrypto;
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null check (category in ('Petiscos','Espetos','Drinks e cervejas','Hidratação e energia','Refrigerantes')),
  prices numeric(10,2)[] not null check (cardinality(prices) > 0),
  options text[] not null default '{}',
  icon text not null default '•',
  active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(options)=0 or cardinality(options)=cardinality(prices))
);
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  customer_name text not null check (length(trim(customer_name)) between 1 and 80),
  location_label text,
  items jsonb not null check (jsonb_typeof(items)='array' and jsonb_array_length(items)>0),
  total numeric(10,2) not null check (total >= 0),
  status text not null default 'received' check (status in ('received','preparing','ready','delivered','cancelled')),
  source text not null default 'menu',
  created_at timestamptz not null default now()
);
create index if not exists products_active_sort_idx on public.products(active,sort_order);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.admin_users enable row level security;
drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products" on public.products for select to anon,authenticated using (active=true or exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products" on public.products for all to authenticated using (exists(select 1 from public.admin_users a where a.user_id=auth.uid())) with check (exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
drop policy if exists "Public can create orders" on public.orders;
create policy "Public can create orders" on public.orders for insert to anon,authenticated with check (status='received' and source='menu' and length(trim(customer_name)) between 1 and 80 and total>=0);
drop policy if exists "Admins read and update orders" on public.orders;
create policy "Admins read and update orders" on public.orders for select to authenticated using (exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
drop policy if exists "Admins update orders" on public.orders;
create policy "Admins update orders" on public.orders for update to authenticated using (exists(select 1 from public.admin_users a where a.user_id=auth.uid())) with check (exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
drop policy if exists "Admins read own admin record" on public.admin_users;
create policy "Admins read own admin record" on public.admin_users for select to authenticated using (user_id=auth.uid());
-- Adicione produtos com products-seed.json usando o SQL Editor ou o importador do Supabase.
-- Depois crie um usuário em Authentication > Users e cadastre sua autorização:
-- insert into public.admin_users(user_id) values ('UUID_DO_USUARIO_AUTH');
-- Habilite Realtime para public.orders e public.products em Database > Publications.
