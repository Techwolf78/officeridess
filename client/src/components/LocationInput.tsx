import { useState, useRef, useEffect } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { Search, X, MapPin, Clock } from "lucide-react";
import { getRecentFromSearches, addRecentFromSearch } from "@/lib/recentSearches";
import type { RecentSearch } from "@/lib/recentSearches";

interface LocationInputProps {
  value: string;
  onChange: (address: string, lat?: number, lng?: number) => void;
  placeholder: string;
  label: string;
}

const mapContainerStyle = {
  width: "100%",
  height: "300px",
  borderRadius: "8px",
};

const defaultCenter = {
  lat: 18.5204, // Pune, India
  lng: 73.8567,
};

// Static libraries array to prevent LoadScript reload on every render
const googleMapsLibraries: ("places")[] = ["places"];

export function LocationInput({ value, onChange, placeholder, label }: LocationInputProps) {
  const [searchInput, setSearchInput] = useState(value);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [recentLocations, setRecentLocations] = useState<RecentSearch[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [markerPosition, setMarkerPosition] = useState(defaultCenter);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const inputRef = useRef<HTMLDivElement | null>(null);
  const dummyDivRef = useRef<HTMLDivElement | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: googleMapsLibraries,
  });

  // Sync searchInput with value prop
  useEffect(() => {
    if (value !== undefined) {
      setSearchInput(value);
    }
  }, [value]);

  // Initialize Places Services
  useEffect(() => {
    if (isLoaded && window.google) {
      if (!autocompleteService.current) {
        autocompleteService.current = new google.maps.places.AutocompleteService();
      }
      if (!placesService.current) {
        // Use a dummy div if the map isn't available yet
        const element = dummyDivRef.current || document.createElement('div');
        placesService.current = new google.maps.places.PlacesService(element);
      }
    }
  }, [isLoaded]);

  // Update places service if map becomes available
  useEffect(() => {
    if (mapRef.current && window.google) {
      placesService.current = new google.maps.places.PlacesService(mapRef.current);
    }
  }, [mapRef.current]);

  // Handle autocomplete search
  const handleSearchChange = async (input: string) => {
    setSearchInput(input);

    // Update dropdown position
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }

    if (input.length < 2 || !autocompleteService.current) {
      setSuggestions([]);
      return;
    }

    try {
      autocompleteService.current.getPlacePredictions({
        input,
        componentRestrictions: { country: ["in"] }, // Restrict to India
      }, (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions);
        } else {
          setSuggestions([]);
        }
      });
    } catch (error) {
      console.error("Autocomplete error:", error);
      setSuggestions([]);
    }
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (placeId: string, description: string, mainText: string) => {
    if (!placesService.current) {
      console.warn("Places service not ready");
      return;
    }

    setSearchInput(description);
    setSuggestions([]);
    setShowSuggestions(false);

    placesService.current.getDetails(
      { placeId, fields: ["geometry", "formatted_address", "name"] },
      (result, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && result?.geometry?.location) {
          const lat = result.geometry.location.lat();
          const lng = result.geometry.location.lng();
          const address = result.formatted_address || description;
          
          setMarkerPosition({ lat, lng });
          onChange(address, lat, lng);
          
          // Save to recent locations
          addRecentFromSearch({ name: mainText, lat, lng });
          setRecentLocations(getRecentFromSearches());
        }
      }
    );
  };

  // Handle recent location selection
  const handleSelectRecent = (location: RecentSearch) => {
    setSearchInput(location.name);
    setSuggestions([]);
    setShowSuggestions(false);
    setMarkerPosition({ lat: location.lat, lng: location.lng });
    onChange(location.name, location.lat, location.lng);
    
    if (mapRef.current) {
      mapRef.current.panTo({ lat: location.lat, lng: location.lng });
      mapRef.current.setZoom(15);
    }
  };

  if (!isLoaded) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium ml-1">{label}</label>
        <div className="w-full px-4 py-3.5 bg-gray-100 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium ml-1">{label}</label>

      {/* Search Input */}
      <div className="relative z-40" ref={inputRef}>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Search size={18} />
        </div>
        <input
          type="text"
          placeholder={placeholder}
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          className="w-full bg-secondary rounded-lg pl-10 pr-10 py-2.5 outline-none text-sm border border-border/50 focus:border-primary transition-colors"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              onChange("");
              setSuggestions([]);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Autocomplete Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          className="fixed z-50 bg-white border border-border/50 rounded-lg shadow-lg overflow-hidden"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
          }}
        >
          <div>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.place_id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectSuggestion(
                    suggestion.place_id, 
                    suggestion.description, 
                    suggestion.structured_formatting?.main_text || suggestion.description
                  );
                }}
                className="w-full text-left px-4 py-3 hover:bg-secondary border-b border-border/30 last:border-0 transition-colors flex items-center gap-2"
              >
                <MapPin size={16} className="text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-foreground">
                  {suggestion.structured_formatting?.main_text || suggestion.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Locations Dropdown */}
      {showSuggestions && suggestions.length === 0 && recentLocations.length > 0 && (
        <div
          className="fixed z-50 bg-white border border-border/50 rounded-lg shadow-lg overflow-hidden"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
          }}
        >
          <div className="bg-secondary px-4 py-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Clock size={12} /> Recent Locations
            </p>
          </div>
          <div>
            {recentLocations.map((location, idx) => (
              <button
                key={idx}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectRecent(location);
                }}
                className="w-full text-left px-4 py-3 hover:bg-secondary border-b border-border/30 last:border-0 transition-colors flex items-center gap-2"
              >
                <MapPin size={16} className="text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-foreground">{location.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Map - Hidden */}
      <div className="hidden" ref={dummyDivRef}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={markerPosition}
          zoom={15}
          onLoad={(map) => {
            mapRef.current = map;
          }}
        >
          <Marker position={markerPosition} />
        </GoogleMap>
      </div>
    </div>
  );
}
