// Endereço da foto do perfil (puro, serve no cliente): só o nome do arquivo vai em ?v=.
export function photoUrl(profile) {
  if (!profile?.photoKey || !profile.id) return null;
  const arquivo = profile.photoKey.split('/').pop().replace(/\.[^.]+$/, '');
  return `/api/foto/${profile.id}?v=${arquivo}`;
}
