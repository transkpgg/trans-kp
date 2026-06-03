import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trans KP — Sistem Absensi",
  description: "Aplikasi absensi karyawan Trans KP dengan GPS, geofencing, dan kamera selfie",
  manifest: "/manifest.ts",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      <body>
        {children}
      </body>
    </html>
  );
}
