import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Which build a device is running, shown in Settings: the commit the deploy was built from
// (GitHub sets GITHUB_SHA) and the day, or "development" on a computer
const build = (process.env.GITHUB_SHA || '').slice(0, 7)
const stamp = build ? `${build}, built ${new Date().toISOString().slice(0, 10)}` : 'development'

export default defineConfig({
  plugins: [react()],
  define: { 'import.meta.env.VITE_APP_BUILD': JSON.stringify(stamp) },
})
