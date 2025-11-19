'use client';

import { useState, useEffect } from 'react';
import { Listing, MatchResult } from '../types';
import { savedListingsService } from '../services/savedListingsService';
import { useAuth } from '../hooks/useAuth';

interface MatchCardProps {
  match: MatchResult;
  onContact?: (listing: Listing) => void;
  onSave?: (listing: Listing) => void;
}

export default function MatchCard({ match, onContact, onSave }: MatchCardProps) {
  const auth = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [checkingSaved, setCheckingSaved] = useState(true);

  // Check if listing is saved when component mounts
  useEffect(() => {
    const checkSavedStatus = async () => {
      if (!auth?.user) {
        setCheckingSaved(false);
        return;
      }

      try {
        const saved = await savedListingsService.isListingSaved(auth.user.uid, match.listing.id);
        setIsSaved(saved);
      } catch (error) {
        console.error('Error checking saved status:', error);
      } finally {
        setCheckingSaved(false);
      }
    };

    checkSavedStatus();
  }, [auth?.user, match.listing.id]);

  const handleSaveClick = async () => {
    if (!auth?.user) return;

    try {
      if (isSaved) {
        // Unsave
        await savedListingsService.unsaveListing(auth.user.uid, match.listing.id);
        setIsSaved(false);
      } else {
        // Save
        await savedListingsService.saveListing(auth.user.uid, match.listing);
        setIsSaved(true);
      }
      
      // Call parent callback if provided
      onSave?.(match.listing);
    } catch (error) {
      console.error('Error toggling save:', error);
    }
  };

  const theirReasons = match.reasonBreakdown?.theirApartment ?? {
    structured: match.whyThisMatches || [],
    descriptions: match.whatYouWantAndTheyHave || [],
  };

  const yourReasons = match.reasonBreakdown?.yourApartment ?? {
    structured: match.reasonBreakdown?.yourApartment?.structured || [],
    descriptions: match.whatYouHaveAndTheyWant || [],
  };

  // Debug: Log what we have
  if (process.env.NODE_ENV === 'development') {
    const debugInfo = {
      listingId: match.listing.id,
      hasReasonBreakdown: !!match.reasonBreakdown,
      hasYourApartment: !!match.reasonBreakdown?.yourApartment,
      structuredCount: yourReasons.structured?.length || 0,
      descriptionsCount: yourReasons.descriptions?.length || 0,
      structuredSample: yourReasons.structured?.slice(0, 2),
      // Check all possible sources of semantic reasons
      whatYouHaveFromMatch: match.whatYouHaveAndTheyWant?.length || 0,
      whatYouWantFromMatch: match.whatYouWantAndTheyHave?.length || 0,
      semanticScore: match.semanticScore,
      structuredScore: match.structuredScore,
      theirDescriptionsCount: theirReasons.descriptions?.length || 0,
      yourDescriptionsCount: yourReasons.descriptions?.length || 0,
      // Show actual arrays
      whatYouHaveArray: match.whatYouHaveAndTheyWant || [],
      whatYouWantArray: match.whatYouWantAndTheyHave || [],
      reasonBreakdownYourDescriptions: match.reasonBreakdown?.yourApartment?.descriptions || [],
      reasonBreakdownTheirDescriptions: match.reasonBreakdown?.theirApartment?.descriptions || [],
    };
    
    // Only log first match to avoid spam
    if (match.listing.id === match.listing.id) {
      console.log('🔍 FULL MatchCard data for listing:', match.listing.id);
      console.table(debugInfo);
      console.log('Full match object:', match);
    }
  }

  const structuredScore = match.structuredScore ?? match.traditionalScore ?? 0;
  const semanticScore = match.semanticScore ?? 0;

  const renderReasonColumn = (title: string, reasons: { structured?: string[]; descriptions?: string[] }) => {
    const structured = reasons.structured || [];
    const descriptions = reasons.descriptions || [];
    const hasAny = structured.length > 0 || descriptions.length > 0;

    return (
      <div>
        <div className="font-semibold text-gray-900 mb-2">{title}:</div>
        {hasAny ? (
          <ul className="space-y-1.5 text-sm">
            {structured.length > 0 && (
              <>
                {structured.map((item, idx) => (
                  <li key={`${title}-structured-${idx}`} className="flex gap-2 items-start">
                    <span className="text-green-600 font-semibold mt-0.5">✓</span>
                    <span className="text-gray-800">{item}</span>
                  </li>
                ))}
              </>
            )}
            {descriptions.length > 0 && (
              <>
                {descriptions.map((item, idx) => (
                  <li key={`${title}-description-${idx}`} className="flex gap-2 items-start">
                    <span className="text-blue-500 font-semibold mt-0.5">✓</span>
                    <span className="text-blue-700 font-medium">{item}</span>
                  </li>
                ))}
              </>
            )}
          </ul>
        ) : (
          <p className="text-xs text-gray-500 italic">No AI analysis available. Add descriptions to your apartment and preferences for AI-powered matching.</p>
        )}
      </div>
    );
  };


  return (
    <article className="card bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-2xl flex flex-col h-full">
      {/* Listing image */}
      <div className="relative">
        {match.listing.images && match.listing.images.length > 0 ? (
          <img
            src={match.listing.images[0]}
            alt={match.listing.address || match.listing.district || 'Listing image'}
            className="w-full h-48 object-cover rounded-t-2xl"
          />
        ) : (
          <div className="w-full h-48 bg-gray-200 flex items-center justify-center rounded-t-2xl text-gray-400 text-lg">
            No image available
          </div>
        )}
        <div className="absolute top-3 left-3 bg-black/70 text-white text-xs font-semibold px-3 py-1 rounded-full">
          Matchscore: {match.score}/10
        </div>
        {/* Heart icon for saving - positioned top right */}
        {auth?.user && (
          <button
            onClick={handleSaveClick}
            className="absolute top-3 right-3 bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-400 z-10"
            aria-label={isSaved ? 'Unsave listing' : 'Save listing'}
            disabled={checkingSaved}
          >
            {isSaved ? (
              // Filled heart (saved)
              <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
            ) : (
              // Empty heart (not saved)
              <svg className="w-6 h-6 text-gray-400 hover:text-red-500 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            )}
          </button>
        )}
      </div>
      <div className="card-body p-5 flex flex-col flex-1">
        {/* Header with scores */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="card-title text-lg font-semibold mb-2">
              {match.listing.type} in {match.listing.district}
            </h3>
            <p className="text-gray-600 text-sm">
              {match.listing.address || `${match.listing.district} • ${match.listing.type}`}
            </p>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-700">
              {match.score}/10
            </div>
          </div>
        </div>

        {/* Filter criteria as bullet points */}
        {match.filters && (
          <ul className="list-disc list-inside text-xs text-gray-600 mb-2">
            {Object.entries(match.filters || {}).map(([key, value]) => {
              if (!value) return null;
              const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
              return <li key={key}><span className="font-medium">{key}:</span> {displayValue}</li>;
            })}
          </ul>
        )}

        {/* Scores breakdown */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-3 mb-3">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs text-gray-600 mb-1">Combined</div>
              <div className="text-xl font-bold text-blue-700">{match.score}/10</div>
            </div>
            <div className="border-l border-blue-300">
              <div className="text-xs text-gray-600 mb-1">Structured</div>
              <div className="text-lg font-semibold text-green-700">
                {match.structuredScore ?? match.traditionalScore ?? 'N/A'}/10
              </div>
              <div className="text-xs text-gray-500">(60% weight)</div>
            </div>
            <div className="border-l border-blue-300">
              <div className="text-xs text-gray-600 mb-1">Semantic</div>
              <div className="text-lg font-semibold text-red-700">
                {match.semanticScore ?? 'N/A'}/10
              </div>
              <div className="text-xs text-gray-500">(40% weight)</div>
            </div>
          </div>
        </div>

        {/* Structured Matching Section */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-green-700 font-semibold">✓</span>
            <h4 className="font-semibold text-gray-900">Structured Matching</h4>
            <span className="text-xs text-gray-500 ml-auto">
              Score: {match.structuredScore ?? match.traditionalScore ?? 'N/A'}/10
            </span>
          </div>
          <div className="space-y-4 text-sm">
            {renderReasonColumn('What you have & they want', {
              structured: yourReasons.structured || [],
              descriptions: [] // No semantic reasons in structured section
            })}
            {renderReasonColumn('What they have & you want', {
              structured: theirReasons.structured || [],
              descriptions: [] // No semantic reasons in structured section
            })}
          </div>
        </div>

        {/* Semantic Matching Section - Only show if there's a semantic score > 1 or semantic reasons */}
        {(match.semanticScore && match.semanticScore > 1) || (yourReasons.descriptions && yourReasons.descriptions.length > 0) || (theirReasons.descriptions && theirReasons.descriptions.length > 0) ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-3">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-blue-700 font-semibold">✓</span>
              <h4 className="font-semibold text-gray-900">Semantic Matching (AI Analysis)</h4>
              <span className="text-xs text-gray-500 ml-auto">
                Score: {match.semanticScore ?? 'N/A'}/10
              </span>
            </div>
            <div className="space-y-4 text-sm">
              {renderReasonColumn('What you have & they want', {
                structured: [], // No structured reasons in semantic section
                descriptions: yourReasons.descriptions || []
              })}
              {renderReasonColumn('What they have & you want', {
                structured: [], // No structured reasons in semantic section
                descriptions: theirReasons.descriptions || []
              })}
            </div>
          </div>
        ) : null}

      </div>
      {/* Action & listing CTA */}
      <div className="px-5 pb-5 pt-4">
        <div className="flex justify-center">
          <button
            onClick={() => onContact?.(match.listing)}
            className="bg-blue-600 text-white rounded-full px-6 py-2 text-sm font-semibold shadow-md transition hover:bg-blue-700 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            To The Listing
          </button>
        </div>
      </div>
    </article>
  );
} 
