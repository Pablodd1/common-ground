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

const supportedContentTypes = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav",
] as const;
type SupportedContentType = typeof supportedContentTypes[number];

// Mirrors the server cap in media-upload.ts (Vercel request-body ceiling).
const MAX_UPLOAD_BYTES = 4_000_000;

function isSupportedContentType(value: string): value is SupportedContentType {
  return supportedContentTypes.includes(value as SupportedContentType);
}

// Photos from phone cameras routinely exceed the demo's 4 MB proxy cap, so
// images are downscaled on-canvas before uploading; audio passes through
// untouched (voice notes stay well under the cap at recorder bitrates).
async function downscaleImage(file: Blob): Promise<{ blob: Blob; type: string }> {
  if (file.type === "image/gif" || file.size <= MAX_UPLOAD_BYTES) {
    return { blob: file, type: file.type };
  }
  try {
    const bitmap = await createImageBitmap(file);
    const maxEdge = 2200;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return { blob: file, type: file.type };
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob || !blob.size) return { blob: file, type: file.type };
    return { blob, type: "image/jpeg" };
  } catch {
    return { blob: file, type: file.type };
  }
}

export function useMediaUpload() {
  const [attachment, setAttachment] = useState<Attachment>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function uploadFile(file: Blob, name: string, contentType: string) {
    if (!file.size || !isSupportedContentType(contentType)) {
      toast.error("Este tipo de archivo no está permitido. Usa una imagen o una nota de voz compatible.");
      return;
    }
    setIsUploading(true);
    try {
      const prepared = contentType.startsWith("image/")
        ? await downscaleImage(file)
        : { blob: file, type: contentType };
      if (!prepared.blob.size || prepared.blob.size > MAX_UPLOAD_BYTES) {
        toast.error("El archivo supera el límite de 4 MB del demo. Prueba con uno más pequeño.");
        return;
      }
      const response = await fetch("/api/media", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/octet-stream",
          "x-media-type": prepared.type,
          "x-media-name": encodeURIComponent(name).slice(0, 400),
          "x-media-size": String(prepared.blob.size),
        },
        body: prepared.blob,
      });
      const payload = await response.json().catch(() => null) as { key?: string; contentType?: string; error?: string } | null;
      if (!response.ok || !payload?.key) {
        throw new Error(payload?.error || "No pudimos subir el archivo.");
      }
      setAttachment({ key: payload.key, contentType: payload.contentType ?? prepared.type, name });
      toast.success("Archivo listo para compartir");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos subir el archivo.";
      toast.error(message || "No pudimos subir el archivo. Intenta con uno más pequeño.");
    } finally {
      setIsUploading(false);
    }
  }

  return { attachment, setAttachment, uploadFile, isUploading };
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
