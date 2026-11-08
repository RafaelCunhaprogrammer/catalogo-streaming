import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ProfileAvatar } from '@/components/profiles/ProfileAvatar';
import { AvatarArt } from '@/components/profiles/avatars';
import { AVATARS } from '@/lib/avatars';

const perfil = (extra = {}) => ({ name: 'Ana', color: '#8b5cf6', kind: 'adulto', avatar: null, ...extra });

describe('ProfileAvatar', () => {
  it('com avatar, mostra o desenho sobre a cor do perfil, sem a inicial', () => {
    const { container } = render(<ProfileAvatar profile={perfil({ avatar: 'boto' })} />);
    expect(container.querySelector('svg[data-avatar="boto"]')).not.toBeNull();
    expect(container.textContent).not.toContain('A');
    expect(container.querySelector('[style*="background"]').style.background).toBe('rgb(139, 92, 246)');
  });

  it('perfil antigo (sem avatar) ou avatar desconhecido: a inicial, como antes', () => {
    for (const avatar of [null, undefined, 'mickey']) {
      const { container, unmount } = render(<ProfileAvatar profile={perfil({ avatar })} />);
      expect(container.querySelector('svg')).toBeNull();
      expect(container.textContent).toBe('A');
      unmount();
    }
  });

  it('no tamanho pequeno, o Açaí usa a versão simples', () => {
    const { container } = render(<ProfileAvatar profile={perfil({ avatar: 'acai' })} size="sm" />);
    expect(container.querySelector('svg').getAttribute('data-simple')).toBe('true');
    const grande = render(<ProfileAvatar profile={perfil({ avatar: 'acai' })} size="md" />);
    expect(grande.container.querySelector('svg').getAttribute('data-simple')).toBe('false');
  });

  it('etiqueta Kids só no tamanho grande', () => {
    const kids = perfil({ kind: 'kids', avatar: 'onca' });
    expect(render(<ProfileAvatar profile={kids} />).container.textContent).toContain('Kids');
    expect(render(<ProfileAvatar profile={kids} size="md" />).container.textContent).not.toContain('Kids');
  });
});

describe('AvatarArt', () => {
  it('tem um desenho para cada avatar da lista, sempre decorativo', () => {
    for (const { slug } of AVATARS) {
      const { container, unmount } = render(<AvatarArt slug={slug} />);
      const svg = container.querySelector('svg');
      expect(svg, slug).not.toBeNull();
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.children.length, slug).toBeGreaterThan(2);
      unmount();
    }
  });
});
