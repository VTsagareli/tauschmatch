import React, { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();

  if (!auth) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600" />
      </div>
    );
  }

  const { user, loading } = auth;

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || (!user && typeof window !== "undefined")) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600" />
      </div>
    );
  }

  return <>{children}</>;
} 