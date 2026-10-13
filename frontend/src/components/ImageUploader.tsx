/**
 * ImageUploader — Galereadan rasm tanlash, kichraytirish va yuklash
 * ================================================================
 * 1. Foydalanuvchi rasm tanlaydi (input[type=file])
 * 2. Canvas API orqali brauzerda o'zi kichraytiradi (max 1000px, WebP 80%)
 * 3. Kichraytirilgan faylni /api/admin/upload-image/ ga yuboradi
 * 4. Serverdan kelgan URL ni onUrl callback orqali qaytaradi
 */

import { useRef, useState } from "react";
import { ImageIcon, Loader2, X } from "lucide-react";
import { getStoredToken } from "@/lib/api";

interface Props {
  onUrl: (url: string) => void;
  currentUrl?: string;
  /** Preview height class, default 'h-32' */
  previewClass?: string;
  label?: string;
}

/** Compress an image File using Canvas. Returns a Blob. */
async function compressImage(file: File, maxDim = 900, quality = 0.72): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const sourceUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height / width) * maxDim);
            width = maxDim;
          } else {
            width = Math.round((width / height) * maxDim);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(sourceUrl);
          reject(new Error("Canvas context failed"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(sourceUrl);
            if (blob) resolve(blob);
            else reject(new Error("Compression failed"));
          },
          "image/webp",
          quality,
        );
      } catch (error) {
        URL.revokeObjectURL(sourceUrl);
        reject(error);
      }
    };
    img.onerror = (error) => {
      URL.revokeObjectURL(sourceUrl);
      reject(error);
    };
    img.src = sourceUrl;
  });
}

export function ImageUploader({ onUrl, currentUrl, previewClass = "h-32", label = "Rasm yuklash" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string>(currentUrl ?? "");
  const [error, setError] = useState<string>("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setLoading(true);
    try {
      // Show local preview immediately
      const localUrl = URL.createObjectURL(file);
      setPreview(localUrl);

      // Compress
      const blob = await compressImage(file);
      const sizeMB = (blob.size / 1024 / 1024).toFixed(2);
      console.log(`Compressed: ${sizeMB} MB`);

      // Upload
      const token = getStoredToken();
      const form = new FormData();
      form.append("image", blob, "image.webp");

      const res = await fetch("/api/admin/upload-image/", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? `Server xatosi: ${res.status}`);
      }

      const data = await res.json();
      setPreview(data.image_url);
      onUrl(data.image_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yuklashda xatolik");
      setPreview(currentUrl ?? "");
    } finally {
      setLoading(false);
      // Reset input so same file can be selected again
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleClear = () => {
    setPreview("");
    onUrl("");
  };

  return (
    <div className="w-full">
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      {preview ? (
        <div className={`relative w-full ${previewClass} overflow-hidden rounded-2xl bg-gray-100 border border-border group`}>
          <img src={preview} alt="Preview" decoding="async" className="h-full w-full object-cover" />
          {/* Overlay buttons */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={loading}
              className="rounded-xl bg-white/90 px-3 py-2 text-xs font-bold text-gray-800 shadow"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Almashtirish"}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="grid h-8 w-8 place-items-center rounded-xl bg-red-500/90 text-white shadow"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {loading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-7 w-7 animate-spin text-white" />
                <span className="text-xs text-white font-semibold">Siqilmoqda...</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="w-full flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-secondary/30 py-6 text-muted-foreground hover:border-primary/50 hover:bg-secondary/60 transition-colors disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <span className="text-xs font-semibold text-primary">Siqilmoqda va yuklanmoqda...</span>
            </>
          ) : (
            <>
              <ImageIcon className="h-8 w-8" />
              <span className="text-sm font-semibold">{label}</span>
              <span className="text-xs opacity-60">Galereaydan tanlang — avtomatik kichrayadi</span>
            </>
          )}
        </button>
      )}

      {error && (
        <p className="mt-1.5 text-xs text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
}
