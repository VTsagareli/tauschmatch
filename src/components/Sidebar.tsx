import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

type SidebarProps = {
  isDrawer?: boolean;
  open?: boolean;
  onClose?: () => void;
};

export default function Sidebar({ isDrawer = false, open = false, onClose }: SidebarProps) {
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    if (auth) {
      await auth.logout();
      router.replace("/login");
    }
  };

  // Drawer overlay for mobile
  if (isDrawer) {
    return (
      <>
        {/* Overlay */}
        <div
          className={`fixed inset-0 bg-black bg-opacity-40 z-40 transition-opacity duration-200 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          onClick={onClose}
        />
        {/* Drawer */}
        <aside
          className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg rounded-tr-3xl rounded-br-3xl z-50 flex flex-col items-center p-8 transform transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <button
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 text-2xl focus:outline-none"
            onClick={onClose}
            aria-label="Close menu"
          >
            &times;
          </button>
          <nav className="w-full mt-8 flex flex-col flex-1">
            <ul className="list-none p-0 m-0 w-full flex flex-col gap-5">
              <li>
                <a
                  href="/match"
                  className="text-gray-900 font-semibold text-lg no-underline rounded-xl px-4 py-3 block transition-colors duration-150 hover:bg-blue-50 focus:bg-blue-100 focus:outline-none"
                >
                  Find Matches
                </a>
              </li>
              <li>
                <a
                  href="/saved"
                  className="text-gray-900 font-semibold text-lg no-underline rounded-xl px-4 py-3 block transition-colors duration-150 hover:bg-blue-50 focus:bg-blue-100 focus:outline-none"
                >
                  Saved Listings
                </a>
              </li>
              <li>
                <a
                  href="/profile"
                  className="text-gray-900 font-semibold text-lg no-underline rounded-xl px-4 py-3 block transition-colors duration-150 hover:bg-blue-50 focus:bg-blue-100 focus:outline-none"
                >
                  Profile
                </a>
              </li>
            </ul>
            <div className="mt-auto pt-4">
              <button
                onClick={handleLogout}
                className="text-red-500 font-semibold text-lg no-underline rounded-xl px-4 py-3 block w-full text-left transition-colors duration-150 hover:bg-red-50 focus:bg-red-100 focus:outline-none"
              >
                Logout
              </button>
            </div>
          </nav>
        </aside>
      </>
    );
  }

  // Fixed sidebar for desktop
  return (
    <div className="w-full flex flex-col items-center p-8 h-full">
      <nav className="w-full flex flex-col flex-1">
        <ul className="list-none p-0 m-0 w-full flex flex-col gap-5">
          <li>
            <a
              href="/match"
              className="text-gray-900 font-semibold text-lg no-underline rounded-xl px-4 py-3 block transition-colors duration-150 hover:bg-blue-50 focus:bg-blue-100 focus:outline-none"
            >
              Find Matches
            </a>
          </li>
          <li>
            <a
              href="/saved"
              className="text-gray-900 font-semibold text-lg no-underline rounded-xl px-4 py-3 block transition-colors duration-150 hover:bg-blue-50 focus:bg-blue-100 focus:outline-none"
            >
              Saved Listings
            </a>
          </li>
          <li>
            <a
              href="/profile"
              className="text-gray-900 font-semibold text-lg no-underline rounded-xl px-4 py-3 block transition-colors duration-150 hover:bg-blue-50 focus:bg-blue-100 focus:outline-none"
            >
              Profile
            </a>
          </li>
        </ul>
        <div className="mt-auto pt-4">
          <button
            onClick={handleLogout}
            className="text-red-500 font-semibold text-lg no-underline rounded-xl px-4 py-3 block w-full text-left transition-colors duration-150 hover:bg-red-50 focus:bg-red-100 focus:outline-none"
          >
            Logout
          </button>
        </div>
      </nav>
    </div>
  );
} 