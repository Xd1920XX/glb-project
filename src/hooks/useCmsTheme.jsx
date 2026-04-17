import { useState, useEffect } from 'react'

export function useCmsTheme() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('cms-dark') === '1'
    // Apply synchronously to avoid flash on authenticated pages
    document.documentElement.setAttribute('data-cms-dark', stored ? 'true' : 'false')
    return stored
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-cms-dark', dark ? 'true' : 'false')
    localStorage.setItem('cms-dark', dark ? '1' : '0')
  }, [dark])

  return { dark, toggleDark: () => setDark((v) => !v) }
}
