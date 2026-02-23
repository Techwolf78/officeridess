import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/ui/Layout";
import { useRidesRealtime } from "@/hooks/use-rides-realtime";
import { useAuth } from "@/hooks/use-auth";
import { RideCard } from "@/components/RideCard";
import { RideCardSkeleton } from "@/components/RideCardSkeleton";
import { Loader2, MapPin, Calendar as CalendarIcon, Search as SearchIcon, X, Clock, ChevronRight, ArrowRightLeft, Filter } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { haversineDistance, isPointNearPolylineFlexible, doesRouteOverlapFlexible, canAccommodateStops, calculateRouteOverlapScore, decodePolyline, reverseGeocode, getDirections } from "@/lib/utils";
import { FirebaseRide } from "@/lib/types";
import { getRecentFromSearches, getRecentToSearches, addRecentFromSearch, addRecentToSearch, type RecentSearch } from "@/lib/recentSearches";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SearchFiltersPanel, type SearchFilters as AdvancedFilters } from "@/components/SearchFilters";

type SearchFilters = {
  originLatLng: { lat: number; lng: number };
  destLatLng: { lat: number; lng: number };
  departureDate?: Date;
  departureHour?: string;
  departureMinute?: string;
  departureAMPM?: "AM" | "PM";
};

// Static libraries array to prevent LoadScript reload
const googleMapsLibraries: ("places")[] = ["places"];

export default function Search() {
  const [filters, setFilters] = useState<SearchFilters | undefined>();
  
  // Advanced filters - declare first before using
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({});
  
  const { rides, loading: isLoading } = useRidesRealtime({
    minPrice: advancedFilters.minPrice,
    maxPrice: advancedFilters.maxPrice,
    minSeats: advancedFilters.minSeats,
    verifiedDriversOnly: advancedFilters.verifiedDriversOnly,
    vehicleComfort: advancedFilters.vehicleComfort,
    minRating: advancedFilters.minRating,
    instantBookingOnly: advancedFilters.instantBookingOnly,
    preferences: advancedFilters.smoking !== undefined || advancedFilters.pets !== undefined ||
                advancedFilters.music !== undefined || advancedFilters.ac !== undefined ? {
      smoking: advancedFilters.smoking,
      pets: advancedFilters.pets,
      music: advancedFilters.music,
      ac: advancedFilters.ac,
    } : undefined,
    sortBy: advancedFilters.sortBy,
  });
  const { user } = useAuth();
  const { handleSubmit } = useForm<SearchFilters>();

  const [hasSearched, setHasSearched] = useState(false);

  // State management
  const [originLatLng, setOriginLatLng] = useState<{lat: number, lng: number} | null>(null);
  const [destLatLng, setDestLatLng] = useState<{lat: number, lng: number} | null>(null);

  const [originText, setOriginText] = useState('');
  const [destText, setDestText] = useState('');

  // Recent searches
  const [recentFromSearches, setRecentFromSearches] = useState<RecentSearch[]>([]);
  const [recentToSearches, setRecentToSearches] = useState<RecentSearch[]>([]);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);

  // Autocomplete suggestions
  const [fromSuggestions, setFromSuggestions] = useState<any[]>([]);
  const [toSuggestions, setToSuggestions] = useState<any[]>([]);
  const [fromDropdownPos, setFromDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [toDropdownPos, setToDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  // Date & time state
  const [departureDate, setDepartureDate] = useState<Date | undefined>(undefined);
  const [departureHour, setDepartureHour] = useState("09");
  const [departureMinute, setDepartureMinute] = useState("00");
  const [departureAMPM, setDepartureAMPM] = useState<"AM" | "PM">("AM");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Enhanced time filtering
  const [timeWindow, setTimeWindow] = useState<'anytime' | 'morning' | 'afternoon' | 'evening' | 'exact'>('anytime');
  const [dateFlexibility, setDateFlexibility] = useState<'exact' | 'flexible'>('flexible');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10); // Show 10 rides per page

  // Loading states
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  
  // Filter panel visibility
  const [showFilters, setShowFilters] = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: googleMapsLibraries,
  });

  const fromAutocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const toAutocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const fromPlacesRef = useRef<google.maps.places.PlacesService | null>(null);
  const toPlacesRef = useRef<google.maps.places.PlacesService | null>(null);
  const fromInputRef = useRef<HTMLDivElement | null>(null);
  const toInputRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const hiddenMapRef = useRef<google.maps.Map | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  // Load recent searches on mount
  useEffect(() => {
    setRecentFromSearches(getRecentFromSearches());
    setRecentToSearches(getRecentToSearches());
  }, []);

  // Pre-populate origin and destination with user's home and office addresses
  useEffect(() => {
    if (user?.homeAddress) {
      setOriginText(user.homeAddress);
    }
    if (user?.officeAddress) {
      setDestText(user.officeAddress);
    }
  }, [user?.homeAddress, user?.officeAddress]);

  // Geocode home and office addresses to get coordinates
  useEffect(() => {
    if (!geocoderRef.current || !user?.homeAddress || !user?.officeAddress) return;

    const geocoder = geocoderRef.current;

    // Geocode home address
    if (user.homeAddress && !originLatLng) {
      geocoder.geocode({ address: user.homeAddress }, (results, status) => {
        if (status === "OK" && results?.[0]?.geometry?.location) {
          setOriginLatLng({
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng(),
          });
        }
      });
    }

    // Geocode office address
    if (user.officeAddress && !destLatLng) {
      geocoder.geocode({ address: user.officeAddress }, (results, status) => {
        if (status === "OK" && results?.[0]?.geometry?.location) {
          setDestLatLng({
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng(),
          });
        }
      });
    }
  }, [user?.homeAddress, user?.officeAddress]);

  // Initialize AutocompleteService for origin
  useEffect(() => {
    if (isLoaded && window.google) {
      fromAutocompleteRef.current = new google.maps.places.AutocompleteService();
    }
  }, [isLoaded]);

  // Initialize AutocompleteService for destination
  useEffect(() => {
    if (isLoaded && window.google) {
      toAutocompleteRef.current = new google.maps.places.AutocompleteService();
    }
  }, [isLoaded]);

  // Initialize PlacesService with hidden map when Google is ready
  useEffect(() => {
    if (isLoaded && window.google && !hiddenMapRef.current) {
      // Create a hidden map element for PlacesService
      const hiddenMapDiv = document.createElement('div');
      hiddenMapDiv.style.display = 'none';
      document.body.appendChild(hiddenMapDiv);

      const hiddenMap = new google.maps.Map(hiddenMapDiv, {
        center: { lat: 20.5937, lng: 78.9629 },
        zoom: 5,
      });

      hiddenMapRef.current = hiddenMap;

      // Initialize PlacesServices
      if (!fromPlacesRef.current) {
        fromPlacesRef.current = new google.maps.places.PlacesService(hiddenMap);
      }
      if (!toPlacesRef.current) {
        toPlacesRef.current = new google.maps.places.PlacesService(hiddenMap);
      }

      // Initialize Geocoder
      if (!geocoderRef.current) {
        geocoderRef.current = new google.maps.Geocoder();
      }
    }
  }, [isLoaded]);

  // Handle origin text change with autocomplete
  const handleOriginChange = async (input: string) => {
    setOriginText(input);

    if (fromInputRef.current) {
      const rect = fromInputRef.current.getBoundingClientRect();
      setFromDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }

    if (input.length < 2 || !fromAutocompleteRef.current) {
      setFromSuggestions([]);
      return;
    }

    try {
      const predictions = await fromAutocompleteRef.current.getPlacePredictions({
        input,
        componentRestrictions: { country: ["in"] },
      });
      setFromSuggestions(predictions.predictions || []);
    } catch (error) {
      console.error("Origin autocomplete error:", error);
      setFromSuggestions([]);
    }
  };

  // Handle destination text change with autocomplete
  const handleDestinationChange = async (input: string) => {
    setDestText(input);

    if (toInputRef.current) {
      const rect = toInputRef.current.getBoundingClientRect();
      setToDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }

    if (input.length < 2 || !toAutocompleteRef.current) {
      setToSuggestions([]);
      return;
    }

    try {
      const predictions = await toAutocompleteRef.current.getPlacePredictions({
        input,
        componentRestrictions: { country: ["in"] },
      });
      setToSuggestions(predictions.predictions || []);
    } catch (error) {
      console.error("Destination autocomplete error:", error);
      setToSuggestions([]);
    }
  };

  // Handle origin suggestion selection
  const handleSelectOriginSuggestion = (placeId: string, description: string, mainText: string) => {
    if (!fromPlacesRef.current) return;

    setOriginText(description);
    setFromSuggestions([]);
    setShowFromSuggestions(false);

    fromPlacesRef.current.getDetails(
      { placeId, fields: ["geometry"] },
      (result, status) => {
        if (status === "OK" && result?.geometry?.location) {
          const latLng = { lat: result.geometry.location.lat(), lng: result.geometry.location.lng() };
          setOriginLatLng(latLng);
          addRecentFromSearch({ name: mainText || description, lat: latLng.lat, lng: latLng.lng });
          setRecentFromSearches(getRecentFromSearches());
        }
      }
    );
  };

  // Handle destination suggestion selection
  const handleSelectDestinationSuggestion = (placeId: string, description: string, mainText: string) => {
    if (!toPlacesRef.current) return;

    setDestText(description);
    setToSuggestions([]);
    setShowToSuggestions(false);

    toPlacesRef.current.getDetails(
      { placeId, fields: ["geometry"] },
      (result, status) => {
        if (status === "OK" && result?.geometry?.location) {
          const latLng = { lat: result.geometry.location.lat(), lng: result.geometry.location.lng() };
          setDestLatLng(latLng);
          addRecentToSearch({ name: mainText || description, lat: latLng.lat, lng: latLng.lng });
          setRecentToSearches(getRecentToSearches());
        }
      }
    );
  };

  const getDepartureTime24h = () => {
    let hour = parseInt(departureHour);
    if (departureAMPM === "PM" && hour !== 12) hour += 12;
    if (departureAMPM === "AM" && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${departureMinute}`;
  };

  // Enhanced time filtering helpers
  const getTimeWindowRange = (window: 'morning' | 'afternoon' | 'evening'): { start: number; end: number } => {
    switch (window) {
      case 'morning': return { start: 6, end: 12 }; // 6 AM - 12 PM
      case 'afternoon': return { start: 12, end: 18 }; // 12 PM - 6 PM
      case 'evening': return { start: 18, end: 24 }; // 6 PM - 12 AM
      default: return { start: 0, end: 24 };
    }
  };

  const isRideInTimeWindow = (rideTime: Date, window: 'anytime' | 'morning' | 'afternoon' | 'evening' | 'exact', searchTime?: Date): boolean => {
    if (window === 'anytime') return true;
    if (window === 'exact' && searchTime) {
      // Within 2 hours of exact time
      const timeDiff = Math.abs(rideTime.getTime() - searchTime.getTime());
      return timeDiff <= (2 * 60 * 60 * 1000); // 2 hours
    }

    // For morning, afternoon, evening windows
    if (window === 'exact' || !searchTime) return true; // If exact time but no searchTime, allow all
    
    const hour = rideTime.getHours();
    const range = getTimeWindowRange(window as 'morning' | 'afternoon' | 'evening');
    return hour >= range.start && hour < range.end;
  };

  const isRideInDateRange = (rideDate: Date, searchDate: Date, flexibility: 'exact' | 'flexible'): boolean => {
    if (flexibility === 'exact') {
      // Same day
      return rideDate.toDateString() === searchDate.toDateString();
    } else {
      // Within 24 hours (flexible)
      const timeDiff = Math.abs(rideDate.getTime() - searchDate.getTime());
      return timeDiff <= (24 * 60 * 60 * 1000); // 24 hours
    }
  };

  // Zoom map to fit locations when both are selected
  useEffect(() => {
    if (originLatLng && destLatLng && mapRef.current) {
      const bounds = new google.maps.LatLngBounds();
      
      bounds.extend(originLatLng);
      bounds.extend(destLatLng);

      // Fit map to bounds with padding
      mapRef.current.fitBounds(bounds, { top: 100, right: 100, bottom: 100, left: 100 });
    }
  }, [originLatLng, destLatLng]);

  // Filter rides based on flexible route matching (BlaBlaCar-style: 5-10km tolerance)
  const filterRidesByRoute = () => {
    if (!filters) {
      return rides; // Show all rides if no filters
    }

    const LOCATION_TOLERANCE_KM = 3.0; // 3km tolerance for location matching in urban areas

    return rides.filter((ride: FirebaseRide) => {
      if (!ride.originLatLng || !ride.destLatLng) {
        return false; // Exclude rides without location data
      }

      // ENHANCED DATE/TIME FILTERING: BlaBlaCar-style flexible time windows
      if (filters.departureDate) {
        const rideDate = new Date(ride.departureTime);
        const searchDate = new Date(filters.departureDate);

        // Check date range (exact day or flexible 24-hour window)
        const dateMatches = isRideInDateRange(rideDate, searchDate, dateFlexibility);
        if (!dateMatches) return false;

        // Check time window (morning/afternoon/evening or exact time)
        const timeMatches = isRideInTimeWindow(rideDate, timeWindow, searchDate);
        if (!timeMatches) return false;
      }

      // Route-based location matching: search points should be within 300m of driver's route
      const rideRoute = ride.route || [];
      if (rideRoute.length === 0) {
        // Fallback to simple proximity if no route data
        const originDistance = haversineDistance(
          filters.originLatLng.lat, filters.originLatLng.lng,
          ride.originLatLng.lat, ride.originLatLng.lng
        );
        if (originDistance > LOCATION_TOLERANCE_KM) return false;

        const destDistance = haversineDistance(
          filters.destLatLng.lat, filters.destLatLng.lng,
          ride.destLatLng.lat, ride.destLatLng.lng
        );
        if (destDistance > LOCATION_TOLERANCE_KM) return false;
      } else {
        // Check if search origin is near any part of the driver's route
        const originNearRoute = isPointNearPolylineFlexible(
          filters.originLatLng,
          rideRoute,
          LOCATION_TOLERANCE_KM
        );
        if (!originNearRoute) return false;

        // Check if search destination is near any part of the driver's route
        const destNearRoute = isPointNearPolylineFlexible(
          filters.destLatLng,
          rideRoute,
          LOCATION_TOLERANCE_KM
        );
        if (!destNearRoute) return false;
      }

      // For rides with stops, check if stops can accommodate the journey
      if (ride.stops && ride.stops.length > 0) {
        const stopsCompatible = canAccommodateStops(
          filters.originLatLng,
          filters.destLatLng,
          ride.stops
        );
        if (!stopsCompatible) return false;
      }

      return true;
    });
  };

  const filteredRides = filters ? filterRidesByRoute() : rides;

  // Pagination logic
  const totalRides = filteredRides?.length || 0;
  const totalPages = Math.ceil(totalRides / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRides = filteredRides?.slice(startIndex, endIndex) || [];

  const handleFiltersChange = (newFilters: AdvancedFilters) => {
    setIsApplyingFilters(true);
    setAdvancedFilters(newFilters);
    // Reset loading state after a short delay to simulate filter application
    setTimeout(() => setIsApplyingFilters(false), 100);
  };

  const onSubmit = () => {
    if (originLatLng && destLatLng && departureDate) {
      const time24h = getDepartureTime24h();
      const [hours, minutes] = time24h.split(':').map(Number);
      const finalDateTime = new Date(departureDate);
      finalDateTime.setHours(hours, minutes);

      setFilters({
        originLatLng,
        destLatLng,
        departureDate: finalDateTime,
        departureHour,
        departureMinute,
        departureAMPM,
      });
      setHasSearched(true);
      
      // Scroll to available rides section after search
      setTimeout(() => {
        document.getElementById('available-rides-section')?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    }
  };

  const clearFilters = () => {
    setFilters(undefined);
    setOriginLatLng(null);
    setDestLatLng(null);
    setOriginText('');
    setDestText('');
    setDepartureDate(undefined);
    setDepartureHour("09");
    setDepartureMinute("00");
    setDepartureAMPM("AM");
    setHasSearched(false);
  };

  const handleReverseRoute = () => {
    // Swap text
    const tempText = originText;
    setOriginText(destText);
    setDestText(tempText);

    // Swap coordinates
    const tempLatLng = originLatLng;
    setOriginLatLng(destLatLng);
    setDestLatLng(tempLatLng);

    // Clear suggestions
    setFromSuggestions([]);
    setToSuggestions([]);
    setShowFromSuggestions(false);
    setShowToSuggestions(false);
  };

  return (
    <Layout headerTitle="Find a Ride" showNav={true}>
      <div className="px-4 py-6 space-y-6">
          {/* Search Form */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-border/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Select Route</h3>
              <button
                type="button"
                onClick={async () => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      async (position) => {
                        const latLng = { lat: position.coords.latitude, lng: position.coords.longitude };
                        setOriginLatLng(latLng);
                        try {
                          const address = await reverseGeocode(latLng.lat, latLng.lng);
                          setOriginText(address);
                        } catch (error) {
                          console.error('Reverse geocoding failed:', error);
                          setOriginText(`${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)}`);
                        }
                      },
                      (error) => {
                        console.error(error);
                        alert('Unable to get location');
                      }
                    );
                  } else {
                    alert('Geolocation not supported');
                  }
                }}
                className="px-3 py-1 bg-primary text-white text-xs rounded-lg"
              >
                Use My Location
              </button>
            </div>
            <div className="space-y-0 mb-4">
                  {/* Origin Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Origin</label>
                    <div className="relative z-40" ref={fromInputRef}>
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <SearchIcon size={18} />
                      </div>
                      <input
                        type="text"
                        value={originText}
                        onChange={(e) => handleOriginChange(e.target.value)}
                        onFocus={() => setShowFromSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowFromSuggestions(false), 200)}
                        placeholder="Enter pickup location"
                        className="w-full bg-secondary rounded-lg pl-10 pr-10 py-2.5 outline-none text-sm border border-border/50 focus:border-primary transition-colors"
                      />
                      {originText && (
                        <button
                          type="button"
                          onClick={() => {
                            setOriginText("");
                            setOriginLatLng(null);
                            setFromSuggestions([]);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>

                    {/* Origin Suggestions Dropdown */}
                    {showFromSuggestions && fromSuggestions.length > 0 && (
                      <div
                        className="fixed z-50 bg-white border border-border/50 rounded-lg shadow-lg overflow-hidden"
                        style={{
                          top: `${fromDropdownPos.top}px`,
                          left: `${fromDropdownPos.left}px`,
                          width: `${fromDropdownPos.width}px`,
                        }}
                      >
                        <div>
                          {fromSuggestions.map((suggestion) => (
                            <button
                              key={suggestion.place_id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectOriginSuggestion(suggestion.place_id, suggestion.description, suggestion.main_text || suggestion.description);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-secondary border-b border-border/30 last:border-0 transition-colors flex items-center gap-2"
                            >
                              <MapPin size={16} className="text-muted-foreground flex-shrink-0" />
                              <span className="text-sm text-foreground">{suggestion.main_text || suggestion.description}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent From Searches Dropdown */}
                    {showFromSuggestions && fromSuggestions.length === 0 && recentFromSearches.length > 0 && (
                      <div
                        className="fixed z-50 bg-white border border-border/50 rounded-lg shadow-lg overflow-hidden"
                        style={{
                          top: `${fromDropdownPos.top}px`,
                          left: `${fromDropdownPos.left}px`,
                          width: `${fromDropdownPos.width}px`,
                        }}
                      >
                        <div className="bg-secondary px-4 py-2">
                          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                            <Clock size={12} /> Recent Pickups
                          </p>
                        </div>
                        <div>
                          {recentFromSearches.map((search, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setOriginLatLng({ lat: search.lat, lng: search.lng });
                                setOriginText(search.name);
                                setShowFromSuggestions(false);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-secondary border-b border-border/30 last:border-0 transition-colors flex items-center gap-2"
                            >
                              <MapPin size={16} className="text-muted-foreground flex-shrink-0" />
                              <span className="text-sm text-foreground">{search.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reverse Button */}
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={handleReverseRoute}
                      className=" hover:bg-secondary rounded-lg transition-colors"
                      title="Swap origin and destination"
                    >
                      <div className="bg-primary/10 hover:bg-primary/20 text-primary mt-2 rounded-full p-0.5 transition-colors">
                        <ArrowRightLeft size={16} />
                      </div>
                    </button>
                  </div>

                  {/* Destination Input */}
                  <div className="mb-2">
                    <label className="text-sm font-medium">To</label>
                    <div className="relative z-40" ref={toInputRef}>
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <SearchIcon size={18} />
                      </div>
                      <input
                        type="text"
                        value={destText}
                        onChange={(e) => handleDestinationChange(e.target.value)}
                        onFocus={() => setShowToSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowToSuggestions(false), 200)}
                        placeholder="Enter dropoff location"
                        className="w-full bg-secondary rounded-lg pl-10 pr-10 py-2.5 outline-none text-sm border border-border/50 focus:border-primary transition-colors"
                      />
                      {destText && (
                        <button
                          type="button"
                          onClick={() => {
                            setDestText("");
                            setDestLatLng(null);
                            setToSuggestions([]);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>

                    {/* Destination Suggestions Dropdown */}
                    {showToSuggestions && toSuggestions.length > 0 && (
                      <div
                        className="fixed z-50 bg-white border border-border/50 rounded-lg shadow-lg overflow-hidden"
                        style={{
                          top: `${toDropdownPos.top}px`,
                          left: `${toDropdownPos.left}px`,
                          width: `${toDropdownPos.width}px`,
                        }}
                      >
                        <div>
                          {toSuggestions.map((suggestion) => (
                            <button
                              key={suggestion.place_id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectDestinationSuggestion(suggestion.place_id, suggestion.description, suggestion.main_text || suggestion.description);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-secondary border-b border-border/30 last:border-0 transition-colors flex items-center gap-2"
                            >
                              <MapPin size={16} className="text-muted-foreground flex-shrink-0" />
                              <span className="text-sm text-foreground">{suggestion.main_text || suggestion.description}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent To Searches Dropdown */}
                    {showToSuggestions && toSuggestions.length === 0 && recentToSearches.length > 0 && (
                      <div
                        className="fixed z-50 bg-white border border-border/50 rounded-lg shadow-lg overflow-hidden"
                        style={{
                          top: `${toDropdownPos.top}px`,
                          left: `${toDropdownPos.left}px`,
                          width: `${toDropdownPos.width}px`,
                        }}
                      >
                        <div className="bg-secondary px-4 py-2">
                          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                            <Clock size={12} /> Recent Dropoffs
                          </p>
                        </div>
                        <div>
                          {recentToSearches.map((search, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setDestLatLng({ lat: search.lat, lng: search.lng });
                                setDestText(search.name);
                                setShowToSuggestions(false);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-secondary border-b border-border/30 last:border-0 transition-colors flex items-center gap-2"
                            >
                              <MapPin size={16} className="text-muted-foreground flex-shrink-0" />
                              <span className="text-sm text-foreground">{search.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {originLatLng && destLatLng && (
                  <>
                    <div className="h-64 w-full">
                      <GoogleMap
                        center={originLatLng || {lat: 20.5937, lng: 78.9629}}
                        zoom={5}
                        onClick={(e: google.maps.MapMouseEvent) => {
                          const latLng = {lat: e.latLng!.lat(), lng: e.latLng!.lng()};
                          if (!originLatLng) {
                            setOriginLatLng(latLng);
                            setOriginText('Selected Origin');
                          } else if (!destLatLng) {
                            setDestLatLng(latLng);
                            setDestText('Selected Destination');
                          }
                        }}
                        onLoad={(map) => {
                          mapRef.current = map;
                        }}
                        mapContainerStyle={{ height: '100%', width: '100%' }}
                      >
                        {originLatLng && <Marker position={originLatLng} />}
                        {destLatLng && <Marker position={destLatLng} />}
                      </GoogleMap>
                    </div>
                    <p className="text-sm text-muted-foreground">Click to set origin, then destination.</p>
                  </>
                )}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Departure Date & Time */}
                  <div className="space-y-4">
                    {/* Date Picker */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium block">Departure Date</label>
                      <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <button className="w-full bg-secondary rounded-lg px-4 py-3 outline-none text-sm border border-border/50 focus:border-primary transition-colors hover:border-primary/50 text-left flex items-center justify-between">
                            <span className={departureDate ? "text-foreground" : "text-muted-foreground"}>
                              {departureDate ? format(departureDate, "MMM dd, yyyy") : "Select departure date"}
                            </span>
                            <CalendarIcon size={18} className="text-muted-foreground" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={departureDate}
                            onSelect={(date) => {
                              setDepartureDate(date);
                              setIsDatePickerOpen(false);
                            }}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Time Picker - 12 Hour Format */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium block">Departure Time</label>
                      <div className="flex gap-3">
                        {/* Hour */}
                        <select
                          value={departureHour}
                          onChange={(e) => setDepartureHour(e.target.value)}
                          className="flex-1 bg-secondary rounded-lg px-3 py-3 outline-none text-sm border border-border/50 focus:border-primary transition-colors"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                            <option key={hour} value={String(hour).padStart(2, '0')}>
                              {String(hour).padStart(2, '0')}
                            </option>
                          ))}
                        </select>

                        {/* Minute */}
                        <select
                          value={departureMinute}
                          onChange={(e) => setDepartureMinute(e.target.value)}
                          className="flex-1 bg-secondary rounded-lg px-3 py-3 outline-none text-sm border border-border/50 focus:border-primary transition-colors"
                        >
                          {Array.from({ length: 60 }, (_, i) => i).map((min) => (
                            <option key={min} value={String(min).padStart(2, '0')}>
                              {String(min).padStart(2, '0')}
                            </option>
                          ))}
                        </select>

                        {/* AM/PM */}
                        <select
                          value={departureAMPM}
                          onChange={(e) => setDepartureAMPM(e.target.value as "AM" | "PM")}
                          className="flex-1 bg-secondary rounded-lg px-3 py-3 outline-none text-sm border border-border/50 focus:border-primary transition-colors"
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    {filters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="px-4 py-2.5 bg-secondary text-foreground rounded-xl font-medium text-sm flex items-center justify-center hover:bg-secondary/80 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={!originLatLng || !destLatLng || !departureDate}
                      className="flex-1 py-2.5 bg-primary text-white rounded-xl font-medium text-sm shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <SearchIcon size={16} />
                      Search Rides
                    </button>
                  </div>
                </form>
          </div>

        {/* Results */}
        {hasSearched && (
          <div id="available-rides-section">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold flex items-center gap-2">
                Available Rides
                {filters && <span className="text-xs font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">Filtered</span>}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(true)}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
                <span className="sm:hidden">Filter</span>
                {Object.values(advancedFilters).filter(value =>
                  value !== undefined && value !== null && value !== false && value !== ''
                ).length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs">
                    {Object.values(advancedFilters).filter(value =>
                      value !== undefined && value !== null && value !== false && value !== ''
                    ).length}
                  </Badge>
                )}
              </Button>
            </div>

            {isLoading || isApplyingFilters ? (
              <div className="space-y-4 pb-20">
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    {isApplyingFilters ? "Applying filters..." : "Searching for rides..."}
                  </p>
                </div>
                <RideCardSkeleton />
                <RideCardSkeleton />
                <RideCardSkeleton />
              </div>
            ) : paginatedRides && paginatedRides.length > 0 ? (
              <>
                <div className="space-y-4 pb-20">
                  {paginatedRides.map((ride: FirebaseRide) => (
                    <RideCard key={ride.id} ride={ride} passengerOrigin={filters?.originLatLng} passengerDest={filters?.destLatLng} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center py-6">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}

                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-border px-4">
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                  <SearchIcon size={24} />
                </div>
                <h4 className="font-medium text-foreground mb-1">No rides found</h4>
                <p className="text-muted-foreground text-sm">Try adjusting your filters or check back later.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Advanced Filters Panel */}
      <SearchFiltersPanel
        filters={advancedFilters}
        onFiltersChange={handleFiltersChange}
        onClose={() => setShowFilters(false)}
        isOpen={showFilters}
      />
    </Layout>
  );
}
