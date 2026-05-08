"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Point, Area } from "react-easy-crop";
import { RotateCw, ZoomOut, ZoomIn, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCroppedImg } from "@/lib/crop-image";

interface Props {
  imageSrc: string;
  onCancel: () => void;
  onApply: (blob: Blob) => Promise<void>;
}

export function AvatarCropModal({ imageSrc, onCancel, onApply }: Props) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleApply() {
    if (!croppedAreaPixels) return;
    setApplying(true);
    setError(null);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      await onApply(blob);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to process image.");
      setApplying(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="max-w-sm p-0 overflow-hidden gap-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle>Edit Image</DialogTitle>
        </DialogHeader>

        {/* Crop canvas */}
        <div
          className="relative mx-5 rounded-xl overflow-hidden bg-black"
          style={{ height: 280 }}
        >
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Controls */}
        <div className="px-5 pt-4 pb-5 space-y-4">
          {/* Zoom */}
          <div className="flex items-center gap-2.5">
            <ZoomOut className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-1.5 rounded-full cursor-pointer"
              style={{ accentColor: "hsl(var(--primary))" }}
            />
            <ZoomIn className="h-4.5 w-4.5 text-muted-foreground flex-shrink-0" />
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          {/* Actions row */}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="gap-1.5"
            >
              <RotateCw className="h-3.5 w-3.5" /> Rotate
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={applying}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleApply} disabled={applying || !croppedAreaPixels}>
                {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
