"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const router = useRouter();
  const auth = useAuth() as any;
  const user = auth && auth.user;
  function handleStartMatching(e: React.MouseEvent) {
    e.preventDefault();
    if (user) {
      router.push("/match");
    } else {
      router.push("/login");
    }
  }
  return (
    <main className="min-h-screen flex flex-col justify-center items-center bg-blue-50 p-8 sm:p-4">
      <section className="w-full max-w-md mx-auto p-8 sm:p-4 rounded-3xl shadow-lg bg-white flex flex-col items-center gap-6 border border-gray-200 animate-fadeInUp">
        <h1 className="text-4xl sm:text-2xl font-bold text-gray-900 m-0 tracking-tight leading-tight text-center">TauschMatch</h1>
        <p className="text-gray-500 text-lg sm:text-base font-medium m-0 leading-relaxed tracking-tight text-center">
          Find real, two-way apartment swaps in Berlin.<br />Minimal, efficient, and AI-powered.
        </p>
        <button
          onClick={handleStartMatching}
          className="bg-blue-600 text-white rounded-full px-8 py-4 sm:px-4 sm:py-3 font-bold text-lg sm:text-base no-underline inline-block mt-6 border-none shadow-md transition hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400 w-auto sm:w-full text-center"
        >
          Start Matching
        </button>
      </section>
      <footer className="text-gray-400 text-base sm:text-sm mt-10 font-medium tracking-wide text-center">
        &copy; {new Date().getFullYear()} TauschMatch
      </footer>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: none; }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.7s cubic-bezier(.4,0,.2,1);
        }
      `}</style>
    </main>
  );
}
