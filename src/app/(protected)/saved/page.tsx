"use client";

import React, { useState, useEffect } from "react";
import AuthGuard from "@/components/AuthGuard";
import MatchCard from "@/components/MatchCard";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { savedListingsService, SavedListing } from "@/services/savedListingsService";
import { MatchResult } from "@/types";

export default function SavedListingsPage() {
  const auth = useAuth();
  const [savedListings, setSavedListings] = useState<SavedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    loadSavedListings();
  }, [auth?.user]);

  const loadSavedListings = async () => {
    if (!auth?.user) return;

    setLoading(true);
    setError("");
    try {
      const saved = await savedListingsService.getSavedListings(auth.user.uid);
      setSavedListings(saved);
    } catch (err: any) {
      console.error("Error loading saved listings:", err);
      setError("Failed to load saved listings");
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (listingId: string) => {
    if (!auth?.user) return;

    try {
      await savedListingsService.unsaveListing(auth.user.uid, listingId);
      // Remove from local state
      setSavedListings(prev => prev.filter(saved => saved.listingId !== listingId));
      setError(""); // Clear any previous errors
    } catch (err: any) {
      console.error("Error unsaving listing:", err);
      setError("Failed to unsave listing");
    }
  };

  const handleContact = (listing: any) => {
    window.open(listing.link, '_blank');
  };

  // Convert SavedListing to MatchResult format for MatchCard
  const convertToMatchResult = (saved: SavedListing): MatchResult => {
    return {
      listing: saved.listing,
      score: 0, // Saved listings don't have scores
      structuredScore: 0,
      semanticScore: 0,
      whatYouWantAndTheyHave: [],
      whatYouHaveAndTheyWant: [],
      reasonBreakdown: {
        theirApartment: { structured: [], descriptions: [] },
        yourApartment: { structured: [], descriptions: [] },
      },
    };
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
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Saved Listings
              </h1>
              <p className="text-gray-600">
                Your saved apartment listings for easy access
              </p>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading saved listings...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600">{error}</p>
                  <button
                    onClick={loadSavedListings}
                    className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : savedListings.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-8">
                  <h3 className="text-gray-900 font-bold text-lg mb-4">
                    No saved listings yet
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Start saving listings you're interested in by clicking the "Save" button on any match.
                  </p>
                  <a
                    href="/match"
                    className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Browse Matches
                  </a>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedListings.map((saved) => (
                  <div key={saved.id} className="relative">
                    <MatchCard
                      match={convertToMatchResult(saved)}
                      onContact={handleContact}
                      onSave={() => handleUnsave(saved.listingId)}
                    />
                    <button
                      onClick={() => handleUnsave(saved.listingId)}
                      className="absolute top-4 right-4 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors shadow-lg z-10"
                      aria-label="Unsave listing"
                      title="Remove from saved"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}

