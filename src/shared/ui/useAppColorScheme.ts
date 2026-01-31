import { useAppColorSchemeStore, type AppColorScheme } from './appColorSchemeStore';

export function useAppColorScheme(): AppColorScheme {
  return useAppColorSchemeStore((s) => s.scheme);
}

export function useToggleAppColorScheme() {
  return useAppColorSchemeStore((s) => s.toggleScheme);
}

export function useSetAppColorScheme() {
  return useAppColorSchemeStore((s) => s.setScheme);
}

export function useIsAppColorSchemeHydrated() {
  return useAppColorSchemeStore((s) => s.isHydrated);
}

export async function bootstrapAppColorScheme() {
  await useAppColorSchemeStore.getState().hydrate();
}

