import { render } from '@testing-library/react';
import { SettingsProvider } from '@/components/settings/SettingsProvider';
import { STORAGE_KEY } from '@/lib/preferences';

export function renderWithSettings(ui, prefs) {
  if (prefs) localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...prefs }));
  return render(<SettingsProvider>{ui}</SettingsProvider>);
}
