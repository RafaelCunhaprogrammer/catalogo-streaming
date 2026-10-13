'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useSettings } from './SettingsProvider';
import { useDialogFocus } from '@/components/useDialogFocus';
import { X } from 'lucide-react';
import { PROVIDERS } from '@/lib/providers';
import { writeProvidersCookie } from '@/lib/preferences';

const THEME_OPTIONS = [
  { value: 'escuro', label: 'Escuro' },
  { value: 'claro', label: 'Claro' },
  { value: 'noturno', label: 'Noturno' },
];

const TEXT_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'grande', label: 'Grande' },
  { value: 'muito-grande', label: 'Muito grande' },
];

function Segmented({ name, options, value, onChange }) {
  return (
    <div className="mt-2 grid grid-cols-3 gap-2">
      {options.map((option) => (
        <label
          key={option.value}
          className="cursor-pointer rounded-lg border border-line px-2 py-2 text-center text-sm has-checked:neon-gradient has-checked:border-transparent has-checked:font-bold has-checked:text-white has-focus-visible:outline-3 has-focus-visible:outline-accent-2"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <label className="mt-4 flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block">{label}</span>
        {description && <span className="block text-sm text-muted">{description}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent)]"
      />
    </label>
  );
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

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="fundo"
            aria-hidden="true"
            className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            key="painel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="config-titulo"
            className="fixed right-0 top-0 z-50 h-full w-full max-w-sm overflow-y-auto border-l border-line bg-surface p-6 text-fg shadow-glow"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
          >
            {guards.start}
            <div className="flex items-center justify-between">
              <h2 id="config-titulo" className="text-xl font-bold">Configurações</h2>
              <button onClick={onClose} aria-label="Fechar configurações" className="rounded p-2 hover:bg-surface-2">
                <X aria-hidden="true" className="h-6 w-6" />
              </button>
            </div>

            <fieldset className="mt-6">
              <legend className="font-semibold">Aparência</legend>
              <Segmented name="tema" options={THEME_OPTIONS} value={resolvedTheme} onChange={(theme) => updatePrefs({ theme })} />
              {resolvedTheme === 'noturno' && (
                <label className="mt-4 block text-sm">
                  Brilho: {prefs.brightness}%
                  <input
                    type="range"
                    min="20"
                    max="100"
                    step="5"
                    value={prefs.brightness}
                    onChange={(e) => updatePrefs({ brightness: Number(e.target.value) })}
                    className="mt-2 w-full accent-[var(--accent)]"
                  />
                </label>
              )}
            </fieldset>

            <fieldset className="mt-8">
              <legend className="font-semibold">Acessibilidade</legend>
              <p className="mt-3 text-sm">Tamanho do texto</p>
              <Segmented name="texto" options={TEXT_OPTIONS} value={prefs.textSize} onChange={(textSize) => updatePrefs({ textSize })} />
              <Toggle
                label="Modo sensorial calmo"
                description="Sem sons, vídeos automáticos, brilhos ou animações."
                checked={prefs.calm}
                onChange={(calm) => updatePrefs({ calm })}
              />
              <Toggle label="Alto contraste" checked={prefs.highContrast} onChange={(highContrast) => updatePrefs({ highContrast })} />
            </fieldset>

            <fieldset className="mt-8">
              <legend className="font-semibold">Meus streamings</legend>
              <p className="mt-1 text-sm text-muted">Marque os serviços que você assina. Sem nenhum marcado, mostramos todos.</p>
              <div className="mt-3 space-y-2">
                {PROVIDERS.map((provider) => (
                  <label key={provider.id} className="flex cursor-pointer items-center gap-3">
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
            {guards.end}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
