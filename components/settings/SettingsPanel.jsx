'use client';

import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Moon, MoonStar, Sun, X } from 'lucide-react';
import { useSettings } from './SettingsProvider';
import { useDialogFocus } from '@/components/useDialogFocus';
import { PROVIDERS } from '@/lib/providers';
import { writeProvidersCookie } from '@/lib/preferences';

// Cada cartão mostra uma miniatura do modo (cores fixas, para a prévia não mudar com o tema atual).
const THEME_OPTIONS = [
  { value: 'escuro', label: 'Escuro', hint: 'Padrão, com neon', Icon: Moon, preview: { bg: '#0d0820', card: '#241646', accent: 'linear-gradient(90deg,#8b5cf6,#ec4899)' } },
  { value: 'claro', label: 'Claro', hint: 'Para ambientes iluminados', Icon: Sun, preview: { bg: '#f6f3fb', card: '#ede7f8', accent: 'linear-gradient(90deg,#7c3aed,#db2777)' } },
  { value: 'noturno', label: 'Noturno', hint: 'Quarto escuro, brilho ajustável', Icon: MoonStar, preview: { bg: '#05030a', card: '#160f26', accent: '#2e1a52' } },
];

const TEXT_OPTIONS = [
  { value: 'normal', label: 'Normal', sample: 'text-base' },
  { value: 'grande', label: 'Grande', sample: 'text-lg' },
  { value: 'muito-grande', label: 'Muito grande', sample: 'text-xl' },
];

function ThemeCard({ option, checked, onChange }) {
  const { Icon, preview } = option;
  return (
    <label className="group cursor-pointer rounded-xl border-2 border-line p-2 transition has-checked:border-accent-2 has-focus-visible:outline-3 has-focus-visible:outline-accent-2">
      <input
        type="radio"
        name="tema"
        value={option.value}
        checked={checked}
        onChange={onChange}
        aria-label={option.label}
        aria-describedby={`tema-${option.value}-dica`}
        className="sr-only"
      />
      <span aria-hidden="true" className="block h-20 overflow-hidden rounded-lg p-2" style={{ background: preview.bg }}>
        <span className="block h-2.5 w-1/2 rounded" style={{ background: preview.accent }} />
        <span className="mt-2 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="block h-8 w-6 rounded" style={{ background: preview.card }} />
          ))}
        </span>
      </span>
      <span className="mt-2 flex items-center gap-2 px-1 font-semibold">
        <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
        {option.label}
        {checked && <Check aria-hidden="true" className="ml-auto h-5 w-5 text-accent-2" />}
      </span>
      <span id={`tema-${option.value}-dica`} className="block px-1 text-sm text-muted">{option.hint}</span>
    </label>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-line p-4 hover:bg-surface-2">
      <span>
        <span className="block font-semibold">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-muted">{description}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-6 w-6 shrink-0 accent-[var(--accent)]"
      />
    </label>
  );
}

function SectionTitle({ children }) {
  return <legend className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">{children}</legend>;
}

export function SettingsPanel({ open, onClose }) {
  const { prefs, resolvedTheme, updatePrefs } = useSettings();
  const router = useRouter();
  const panelRef = useRef(null);
  const guards = useDialogFocus(panelRef, open, onClose);

  function toggleProvider(id) {
    const next = prefs.myProviders.includes(id)
      ? prefs.myProviders.filter((p) => p !== id)
      : [...prefs.myProviders, id];
    writeProvidersCookie(next);
    updatePrefs({ myProviders: next });
    router.refresh();
  }

  // Portal: a janela é desenhada direto no <body>. Dentro do topo (que tem backdrop-blur),
  // position: fixed ficaria presa ao tamanho do topo em vez da tela inteira.
  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="fundo"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-0 backdrop-blur-sm sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="config-titulo"
            onClick={(e) => e.stopPropagation()}
            className="h-full w-full overflow-y-auto bg-surface text-fg shadow-glow sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-2xl sm:border sm:border-line"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'tween', duration: 0.2 }}
          >
            {guards.start}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface/95 px-6 py-4 backdrop-blur">
              <h2 id="config-titulo" className="text-2xl font-black">Configurações</h2>
              <button onClick={onClose} aria-label="Fechar configurações" className="rounded-full p-2 hover:bg-surface-2">
                <X aria-hidden="true" className="h-6 w-6" />
              </button>
            </div>

            <div className="grid gap-8 p-6 md:grid-cols-2">
              <div className="space-y-8">
                <fieldset>
                  <SectionTitle>Aparência</SectionTitle>
                  <div className="grid grid-cols-3 gap-3">
                    {THEME_OPTIONS.map((option) => (
                      <ThemeCard
                        key={option.value}
                        option={option}
                        checked={resolvedTheme === option.value}
                        onChange={() => updatePrefs({ theme: option.value })}
                      />
                    ))}
                  </div>
                  {resolvedTheme === 'noturno' && (
                    <label className="mt-5 block rounded-xl border border-line p-4">
                      <span className="flex justify-between font-semibold">
                        Brilho <span className="text-muted">{prefs.brightness}%</span>
                      </span>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        step="5"
                        value={prefs.brightness}
                        aria-label={`Brilho: ${prefs.brightness}%`}
                        onChange={(e) => updatePrefs({ brightness: Number(e.target.value) })}
                        className="mt-3 h-2 w-full accent-[var(--accent)]"
                      />
                    </label>
                  )}
                </fieldset>

                <fieldset>
                  <SectionTitle>Tamanho do texto</SectionTitle>
                  <div className="grid grid-cols-3 gap-3">
                    {TEXT_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className="cursor-pointer rounded-xl border-2 border-line px-3 py-3 text-center transition has-checked:border-accent-2 has-checked:font-bold has-focus-visible:outline-3 has-focus-visible:outline-accent-2"
                      >
                        <input
                          type="radio"
                          name="texto"
                          value={option.value}
                          checked={prefs.textSize === option.value}
                          onChange={() => updatePrefs({ textSize: option.value })}
                          className="sr-only"
                        />
                        <span aria-hidden="true" className={`block font-black ${option.sample}`}>Aa</span>
                        <span className="text-sm">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>

              <div className="space-y-8">
                <fieldset className="space-y-3">
                  <SectionTitle>Acessibilidade</SectionTitle>
                  <Toggle
                    label="Modo sensorial calmo"
                    description="Sem vídeos automáticos, brilhos ou animações."
                    checked={prefs.calm}
                    onChange={(calm) => updatePrefs({ calm })}
                  />
                  <Toggle
                    label="Alto contraste"
                    description="Cores mais fortes para baixa visão."
                    checked={prefs.highContrast}
                    onChange={(highContrast) => updatePrefs({ highContrast })}
                  />
                </fieldset>

                <fieldset>
                  <SectionTitle>Meus streamings</SectionTitle>
                  <p className="-mt-1 mb-3 text-sm text-muted">Marque os serviços que você assina. Sem nenhum marcado, mostramos todos.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {PROVIDERS.map((provider) => (
                      <label
                        key={provider.id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-line px-3 py-2.5 hover:bg-surface-2 has-checked:border-accent-2"
                      >
                        <input
                          type="checkbox"
                          checked={prefs.myProviders.includes(provider.id)}
                          onChange={() => toggleProvider(provider.id)}
                          className="h-5 w-5 accent-[var(--accent)]"
                        />
                        {provider.name}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
            </div>
            {guards.end}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
