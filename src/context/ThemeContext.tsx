import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Theme, dark, cream } from '../constants/theme'

type ThemeMode = 'dark' | 'cream'

interface ThemeContextValue {
  theme: Theme
  mode: ThemeMode
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: dark,
  mode: 'dark',
  toggleTheme: () => {},
})

const STORAGE_KEY = 'altianly_theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark')

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'cream' || saved === 'dark') setMode(saved)
    })
  }, [])

  function toggleTheme() {
    setMode((prev) => {
      const next = prev === 'dark' ? 'cream' : 'dark'
      AsyncStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }

  const theme = mode === 'dark' ? dark : cream

  return (
    <ThemeContext.Provider value={{ theme, mode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
