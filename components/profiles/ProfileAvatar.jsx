import { photoUrl } from '@/lib/photos/url';
import { AvatarArt, hasArt } from '@/components/profiles/avatars';

const BOX = {
  lg: 'h-28 w-28 text-5xl sm:h-36 sm:w-36',
  md: 'h-24 w-24 text-4xl',
  sm: 'h-9 w-9 text-base',
};

// Avatar do perfil: o desenho escolhido (Etapa D) sobre a cor do perfil.
// Sem avatar (perfis antigos ou "Só a inicial"), a inicial do nome, como antes.
export function ProfileAvatar({ profile, size = 'lg' }) {
  const box = BOX[size] ?? BOX.lg;
  const foto = profile.avatar === 'foto' ? photoUrl(profile) : null;
  const art = !foto && hasArt(profile.avatar);
  return (
    <span className="relative inline-block">
      <span
        aria-hidden="true"
        className={`flex items-center justify-center overflow-hidden rounded-2xl font-black text-white ${box}`}
        style={{ background: profile.color }}
      >
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt="" className="h-full w-full object-cover" />
        ) : art ? <AvatarArt slug={profile.avatar} simple={size === 'sm'} /> : profile.name.trim().charAt(0).toUpperCase()}
      </span>
      {profile.kind === 'kids' && size === 'lg' && (
        <span aria-hidden="true" className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white px-2 py-0.5 text-xs font-black text-[#1e1433]">Kids</span>
      )}
    </span>
  );
}
