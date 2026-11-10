// Skipping one thing for one day, on purpose (a night at the play, a dose left out
// for a reason): it comes off that day's list without a tick, so nothing is
// "done" that wasn't, and a streak neither grows nor breaks on it. It is the
// `skip` change the lists' table already holds; Undo and "Put back" remove it.

/** `{ onSkip, onUnskip }` for a RoutineList; `L` is useLists(), `onToast` shows the Undo. */
export function skipHandlers(L, { part, today, onToast }) {
  return {
    onSkip: async (entry) => {
      const c = await L.addChange({ on_date: today, part, kind: 'skip', item_id: entry.id })
      if (c) onToast({ text: `Skipped “${entry.title}” for today. It isn’t ticked.`, undo: () => L.removeChange(c.id) })
    },
    onUnskip: (entry) => {
      const c = L.changes.find((x) => x.kind === 'skip' && x.item_id === entry.id && x.on_date === today)
      if (c) L.removeChange(c.id)
    },
  }
}
