-- Notekeeper cloud sync: the whole backend in one run (issue #2, §8).
-- Run it in the Supabase SQL editor, or locally with `npx supabase start`.

-- ---------------------------------------------------------------------------
-- records: every folder, card, notebook and canvas item, with tombstones
-- ---------------------------------------------------------------------------

create table public.records (
  user_id           uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  kind              text        not null check (kind in ('folder', 'card', 'notebook', 'canvas_item')),
  -- The app's own id. Starter ids such as `f-start` repeat across users, hence the composite key.
  id                text        not null,
  -- The item exactly as the store holds it; `{}` for a tombstone. Images must be URLs, not base64.
  data              jsonb       not null default '{}'::jsonb check (pg_column_size(data) < 1048576),
  deleted           boolean     not null default false,
  -- Client time of the edit in ms: the last-write-wins key.
  modified_at       bigint      not null,
  -- Random device id: tie-break and echo detection.
  modified_by       text        not null,
  -- The pull cursor, set by the trigger below.
  server_updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, kind, id)
);

create index records_pull_idx on public.records (user_id, server_updated_at);

create function public.touch_server_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.server_updated_at := clock_timestamp();
  return new;
end
$$;

create trigger records_touch before insert or update on public.records
  for each row execute function public.touch_server_updated_at();

alter table public.records enable row level security;

create policy "own rows: read"   on public.records for select to authenticated using (user_id = (select auth.uid()));
create policy "own rows: insert" on public.records for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own rows: update" on public.records for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows: delete" on public.records for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.records from anon;

-- Realtime only nudges other devices to pull; RLS decides who hears about which row.
alter publication supabase_realtime add table public.records;

-- ---------------------------------------------------------------------------
-- push_records: conditional upsert, last write wins, in one round trip
-- ---------------------------------------------------------------------------

-- `changes` is an array of { kind, id, data, deleted, modified_at, modified_by }.
-- Returns { applied: ["kind:id"], skipped: ["kind:id"], server_time }. A skipped
-- change lost to a newer version already stored, which the next pull delivers.
create function public.push_records(changes jsonb) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  applied  text[];
  incoming text[];
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if jsonb_typeof(changes) is distinct from 'array' then
    raise exception 'changes must be a JSON array' using errcode = '22023';
  end if;
  if jsonb_array_length(changes) > 200 then
    raise exception 'at most 200 changes per call' using errcode = '54000';
  end if;
  if octet_length(changes::text) > 2 * 1024 * 1024 then
    raise exception 'at most 2 MB per call' using errcode = '54000';
  end if;

  select coalesce(array_agg(c.kind || ':' || c.id), '{}')
    into incoming
    from jsonb_to_recordset(changes) as c(kind text, id text);

  with upserted as (
    insert into public.records as r (user_id, kind, id, data, deleted, modified_at, modified_by)
    select auth.uid(),
           c.kind,
           c.id,
           case when coalesce(c.deleted, false) then '{}'::jsonb else coalesce(c.data, '{}'::jsonb) end,
           coalesce(c.deleted, false),
           c.modified_at,
           c.modified_by
      from jsonb_to_recordset(changes)
        as c(kind text, id text, data jsonb, deleted boolean, modified_at bigint, modified_by text)
    on conflict (user_id, kind, id) do update
      set data        = excluded.data,
          deleted     = excluded.deleted,
          modified_at = excluded.modified_at,
          modified_by = excluded.modified_by
      where (excluded.modified_at, excluded.modified_by) > (r.modified_at, r.modified_by)
    returning r.kind, r.id
  )
  select coalesce(array_agg(u.kind || ':' || u.id), '{}') into applied from upserted u;

  return jsonb_build_object(
    'applied', to_jsonb(applied),
    'skipped', to_jsonb(array(select k from unnest(incoming) k where k <> all (applied))),
    'server_time', clock_timestamp()
  );
end
$$;

revoke execute on function public.push_records(jsonb) from public, anon;
grant execute on function public.push_records(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- delete_my_account: removes the caller's sign-in; records go by cascade
-- ---------------------------------------------------------------------------

-- Supabase blocks deleting storage.objects rows from SQL, and doing so would
-- leave the files behind. The client therefore empties `note-images/<uid>/`
-- through the Storage API first, then calls this.
create function public.delete_my_account() returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  delete from auth.users where id = uid;
end
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: note-images, public read with unguessable paths
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('note-images', 'note-images', true, 10485760,
        array['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

-- Paths are `<user_id>/<random uuid>.<ext>`. Files are served through the public
-- URL, so there is no policy for anon and nobody can list the bucket. The owner's
-- select policy is needed for upserts and removals through the Storage API.
create policy "note-images: owner reads" on storage.objects for select to authenticated
  using (bucket_id = 'note-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "note-images: owner inserts" on storage.objects for insert to authenticated
  with check (bucket_id = 'note-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "note-images: owner updates" on storage.objects for update to authenticated
  using (bucket_id = 'note-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'note-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "note-images: owner deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'note-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------------
-- Daily purge of tombstones older than 90 days (SYNC-10)
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'purge-old-tombstones',
  '17 3 * * *',
  $$delete from public.records
      where deleted and server_updated_at < now() - interval '90 days'$$
);
