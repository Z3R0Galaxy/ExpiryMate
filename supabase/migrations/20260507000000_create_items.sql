create table items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  expiry_date date not null,
  created_at timestamptz default now()
);

alter table items enable row level security;

create policy "Users can manage their own items"
  on items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
