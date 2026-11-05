import { useRef, useState } from "react";
import { Camera, ImagePlus, Mic, Paperclip, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";

export type Attachment = { key: string; contentType: string; name: string } | null;

export function MediaView({ mediaKey, mediaType, className = "" }: { mediaKey: string; mediaType?: string | null; className?: string }) {
  const { data, isLoading, error } = trpc.community.mediaUrl.useQuery({ key: mediaKey }, { staleTime: 8 * 60 * 1000 });
  if (isLoading) return <div className={`media-loading ${className}`} aria-label="Cargando contenido multimedia" />;
  if (error || !data?.url) return <p className="media-error">No pudimos cargar este archivo adjunto.</p>;
  if (mediaType?.startsWith("audio/")) return <audio className={`audio-player ${className}`} src={data.url} controls preload="metadata" aria-label="Nota de voz" />;
  return <img className={`shared-image ${className}`} src={data.url} alt="Foto compartida por un compañero" loading="lazy" />;
}

async function toBase64(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("No pudimos leer este archivo."));
    reader.readAsDataURL(file);
  });
}

export function useMediaUpload() {
  const [attachment, setAttachment] = useState<Attachment>(null);
  const upload = trpc.community.upload.useMutation({
    onError: (error) => toast.error(error.message || "No pudimos subir el archivo. Intenta con uno más pequeño."),
  });

  async function uploadFile(file: Blob, name: string, contentType: string) {
    if (file.size > 12_000_000) {
      toast.error("Elige un archivo de menos de 12 MB.");
      return;
    }
    try {
      const saved = await upload.mutateAsync({ name, contentBase64: await toBase64(file), contentType });
      setAttachment({ ...saved, name });
      toast.success("Archivo listo para compartir");
    } catch {
      // La mutación muestra un error específico y comprensible para la persona.
    }
  }

  return { attachment, setAttachment, uploadFile, isUploading: upload.isPending };
}

export function MediaButtons({
  attachment,
  setAttachment,
  uploadFile,
  isUploading,
  voice = true,
  compact = false,
}: ReturnType<typeof useMediaUpload> & { voice?: boolean; compact?: boolean }) {
  const imageInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function toggleRecording() {
    if (recording) {
      recorder.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Este navegador no permite grabar notas de voz.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      recorder.current = mediaRecorder;
      chunks.current = [];
      mediaRecorder.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (timer.current) clearInterval(timer.current);
        setRecording(false);
        const blob = new Blob(chunks.current, { type: mimeType });
        if (blob.size) void uploadFile(blob, `nota-de-voz.${mimeType === "audio/webm" ? "webm" : "m4a"}`, mimeType);
        setSeconds(0);
      };
      mediaRecorder.start();
      setRecording(true);
      setSeconds(0);
      timer.current = setInterval(() => setSeconds((value) => value + 1), 1000);
    } catch {
      toast.error("Necesitamos acceso al micrófono para grabar una nota de voz.");
    }
  }

  function chooseImage(file?: File) {
    if (file) void uploadFile(file, file.name, file.type);
  }

  return (
    <div className="media-controls">
      <input ref={imageInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => chooseImage(e.target.files?.[0])} />
      <input ref={cameraInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(e) => chooseImage(e.target.files?.[0])} />
      <Button type="button" variant="ghost" size={compact ? "icon" : "sm"} onClick={() => imageInput.current?.click()} disabled={isUploading || recording} aria-label="Agregar una foto">
        <ImagePlus />{!compact && "Foto"}
      </Button>
      <Button type="button" variant="ghost" size={compact ? "icon" : "sm"} onClick={() => cameraInput.current?.click()} disabled={isUploading || recording} aria-label="Usar la cámara">
        <Camera />{!compact && "Cámara"}
      </Button>
      {voice && <Button type="button" variant="ghost" size={compact ? "icon" : "sm"} className={recording ? "recording" : ""} onClick={() => void toggleRecording()} disabled={isUploading} aria-label={recording ? "Detener la grabación" : "Grabar una nota de voz"}>
        {recording ? <Square /> : <Mic />}{!compact && (recording ? `Detener ${seconds} s` : "Voz")}
      </Button>}
      {isUploading && <span className="upload-status"><Paperclip /> Subiendo…</span>}
      {attachment && <span className="attachment-chip"><span>{attachment.name}</span><button type="button" onClick={() => setAttachment(null)} aria-label="Quitar archivo adjunto"><Trash2 /></button></span>}
    </div>
  );
}
