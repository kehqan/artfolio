"use client";

import { useState, useCallback } from "react";
import { Upload, X, Loader2 } from "lucide-react";

interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export default function ImageUpload({
  images,
  onChange,
  maxImages = 8,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");

  const uploadFile = useCallback(async (file: File) => {
    setError("");
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Upload failed");
    }

    const data = await res.json();
    return data.url;
  }, []);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const remaining = maxImages - images.length;

      if (remaining <= 0) {
        setError(`Maximum ${maxImages} images allowed.`);
        return;
      }

      const toUpload = fileArray.slice(0, remaining);
      setUploading(true);
      setError("");

      try {
        const urls: string[] = [];
        for (const file of toUpload) {
          const url = await uploadFile(file);
          urls.push(url);
        }
        onChange([...images, ...urls]);
      } catch (err: any) {
        setError(err.message || "Upload failed. Please try again.");
      }

      setUploading(false);
    },
    [images, maxImages, onChange, uploadFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const newImages = [...images];
    const [moved] = newImages.splice(from, 1);
    newImages.splice(to, 0, moved);
    onChange(newImages);
  };

  return (
    <div>
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
          {images.map((url, index) => (
            <div
              key={url}
              className="relative group aspect-square bg-canvas-900 border border-canvas-800/40 overflow-hidden"
            >
              <img
                src={url}
                alt={`Artwork image ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => moveImage(index, index - 1)}
                    className="w-8 h-8 bg-canvas-800 text-canvas-200 flex items-center justify-center text-xs hover:bg-canvas-700 transition-colors"
                  >
                    ←
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="w-8 h-8 bg-red-600 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
                {index < images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => moveImage(index, index + 1)}
                    className="w-8 h-8 bg-canvas-800 text-canvas-200 flex items-center justify-center text-xs hover:bg-canvas-700 transition-colors"
                  >
                    →
                  </button>
                )}
              </div>
              {index === 0 && (
                <span className="absolute top-2 left-2 text-[9px] font-semibold uppercase tracking-wider bg-accent-500 text-canvas-950 px-2 py-0.5">
                  Cover
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {images.length < maxImages && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed transition-all duration-300 p-8 text-center cursor-pointer ${
            dragOver
              ? "border-accent-500 bg-accent-500/5"
              : "border-canvas-800/60 hover:border-canvas-600"
          }`}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <input
            id="file-input"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = "";
            }}
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={24} className="animate-spin text-accent-500" />
              <p className="text-sm text-canvas-400">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload size={24} className="text-canvas-500" strokeWidth={1.5} />
              <div>
                <p className="text-sm text-canvas-300">
                  Drop images here or click to browse
                </p>
                <p className="text-xs text-canvas-600 mt-1">
                  JPG, PNG, WebP, GIF · Max 10MB each · Up to {maxImages} images
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}

      {images.length > 0 && (
        <p className="text-xs text-canvas-600 mt-2">
          {images.length}/{maxImages} images · First image is the cover · Hover to reorder or remove
        </p>
      )}
    </div>
  );
}
