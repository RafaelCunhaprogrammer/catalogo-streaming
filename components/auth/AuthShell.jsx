import { BrandLogo } from '@/components/BrandLogo';

// Moldura das telas de conta: logo, título e o cartão do formulário.
export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 shadow-glow">
        <BrandLogo className="mb-6" />
        <h1 className="text-2xl font-black">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export const inputClass = 'mt-1 w-full rounded-xl border border-line bg-bg px-4 py-3 text-fg';
export const buttonClass = 'neon-gradient w-full rounded-full px-6 py-3 font-bold text-white shadow-glow disabled:opacity-50';

export function Field({ id, label, ...props }) {
  return (
    <label htmlFor={id} className="block text-sm font-semibold">
      {label}
      <input id={id} className={inputClass} {...props} />
    </label>
  );
}
