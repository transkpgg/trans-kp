import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-key-trans-kp-2024'
);

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const path = request.nextUrl.pathname;

  // Cek path yang diproteksi
  const isProtectedPath = path.startsWith('/admin') || 
                          path.startsWith('/home') || 
                          path.startsWith('/profile') || 
                          path.startsWith('/hotel-visit') || 
                          path.startsWith('/bon-pengemudi') || 
                          path.startsWith('/history') ||
                          path.startsWith('/vehicle-checklist');

  if (isProtectedPath) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      // Verifikasi token
      const { payload } = await jose.jwtVerify(token, JWT_SECRET);
      
      // Jika mencoba akses admin tapi role karyawan (bukan admin)
      // Pengecualian rute:
      // - /admin/upd dan /admin/etoll (terbuka untuk staf/driver)
      // - /admin/vehicle-maintenance dan /admin/vehicles (dijaga oleh role/jabatan di level halaman & API)
      const isExemptAdminPath = path.startsWith('/admin/upd') || 
                                path.startsWith('/admin/etoll') ||
                                path.startsWith('/admin/vehicle-maintenance') ||
                                path.startsWith('/admin/vehicles');

      if (path.startsWith('/admin') && !isExemptAdminPath && payload.role === 'karyawan') {
        return NextResponse.redirect(new URL('/home', request.url));
      }
      
      return NextResponse.next();
    } catch (error) {
      // Token tidak valid/expired
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Mencegah user yang sudah login mengakses halaman login (langsung arahkan ke beranda utama)
  if (path === '/login' && token) {
    try {
      await jose.jwtVerify(token, JWT_SECRET);
      return NextResponse.redirect(new URL('/home', request.url));
    } catch (error) {
      // Biarkan lanjut ke login jika token tidak valid
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/home',
    '/profile',
    '/hotel-visit/:path*',
    '/bon-pengemudi/:path*',
    '/history',
    '/vehicle-checklist/:path*',
    '/login'
  ]
};
