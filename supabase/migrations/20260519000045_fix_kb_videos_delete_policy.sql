-- Add missing delete policy for kb_videos
-- The original RLS migration (20260425000020_kb_rls.sql) did not include a delete policy for kb_videos.
-- The platform admin fix migration (20260519000044) updated insert/update but could not add delete
-- since it didn't exist. This migration adds the missing policy.

drop policy if exists "kb_videos_delete" on public.kb_videos;
create policy "kb_videos_delete" on public.kb_videos
  for delete using (
    public.is_platform_admin()
    or public.has_permission(company_id, 'kb:article:write')
  );
