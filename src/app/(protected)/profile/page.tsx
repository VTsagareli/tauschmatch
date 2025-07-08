"use client";

export default function ProfilePage() {
  return (
    <main className="min-h-screen flex flex-col justify-center items-center bg-blue-50 p-8 sm:p-4">
      <section className="w-full max-w-md mx-auto p-8 sm:p-4 rounded-3xl shadow-lg bg-white flex flex-col items-center gap-6 border border-gray-200">
        <h1 className="text-3xl sm:text-2xl font-bold text-gray-900 m-0 tracking-tight text-center">Profile</h1>
        <p className="text-gray-400 text-lg sm:text-base font-medium m-0 leading-relaxed tracking-tight text-center">
          Update your email, password, or delete your account.
        </p>
        {/* Profile form will go here */}
      </section>
    </main>
  );
} 