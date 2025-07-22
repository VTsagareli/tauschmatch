'use client';

import { useState } from 'react';
import { Listing } from '../types/listing';
import { MatchResult } from '../services/matchService';
import { ListingAnalysis } from '../services/aiService';

interface MatchCardProps {
  match: MatchResult;
  onContact?: (listing: Listing) => void;
  onSave?: (listing: Listing) => void;
}

export default function MatchCard({ match, onContact, onSave }: MatchCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<ListingAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  const loadAiAnalysis = async () => {
    if (aiAnalysis) return;
    
    setLoadingAnalysis(true);
    try {
      const analysis = await fetch('/api/analyze-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          listingId: match.listing.id,
          description: match.listing.description 
        })
      }).then(res => res.json());
      
      setAiAnalysis(analysis);
    } catch (error) {
      console.error('Error loading AI analysis:', error);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  return (
    <article className="card bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-2xl">
      {/* Listing image */}
      {match.listing.images && match.listing.images.length > 0 ? (
        <img
          src={match.listing.images[0]}
          alt={match.listing.title || 'Listing image'}
          className="w-full h-48 object-cover rounded-t-2xl"
        />
      ) : (
        <div className="w-full h-48 bg-gray-200 flex items-center justify-center rounded-t-2xl text-gray-400 text-lg">
          No image available
        </div>
      )}
      <div className="card-body">
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

        {/* Why this matches (combined) */}
        {match.whyThisMatches && match.whyThisMatches.length > 0 && (
          <div className="text-xs text-blue-700 space-y-1 mb-2">
            <div className="font-semibold mb-1">Why this matches</div>
            {match.whyThisMatches.map((reason, idx) => (
              <p key={idx}>- {reason}</p>
            ))}
          </div>
        )}

        {/* Filter criteria as bullet points */}
        {match.filters && (
          <ul className="list-disc list-inside text-xs text-gray-600 mb-2">
            {Object.entries(match.filters).map(([key, value]) => (
              value ? <li key={key}><span className="font-medium">{key}:</span> {Array.isArray(value) ? value.join(', ') : value}</li> : null
            ))}
          </ul>
        )}

        {/* GPT-based explanation: what you want & they have, what you have & they want */}
        {(match.whatYouWantAndTheyHave?.length > 0 || match.whatYouHaveAndTheyWant?.length > 0) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2 text-xs text-blue-900 space-y-2">
            {match.whatYouWantAndTheyHave?.length > 0 && (
              <div>
                <div className="font-semibold mb-1">What you want & they have</div>
                <ul className="list-disc list-inside">
                  {match.whatYouWantAndTheyHave.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {match.whatYouHaveAndTheyWant?.length > 0 && (
              <div>
                <div className="font-semibold mb-1">What you have & they want</div>
                <ul className="list-disc list-inside">
                  {match.whatYouHaveAndTheyWant.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => onContact?.(match.listing)}
            className="btn btn-primary btn-sm flex-1"
          >
            Contact
          </button>
          <button
            onClick={() => onSave?.(match.listing)}
            className="btn btn-outline btn-sm"
          >
            Save
          </button>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="btn btn-ghost btn-sm"
          >
            {showDetails ? 'Hide' : 'Details'}
          </button>
        </div>

        {/* Detailed view */}
        {showDetails && (
          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <h5 className="font-semibold text-sm mb-2">Traditional Score Breakdown:</h5>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Budget Match:</span>
                    <span>{Math.round(match.traditionalScore * 0.4)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Room Match:</span>
                    <span>{Math.round(match.traditionalScore * 0.3)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>District:</span>
                    <span>{Math.round(match.traditionalScore * 0.2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span>{Math.round(match.traditionalScore * 0.1)}%</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h5 className="font-semibold text-sm mb-2">AI Analysis:</h5>
                <button
                  onClick={loadAiAnalysis}
                  disabled={loadingAnalysis}
                  className="btn btn-sm btn-outline"
                >
                  {loadingAnalysis ? 'Loading...' : 'Load AI Analysis'}
                </button>
              </div>
            </div>

            {/* AI Analysis Display */}
            {aiAnalysis && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-semibold text-sm mb-3">AI Analysis Results:</h5>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-gray-700 mb-1">Features:</div>
                    <div className="flex flex-wrap gap-1">
                      {aiAnalysis.features.slice(0, 4).map((feature, index) => (
                        <span key={index} className="badge badge-sm badge-outline">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <div className="font-medium text-gray-700 mb-1">Amenities:</div>
                    <div className="flex flex-wrap gap-1">
                      {aiAnalysis.amenities.slice(0, 4).map((amenity, index) => (
                        <span key={index} className="badge badge-sm badge-outline">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <div className="font-medium text-gray-700 mb-1">Neighborhood:</div>
                    <div className="text-gray-600">{aiAnalysis.neighborhood}</div>
                  </div>
                  
                  <div>
                    <div className="font-medium text-gray-700 mb-1">Suitable for:</div>
                    <div className="flex flex-wrap gap-1">
                      {aiAnalysis.suitability.map((suit, index) => (
                        <span key={index} className="badge badge-sm badge-primary">
                          {suit}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Original listing link */}
            <div className="mt-4">
              <a
                href={match.listing.link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-outline w-full"
              >
                View Original Listing
              </a>
            </div>
          </div>
        )}
      </div>
    </article>
  );
} 