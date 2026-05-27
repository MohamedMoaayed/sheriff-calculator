'use client';
import { useEffect, useRef } from 'react';

/**
 * QRCode — renders a QR code using the free qrserver.com API as an <img>.
 * No npm packages needed.
 */
export default function QRCode({ value, size = 160 }: { value: string; size?: number }) {
  const encoded = encodeURIComponent(value);
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&bgcolor=1e1b18&color=c29b47&format=png&margin=2`;

  return (
    <img
      src={src}
      alt="QR Code"
      width={size}
      height={size}
      style={{
        borderRadius: 12,
        border: '2px solid rgba(194,155,71,0.4)',
        display: 'block',
        imageRendering: 'pixelated',
      }}
    />
  );
}
