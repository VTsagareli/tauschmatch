"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (!auth) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600" />
      </div>
    );
  }

  const { login, user, loading } = auth;

  useEffect(() => {
    if (user) {
      router.replace("/match");
    }
  }, [user, router]);

  if (user) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600" />
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      router.replace("/match");
    } catch (err: any) {
      setError(err.message || "Login failed");
    }
  }

  return (
    <main className="min-h-screen flex flex-col justify-center items-center bg-blue-50 p-8 sm:p-4">
      <section className="w-full max-w-md mx-auto p-8 sm:p-4 rounded-3xl shadow-lg bg-white flex flex-col items-center gap-6 border border-gray-200">
        <h1 className="text-3xl sm:text-2xl font-bold text-gray-900 m-0 tracking-tight text-center">Login</h1>
        <form className="w-full flex flex-col gap-5 mt-4" onSubmit={handleSubmit}>
          <label className="w-full text-left font-medium text-gray-700">
            Email
            <input
              type="email"
              placeholder="Email"
              required
              className="mt-1 w-full px-4 py-3 sm:px-3 sm:py-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base sm:text-sm"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </label>
          <label className="w-full text-left font-medium text-gray-700">
            Password
            <input
              type="password"
              placeholder="Password"
              required
              className="mt-1 w-full px-4 py-3 sm:px-3 sm:py-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base sm:text-sm"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </label>
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          <button
            type="submit"
            className="bg-blue-600 text-white rounded-full px-8 py-4 sm:px-4 sm:py-3 font-bold text-lg sm:text-base mt-4 shadow-md transition hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400 w-auto sm:w-full text-center"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>
      </section>
    </main>
  );
} 