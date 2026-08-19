-- ============================================================================
-- PHOTOWALKS IN PUNE — 0005 · A HARD CEILING ON STORED IMAGES
-- ----------------------------------------------------------------------------
-- No stored image may exceed 200KB.
--
-- The browser already compresses every upload to fit (see prepareImage in
-- lib/uploads.ts), but that is the polite half: it runs on the client, and a
-- client is something anybody can replace with curl. This is the half that
-- actually holds. Storage refuses a larger object outright, so the ceiling is
-- a property of the bucket rather than a promise made by the uploader.
--
-- Why 200KB matters here: at 500 members × 20 photographs it is the
-- difference between ~2GB and ~67GB of storage, and the same again in egress.
--
-- The file picker still accepts up to 10MB — people choose camera originals,
-- and the point is to compress them, not to make them do it by hand. What
-- changes is what may be *stored*.
-- ============================================================================

update storage.buckets
   set file_size_limit = 204800  -- 200 KiB
 where id in ('avatars', 'photos');

-- Anything already stored above the new ceiling predates it. Nothing is
-- deleted here — that is a decision for a person, not a migration — but this
-- makes them easy to find:
--
--   select bucket_id, name, (metadata->>'size')::bigint as bytes
--   from storage.objects
--   where bucket_id in ('avatars','photos')
--     and (metadata->>'size')::bigint > 204800
--   order by bytes desc;
