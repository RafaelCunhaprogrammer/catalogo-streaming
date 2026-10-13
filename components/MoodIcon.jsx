import { Church, Coffee, Ghost, Heart, HeartHandshake, Laugh, Trophy, Zap } from 'lucide-react';

const ICONS = { Church, Coffee, Ghost, Heart, HeartHandshake, Laugh, Trophy, Zap };

export function MoodIcon({ name, className = '' }) {
  const Icon = ICONS[name];
  return Icon ? <Icon aria-hidden="true" className={className} strokeWidth={1.75} /> : null;
}
