import { Camera, RefreshCw, VideoOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  onCapture: (file: File, previewUrl: string) => void;
  label?: string;
  busy?: boolean;
};

export function CameraCapture({ onCapture, label = "Capture", busy }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setReady(true);
    } catch {
      setError("Camera access denied or unavailable. Allow camera permission and retry.");
    }
  }, []);

  useEffect(() => {
    void start();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [start]);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
        onCapture(file, URL.createObjectURL(blob));
      },
      "image/jpeg",
      0.92,
    );
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="scan-frame relative w-full max-w-xl overflow-hidden rounded-2xl bg-muted">
        <video
          ref={videoRef}
          playsInline
          muted
          className="aspect-video w-full scale-x-[-1] object-cover"
        />
        {ready && <div className="scan-line" />}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card/90 p-6 text-center">
            <VideoOff className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void start()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </div>
        )}
      </div>
      <Button size="lg" onClick={capture} disabled={!ready || busy}>
        <Camera className="mr-2 h-4 w-4" />
        {label}
      </Button>
    </div>
  );
}
