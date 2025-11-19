"use client";

import React, { useState, useEffect } from "react";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services/userService";
import { User } from "@/types";

export default function ProfilePage() {
  const auth = useAuth();
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadUserData();
  }, [auth?.user]);

  const loadUserData = async () => {
    if (!auth?.user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const user = await userService.getUser(auth.user.uid);
      setUserData(user);
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get user initials for avatar
  const getInitials = () => {
    if (userData?.displayName) {
      return userData.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (auth?.user?.email) {
      return auth.user.email[0].toUpperCase();
    }
    return "U";
  };

  // Format date
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const displayName = userData?.displayName || auth?.user?.displayName || "User";
  const email = auth?.user?.email || (auth?.isAnonymous ? "Guest Account" : "No email");
  const memberSince = userData?.createdAt || null;
  const isGuest = auth?.isAnonymous || false;

  const handleUpdateDisplayName = async () => {
    if (!auth?.updateUserDisplayName) return;
    if (!newDisplayName.trim()) {
      setError("Display name cannot be empty");
      return;
    }
    setError("");
    setSuccess("");
    try {
      await auth.updateUserDisplayName(newDisplayName);
      setSuccess("Display name updated successfully!");
      setEditingDisplayName(false);
      setNewDisplayName("");
      await loadUserData();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update display name");
    }
  };

  const handleUpdateEmail = async () => {
    if (!auth?.updateUserEmail) return;
    if (!newEmail.trim()) {
      setError("Email cannot be empty");
      return;
    }
    if (!currentPassword) {
      setError("Please enter your current password");
      return;
    }
    setError("");
    setSuccess("");
    try {
      await auth.updateUserEmail(newEmail, currentPassword);
      setSuccess("Email updated successfully!");
      setEditingEmail(false);
      setNewEmail("");
      setCurrentPassword("");
      await loadUserData();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update email");
    }
  };

  const handleUpdatePassword = async () => {
    if (!auth?.updateUserPassword) return;
    if (!currentPassword) {
      setError("Please enter your current password");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setError("");
    setSuccess("");
    try {
      await auth.updateUserPassword(currentPassword, newPassword);
      setSuccess("Password updated successfully!");
      setEditingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update password");
    }
  };

  return (
    <AuthGuard>
      <main className="min-h-screen bg-blue-50">
        {/* Drawer trigger */}
        <button
          className="fixed top-4 left-4 z-50 bg-white rounded-full shadow-lg p-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Sidebar */}
        <Sidebar isDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="max-w-2xl mx-auto">
            {/* Profile Header */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-gray-600">Loading profile...</p>
                </div>
              ) : (
                <>
                  {/* Profile Picture/Avatar */}
                  <div className="flex flex-col items-center mb-6">
                    <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-4">
                      {getInitials()}
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{displayName}</h1>
                    <p className="text-gray-600 text-lg">{email}</p>
                  </div>

                  {/* Error/Success Messages */}
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-600 text-sm">{error}</p>
                    </div>
                  )}
                  {success && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-600 text-sm">{success}</p>
                    </div>
                  )}

                  {/* Profile Information */}
                  <div className="space-y-4 pt-6 border-t border-gray-200">
                    {/* Display Name */}
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-500">Display Name</p>
                          {editingDisplayName ? (
                            <div className="flex gap-2 mt-1">
                              <input
                                type="text"
                                value={newDisplayName || displayName}
                                onChange={(e) => setNewDisplayName(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
                                placeholder="Enter display name"
                              />
                              <button
                                onClick={handleUpdateDisplayName}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingDisplayName(false);
                                  setNewDisplayName("");
                                  setError("");
                                }}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <p className="text-gray-900 font-medium">{displayName}</p>
                              <button
                                onClick={() => {
                                  setEditingDisplayName(true);
                                  setNewDisplayName(displayName);
                                  setError("");
                                }}
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-500">Email</p>
                          {!editingEmail && (
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-gray-900 font-medium">{email}</p>
                                {isGuest && (
                                  <p className="text-xs text-yellow-600 mt-1">Guest accounts don't have email addresses</p>
                                )}
                              </div>
                              {!isGuest && (
                                <button
                                  onClick={() => {
                                    setEditingEmail(true);
                                    setNewEmail(email);
                                    setCurrentPassword("");
                                    setError("");
                                  }}
                                  className="text-blue-600 hover:text-blue-700 text-sm font-medium ml-4"
                                >
                                  Edit
                                </button>
                              )}
                            </div>
                          )}
                          {editingEmail ? (
                            <div className="space-y-2 mt-1">
                              {isGuest ? (
                                <p className="text-sm text-yellow-600">Guest accounts cannot update email. Please sign up for a full account.</p>
                              ) : (
                                <>
                                  <input
                                    type="email"
                                    value={newEmail || email}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
                                    placeholder="Enter new email"
                                  />
                                  <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
                                    placeholder="Enter current password"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={handleUpdateEmail}
                                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingEmail(false);
                                        setNewEmail("");
                                        setCurrentPassword("");
                                        setError("");
                                      }}
                                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Password */}
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-500">Password</p>
                          {editingPassword ? (
                            <div className="space-y-2 mt-1">
                              <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
                                placeholder="Enter current password"
                              />
                              <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
                                placeholder="Enter new password"
                              />
                              <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
                                placeholder="Confirm new password"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={handleUpdatePassword}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingPassword(false);
                                    setCurrentPassword("");
                                    setNewPassword("");
                                    setConfirmPassword("");
                                    setError("");
                                  }}
                                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <p className="text-gray-900 font-medium">••••••••</p>
                              <button
                                onClick={() => {
                                  setEditingPassword(true);
                                  setCurrentPassword("");
                                  setNewPassword("");
                                  setConfirmPassword("");
                                  setError("");
                                }}
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Member Since</p>
                          <p className="text-gray-900 font-medium">{formatDate(memberSince)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <a
                        href="/match"
                        className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors border border-blue-200"
                      >
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Find Matches</p>
                          <p className="text-sm text-gray-600">Browse available apartments</p>
                        </div>
                      </a>
                      <a
                        href="/saved"
                        className="flex items-center gap-3 p-4 bg-red-50 rounded-xl hover:bg-red-100 transition-colors border border-red-200"
                      >
                        <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Saved Listings</p>
                          <p className="text-sm text-gray-600">View your saved apartments</p>
                        </div>
                      </a>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Account Section */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Account</h2>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">
                    Need to update your profile information? You can edit your apartment details and preferences from the match page.
                  </p>
                  <a
                    href="/match"
                    className="inline-block text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    Go to Match Page →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
} 
