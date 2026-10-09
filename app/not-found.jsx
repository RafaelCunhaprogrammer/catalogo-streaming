import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="neon-gradient bg-clip-text text-7xl font-black text-transparent">404</p>
      <h1 className="text-2xl font-bold">Não encontrado</h1>
      <p className="text-muted">Este título não existe ou não está disponível nas assinaturas de streaming no Brasil.</p>
      <Link href="/" className="neon-gradient rounded-full px-6 py-2.5 font-bold text-white shadow-glow">
        Voltar ao Início
      </Link>
    </div>
  );
}
