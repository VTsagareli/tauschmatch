"use client";

import React from "react";
import AuthGuard from "@/components/AuthGuard";

export default function ProfilePage() {
  return (
    <AuthGuard>
      <main className="min-h-screen bg-blue-50">
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Profile</h1>
              <p className="text-gray-600">Profile page - temporarily simplified</p>
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
