import { redirect } from "next/navigation";

export default function RootPage() {
  // Sementara langsung redirect ke halaman login
  redirect("/login");
}
