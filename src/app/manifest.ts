import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sheriff of Nottingham - شريف نوتنغهام',
    short_name: 'شريف نوتنغهام',
    description: 'حاسبة نقاط نهاية لعبة شريف نوتنغهام - Sheriff of Nottingham End Game Calculator',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#12100e',
    theme_color: '#c29b47',
    lang: 'ar',
    dir: 'rtl',
    categories: ['games', 'entertainment'],
    icons: [
      { src: '/icons/icon-72.png',   sizes: '72x72',   type: 'image/png' },
      { src: '/icons/icon-96.png',   sizes: '96x96',   type: 'image/png' },
      { src: '/icons/icon-128.png',  sizes: '128x128', type: 'image/png' },
      { src: '/icons/icon-144.png',  sizes: '144x144', type: 'image/png' },
      { src: '/icons/icon-152.png',  sizes: '152x152', type: 'image/png' },
      { src: '/icons/icon-192.png',  sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-384.png',  sizes: '384x384', type: 'image/png' },
      { src: '/icons/icon-512.png',  sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    screenshots: [],
  };
}
