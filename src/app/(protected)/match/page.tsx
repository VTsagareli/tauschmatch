"use client";

import React, { useState, useEffect, useRef } from "react";
import ApartmentForm, { ApartmentFormData } from "@/components/ApartmentForm";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import MatchCard from "@/components/MatchCard";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services/userService";
import { matchService, MatchResult } from "@/services/matchService";
import { User } from "@/types";
import { FaCheck } from 'react-icons/fa';

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
  const yourApartmentRef = useRef<HTMLDivElement>(null);
  const [yourApartmentHeight, setYourApartmentHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    function syncHeight() {
      const h1 = yourApartmentRef.current?.offsetHeight || 0;
      setYourApartmentHeight(h1);
    }
    syncHeight();
    window.addEventListener('resize', syncHeight);
    return () => window.removeEventListener('resize', syncHeight);
  }, [myApartment, step]);

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
      console.log('Loading user and matches...');
      // Get current user data
      const user = await userService.getUser(auth.user.uid);
      setCurrentUser(user);
      console.log('User loaded:', user ? 'yes' : 'no');
      console.log('User data:', user);
      
      if (user) {
        // Find matches using AI-powered matching
        console.log('Finding matches...');
        // This now calls the client-side function which fetches from the API
        const matchResults = await matchService.findMatches(user, {}, 10);
        console.log('Matches found:', matchResults.length);
        console.log('Match results:', matchResults);
        
        setMatches(matchResults);
      } else {
        console.log('❌ No user data found');
        setError('No user data found. Please complete your profile first.');
      }
    } catch (error) {
      console.error('Error loading matches:', error);
      setError('Failed to load matches');
    } finally {
      setLoadingMatches(false);
      console.log('Loading matches completed');
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
          ...myApartment,
          myApartmentDescription: myApartment.myApartmentDescription || ""
        },
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
          lookingForDescription: lookingFor.lookingForDescription || ""
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
        myApartment: {
          ...myApartment,
          myApartmentDescription: myApartment.myApartmentDescription || ""
        },
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
          lookingForDescription: lookingFor.lookingForDescription || ""
        },
      });
      
      // Load matches after saving preferences
      await loadUserAndMatches();
      
      // Only show matches after loading is complete
      setSuccess("Your preferences have been saved!");
      setShowMatches(true);
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
      <main className="h-screen flex flex-col md:flex-row items-center justify-center bg-blue-50 overflow-hidden relative w-full">
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
        
        <div className="flex-1 flex flex-col items-center w-full max-w-full md:ml-[220px] px-2 sm:px-4 overflow-hidden" style={{ height: '100vh' }}>
          <div className="flex flex-col items-center w-full transition-all duration-500 pt-20 relative h-full">
            {/* Animated step/reveal flow */}
            <div className={`transition-all duration-700 ease-out ${showMatches ? 'opacity-0 pointer-events-none -translate-y-full' : 'opacity-100 translate-y-0'}`}>
              <div className="w-full md:flex md:flex-row md:gap-14 md:justify-center md:items-center md:mb-8 relative">
                {/* Step 1: Your Apartment */}
                <div
                  ref={yourApartmentRef}
                  className={`md:flex items-center justify-center w-full md:w-auto transition-all duration-300 ${step === 2 ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <ApartmentForm
                    title="Your Apartment"
                    data={myApartment}
                    onChange={setMyApartment}
                    editable={step === 1}
                  />
                </div>
                {/* Step 2: Looking For */}
                <div
                  style={yourApartmentHeight ? { minHeight: yourApartmentHeight } : {}}
                  className={`md:flex items-center justify-center w-full md:w-auto transition-all duration-300 ${step === 1 || loading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <ApartmentForm
                    title="Looking For"
                    data={lookingFor}
                    onChange={setLookingFor}
                    editable={step === 2 && !loading}
                  />
                </div>

              </div>
              {/* Step button logic */}
              {step === 1 && (
                <div className="flex justify-center mt-4">
                  <button
                    className={`bg-blue-600 text-white rounded-full px-8 py-4 font-bold text-lg shadow-md transition-all duration-700 ease-out hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60 disabled:cursor-not-allowed ${showMatches ? 'opacity-0 pointer-events-none -translate-y-16' : 'opacity-100 translate-y-0'}`}
                    onClick={handleNext}
                    disabled={loading || !isMyApartmentComplete}
                  >
                    {loading ? "Saving..." : "Next"}
                  </button>
                </div>
              )}
              {step === 2 && (
                <div className="flex flex-col items-center mt-4">
                  <button
                    className={`bg-blue-600 text-white rounded-full px-8 py-4 font-bold text-lg shadow-md transition-all duration-700 ease-out hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60 disabled:cursor-not-allowed ${showMatches ? 'opacity-0 pointer-events-none -translate-y-16' : 'opacity-100 translate-y-0'}`}
                    onClick={handleSubmit}
                    disabled={loading || !isLookingForComplete}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
                        Finding matches...
                      </div>
                    ) : (
                      "Match"
                    )}
                  </button>
                  {loading && (
                    <p className="text-gray-600 text-sm mt-2 text-center">
                      AI is analyzing your preferences and finding the best matches...
                    </p>
                  )}
                </div>
              )}
              {success && <div className="text-green-600 mt-4 text-center font-medium">{success}</div>}
              {error && <div className="text-red-600 mt-4 text-center font-medium">{error}</div>}
            </div>
            
            {/* Floating button that stays at the top */}
            <div className="fixed top-8 z-20" style={{ left: '220px', right: '0', display: 'flex', justifyContent: 'center' }}>
              <button
                className={`bg-blue-600 text-white rounded-full px-8 py-4 font-bold text-lg shadow-md transition-all duration-700 ease-out hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400 ${showMatches ? 'opacity-100 translate-y-0' : 'opacity-0 pointer-events-none -translate-y-16'}`}
                onClick={() => { 
                  setShowMatches(false); 
                  setStep(1); 
                  // Reset success/error messages when going back
                  setSuccess("");
                  setError("");
                }}
              >
                Edit Apartment Info
              </button>
            </div>
            

            
          </div>
        </div>
        
        {/* Matching Apartments section, animated in - moved outside main container */}
        <div className={`transition-all duration-700 ease-out listings-scrollbar ${showMatches ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'}`} style={{ 
          position: 'fixed', 
          top: '8rem', 
          left: '220px', // Start after sidebar
          right: '0', // Extend to right edge
          width: 'calc(100% - 220px)', 
          maxWidth: '1200px',
          height: 'calc(100vh - 12rem)', 
          overflowY: 'auto', 
          visibility: showMatches ? 'visible' : 'hidden',
          zIndex: 15,
          margin: '0 auto' // Center within the available space
        }}>
          
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
                    key={match.listing.id || match.listing.link}
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
    </main>
    </AuthGuard>
  );
} 