"use client";

import React, { useState, useEffect } from "react";
import ApartmentForm, { ApartmentFormData } from "@/components/ApartmentForm";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import MatchCard from "@/components/MatchCard";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services/userService";
import { matchService, MatchResult } from "@/services/matchService";
import { User } from "@/types";

const initialForm: ApartmentFormData = {
  type: "Apartment",
  rooms: "",
  squareMeters: "",
  coldRent: "",
  minRooms: "",
  minSquareMeters: "",
  maxColdRent: "",
  floor: "any",
  districts: [],
  balcony: false,
  petsAllowed: false,
};

export default function MatchPage() {
  const [myApartment, setMyApartment] = useState<ApartmentFormData>(initialForm);
  const [lookingFor, setLookingFor] = useState<ApartmentFormData>(initialForm);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: Your Apartment, 2: Looking For
  const [isMobile, setIsMobile] = useState(false);
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [showMatches, setShowMatches] = useState(false);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check if forms are complete
  const requiredMyApartmentFields = [
    'type', 'rooms', 'squareMeters', 'coldRent', 'floor', 'street', 'number', 'zipcode'
  ];
  const isMyApartmentComplete = requiredMyApartmentFields.every(
    field => myApartment[field as keyof ApartmentFormData] !== '' && myApartment[field as keyof ApartmentFormData] !== undefined && myApartment[field as keyof ApartmentFormData] !== null
  );
  const requiredLookingForFields = [
    'type', 'minRooms', 'minSquareMeters', 'maxColdRent', 'districts'
  ];
  const isLookingForComplete = requiredLookingForFields.every(
    field => lookingFor[field as keyof ApartmentFormData] !== '' && lookingFor[field as keyof ApartmentFormData] !== undefined && lookingFor[field as keyof ApartmentFormData] !== null
  );

  // Load user data and find matches
  const loadUserAndMatches = async () => {
    if (!auth?.user) return;
    
    setLoadingMatches(true);
    try {
      // Get current user data
      const user = await userService.getUser(auth.user.uid);
      setCurrentUser(user);
      
      if (user) {
        // Find matches using AI-powered matching
        const matchResults = await matchService.findMatches(user, {}, 10);
        setMatches(matchResults);
      }
    } catch (error) {
      console.error('Error loading matches:', error);
      setError('Failed to load matches');
    } finally {
      setLoadingMatches(false);
    }
  };

  // Submission handlers
  async function handleNext() {
    if (!auth?.user) return;
    setLoading(true);
    setSuccess("");
    setError("");
    try {
      await userService.createOrUpdateUser({
        uid: auth.user.uid,
        email: auth.user.email || "",
        displayName: auth.user.displayName || "",
        myApartment: {
          street: myApartment.street || "",
          number: myApartment.number || "",
          zipcode: myApartment.zipcode || "",
          city: "Berlin",
          type: myApartment.type,
          rooms: myApartment.rooms,
          squareMeters: myApartment.squareMeters,
          coldRent: myApartment.coldRent,
          floor: myApartment.floor,
          balcony: myApartment.balcony ?? false,
          petsAllowed: myApartment.petsAllowed ?? false,
        },
      });
      setStep(2);
    } catch (e: any) {
      setError(e.message || "Failed to save your apartment info.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!auth?.user) return;
    setLoading(true);
    setSuccess("");
    setError("");
    try {
      await userService.createOrUpdateUser({
        uid: auth.user.uid,
        email: auth.user.email || "",
        displayName: auth.user.displayName || "",
        lookingFor: {
          districts: lookingFor.districts || [],
          street: lookingFor.lookingStreet || "",
          number: lookingFor.lookingNumber || "",
          type: lookingFor.type,
          minRooms: lookingFor.minRooms,
          minSquareMeters: lookingFor.minSquareMeters,
          maxColdRent: lookingFor.maxColdRent,
          floor: lookingFor.floor,
          balcony: lookingFor.balcony ?? false,
          petsAllowed: lookingFor.petsAllowed ?? false,
        },
      });
      setSuccess("Your preferences have been saved!");
      setShowMatches(true);
      
      // Load matches after saving preferences
      await loadUserAndMatches();
    } catch (e: any) {
      setError(e.message || "Failed to save preferences.");
    } finally {
      setLoading(false);
    }
  }

  const handleContact = (listing: any) => {
    window.open(listing.link, '_blank');
  };

  const handleSave = (listing: any) => {
    // TODO: Implement save functionality
    console.log('Saving listing:', listing);
  };

  return (
    <AuthGuard>
      <main className="min-h-screen flex flex-col md:flex-row items-center justify-center bg-blue-50 overflow-auto relative w-full">
        {/* Hamburger for mobile */}
        <button
          className="md:hidden fixed top-4 left-4 z-50 bg-white rounded-full shadow-lg p-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        
        {/* Sidebar: drawer on mobile, fixed on md+ */}
        <Sidebar isDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        <aside className="hidden md:flex fixed left-0 top-0 h-screen min-w-[200px] max-w-[220px] bg-white shadow-lg rounded-tr-3xl rounded-br-3xl z-10 flex-col justify-start">
          <Sidebar />
        </aside>
        
        <div className="flex-1 flex flex-col items-center justify-center w-full md:h-screen max-w-full md:ml-[220px] px-2 sm:px-4 overflow-auto">
          <div className="flex flex-col items-center justify-center w-full h-full transition-all duration-500">
            {/* Animated step/reveal flow */}
            <div className={`transition-all duration-500 ${showMatches ? 'opacity-0 pointer-events-none translate-y-8' : 'opacity-100 translate-y-0'}`} style={{ display: showMatches ? 'none' : 'block' }}>
              <div className="w-full md:flex md:flex-row md:gap-14 md:justify-center md:items-center md:mb-14">
                {/* Step 1: Your Apartment (enabled if step 1, visually disabled if step 2) */}
                <div className={`md:flex items-center justify-center w-full md:w-auto transition-all duration-300 ${step === 2 ? 'opacity-50 pointer-events-none' : ''}`}>
                  <ApartmentForm
                    title="Your Apartment"
                    data={myApartment}
                    onChange={setMyApartment}
                    editable={step === 1}
                  />
                </div>
                {/* Step 2: Looking For (enabled if step 2, visually disabled if step 1) */}
                <div className={`md:flex items-center justify-center w-full md:w-auto transition-all duration-300 ${step === 1 ? 'opacity-50 pointer-events-none' : ''}`}>
                  <ApartmentForm
                    title="Looking For"
                    data={lookingFor}
                    onChange={setLookingFor}
                    editable={step === 2}
                  />
                </div>
                {/* Desktop: Show both forms, but only one is editable at a time */}
                <div className="hidden md:flex items-center justify-center w-full md:w-auto">
                  {/* Empty for layout symmetry */}
                </div>
              </div>
              {/* Step button logic */}
              {step === 1 && (
                <button
                  className="mt-6 bg-blue-600 text-white rounded-full px-8 py-4 font-bold text-lg shadow-md transition hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={handleNext}
                  disabled={loading || !isMyApartmentComplete}
                >
                  {loading ? "Saving..." : "Next"}
                </button>
              )}
              {step === 2 && (
                <button
                  className="mt-6 bg-blue-600 text-white rounded-full px-8 py-4 font-bold text-lg shadow-md transition hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={handleSubmit}
                  disabled={loading || !isLookingForComplete}
                >
                  {loading ? "Saving..." : "Submit"}
                </button>
              )}
              {success && <div className="text-green-600 mt-4 text-center font-medium">{success}</div>}
              {error && <div className="text-red-600 mt-4 text-center font-medium">{error}</div>}
            </div>
            
            {/* Matching Apartments section, animated in */}
            <div className={`transition-all duration-500 ${showMatches ? 'opacity-100 translate-y-0' : 'opacity-0 pointer-events-none -translate-y-8'}`} style={{ display: showMatches ? 'block' : 'none' }}>
              <button
                className="mb-4 text-blue-600 font-semibold flex items-center gap-1 hover:underline focus:outline-none"
                onClick={() => { setShowMatches(false); setStep(1); }}
              >
                <span className="inline-block transform rotate-180">⬆️</span> Edit apartment infos
              </button>
              
              {/* AI-Powered Matches */}
              <div className="w-full max-w-6xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    AI-Powered Matches
                  </h2>
                  <p className="text-gray-600">
                    Our AI analyzes your preferences and listing descriptions to find the best matches
                  </p>
                </div>
                
                {loadingMatches ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600">Finding your perfect matches...</p>
                  </div>
                ) : matches.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {matches.map((match) => (
                      <MatchCard
                        key={match.listing.id}
                        match={match}
                        onContact={handleContact}
                        onSave={handleSave}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-8">
                      <h3 className="text-gray-900 font-bold text-lg mb-4">
                        No matches found yet
                      </h3>
                      <p className="text-gray-600 mb-4">
                        We're analyzing available listings to find your perfect match.
                      </p>
                      <button
                        onClick={loadUserAndMatches}
                        className="btn btn-primary"
                      >
                        Refresh Matches
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
} 