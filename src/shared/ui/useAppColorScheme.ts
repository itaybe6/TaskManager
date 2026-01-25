// We deliberately force a light UI for this Hebrew RTL app.
// If you want to re-enable dark mode later, switch this to `useColorScheme()`.
export function useAppColorScheme(): 'light' | 'dark' {
  return 'light';
}

