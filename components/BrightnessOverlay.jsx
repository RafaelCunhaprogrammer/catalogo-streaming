'use client';

import { useSettings } from '@/components/settings/SettingsProvider';
import { nightOverlayOpacity } from '@/lib/preferences';

// Camada preta por cima de tudo (inclusive vídeos), sem bloquear cliques.
export function BrightnessOverlay() {
  const { prefs, resolvedTheme } = useSettings();
  const opacity = nightOverlayOpacity(prefs, resolvedTheme);
  if (!opacity) return null;
  return (
    <div
      data-testid="brightness-overlay"
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[100] bg-black"
      style={{ opacity }}
    />
  );
}
