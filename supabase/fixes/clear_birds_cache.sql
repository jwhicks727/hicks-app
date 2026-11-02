-- Run once after redeploying the birds function: forget the stored bird answers so the
-- next visit asks eBird again (instead of showing the old shape for up to an hour).
delete from public.outside_cache where key in ('birds', 'birds-more');
