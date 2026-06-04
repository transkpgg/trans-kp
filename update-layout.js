const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, findPattern, replaceText) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(findPattern, replaceText);
  fs.writeFileSync(filePath, content);
}

// 1. Admin Layout - Remove Absensi, Lokasi, Cabang
let adminLayout = path.join(__dirname, 'src/app/admin/layout.tsx');
replaceInFile(adminLayout, 
  /const adminNavItems = \[([\s\S]*?)\];/g,
  `const adminNavItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Master User", href: "/admin/users", icon: Users },
  { name: "Hotel Visit", href: "/admin/hotel-visits", icon: Building2 },
  { name: "E-Toll", href: "/admin/etoll", icon: CreditCard },
  { name: "Laporan", href: "/admin/reports", icon: FileBarChart },
];`
);

// 2. User Layout - Remove Check In, Riwayat (Absensi)
let userLayout = path.join(__dirname, 'src/app/(dashboard)/layout.tsx');
replaceInFile(userLayout,
  /const navItems = \[([\s\S]*?)\];/g,
  `const navItems = [
  { name: "Home", href: "/home", icon: Home },
  { name: "Hotel", href: "/hotel-visit", icon: Building2 },
  { name: "Profil", href: "/profile", icon: User },
];`
);

console.log("Admin & User layouts updated.");

