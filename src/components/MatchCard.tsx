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

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent Match';
    if (score >= 60) return 'Good Match';
    if (score >= 40) return 'Fair Match';
    return 'Poor Match';
  };

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
    <article className="card bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className="card-body">
        {/* Header with scores */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="card-title text-lg font-semibold mb-2">
              {match.listing.title}
            </h3>
            <p className="text-gray-600 text-sm">
              {match.listing.district} • {match.listing.type}
            </p>
          </div>
          
          <div className="text-right">
            <div className={`text-2xl font-bold ${getScoreColor(match.score)}`}>
              {match.score}%
            </div>
            <div className="text-xs text-gray-500">
              {getScoreLabel(match.score)}
            </div>
          </div>
        </div>

        {/* Key details */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-blue-600">
              €{match.listing.coldRent}
            </div>
            <div className="text-xs text-gray-500">Cold Rent</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-green-600">
              {match.listing.rooms}
            </div>
            <div className="text-xs text-gray-500">Rooms</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-purple-600">
              {match.listing.squareMeters}m²
            </div>
            <div className="text-xs text-gray-500">Size</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-orange-600">
              {match.traditionalScore}%
            </div>
            <div className="text-xs text-gray-500">Traditional</div>
          </div>
        </div>

        {/* Match reasons */}
        <div className="mb-4">
          <h4 className="font-semibold text-sm text-gray-700 mb-2">Why this matches:</h4>
          <ul className="space-y-1">
            {match.matchReasons.slice(0, 3).map((reason, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                {reason}
              </li>
            ))}
          </ul>
        </div>

        {/* AI Score indicator */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-blue-800">AI Semantic Score</div>
              <div className="text-xs text-blue-600">
                Analyzed your preferences vs listing description
              </div>
            </div>
            <div className={`text-lg font-bold ${getScoreColor(match.semanticScore)}`}>
              {match.semanticScore}%
            </div>
          </div>
        </div>

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