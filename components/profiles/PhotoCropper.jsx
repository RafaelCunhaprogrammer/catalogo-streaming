'use client';

import { useEffect, useRef, useState } from 'react';
import { buttonClass } from '@/components/auth/AuthShell';

const QUADRO = 224; // lado do quadro na tela, em px
const SAIDA = 256; // lado da foto final (o servidor exige 256 x 256)
const PASSO = 0.2; // quanto cada seta move, de -1 a 1

const seta = 'flex h-11 w-11 items-center justify-center rounded-xl border border-line text-lg font-black focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-text)]';

// Recorte quadrado da foto: zoom + setas. O que aparece no quadro é exatamente o que vai para os 256 x 256.
export function PhotoCropper({ file, onDone, onCancel }) {
  const imgRef = useRef(null);
  const [src, setSrc] = useState(null);
  const [natural, setNatural] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // -1 a 1: de uma ponta à outra da imagem
  const [erro, setErro] = useState('');

  useEffect(() => {
    const url = URL.createObjectURL(file);
    // Endereço temporário do arquivo: criado e desfeito aqui, então precisa ser estado.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Região da imagem original que o quadro mostra (em pixels da imagem).
  const regiao = () => {
    const { w, h } = natural;
    const lado = Math.min(w, h) / zoom;
    return { lado, sx: ((w - lado) / 2) * (1 + pos.x), sy: ((h - lado) / 2) * (1 + pos.y) };
  };

  const mover = (dx, dy) => setPos((p) => ({ x: Math.max(-1, Math.min(1, p.x + dx)), y: Math.max(-1, Math.min(1, p.y + dy)) }));

  const usar = () => {
    if (!natural) return;
    const { lado, sx, sy } = regiao();
    const canvas = document.createElement('canvas');
    canvas.width = SAIDA;
    canvas.height = SAIDA;
    canvas.getContext('2d').drawImage(imgRef.current, sx, sy, lado, lado, 0, 0, SAIDA, SAIDA);
    const entregar = (blob) => (blob ? onDone(blob) : setErro('Não foi possível preparar essa imagem. Tente outra foto.'));
    // Webp é o mais leve; navegador que não sabe gerar devolve null, e aí vai JPEG.
    canvas.toBlob((webp) => (webp ? entregar(webp) : canvas.toBlob(entregar, 'image/jpeg', 0.85)), 'image/webp', 0.85);
  };

  let estilo = { visibility: 'hidden' };
  if (natural) {
    const { lado, sx, sy } = regiao();
    const escala = QUADRO / lado;
    estilo = { width: natural.w * escala, height: natural.h * escala, left: -sx * escala, top: -sy * escala };
  }

  return (
    <div className="mt-2 space-y-3 rounded-xl border border-line p-3">
      <div className="relative mx-auto overflow-hidden rounded-2xl bg-black/20" style={{ width: QUADRO, height: QUADRO, maxWidth: '100%' }}>
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={src}
            alt="Prévia do recorte"
            draggable={false}
            onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            onError={() => setErro('Não foi possível abrir essa imagem. Tente outra foto.')}
            className="absolute max-w-none select-none"
            style={estilo}
          />
        )}
      </div>
      <div className="mx-auto grid w-fit grid-cols-3 gap-1">
        <span />
        <button type="button" aria-label="Mover para cima" onClick={() => mover(0, -PASSO)} className={seta}><span aria-hidden="true">↑</span></button>
        <span />
        <button type="button" aria-label="Mover para a esquerda" onClick={() => mover(-PASSO, 0)} className={seta}><span aria-hidden="true">←</span></button>
        <button type="button" aria-label="Mover para baixo" onClick={() => mover(0, PASSO)} className={seta}><span aria-hidden="true">↓</span></button>
        <button type="button" aria-label="Mover para a direita" onClick={() => mover(PASSO, 0)} className={seta}><span aria-hidden="true">→</span></button>
      </div>
      <label className="block text-sm font-semibold">
        Zoom
        <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="mt-1 w-full accent-[var(--accent)]" />
      </label>
      {erro && <p role="alert" className="text-sm font-semibold text-accent-2">{erro}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={usar} className={buttonClass}>Usar esta foto</button>
        <button type="button" onClick={onCancel} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold">Cancelar</button>
      </div>
    </div>
  );
}
