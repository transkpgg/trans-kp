import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Trans KP — Sistem Absensi",
    short_name: "Trans KP",
    description:
      "Aplikasi absensi karyawan Trans KP dengan GPS, geofencing, dan kamera selfie",
    start_url: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#3b82f6",
    orientation: "portrait",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icons/icon-72.png",
        sizes: "72x72",
        type: "image/png",
      },
      {
        src: "/icons/icon-96.png",
        sizes: "96x96",
        type: "image/png",
      },
      {
        src: "/icons/icon-128.png",
        sizes: "128x128",
        type: "image/png",
      },
      {
        src: "/icons/icon-144.png",
        sizes: "144x144",
        type: "image/png",
      },
      {
        src: "/icons/icon-152.png",
        sizes: "152x152",
        type: "image/png",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-384.png",
        sizes: "384x384",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
