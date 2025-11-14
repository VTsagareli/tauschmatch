"use client";
import React from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const auth = useAuth();
  const startMatchingHref = auth?.user ? "/match" : "/login";
  return (
    <main className="min-h-screen flex flex-col justify-center items-center bg-blue-50 p-8 sm:p-4">
      <section className="w-full max-w-md mx-auto p-8 sm:p-4 rounded-3xl shadow-lg bg-white flex flex-col items-center gap-6 border border-gray-200 animate-fadeInUp">
        <h1 className="text-4xl sm:text-2xl font-bold text-gray-900 m-0 tracking-tight leading-tight text-center">TauschMatch</h1>
        <p className="text-gray-500 text-lg sm:text-base font-medium m-0 leading-relaxed tracking-tight text-center">
          Find real, two-way apartment swaps in Berlin.<br />Minimal, efficient, and AI-powered.
        </p>
        <div className="flex flex-col gap-4 w-full">
          <Link
            href={startMatchingHref}
            className="bg-blue-600 text-white rounded-full px-8 py-4 sm:px-4 sm:py-3 font-bold text-lg sm:text-base no-underline border-none shadow-md transition hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400 text-center"
          >
            Start Matching
          </Link>
          <div className="flex items-center" aria-hidden="true">
            <span className="flex-1 h-0.5 bg-gradient-to-r from-transparent via-gray-200 via-60% to-transparent rounded-full blur-[0.5px]" />
          </div>
          <Link
            href="/signup"
            className="bg-white text-blue-600 border border-blue-200 rounded-full px-8 py-4 sm:px-4 sm:py-3 font-bold text-lg sm:text-base no-underline shadow-md transition hover:bg-blue-50 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400 text-center"
          >
            Sign Up
          </Link>
        </div>
      </section>
      <footer className="text-gray-400 text-base sm:text-sm mt-10 font-medium tracking-wide text-center">
        &copy; {new Date().getFullYear()} TauschMatch
      </footer>
    </main>
  );
}
