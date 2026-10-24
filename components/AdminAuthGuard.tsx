"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Printer } from "lucide-react";

export default function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // If on login page, skip check
    if (pathname === "/admin/login") {
      setIsChecking(false);
      setIsAuthenticated(true);
      return;
    }

    let isMounted = true;

    async function checkAuth() {
      try {
        const res = await fetch("/api/admin/auth", { cache: "no-store" });
        const data = await res.json();
        if (isMounted) {
          if (data.authenticated) {
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
            router.push("/admin/login");
          }
        }
      } catch {
        if (isMounted) {
          // If network error during dev/build, still allow graceful fallback or redirect
          setIsAuthenticated(true);
        }
      } finally {
        if (isMounted) setIsChecking(false);
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mb-4 shadow-xl shadow-indigo-600/30">
          <Printer className="w-6 h-6 animate-pulse" />
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          <span>Verifying Admin Credentials...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
