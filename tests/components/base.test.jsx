import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithSettings } from '../helpers/render-with-settings';
import { useSettings } from '@/components/settings/SettingsProvider';
import { BrightnessOverlay } from '@/components/BrightnessOverlay';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { STORAGE_KEY } from '@/lib/preferences';

vi.mock('next/navigation', () => ({ usePathname: () => '/explorar', useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

function Probe() {
  const { resolvedTheme, loaded, updatePrefs } = useSettings();
  return (
    <>
      <p>tema:{resolvedTheme}:{String(loaded)}</p>
      <button onClick={() => updatePrefs({ theme: 'noturno', myProviders: [8] })}>mudar</button>
    </>
  );
}

describe('SettingsProvider', () => {
  it('carrega as preferências salvas e aplica no <html>', async () => {
    renderWithSettings(<Probe />, { theme: 'claro', calm: true, textSize: 'grande' });
    expect(await screen.findByText('tema:claro:true')).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('data-calm', 'true');
    expect(document.documentElement).toHaveAttribute('data-text', 'grande');
  });

  it('salva as mudanças no navegador e no cookie', async () => {
    renderWithSettings(<Probe />);
    await screen.findByText(/:true$/);
    await userEvent.click(screen.getByRole('button', { name: 'mudar' }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).theme).toBe('noturno'));
    expect(document.cookie).toContain('catalogo_streamings=8');
    expect(document.documentElement).toHaveAttribute('data-theme', 'noturno');
  });

  it('funciona com o armazenamento bloqueado', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
    renderWithSettings(<Probe />);
    expect(await screen.findByText('tema:claro:true')).toBeInTheDocument();
  });
});

describe('BrightnessOverlay', () => {
  it('escurece a tela no Noturno conforme o brilho', async () => {
    renderWithSettings(<BrightnessOverlay />, { theme: 'noturno', brightness: 40 });
    const overlay = await screen.findByTestId('brightness-overlay');
    expect(overlay).toHaveStyle({ opacity: '0.6' });
    expect(overlay).toHaveAttribute('aria-hidden', 'true');
  });

  it('não aparece fora do Noturno', async () => {
    renderWithSettings(<BrightnessOverlay />, { theme: 'escuro', brightness: 40 });
    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme', 'escuro'));
    expect(screen.queryByTestId('brightness-overlay')).not.toBeInTheDocument();
  });
});

describe('Header', () => {
  it('marca a página atual', () => {
    renderWithSettings(<Header />);
    expect(screen.getByRole('link', { name: 'Explorar' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current');
  });
});

describe('Footer', () => {
  it('mostra os créditos obrigatórios do TMDB e do JustWatch', () => {
    renderWithSettings(<Footer />);
    expect(screen.getByText('Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'TMDB' })).toHaveAttribute('href', 'https://www.themoviedb.org');
    expect(screen.getByRole('link', { name: 'JustWatch' })).toHaveAttribute('href', 'https://www.justwatch.com/br');
  });
});
