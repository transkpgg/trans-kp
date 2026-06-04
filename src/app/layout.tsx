import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Trans KP — Sistem Operasional Pengemudi",
  description: "Aplikasi monitoring hotel driver dan E-Toll Trans KP",
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
        <Toaster 
          theme="dark" 
          position="top-right" 
          richColors 
          closeButton
          toastOptions={{
            style: {
              background: '#0f172a',
              border: '1px solid #1e293b',
              color: '#f8fafc',
            }
          }}
        />
      </body>
    </html>
  );
}
