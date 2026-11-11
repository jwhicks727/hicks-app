import { useMemo } from 'react'
import { useNow } from '../lib/useNow.js'
import { useWeather } from '../lib/useWeather.js'
import { atmosphereAt } from './atmosphere.js'
import { useSkyTry } from './skyTry.js'

/**
 * The air of the academy just now (src/academy/atmosphere.js): the hour by the clock, the forecast at home
 * (the one Home's weather card keeps, asked at most every quarter hour), and a pretend sky if someone is
 * trying one on. Until the forecast arrives, or if it can't be reached, there is no weather: only the real
 * sun and moon.
 */
export function useAtmosphere() {
  const now = useNow()
  const { forecast, error } = useWeather()
  const [tryOn] = useSkyTry()
  return useMemo(() => atmosphereAt({ now, forecast, tryOn, waiting: !error }), [now, forecast, tryOn, error])
}
