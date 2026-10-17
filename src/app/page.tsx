import { redirect } from "next/navigation";

export default function RootPage() {
  // Buka aplikasi langsung mengarah ke beranda utama
  redirect("/home");
}
