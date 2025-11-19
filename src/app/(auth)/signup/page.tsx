"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const auth = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { signup, user, loading } = auth || {};

  useEffect(() => {
    if (user) {
      router.replace("/match");
    }
  }, [user, router]);

  if (!auth) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600" />
      </div>
    );
  }

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
      await signup(email, password, displayName);
      router.replace("/match");
    } catch (err: any) {
      setError(err.message || "Signup failed");
    }
  }

  return (
    <main className="min-h-screen flex flex-col justify-center items-center bg-blue-50 p-8 sm:p-4">
      <section className="w-full max-w-md mx-auto p-8 sm:p-4 rounded-3xl shadow-lg bg-white flex flex-col items-center gap-6 border border-gray-200 animate-fadeInUp">
        <h1 className="text-3xl sm:text-2xl font-bold text-gray-900 m-0 tracking-tight text-center">Sign Up</h1>
        <form className="w-full flex flex-col gap-5 mt-4" onSubmit={handleSubmit}>
          <label className="w-full text-left font-medium text-gray-700">
            Display Name
            <input
              type="text"
              placeholder="Your name"
              required
              className="mt-1 w-full px-4 py-3 sm:px-3 sm:py-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base sm:text-sm"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
            />
          </label>
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
          <div className="flex flex-col gap-3 mt-4">
            <button
              type="submit"
              className="bg-blue-600 text-white rounded-full px-8 py-4 sm:px-4 sm:py-3 font-bold text-lg sm:text-base shadow-md transition hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400 w-auto sm:w-full text-center"
              disabled={loading}
            >
              {loading ? "Signing up..." : "Sign Up"}
            </button>
            <div className="flex items-center" aria-hidden="true">
              <span className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 via-60% to-transparent rounded-full" />
            </div>
            <Link
              href="/login"
              className="bg-white text-blue-600 border border-blue-200 rounded-full px-8 py-4 sm:px-4 sm:py-3 font-bold text-lg sm:text-base no-underline shadow-md transition hover:bg-blue-50 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400 w-auto sm:w-full text-center"
            >
              Log In
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
