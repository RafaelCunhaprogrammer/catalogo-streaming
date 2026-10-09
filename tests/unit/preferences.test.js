import { describe, it, expect, vi } from 'vitest';
import {
  STORAGE_KEY, defaultPrefs, parsePrefs, loadPrefs, savePrefs, resolveTheme, rootAttributes,
  nightOverlayOpacity, shouldAutoplayTrailer, shouldRotateHero, shouldPlayOpeningSound,
  providersCookieValue, parseProvidersCookie, writeProvidersCookie,
} from '@/lib/preferences';
import { bootstrapTheme, THEME_SCRIPT } from '@/lib/theme-bootstrap';

describe('parsePrefs', () => {
  it('sem nada salvo usa o padrão', () => {
    expect(parsePrefs(null)).toEqual({
      version: 1, theme: 'sistema', brightness: 60, textSize: 'normal',
      calm: false, highContrast: false, openingSound: true, myProviders: [],
    });
  });

  it('lê preferências válidas', () => {
    const saved = { version: 1, theme: 'noturno', brightness: 35, textSize: 'grande', calm: true, highContrast: true, openingSound: false, myProviders: [8, 119] };
    expect(parsePrefs(JSON.stringify(saved))).toEqual(saved);
  });

  it('JSON corrompido ou versão antiga voltam ao padrão', () => {
    expect(parsePrefs('{quebrado')).toEqual(defaultPrefs());
    expect(parsePrefs(JSON.stringify({ version: 0, theme: 'claro' }))).toEqual(defaultPrefs());
  });

  it('corrige valores fora da faixa ou desconhecidos', () => {
    const p = parsePrefs(JSON.stringify({ version: 1, theme: 'roxo', brightness: 500, textSize: 'gigante', calm: 'sim', myProviders: [8, 999, 'x'] }));
    expect(p).toMatchObject({ theme: 'sistema', brightness: 100, textSize: 'normal', calm: false, myProviders: [8] });
    expect(parsePrefs(JSON.stringify({ version: 1, brightness: 1 })).brightness).toBe(20);
    expect(parsePrefs(JSON.stringify({ version: 1, brightness: 'x' })).brightness).toBe(60);
  });

  it('defaultPrefs devolve uma cópia nova a cada vez', () => {
    const a = defaultPrefs();
    a.myProviders.push(8);
    expect(defaultPrefs().myProviders).toEqual([]);
  });
});

describe('armazenamento', () => {
  it('salva e carrega do localStorage', () => {
    const prefs = { ...defaultPrefs(), theme: 'claro' };
    expect(savePrefs(localStorage, prefs)).toBe(true);
    expect(loadPrefs(localStorage)).toEqual(prefs);
  });

  it('armazenamento bloqueado não quebra', () => {
    const blocked = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
    expect(loadPrefs(blocked)).toEqual(defaultPrefs());
    expect(savePrefs(blocked, defaultPrefs())).toBe(false);
    expect(loadPrefs(null)).toEqual(defaultPrefs());
  });
});

describe('comportamento por modo', () => {
  const base = defaultPrefs();

  it('resolve o tema do sistema', () => {
    expect(resolveTheme(base, true)).toBe('escuro');
    expect(resolveTheme(base, false)).toBe('claro');
    expect(resolveTheme({ ...base, theme: 'noturno' }, false)).toBe('noturno');
  });

  it('gera os atributos do <html>', () => {
    expect(rootAttributes({ ...base, textSize: 'grande', calm: true }, 'claro')).toEqual({
      'data-theme': 'claro', 'data-text': 'grande', 'data-calm': 'true', 'data-contrast': 'false',
    });
  });

  it('escurece só no Noturno', () => {
    expect(nightOverlayOpacity({ ...base, brightness: 40 }, 'noturno')).toBeCloseTo(0.6);
    expect(nightOverlayOpacity({ ...base, brightness: 100 }, 'noturno')).toBe(0);
    expect(nightOverlayOpacity({ ...base, brightness: 40 }, 'escuro')).toBe(0);
  });

  it('Modo sensorial calmo desliga trailer automático e troca do destaque', () => {
    expect(shouldAutoplayTrailer(base)).toBe(true);
    expect(shouldRotateHero(base)).toBe(true);
    expect(shouldAutoplayTrailer({ ...base, calm: true })).toBe(false);
    expect(shouldRotateHero({ ...base, calm: true })).toBe(false);
  });

  it('som de abertura respeita a opção, o Noturno e o Modo calmo', () => {
    expect(shouldPlayOpeningSound(base, 'escuro')).toBe(true);
    expect(shouldPlayOpeningSound(base, 'noturno')).toBe(false);
    expect(shouldPlayOpeningSound({ ...base, calm: true }, 'claro')).toBe(false);
    expect(shouldPlayOpeningSound({ ...base, openingSound: false }, 'claro')).toBe(false);
  });
});

describe('cookie de Meus streamings', () => {
  it('ida e volta, ignorando IDs desconhecidos', () => {
    expect(providersCookieValue([8, 119])).toBe('8.119');
    expect(parseProvidersCookie('8.119.999.x')).toEqual([8, 119]);
    expect(parseProvidersCookie(undefined)).toEqual([]);
  });

  it('grava o cookie no documento', () => {
    writeProvidersCookie([8]);
    expect(document.cookie).toContain('catalogo_streamings=8');
  });
});

describe('bootstrapTheme', () => {
  it('aplica as preferências salvas antes da página aparecer', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, theme: 'noturno', textSize: 'muito-grande', calm: true, highContrast: true }));
    bootstrapTheme();
    const root = document.documentElement;
    expect(root.getAttribute('data-theme')).toBe('noturno');
    expect(root.getAttribute('data-text')).toBe('muito-grande');
    expect(root.getAttribute('data-calm')).toBe('true');
    expect(root.getAttribute('data-contrast')).toBe('true');
  });

  it('sem preferências segue o sistema', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true });
    bootstrapTheme();
    expect(document.documentElement.getAttribute('data-theme')).toBe('escuro');
  });

  it('JSON corrompido não quebra', () => {
    localStorage.setItem(STORAGE_KEY, '{quebrado');
    expect(() => bootstrapTheme()).not.toThrow();
    expect(document.documentElement.getAttribute('data-text')).toBe('normal');
  });

  it('THEME_SCRIPT é um script autônomo que roda sozinho', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, theme: 'claro' }));
    new Function(THEME_SCRIPT)();
    expect(document.documentElement.getAttribute('data-theme')).toBe('claro');
  });
});
