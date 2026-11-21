import { useEffect, useRef, useState } from "react";

// Tipos mínimos de la Web Speech API (no vienen en todas las versiones de lib.dom).
type ResultadoVoz = { isFinal: boolean; 0: { transcript: string } };
type EventoVoz = { resultIndex: number; results: ArrayLike<ResultadoVoz> };
type Reconocedor = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: EventoVoz) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type ConstructorReconocedor = new () => Reconocedor;

function constructorDisponible(): ConstructorReconocedor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: ConstructorReconocedor;
    webkitSpeechRecognition?: ConstructorReconocedor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

const MENSAJES: Record<string, string> = {
  "not-allowed": "Permite el uso del micrófono en tu navegador para dictar.",
  "service-not-allowed": "Permite el uso del micrófono en tu navegador para dictar.",
  "no-speech": "No escuchamos nada. Intenta de nuevo, más cerca del micrófono.",
  "audio-capture": "No encontramos un micrófono en este dispositivo.",
  network: "El dictado necesita internet. Puedes escribir el registro y se guardará igual.",
};

/**
 * Dictado con la Web Speech API. La transcripción ocurre en el navegador
 * (regla sagrada #6: el backend nunca recibe audio, solo el texto).
 * `alTexto` recibe cada fragmento final reconocido.
 */
export function useDictado(alTexto: (texto: string) => void) {
  const [escuchando, setEscuchando] = useState(false);
  const [interino, setInterino] = useState("");
  const [error, setError] = useState<string | null>(null);
  const reconocedor = useRef<Reconocedor | null>(null);
  const alTextoRef = useRef(alTexto);
  const Constructor = constructorDisponible();

  // La función más reciente, sin reiniciar el reconocimiento en cada render.
  useEffect(() => {
    alTextoRef.current = alTexto;
  });

  useEffect(() => () => reconocedor.current?.abort(), []);

  function iniciar() {
    if (!Constructor || escuchando) return;
    const r = new Constructor();
    r.lang = "es-CL";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (ev) => {
      let final = "";
      let parcial = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        if (res.isFinal) final += res[0].transcript;
        else parcial += res[0].transcript;
      }
      if (final.trim()) alTextoRef.current(final.trim());
      setInterino(parcial);
    };
    r.onerror = (ev) => {
      if (ev.error !== "aborted") {
        setError(MENSAJES[ev.error] ?? "No se pudo usar el dictado. Puedes escribir el registro.");
      }
    };
    r.onend = () => {
      setEscuchando(false);
      setInterino("");
    };
    setError(null);
    reconocedor.current = r;
    try {
      r.start();
      setEscuchando(true);
    } catch {
      setError("No se pudo iniciar el dictado. Puedes escribir el registro.");
    }
  }

  function detener() {
    reconocedor.current?.stop();
  }

  return { soportado: !!Constructor, escuchando, interino, error, iniciar, detener };
}
