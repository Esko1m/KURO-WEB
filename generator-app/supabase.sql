alter table koen_users add column if not exists expires_at timestamptz;
create index if not exists koen_users_expires_at_idx on koen_users (expires_at);