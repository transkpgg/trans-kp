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
                          path.startsWith('/history');

  if (isProtectedPath) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      // Verifikasi token
      const { payload } = await jose.jwtVerify(token, JWT_SECRET);
      
      // Jika mencoba akses admin tapi bukan admin
      if (path.startsWith('/admin') && payload.role === 'karyawan') {
        return NextResponse.redirect(new URL('/home', request.url));
      }
      
      return NextResponse.next();
    } catch (error) {
      // Token tidak valid/expired
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Mencegah user yang sudah login mengakses halaman login
  if (path === '/login' && token) {
    try {
      const { payload } = await jose.jwtVerify(token, JWT_SECRET);
      if (payload.role === 'admin_cabang' || payload.role === 'super_admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      } else {
        return NextResponse.redirect(new URL('/home', request.url));
      }
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
    '/history',
    '/login'
  ]
};
