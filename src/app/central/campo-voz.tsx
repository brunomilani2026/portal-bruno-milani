"use client";

import { useEffect, useRef, useState } from "react";

type Reconhecedor = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

type Construtor = new () => Reconhecedor;

const MENSAGENS: Record<string, string> = {
  "not-allowed": "O microfone está bloqueado. Clique no cadeado ao lado do endereço, permita o Microfone e recarregue a página.",
  "service-not-allowed": "O navegador não liberou o reconhecimento de voz. Permita o Microfone no cadeado do endereço e recarregue.",
  "no-speech": "Não ouvi nada. Clique no 🎤 e fale logo em seguida.",
  "audio-capture": "Não encontrei nenhum microfone ligado neste computador.",
  network: "Sem conexão com o serviço de voz do navegador. Verifique a internet e tente de novo.",
};

function classeVoz(): Construtor | undefined {
  const w = window as unknown as { SpeechRecognition?: Construtor; webkitSpeechRecognition?: Construtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition;
}

/** Campo de texto da anotação com botão de microfone (ditado em português; funciona no Chrome/Edge/Safari). */
export default function CampoVoz({ disabled, placeholder }: { disabled?: boolean; placeholder?: string }) {
  const campo = useRef<HTMLInputElement>(null);
  const rec = useRef<Reconhecedor | null>(null);
  const [ouvindo, setOuvindo] = useState(false);
  const [suportado, setSuportado] = useState(false);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    setSuportado(Boolean(classeVoz()));
    return () => rec.current?.stop();
  }, []);

  async function alternar() {
    if (ouvindo) return rec.current?.stop();
    const Classe = classeVoz();
    if (!Classe || !campo.current) return;

    // pede a permissão do microfone de forma explícita (o reconhecimento sozinho falha em silêncio em alguns casos)
    try {
      const fluxo = await navigator.mediaDevices.getUserMedia({ audio: true });
      fluxo.getTracks().forEach((t) => t.stop());
    } catch (e) {
      const nome = e instanceof DOMException ? e.name : "";
      setAviso(
        nome === "NotFoundError" || nome === "OverconstrainedError"
          ? "O Chrome não encontrou nenhum microfone neste computador. Conecte um microfone/fone (ou ative-o em Configurações do Windows → Som → Entrada) e tente de novo."
          : nome === "NotReadableError" || nome === "AbortError"
            ? "O microfone está em uso por outro programa ou o Windows está bloqueando o acesso (Configurações → Privacidade → Microfone). Feche o outro programa e tente de novo."
            : `${MENSAGENS["not-allowed"]} [mic: ${nome || "?"}]`,
      );
      return;
    }

    const base = campo.current.value.trim();
    const r = new Classe();
    r.lang = "pt-BR";
    r.interimResults = true;
    r.continuous = false;
    r.onstart = () => setAviso("Ouvindo… pode falar.");
    r.onresult = (e) => {
      let falado = "";
      for (let i = 0; i < e.results.length; i++) falado += e.results[i][0].transcript;
      if (campo.current) campo.current.value = (base ? `${base} ` : "") + falado.trim();
    };
    r.onend = () => {
      setOuvindo(false);
      setAviso((a) => (a.startsWith("Ouvindo") ? "" : a));
    };
    r.onerror = (e) => {
      setOuvindo(false);
      setAviso((MENSAGENS[e.error ?? ""] ?? "Não consegui ouvir.") + ` [voz: ${e.error ?? "?"}]`);
    };
    rec.current = r;
    setOuvindo(true);
    setAviso("");
    try {
      r.start();
    } catch {
      setOuvindo(false);
      setAviso("Não consegui iniciar o microfone. Recarregue a página e tente de novo.");
    }
  }

  return (
    <span className="campo-voz">
      <input ref={campo} name="texto" required maxLength={500} placeholder={placeholder} disabled={disabled} />
      {suportado && (
        <button type="button" className={`btn-mic${ouvindo ? " ouvindo" : ""}`} onClick={alternar} disabled={disabled} aria-label={ouvindo ? "Parar de ouvir" : "Falar a anotação"} title={ouvindo ? "Ouvindo… clique para parar" : "Falar a anotação"}>
          {ouvindo ? "⏹" : "🎤"}
        </button>
      )}
      {aviso && <small className="aviso-voz">{aviso}</small>}
    </span>
  );
}
