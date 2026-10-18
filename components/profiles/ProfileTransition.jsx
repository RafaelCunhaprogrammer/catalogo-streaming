import { BrandLogo } from '@/components/BrandLogo';
import { ProfileAvatar } from '@/components/profiles/ProfileAvatar';

// Tela de passagem ao entrar num perfil: a logo pulsa enquanto o Início do perfil é montado,
// no lugar da tela preta. Some sozinha quando a página nova chega (este componente sai junto).
export function ProfileTransition({ profile }) {
  return (
    <div
      role="status"
      aria-label={`Entrando como ${profile.name}`}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-bg"
    >
      <div className="animate-[perfil-entrada_1.6s_ease-in-out_infinite] calm:animate-none">
        <BrandLogo className="scale-[2.2]" />
      </div>
      <div className="mt-6 flex items-center gap-3 text-muted">
        <ProfileAvatar profile={profile} size="sm" />
        <span className="font-semibold">Entrando como {profile.name}…</span>
      </div>
    </div>
  );
}
