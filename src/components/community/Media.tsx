import { useRef, useState } from "react";
import { Camera, ImagePlus, Mic, Paperclip, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";

export type Attachment = { key: string; contentType: string; name: string } | null;

export function MediaView({ mediaKey, mediaType, className = "" }: { mediaKey: string; mediaType?: string | null; className?: string }) {
  const { data, isLoading, error } = trpc.community.mediaUrl.useQuery({ key: mediaKey }, { staleTime: 8 * 60 * 1000 });
  if (isLoading) return <div className={`media-loading ${className}`} aria-label="Loading media" />;
  if (error || !data?.url) return <p className="media-error">This attachment couldn’t be loaded.</p>;
  if (mediaType?.startsWith("audio/")) return <audio className={`audio-player ${className}`} src={data.url} controls preload="metadata" />;
  return <img className={`shared-image ${className}`} src={data.url} alt="Shared by a colleague" loading="lazy" />;
}

async function toBase64(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Could not read this file."));
    reader.readAsDataURL(file);
  });
}

export function useMediaUpload() {
  const [attachment, setAttachment] = useState<Attachment>(null);
  const upload = trpc.community.upload.useMutation({
    onError: (error) => toast.error(error.message || "Upload failed. Try a smaller file."),
  });

  async function uploadFile(file: Blob, name: string, contentType: string) {
    if (file.size > 12_000_000) {
      toast.error("Please choose a file smaller than 12 MB.");
      return;
    }
    try {
      const saved = await upload.mutateAsync({ name, contentBase64: await toBase64(file), contentType });
      setAttachment({ ...saved, name });
      toast.success("Attachment ready to share");
    } catch {
      // The mutation surfaces a specific, user-readable error.
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
      toast.error("Voice recording is not supported in this browser.");
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
        if (blob.size) void uploadFile(blob, `voice-note.${mimeType === "audio/webm" ? "webm" : "m4a"}`, mimeType);
        setSeconds(0);
      };
      mediaRecorder.start();
      setRecording(true);
      setSeconds(0);
      timer.current = setInterval(() => setSeconds((value) => value + 1), 1000);
    } catch {
      toast.error("Microphone access is needed to record a voice note.");
    }
  }

  function chooseImage(file?: File) {
    if (file) void uploadFile(file, file.name, file.type);
  }

  return (
    <div className="media-controls">
      <input ref={imageInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => chooseImage(e.target.files?.[0])} />
      <input ref={cameraInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(e) => chooseImage(e.target.files?.[0])} />
      <Button type="button" variant="ghost" size={compact ? "icon" : "sm"} onClick={() => imageInput.current?.click()} disabled={isUploading || recording} aria-label="Add a photo">
        <ImagePlus />{!compact && "Photo"}
      </Button>
      <Button type="button" variant="ghost" size={compact ? "icon" : "sm"} onClick={() => cameraInput.current?.click()} disabled={isUploading || recording} aria-label="Use camera">
        <Camera />{!compact && "Camera"}
      </Button>
      {voice && <Button type="button" variant="ghost" size={compact ? "icon" : "sm"} className={recording ? "recording" : ""} onClick={() => void toggleRecording()} disabled={isUploading} aria-label={recording ? "Stop recording" : "Record a voice note"}>
        {recording ? <Square /> : <Mic />}{!compact && (recording ? `Stop ${seconds}s` : "Voice")}
      </Button>}
      {isUploading && <span className="upload-status"><Paperclip /> Uploading…</span>}
      {attachment && <span className="attachment-chip"><span>{attachment.name}</span><button type="button" onClick={() => setAttachment(null)} aria-label="Remove attachment"><Trash2 /></button></span>}
    </div>
  );
}
