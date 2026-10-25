import React from "react";
import AdminAuthGuard from "@/components/AdminAuthGuard";
import { AdminNavProvider } from "@/components/AdminNavContext";

export const metadata = {
  title: "Preeti Communication | Admin Portal",
  description: "Shopkeeper Print Control & Operations Dashboard",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthGuard>
      <AdminNavProvider>{children}</AdminNavProvider>
    </AdminAuthGuard>
  );
}

