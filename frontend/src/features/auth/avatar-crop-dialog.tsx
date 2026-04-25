import { Loader2, Minus, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getCroppedBlob } from '@/lib/crop-image';

type Props = {
  open: boolean;
  file: File | null;
  onClose: () => void;
  onConfirm: (blob: Blob) => Promise<void> | void;
  loading?: boolean;
};

export function AvatarCropDialog({ open, file, onClose, onConfirm, loading = false }: Props) {
  const { t } = useTranslation();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);

  const imageUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  useEffect(() => {
    if (!open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedArea(null);
    }
  }, [open]);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!imageUrl || !croppedArea) return;
    const blob = await getCroppedBlob(imageUrl, croppedArea);
    await onConfirm(blob);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Avatar tahrirlash</DialogTitle>
          <DialogDescription>
            Rasmni joylab, masshtabini moslang. Saqlash tugmasini bosgach yuboriladi.
          </DialogDescription>
        </DialogHeader>

        <div className="relative h-72 w-full overflow-hidden bg-slate-900">
          {imageUrl && (
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              classes={{
                containerClassName: 'bg-slate-900',
              }}
            />
          )}
        </div>

        <div className="flex items-center gap-3 px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setZoom((z) => Math.max(1, z - 0.1))}
            disabled={zoom <= 1}
          >
            <Minus className="size-4" />
          </Button>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-brand-600"
            aria-label="Zoom"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
            disabled={zoom >= 3}
          >
            <Plus className="size-4" />
          </Button>
        </div>

        <DialogFooter className="px-6 pb-6">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={loading || !croppedArea}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
