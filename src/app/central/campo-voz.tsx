"use client";

import { useEffect, useRef, useState } from "react";

type Reconhecedor = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

/** Campo de texto da anotação com botão de microfone (ditado em português; funciona no Chrome/Edge/Safari). */
export default function CampoVoz({ disabled, placeholder }: { disabled?: boolean; placeholder?: string }) {
  const campo = useRef<HTMLInputElement>(null);
  const rec = useRef<Reconhecedor | null>(null);
  const [ouvindo, setOuvindo] = useState(false);
  const [suportado, setSuportado] = useState(false);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Reconhecedor; webkitSpeechRecognition?: new () => Reconhecedor };
    setSuportado(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => rec.current?.stop();
  }, []);

  function alternar() {
    if (ouvindo) return rec.current?.stop();
    const w = window as unknown as { SpeechRecognition?: new () => Reconhecedor; webkitSpeechRecognition?: new () => Reconhecedor };
    const Classe = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Classe || !campo.current) return;
    const base = campo.current.value.trim();
    const r = new Classe();
    r.lang = "pt-BR";
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => {
      let falado = "";
      for (let i = 0; i < e.results.length; i++) falado += e.results[i][0].transcript;
      if (campo.current) campo.current.value = (base ? `${base} ` : "") + falado.trim();
    };
    r.onend = () => setOuvindo(false);
    r.onerror = () => setOuvindo(false);
    rec.current = r;
    setOuvindo(true);
    r.start();
  }

  return (
    <span className="campo-voz">
      <input ref={campo} name="texto" required maxLength={500} placeholder={placeholder} disabled={disabled} />
      {suportado && (
        <button type="button" className={`btn-mic${ouvindo ? " ouvindo" : ""}`} onClick={alternar} disabled={disabled} aria-label={ouvindo ? "Parar de ouvir" : "Falar a anotação"} title={ouvindo ? "Ouvindo… clique para parar" : "Falar a anotação"}>
          {ouvindo ? "⏹" : "🎤"}
        </button>
      )}
    </span>
  );
}
