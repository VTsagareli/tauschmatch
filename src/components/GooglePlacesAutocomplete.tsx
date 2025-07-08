import React, { useEffect, useRef, useState } from "react";

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (address: { street: string; number: string; zipcode: string; city: string }) => void;
  placeholder?: string;
  types?: string[]; // e.g., ["address"] or ["(regions)"]
}

export default function GooglePlacesAutocomplete({ value, onChange, onSelect, placeholder, types = ["address"] }: GooglePlacesAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const serviceRef = useRef<any>(null);
  const detailsServiceRef = useRef<any>(null);
  const sessionTokenRef = useRef<any>(null);
  // Add a flag to prevent suggestions after selection until user types again
  const [justSelected, setJustSelected] = useState(false);

  // Initialize AutocompleteService
  useEffect(() => {
    if (!(window as any).google?.maps?.places) return;
    if (!serviceRef.current) {
      serviceRef.current = new (window as any).google.maps.places.AutocompleteService();
    }
    if (!detailsServiceRef.current) {
      detailsServiceRef.current = new (window as any).google.maps.places.PlacesService(document.createElement('div'));
    }
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new (window as any).google.maps.places.AutocompleteSessionToken();
    }
  }, [(window as any).google?.maps?.places]);

  // Fetch suggestions
  useEffect(() => {
    if (!value || !serviceRef.current) {
      setSuggestions([]);
      return;
    }
    if (justSelected) { setSuggestions([]); return; }
    setLoading(true);
    serviceRef.current.getPlacePredictions(
      {
        input: value,
        types,
        componentRestrictions: { country: "de" },
        sessionToken: sessionTokenRef.current,
        location: new (window as any).google.maps.LatLng(52.5200, 13.4050),
        radius: 25000, // 25km around Berlin center
      },
      (predictions: any[], status: string) => {
        setLoading(false);
        if (status === "OK" && predictions) {
          setSuggestions(predictions.filter(p => p.description.includes("Berlin")));
        } else {
          setSuggestions([]);
        }
      }
    );
  }, [value, types, justSelected]);

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      setActive((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      setActive((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      handleSuggestionSelect(suggestions[active]);
    }
  }

  function parseAddressComponents(components: any[]): { street: string; number: string; zipcode: string; city: string } {
    let street = "";
    let number = "";
    let zipcode = "";
    let city = "Berlin";
    for (const comp of components) {
      if (comp.types.includes("route")) street = comp.long_name;
      if (comp.types.includes("street_number")) number = comp.long_name;
      if (comp.types.includes("postal_code")) zipcode = comp.long_name;
      if (comp.types.includes("locality")) city = comp.long_name;
    }
    return { street, number, zipcode, city };
  }

  function handleSuggestionSelect(suggestion: any) {
    onChange(suggestion.description);
    setSuggestions([]);
    setActive(-1);
    if (inputRef.current) inputRef.current.blur();
    if (onSelect && detailsServiceRef.current) {
      detailsServiceRef.current.getDetails({ placeId: suggestion.place_id, sessionToken: sessionTokenRef.current }, (place: any, status: string) => {
        if (status === "OK" && place && place.address_components) {
          const parsed = parseAddressComponents(place.address_components);
          onSelect(parsed);
        }
      });
    }
    setJustSelected(true);
  }

  function handleSuggestionClick(suggestion: any) {
    handleSuggestionSelect(suggestion);
  }

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => {
          onChange(e.target.value);
          setJustSelected(false);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="mt-2 h-9 px-4 rounded-xl text-base sm:text-sm w-full bg-white text-gray-900 border border-blue-400 mb-1 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
        autoComplete="off"
      />
      {loading && <div className="absolute left-2 top-2 text-gray-400 text-xs">Loading...</div>}
      {suggestions.length > 0 && (
        <ul className="absolute z-10 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-56 overflow-auto">
          {suggestions.map((s, i) => (
            <li
              key={s.place_id}
              className={`px-4 py-2 cursor-pointer hover:bg-blue-50 ${i === active ? "bg-blue-100" : ""}`}
              onMouseDown={() => handleSuggestionClick(s)}
            >
              {s.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 