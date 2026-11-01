-- Either parent can take back the nightly eBird sync's yes, whoever recorded it,
-- so Laurie can always stop a sync Jason switched on for her (docs/DECISIONS-LOG.md).
-- Recording a yes stays limited to the person recording it (said_yes_by = their own id).
drop policy consents_remove on public.sync_consents;
create policy consents_remove on public.sync_consents for delete to authenticated using ((select public.is_parent()));
