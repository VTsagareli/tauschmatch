import React, { useState, useEffect } from "react";
import GooglePlacesAutocomplete from "./GooglePlacesAutocomplete";

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
  const errors = getErrorMessages(data, isLookingFor);
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

  return (
    <section className={`flex flex-col items-center gap-3 bg-white rounded-3xl shadow-lg p-6 sm:p-3 w-full max-w-[370px] min-h-[460px] justify-center mx-auto relative transition-all duration-500 ${animate ? 'animate-fadeInUp' : 'opacity-0 translate-y-8'}`}>
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
            <label className="font-medium text-gray-700">
              Districts{requiredAsterisk} {infoIcon}
              <div className="mt-2 p-3 border border-blue-400 rounded-xl bg-white max-h-32 overflow-y-auto">
                <div className="text-sm text-gray-600 mb-2">Select one or more districts:</div>
                <div className="grid grid-cols-1 gap-2">
                  {berlinDistricts.map(district => (
                    <label key={district} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(data.districts || []).includes(district)}
                        onChange={() => handleDistrictToggle(district)}
                        disabled={!editable}
                        className="accent-blue-600 w-4 h-4 rounded"
                      />
                      <span className="text-sm text-gray-700">{district}</span>
                    </label>
                  ))}
                </div>
              </div>
              {errors.districts && touched.districts && (
                <div className="text-red-500 text-sm flex items-center gap-1 mt-1">&#9888; {errors.districts}</div>
              )}
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
            <div className="apartment-form-row flex gap-4 w-full flex-col sm:flex-row">
              <label className="flex-1 mb-2 font-medium text-gray-700">
                Min. Rooms{requiredAsterisk}
                <input
                  name="minRooms"
                  type="number"
                  min="1"
                  value={data.minRooms || ""}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`mt-2 h-9 px-4 rounded-xl text-base sm:text-sm w-full bg-white text-gray-900 border ${errors.minRooms && touched.minRooms ? 'border-red-500 bg-red-50' : 'border-blue-400'} mb-1 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none`}
                  required
                  disabled={!editable}
                />
                {errors.minRooms && touched.minRooms && (
                  <div className="text-red-500 text-sm flex items-center gap-1 mt-1">&#9888; {errors.minRooms}</div>
                )}
              </label>
              <label className="flex-1 mb-2 font-medium text-gray-700">
                Min. Square Meters{requiredAsterisk}
                <input
                  name="minSquareMeters"
                  type="number"
                  min="1"
                  value={data.minSquareMeters || ""}
            onChange={handleChange}
            onBlur={handleBlur}
                  className={`mt-2 h-9 px-4 rounded-xl text-base sm:text-sm w-full bg-white text-gray-900 border ${errors.minSquareMeters && touched.minSquareMeters ? 'border-red-500 bg-red-50' : 'border-blue-400'} mb-1 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none`}
            required
                  disabled={!editable}
                />
                {errors.minSquareMeters && touched.minSquareMeters && (
                  <div className="text-red-500 text-sm flex items-center gap-1 mt-1">&#9888; {errors.minSquareMeters}</div>
          )}
        </label>
              <label className="flex-1 mb-2 font-medium text-gray-700">
                Max. Cold Rent (€){requiredAsterisk}
          <input
                  name="maxColdRent"
                  type="number"
                  min="0"
                  value={data.maxColdRent || ""}
            onChange={handleChange}
            onBlur={handleBlur}
                  className={`mt-2 h-9 px-4 rounded-xl text-base sm:text-sm w-full bg-white text-gray-900 border ${errors.maxColdRent && touched.maxColdRent ? 'border-red-500 bg-red-50' : 'border-blue-400'} mb-1 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none`}
            required
                  disabled={!editable}
          />
                {errors.maxColdRent && touched.maxColdRent && (
                  <div className="text-red-500 text-sm flex items-center gap-1 mt-1">&#9888; {errors.maxColdRent}</div>
          )}
        </label>
            </div>
          </div>
        )}
        {/* For 'Your Apartment' */}
        {!isLookingFor && (
          <div className="apartment-form-row flex gap-4 w-full flex-col sm:flex-row">
            <label className="flex-1 mb-2 font-medium text-gray-700">
          Rooms{requiredAsterisk}
          <input
            name="rooms"
            type="number"
            min="1"
                value={data.rooms || ""}
            onChange={handleChange}
            onBlur={handleBlur}
                className={`mt-2 h-9 px-4 rounded-xl text-base sm:text-sm w-full bg-white text-gray-900 border ${errors.rooms && touched.rooms ? 'border-red-500 bg-red-50' : 'border-blue-400'} mb-1 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none`}
            required
                disabled={!editable}
          />
          {errors.rooms && touched.rooms && (
                <div className="text-red-500 text-sm flex items-center gap-1 mt-1">&#9888; {errors.rooms}</div>
          )}
        </label>
            <label className="flex-1 mb-2 font-medium text-gray-700">
          Square Meters{requiredAsterisk}
          <input
            name="squareMeters"
            type="number"
            min="1"
                value={data.squareMeters || ""}
            onChange={handleChange}
            onBlur={handleBlur}
                className={`mt-2 h-9 px-4 rounded-xl text-base sm:text-sm w-full bg-white text-gray-900 border ${errors.squareMeters && touched.squareMeters ? 'border-red-500 bg-red-50' : 'border-blue-400'} mb-1 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none`}
            required
                disabled={!editable}
          />
          {errors.squareMeters && touched.squareMeters && (
                <div className="text-red-500 text-sm flex items-center gap-1 mt-1">&#9888; {errors.squareMeters}</div>
          )}
        </label>
            <label className="flex-1 mb-2 font-medium text-gray-700">
          Cold Rent (€){requiredAsterisk}
          <input
            name="coldRent"
            type="number"
            min="0"
                value={data.coldRent || ""}
            onChange={handleChange}
            onBlur={handleBlur}
                className={`mt-2 h-9 px-4 rounded-xl text-base sm:text-sm w-full bg-white text-gray-900 border ${errors.coldRent && touched.coldRent ? 'border-red-500 bg-red-50' : 'border-blue-400'} mb-1 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none`}
            required
                disabled={!editable}
          />
          {errors.coldRent && touched.coldRent && (
                <div className="text-red-500 text-sm flex items-center gap-1 mt-1">&#9888; {errors.coldRent}</div>
              )}
            </label>
          </div>
        )}
        <div className="apartment-form-row flex gap-4 w-full flex-col sm:flex-row">
          <label className="flex-1 mb-2 font-medium text-gray-700">
            Apartment Type{requiredAsterisk}
            <select
              name="type"
              value={data.type}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`mt-2 h-9 px-4 rounded-xl text-base sm:text-sm w-full bg-white text-gray-900 border ${errors.type && touched.type ? 'border-red-500 bg-red-50' : 'border-blue-400'} mb-1 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none`}
              required
              disabled={!editable}
            >
              <option value="Apartment">Apartment</option>
              <option value="WG Room">WG Room</option>
              <option value="Full House">Full House</option>
            </select>
            {errors.type && touched.type && (
              <div className="text-red-500 text-sm flex items-center gap-1 mt-1">&#9888; {errors.type}</div>
          )}
        </label>
          <label className="flex-1 mb-2 font-medium text-gray-700">
            Floor
            <select
              name="floor"
              value={data.floor || "any"}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`mt-2 h-9 px-4 rounded-xl text-base sm:text-sm w-full bg-white text-gray-900 border ${errors.floor && touched.floor ? 'border-red-500 bg-red-50' : 'border-blue-400'} mb-1 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none`}
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
            {errors.floor && touched.floor && (
              <div className="text-red-500 text-sm flex items-center gap-1 mt-1">&#9888; {errors.floor}</div>
            )}
          </label>
        </div>
        <div className="flex gap-6 mt-auto w-full justify-start items-center flex-col sm:flex-row">
          <label className="flex items-center gap-2 m-0 font-medium text-gray-700">
            <input name="balcony" type="checkbox" checked={!!data.balcony} onChange={handleChange} className="accent-blue-600 w-5 h-5 rounded" disabled={!editable} />
            Balcony/Terrace
          </label>
          <label className="flex items-center gap-2 m-0 font-medium text-gray-700">
            <input name="petsAllowed" type="checkbox" checked={!!data.petsAllowed} onChange={handleChange} className="accent-blue-600 w-5 h-5 rounded" disabled={!editable} />
            Pets allowed
          </label>
        </div>
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