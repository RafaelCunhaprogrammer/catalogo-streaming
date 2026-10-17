import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { SettingsProvider, useSettings, PREFS_SAVE_DEBOUNCE_MS } from '@/components/settings/SettingsProvider';
import { STORAGE_KEY, defaultPrefs } from '@/lib/preferences';

function Probe() {
  const { prefs, updatePrefs } = useSettings();
  return (
    <>
      <p>tema:{prefs.theme} brilho:{prefs.brightness}</p>
      <button onClick={() => updatePrefs({ brightness: 40 })}>40</button>
      <button onClick={() => updatePrefs({ brightness: 30 })}>30</button>
    </>
  );
}

const flush = () => act(async () => {});
afterEach(() => vi.useRealTimers());

describe('preferências do perfil', () => {
  it('usa as preferências do perfil, não as do navegador', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...defaultPrefs(), theme: 'claro' }));
    render(<SettingsProvider initialPrefs={{ ...defaultPrefs(), theme: 'noturno' }} onSave={vi.fn()}><Probe /></SettingsProvider>);
    await flush();
    expect(screen.getByText(/tema:noturno/)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).theme).toBe('noturno'); // espelho para o script do <head>
  });

  it('grava no perfil uma vez, agrupando mudanças seguidas', async () => {
    vi.useFakeTimers();
    const onSave = vi.fn().mockResolvedValue({ ok: true });
    render(<SettingsProvider initialPrefs={defaultPrefs()} onSave={onSave}><Probe /></SettingsProvider>);
    await flush();
    expect(onSave).not.toHaveBeenCalled(); // carregar não grava
    await act(async () => { screen.getByText('40').click(); });
    await act(async () => { vi.advanceTimersByTime(PREFS_SAVE_DEBOUNCE_MS - 100); });
    await act(async () => { screen.getByText('30').click(); });
    await act(async () => { vi.advanceTimersByTime(PREFS_SAVE_DEBOUNCE_MS); });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({ brightness: 30 });
  });

  it('visitante continua só com o navegador', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...defaultPrefs(), theme: 'claro' }));
    render(<SettingsProvider><Probe /></SettingsProvider>);
    await flush();
    expect(screen.getByText(/tema:claro/)).toBeInTheDocument();
  });
});
