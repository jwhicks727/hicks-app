// Anna's drawings waiting in the family's storage: the `drawing_inbox` table and the private `drawings` bucket
// (supabase/migrations/20261108150000_drawing_inbox.sql). Files there can be added but not written over, so a
// file already in place from a try that got part way counts as sent. Each row says who sent it (`added_by`).
import { makeInbox } from './inboxStore.js'
import { DRAWING_SYNCED } from './drawingBatch.js'

export const drawingsInbox = makeInbox({
  table: 'drawing_inbox', bucket: 'drawings', upsert: false, keys: DRAWING_SYNCED, columns: 'id, data, added_by',
  rowExtra: (item) => ({ added_by: item.addedBy }),
  itemExtra: (row) => ({ addedBy: row.added_by }),
})
