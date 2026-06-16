"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { QrCode, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface QRCodeButtonProps {
  eventId: string;
  eventName: string;
}

export function QRCodeButton({ eventId, eventName }: QRCodeButtonProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  async function generateQR() {
    if (dataUrl) return;
    const url = `${window.location.origin}/events/${eventId}/review`;
    const result = await QRCode.toDataURL(url, {
      width: 400,
      margin: 2,
      color: { dark: "#111827", light: "#ffffff" },
    });
    setDataUrl(result);
  }

  function handleDownload() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr-${eventName.toLowerCase().replace(/\s+/g, "-")}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <Dialog>
      <DialogTrigger
        onClick={generateQR}
        className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        title="QR Code"
      >
        <QrCode className="w-4 h-4" />
      </DialogTrigger>
      <DialogContent className="max-w-xs text-center">
        <DialogHeader>
          <DialogTitle className="text-base">{eventName}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-gray-500 -mt-2 mb-3">
          Scan to get a review suggestion
        </p>
        {dataUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dataUrl} alt="QR Code" className="w-full rounded-xl mx-auto" />
            <Button onClick={handleDownload} className="w-full gap-2 mt-1">
              <Download className="w-4 h-4" />
              Download PNG
            </Button>
          </>
        ) : (
          <div className="w-full aspect-square bg-gray-100 rounded-xl animate-pulse" />
        )}
      </DialogContent>
    </Dialog>
  );
}
