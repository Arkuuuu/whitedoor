"use client";

import { useState } from "react";
import Image from "next/image";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Image as ImageType } from "@/lib/types";

interface ImageGalleryProps {
  images: ImageType[];
}

export function ImageGallery({ images }: ImageGalleryProps) {
  const [lightbox, setLightbox] = useState<ImageType | null>(null);

  if (images.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No images available for this event.
      </div>
    );
  }

  async function handleDownload(image: ImageType) {
    try {
      await fetch(`/api/images/${image.id}/download`, { method: "POST" });
    } catch {}

    try {
      const blob = await fetch(image.image_url).then((r) => r.blob());
      const ext = image.image_url.split(".").pop()?.split("?")[0] ?? "jpg";
      const filename = image.title ? `${image.title}.${ext}` : `image-${image.id}.${ext}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      window.open(image.image_url, "_blank");
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {images.map((img) => (
          <div
            key={img.id}
            className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer"
          >
            <Image
              src={img.image_url}
              alt={img.title ?? "Event image"}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              loading="lazy"
              onClick={() => setLightbox(img)}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100">
              <Button
                size="sm"
                variant="secondary"
                className="gap-1 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(img);
                }}
              >
                <Download className="w-3 h-3" />
                Download
              </Button>
            </div>
          </div>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setLightbox(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <div className="relative max-w-4xl w-full max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <Image
              src={lightbox.image_url}
              alt={lightbox.title ?? "Event image"}
              width={1200}
              height={800}
              className="object-contain w-full h-full max-h-[80vh] rounded-xl"
            />
            <div className="absolute bottom-4 right-4">
              <Button
                onClick={() => handleDownload(lightbox)}
                variant="secondary"
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
