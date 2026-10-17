// Avatar provisório (até a Etapa D): a inicial do nome sobre a cor do perfil.
export function ProfileAvatar({ profile, size = 'lg' }) {
  const box = size === 'lg' ? 'h-28 w-28 text-5xl sm:h-36 sm:w-36' : 'h-9 w-9 text-base';
  return (
    <span className="relative inline-block">
      <span aria-hidden="true" className={`flex items-center justify-center rounded-2xl font-black text-white ${box}`} style={{ background: profile.color }}>
        {profile.name.trim().charAt(0).toUpperCase()}
      </span>
      {profile.kind === 'kids' && size === 'lg' && (
        <span aria-hidden="true" className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white px-2 py-0.5 text-xs font-black text-[#1e1433]">Kids</span>
      )}
    </span>
  );
}
