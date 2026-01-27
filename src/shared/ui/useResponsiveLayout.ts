import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

export type LayoutKind = 'list' | 'form' | 'detail' | 'narrow';

type LayoutResult = {
  width: number;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  maxWidth: number;
  paddingX: number;
  /** Use on FlatList/ScrollView contentContainerStyle */
  contentContainerStyle: {
    width: '100%';
    maxWidth: number;
    alignSelf: 'center';
  };
  /** Use to wrap an entire screen region (header+body+footer) so absolute footers don't stretch on web */
  frameStyle: {
    flex: 1;
    width: '100%';
    maxWidth: number;
    alignSelf: 'center';
  };
};

/**
 * Simple responsive primitives for RN + RN Web.
 * Goal: keep content readable on large screens by capping width and centering.
 */
export function useResponsiveLayout(kind: LayoutKind = 'list'): LayoutResult {
  const { width } = useWindowDimensions();

  return useMemo(() => {
    const isDesktop = width >= 1024;
    const isTablet = width >= 768 && width < 1024;
    const isPhone = width < 768;

    const paddingX = width < 360 ? 16 : width < 768 ? 20 : isDesktop ? 32 : 24;
    const available = Math.max(0, width - paddingX * 2);

    const maxWidth =
      kind === 'narrow'
        ? 520
        : kind === 'form'
          ? 720
          : kind === 'detail'
            ? (isDesktop ? 720 : 520)
            : Math.min(isDesktop ? 1400 : 980, available); // list

    return {
      width,
      isPhone,
      isTablet,
      isDesktop,
      maxWidth,
      paddingX,
      contentContainerStyle: {
        width: '100%' as const,
        maxWidth,
        alignSelf: 'center' as const,
      },
      frameStyle: {
        flex: 1,
        width: '100%' as const,
        maxWidth,
        alignSelf: 'center' as const,
      },
    };
  }, [kind, width]);
}

