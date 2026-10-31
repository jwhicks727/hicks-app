import { useEffect, useState } from 'react'

/** The current time, refreshed every minute (the sky and clocks follow it). */
export function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])
  return now
}
