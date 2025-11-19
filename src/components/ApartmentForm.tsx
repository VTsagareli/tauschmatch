import React, { useState, useEffect } from "react";
import GooglePlacesAutocomplete from "./GooglePlacesAutocomplete";
import Select from 'react-select';

export type ApartmentFormData = {
  // For 'Your Apartment'
  street?: string;
  number?: string;
  zipcode?: string;
  city?: string;
  rooms?: string;
  squareMeters?: string;
  coldRent?: string;
  // For 'Looking For'
  districts?: string[]; // Changed from single district to multiple districts
  lookingStreet?: string;
  lookingNumber?: string;
  minRooms?: string;
  minSquareMeters?: string;
  maxColdRent?: string;
  type: "Apartment" | "WG Room" | "Full House";
  floor?: string;
  balcony?: boolean;
  petsAllowed?: boolean;
  myApartmentDescription?: string;
  lookingForDescription?: string;
};

type Props = {
  title: string;
  data: ApartmentFormData;
  onChange: (data: ApartmentFormData) => void;
  onNext?: () => void; // For step-based mobile flow
  showNext?: boolean;  // For step-based mobile flow
  editable?: boolean;  // disables all inputs if false
};

const requiredFields: (keyof ApartmentFormData)[] = [
  "type",
  // For 'Your Apartment'
  "rooms",
  "squareMeters",
  "coldRent",
  // For 'Looking For'
  "minRooms",
  "minSquareMeters",
  "maxColdRent",
];

function getErrorMessages(data: ApartmentFormData, isLookingFor: boolean) {
  const errors: Record<string, string> = {};
  requiredFields.forEach((field) => {
    if (isLookingFor) {
      if (["minRooms", "minSquareMeters", "maxColdRent", "type"].includes(field) && (!data[field] || (typeof data[field] === "string" && data[field].trim() === ""))) {
        errors[field] = "Please fill out this field.";
      }
    } else {
      if (["rooms", "squareMeters", "coldRent", "type"].includes(field) && (!data[field] || (typeof data[field] === "string" && data[field].trim() === ""))) {
      errors[field] = "Please fill out this field.";
      }
    }
  });
  return errors;
}

export default function ApartmentForm({ title, data, onChange, onNext, showNext, editable = true }: Props) {
  const isLookingFor = title.toLowerCase().includes("looking");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  // const errors = getErrorMessages(data, isLookingFor); // Unused - validation handled inline
  const [animate, setAnimate] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    setTimeout(() => setAnimate(true), 10);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    let newValue: any = value;
    if (type === "checkbox" && e.target instanceof HTMLInputElement) {
      newValue = e.target.checked;
    }
    onChange({
      ...data,
      [name]: newValue,
    });
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  }

  // Blue asterisk for required fields
  const requiredAsterisk = <span className="text-blue-600 ml-1">*</span>;

  // Info icon with tooltip
  const infoIcon = (
    <span
      className="ml-1 text-blue-500 cursor-pointer relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onTouchStart={() => setShowTooltip(!showTooltip)}
      tabIndex={0}
      aria-label="Info: Berlin only"
    >
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor">i</text></svg>
      {showTooltip && (
        <span className="absolute left-1/2 -translate-x-1/2 top-7 z-20 bg-gray-900 text-white text-xs rounded px-2 py-1 shadow-lg whitespace-nowrap">
          For now, the app is only limited to Berlin.
        </span>
      )}
    </span>
  );

  // Determine which form
  // const isLookingFor = title.toLowerCase().includes("looking"); // This line is removed

  // Custom error logic for address fields
  function getCustomErrors() {
    const errors: Record<string, string> = {};
    requiredFields.forEach((field) => {
      if (isLookingFor && (field === "minRooms" || field === "minSquareMeters" || field === "maxColdRent")) {
        if (!data[field] || (typeof data[field] === "string" && data[field]?.trim() === "")) {
          errors[field] = "Please fill out this field.";
        }
      } else if (!isLookingFor && (field !== "minRooms" && field !== "minSquareMeters" && field !== "maxColdRent")) {
        if (!data[field] || (typeof data[field] === "string" && data[field]?.trim() === "")) {
          errors[field] = "Please fill out this field.";
        }
      }
    });
    if (!isLookingFor) {
      if (!data.street || data.street.trim() === "") errors.street = "Please fill out this field.";
      if (!data.number || data.number.trim() === "") errors.number = "Please fill out this field.";
      if (!data.zipcode || data.zipcode.trim() === "") errors.zipcode = "Please fill out this field.";
    } else {
      if (!data.districts || data.districts.length === 0) errors.districts = "Please select at least one district.";
    }
    return errors;
  }
  // Use a different variable name to avoid redeclaration
  const customErrors = getCustomErrors();

  // Update isComplete logic
  const isComplete = Object.keys(customErrors).length === 0;

  // For 'Your Apartment' address fields
  function handleAddressSelect(addr: { street: string; number: string; zipcode: string; city: string }) {
    onChange({
      ...data,
      street: addr.street,
      number: addr.number,
      zipcode: addr.zipcode,
      city: "Berlin",
    });
  }

  // For 'Looking For' district autocomplete (static list)
  const berlinDistricts = [
    "Mitte", "Friedrichshain-Kreuzberg", "Pankow", "Charlottenburg-Wilmersdorf", "Spandau", "Steglitz-Zehlendorf", "Tempelhof-Schöneberg", "Neukölln", "Treptow-Köpenick", "Marzahn-Hellersdorf", "Lichtenberg", "Reinickendorf"
  ];

  // Handle district selection/deselection
  const handleDistrictToggle = (district: string) => {
    const currentDistricts = data.districts || [];
    const newDistricts = currentDistricts.includes(district)
      ? currentDistricts.filter(d => d !== district)
      : [...currentDistricts, district];
    
    onChange({
      ...data,
      districts: newDistricts
    });
  };

  // Autofill example data
  function handleAutofill() {
    if (isLookingFor) {
      onChange({
        type: "Apartment",
        minRooms: "2",
        minSquareMeters: "45",
        maxColdRent: "800",
        districts: ["Friedrichshain-Kreuzberg", "Mitte", "Charlottenburg-Wilmersdorf", "Neukölln"],
        lookingForDescription: "I am looking for a cozy, modern 1-2 room apartment in a lively area such as Kreuzberg, Neukölln, or Friedrichshain. Ideally, the apartment has a balcony or terrace, is pet-friendly, and is close to cafés, restaurants, and public transport. I would love to live in a place with a young, social atmosphere where music and gatherings are welcome. Affordability and a vibrant neighborhood are important to me, as well as a space that feels welcoming and inspiring.",
      });
    } else {
      // Random Berlin addresses
      const randomAddresses = [
        { street: "Warschauer Straße", number: "34", zipcode: "10243", city: "Berlin" },
        { street: "Prenzlauer Allee", number: "48", zipcode: "10405", city: "Berlin" },
        { street: "Oranienburger Straße", number: "15", zipcode: "10178", city: "Berlin" },
        { street: "Bergmannstraße", number: "62", zipcode: "10961", city: "Berlin" },
        { street: "Kantstraße", number: "120", zipcode: "10625", city: "Berlin" },
        { street: "Sonnenallee", number: "88", zipcode: "12045", city: "Berlin" },
        { street: "Karl-Marx-Allee", number: "120", zipcode: "10243", city: "Berlin" },
        { street: "Kastanienallee", number: "85", zipcode: "10435", city: "Berlin" },
        { street: "Schönhauser Allee", number: "160", zipcode: "10435", city: "Berlin" },
        { street: "Torstraße", number: "170", zipcode: "10115", city: "Berlin" },
        { street: "Gneisenaustraße", number: "52", zipcode: "10961", city: "Berlin" },
        { street: "Simon-Dach-Straße", number: "23", zipcode: "10245", city: "Berlin" },
        { street: "Revaler Straße", number: "14", zipcode: "10245", city: "Berlin" },
        { street: "Weserstraße", number: "199", zipcode: "12045", city: "Berlin" },
        { street: "Brunnenstraße", number: "75", zipcode: "13355", city: "Berlin" },
      ];

      // Random room count between 1-4
      const randomRooms = Math.floor(Math.random() * 4) + 1;
      
      // Random square meters (between 30-100, roughly 25-35 per room)
      const randomSquareMeters = Math.floor(Math.random() * 70) + 30;
      
      // Random rent (roughly 10-15 euros per sqm)
      const randomRent = Math.floor(randomSquareMeters * (Math.random() * 5 + 10));
      
      // Random floor (0-5)
      const randomFloor = Math.floor(Math.random() * 6);
      
      // Random boolean for balcony and pets
      const randomBalcony = Math.random() > 0.5;
      const randomPets = Math.random() > 0.5;

      // Select random address
      const randomAddress = randomAddresses[Math.floor(Math.random() * randomAddresses.length)];

      onChange({
        type: "Apartment",
        street: randomAddress.street,
        number: randomAddress.number,
        zipcode: randomAddress.zipcode,
        city: randomAddress.city,
        rooms: randomRooms.toString(),
        squareMeters: randomSquareMeters.toString(),
        coldRent: randomRent.toString(),
        floor: randomFloor.toString(),
        balcony: randomBalcony,
        petsAllowed: randomPets,
        myApartmentDescription: "I currently live in a spacious, bright apartment in a quiet, family-friendly neighborhood in Berlin. The apartment features large windows, a modern kitchen, and good access to public transport. The area is peaceful with friendly neighbors, parks, and easy access to public transport.",
      });
    }
  }

  return (
    <section className={`flex flex-col items-center gap-3 bg-white rounded-3xl shadow-lg p-4 sm:p-2 w-full max-w-[600px] min-h-[220px] justify-center mx-auto relative transition-all duration-500 ${animate ? 'animate-fadeInUp' : 'opacity-0 translate-y-8'}`}>
      {/* Autofill Example Button */}
      <button
        type="button"
        className="absolute top-2 right-2 bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-semibold px-3 py-1 rounded shadow-sm border border-blue-200"
        onClick={handleAutofill}
        tabIndex={0}
      >
        Autofill Example
      </button>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(32px); }
          to { opacity: 1; transform: none; }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.6s cubic-bezier(.4,0,.2,1);
        }
      `}</style>
      <h2 className="text-gray-900 font-bold text-xl sm:text-lg mb-2 tracking-tight text-center">{title}</h2>
      <form className="flex flex-col gap-3 w-full items-center justify-center h-full" autoComplete="off" onSubmit={e => { e.preventDefault(); if (onNext && isComplete) onNext(); }}>
        {/* Address fields for 'Your Apartment' */}
        {!isLookingFor && (
          <div className="w-full flex flex-col gap-2 mb-2">
            <label className="font-medium text-gray-700">
              Street{requiredAsterisk} {infoIcon}
              <GooglePlacesAutocomplete
                value={data.street || ""}
                onChange={val => onChange({ ...data, street: val })}
                onSelect={handleAddressSelect}
                placeholder="Start typing your street..."
                types={["address"]}
              />
            </label>
            <div className="flex gap-2">
              <label className="flex-1 font-medium text-gray-700">
                Number{requiredAsterisk}
                <input
                  name="number"
                  type="text"
                  value={data.number || ""}
                  onChange={e => onChange({ ...data, number: e.target.value })}
                  className="mt-2 h-9 px-4 rounded-xl text-base sm:text-sm w-full bg-white text-gray-900 border border-blue-400 mb-1 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                  required
                  disabled={!editable}
                />
              </label>
              <label className="flex-1 font-medium text-gray-700">
                Zipcode{requiredAsterisk}
                <input
                  name="zipcode"
                  type="text"
                  value={data.zipcode || ""}
                  onChange={e => onChange({ ...data, zipcode: e.target.value })}
                  className="mt-2 h-9 px-4 rounded-xl text-base sm:text-sm w-full bg-white text-gray-900 border border-blue-400 mb-1 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                  required
                  disabled={!editable}
                />
              </label>
            </div>
            <label className="font-medium text-gray-700">
              City
              <input
                name="city"
                type="text"
                value="Berlin"
                disabled
                className="mt-2 h-9 px-4 rounded-xl text-base sm:text-sm w-full bg-gray-100 text-gray-900 border border-blue-400 mb-1"
              />
            </label>
          </div>
        )}
        {/* District/Street/Number for 'Looking For' */}
        {isLookingFor && (
          <div className="w-full flex flex-col gap-2 mb-2">
            <label className="font-medium text-gray-700 w-full">
              Districts<span className="text-blue-600 ml-1">*</span>
              <Select
                isMulti
                closeMenuOnSelect={false}
                name="districts"
                options={[
                  { value: "Mitte", label: "Mitte" },
                  { value: "Friedrichshain-Kreuzberg", label: "Friedrichshain-Kreuzberg" },
                  { value: "Pankow", label: "Pankow" },
                  { value: "Charlottenburg-Wilmersdorf", label: "Charlottenburg-Wilmersdorf" },
                  { value: "Spandau", label: "Spandau" },
                  { value: "Steglitz-Zehlendorf", label: "Steglitz-Zehlendorf" },
                  { value: "Tempelhof-Schöneberg", label: "Tempelhof-Schöneberg" },
                  { value: "Neukölln", label: "Neukölln" },
                  { value: "Treptow-Köpenick", label: "Treptow-Köpenick" },
                  { value: "Marzahn-Hellersdorf", label: "Marzahn-Hellersdorf" },
                  { value: "Lichtenberg", label: "Lichtenberg" },
                  { value: "Reinickendorf", label: "Reinickendorf" },
                ]}
                value={(data.districts || []).map(d => ({ value: d, label: d }))}
                onChange={selected => {
                  onChange({ ...data, districts: selected ? selected.map(opt => opt.value) : [] });
                }}
                classNamePrefix="react-select"
                isDisabled={!editable}
                placeholder="Select one or more districts..."
                styles={{
                  menu: base => ({ ...base, zIndex: 9999 }),
                  control: base => ({ ...base, minHeight: 44 }),
                }}
              />
            </label>
            <label className="font-medium text-gray-700">
              Street (optional)
              <input
                name="lookingStreet"
                type="text"
                value={data.lookingStreet || ""}
                onChange={e => onChange({ ...data, lookingStreet: e.target.value })}
                placeholder="Street (optional)"
                className="mt-2 h-9 px-4 rounded-xl text-base sm:text-sm w-full bg-white text-gray-900 border border-blue-400 mb-1 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                disabled={!editable}
              />
            </label>
            <label className="font-medium text-gray-700">
              Number (optional)
              <input
                name="lookingNumber"
                type="text"
                value={data.lookingNumber || ""}
                onChange={e => onChange({ ...data, lookingNumber: e.target.value })}
                placeholder="Number (optional)"
                className="mt-2 h-9 px-4 rounded-xl text-base sm:text-sm w-full bg-white text-gray-900 border border-blue-400 mb-1 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                disabled={!editable}
              />
            </label>
          </div>
        )}
        {/* Numeric fields row */}
        {!isLookingFor && (
          <div className="flex gap-4 w-full mb-2">
            <label className="flex-1 font-medium text-gray-700">
              Rooms
              <input
                name="rooms"
                type="number"
                value={data.rooms || ""}
                onChange={e => onChange({ ...data, rooms: e.target.value })}
                className="mt-2 h-9 px-4 rounded-xl text-base sm:text-sm w-full bg-white text-gray-900 border border-blue-400 mb-1 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                required
                disabled={!editable}
              />
            </label>
            <label className="flex-1 font-medium text-gray-700">
              Square Meters
              <input
                name="squareMeters"
                type="number"
                value={data.squareMeters || ""}
                onChange={e => onChange({ ...data, squareMeters: e.target.value })}
                className="mt-2 h-9 px-4 rounded-xl text-base sm:text-sm w-full bg-white text-gray-900 border border-blue-400 mb-1 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                required
                disabled={!editable}
              />
            </label>
            <label className="flex-1 font-medium text-gray-700">
              Cold Rent (€)
              <input
                name="coldRent"
                type="number"
                value={data.coldRent || ""}
                onChange={e => onChange({ ...data, coldRent: e.target.value })}
                className="mt-2 h-9 px-4 rounded-xl text-base sm:text-sm w-full bg-white text-gray-900 border border-blue-400 mb-1 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                required
                disabled={!editable}
              />
            </label>
          </div>
        )}
        {isLookingFor && (
          <div className="flex gap-4 w-full mb-2">
            <label className="flex-1 font-medium text-gray-700">
              Min Rooms
              <input
                name="minRooms"
                type="number"
                value={data.minRooms || ""}
                onChange={e => onChange({ ...data, minRooms: e.target.value })}
                className="mt-2 h-9 px-4 rounded-xl text-base sm:text-sm w-full bg-white text-gray-900 border border-blue-400 mb-1 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                required
                disabled={!editable}
              />
            </label>
            <label className="flex-1 font-medium text-gray-700">
              Min Square Meters
              <input
                name="minSquareMeters"
                type="number"
                value={data.minSquareMeters || ""}
                onChange={e => onChange({ ...data, minSquareMeters: e.target.value })}
                className="mt-2 h-9 px-4 rounded-xl text-base sm:text-sm w-full bg-white text-gray-900 border border-blue-400 mb-1 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                required
                disabled={!editable}
              />
            </label>
            <label className="flex-1 font-medium text-gray-700">
              Max Cold Rent (€)
              <input
                name="maxColdRent"
                type="number"
                value={data.maxColdRent || ""}
                onChange={e => onChange({ ...data, maxColdRent: e.target.value })}
                className="mt-2 h-9 px-4 rounded-xl text-base sm:text-sm w-full bg-white text-gray-900 border border-blue-400 mb-1 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                required
                disabled={!editable}
              />
            </label>
          </div>
        )}
        {/* Type, Floor, Balcony, Pets row */}
        <div className="flex gap-4 w-full mb-2">
          <label className="flex-1 font-medium text-gray-700">
            Apartment Type
            <select
              name="type"
              value={data.type}
              onChange={e => onChange({ ...data, type: e.target.value as any })}
              className="mt-2 h-9 px-4 rounded-xl text-base sm:text-sm w-full bg-white text-gray-900 border border-blue-400 mb-1 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
              required
              disabled={!editable}
            >
              <option value="Apartment">Apartment</option>
              <option value="WG Room">WG Room</option>
              <option value="Full House">Full House</option>
            </select>
          </label>
          <label className="flex-1 font-medium text-gray-700">
            Floor
            <select
              name="floor"
              value={data.floor || "any"}
              onChange={e => onChange({ ...data, floor: e.target.value })}
              className="mt-2 h-9 px-4 rounded-xl text-base sm:text-sm w-full bg-white text-gray-900 border border-blue-400 mb-1 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
              required
              disabled={!editable}
            >
              <option value="any">Any Floor</option>
              <option value="0">Ground Floor</option>
              <option value="1">1st Floor</option>
              <option value="2">2nd Floor</option>
              <option value="3">3rd Floor</option>
              <option value="4">4th Floor</option>
              <option value="5">5th Floor</option>
              <option value="6">6th Floor</option>
              <option value="7">7th Floor</option>
              <option value="8">8th Floor</option>
              <option value="9">9th Floor</option>
              <option value="10">10th Floor</option>
            </select>
          </label>
          <label className="flex-1 font-medium text-gray-700 flex items-center gap-2 mt-6">
            <input
              type="checkbox"
              checked={data.balcony || false}
              onChange={e => onChange({ ...data, balcony: e.target.checked })}
              disabled={!editable}
              className="accent-blue-600 w-4 h-4 rounded"
            />
            Balcony
          </label>
          <label className="flex-1 font-medium text-gray-700 flex items-center gap-2 mt-6">
            <input
              type="checkbox"
              checked={data.petsAllowed || false}
              onChange={e => onChange({ ...data, petsAllowed: e.target.checked })}
              disabled={!editable}
              className="accent-blue-600 w-4 h-4 rounded"
            />
            Pets Allowed
          </label>
        </div>
        {/* Description fields */}
        {!isLookingFor && (
          <label className="font-medium text-gray-700 w-full">
            Describe your apartment (optional)
            <textarea
              name="myApartmentDescription"
              value={data.myApartmentDescription || ""}
              onChange={e => {
                if (e.target.value.length <= 1000) onChange({ ...data, myApartmentDescription: e.target.value });
              }}
              maxLength={1000}
              rows={4}
              className="mt-2 w-full rounded-xl border border-blue-400 px-4 py-2 text-base sm:text-sm bg-white text-gray-900 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="Describe the vibe, special features, or anything unique about your apartment..."
              disabled={!editable}
            />
            <div className="text-xs text-gray-500 text-right">{(data.myApartmentDescription || "").length}/1000 characters</div>
          </label>
        )}
        {isLookingFor && (
          <label className="font-medium text-gray-700 w-full">
            Describe what you're looking for (optional)
            <textarea
              name="lookingForDescription"
              value={data.lookingForDescription || ""}
              onChange={e => {
                if (e.target.value.length <= 1000) onChange({ ...data, lookingForDescription: e.target.value });
              }}
              maxLength={1000}
              rows={4}
              className="mt-2 w-full rounded-xl border border-blue-400 px-4 py-2 text-base sm:text-sm bg-white text-gray-900 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="Describe your ideal apartment, lifestyle, or anything important to you..."
              disabled={!editable}
            />
            <div className="text-xs text-gray-500 text-right">{(data.lookingForDescription || "").length}/1000 characters</div>
          </label>
        )}

        {showNext && onNext && (
          <button
            type="submit"
            className="block w-full mt-6 bg-blue-600 text-white rounded-full px-8 py-4 font-bold text-lg shadow-md transition hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={!isComplete}
          >
            Next
          </button>
        )}
      </form>
    </section>
  );
} 