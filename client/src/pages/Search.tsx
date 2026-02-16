import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/ui/Layout";
import { useRidesRealtime } from "@/hooks/use-rides-realtime";
import { useAuth } from "@/hooks/use-auth";
import { RideCard } from "@/components/RideCard";
import { RideCardSkeleton } from "@/components/RideCardSkeleton";
import { Loader2, MapPin, Calendar as CalendarIcon, Search as SearchIcon, X, Clock, ChevronRight, ArrowRightLeft } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { GoogleMap, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";
import { haversineDistance, isPointNearPolyline, getDirections, reverseGeocode, decodePolyline } from "@/lib/utils";
import { FirebaseRide, RouteOption } from "@/lib/types";
import { getRecentFromSearches, getRecentToSearches, addRecentFromSearch, addRecentToSearch, type RecentSearch } from "@/lib/recentSearches";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type SearchFilters = {
  originLatLng: { lat: number; lng: number };
  destLatLng: { lat: number; lng: number };
  route: { lat: number; lng: number }[];
  departureDate?: Date;
  departureHour?: string;
  departureMinute?: string;
  departureAMPM?: "AM" | "PM";
};

// Static libraries array to prevent LoadScript reload
const googleMapsLibraries: ("places")[] = ["places"];

export default function Search() {
  const [filters, setFilters] = useState<SearchFilters | undefined>();
  const { rides, loading: isLoading } = useRidesRealtime();
  const { user } = useAuth();
  const { handleSubmit } = useForm<SearchFilters>();

  const [hasSearched, setHasSearched] = useState(false);

  // State management
  const [originLatLng, setOriginLatLng] = useState<{lat: number, lng: number} | null>(null);
  const [destLatLng, setDestLatLng] = useState<{lat: number, lng: number} | null>(null);
  const [route, setRoute] = useState<{lat: number, lng: number}[]>([]);
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

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

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: googleMapsLibraries,
  });

  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
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

  const calculateRoute = async () => {
    if (!originLatLng || !destLatLng) return;
    
    try {
      if (!directionsServiceRef.current) {
        directionsServiceRef.current = new google.maps.DirectionsService();
      }

      const request: google.maps.DirectionsRequest = {
        origin: originLatLng,
        destination: destLatLng,
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
      };

      const results = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
        directionsServiceRef.current!.route(request, (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            resolve(result);
          } else {
            reject(new Error(`Directions API error: ${status}`));
          }
        });
      });

      const options: RouteOption[] = results.routes.map((route) => {
        const polyline = google.maps.geometry.encoding.encodePath(
          route.overview_path.map(p => ({ lat: p.lat(), lng: p.lng() }))
        );
        const distance = route.legs.reduce((acc, leg) => acc + (leg.distance?.value || 0), 0) / 1000;
        const eta = route.legs.reduce((acc, leg) => acc + (leg.duration?.value || 0), 0) / 60;

        const steps: string[] = [];
        const roads: Set<string> = new Set();

        route.legs.forEach((leg) => {
          leg.steps.forEach((step) => {
            const instruction = step.instructions.replace(/<[^>]*>/g, '');
            steps.push(instruction);
            const roadMatch = instruction.match(/(?:onto|via|along)\s+([^,]+?)(?:\s*\(|,|$)/);
            if (roadMatch) {
              roads.add(roadMatch[1].trim());
            }
          });
        });

        return {
          polyline,
          distance,
          eta,
          steps,
          roads: Array.from(roads),
          hasTolls: false,
        };
      });

      setRouteOptions(options);
      if (options.length > 0) {
        const selected = options[0];
        const decodedRoute = decodePolyline(selected.polyline);
        setRoute(decodedRoute);
        setSelectedRouteIndex(0);
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      setRoute([originLatLng, destLatLng]);
    }
  };

  useEffect(() => {
    calculateRoute();
  }, [originLatLng, destLatLng]);

  // Zoom map to fit route when both locations are selected
  useEffect(() => {
    if (route.length > 0 && mapRef.current) {
      const bounds = new google.maps.LatLngBounds();
      
      // Add all route points to bounds
      route.forEach((point) => {
        bounds.extend({ lat: point.lat, lng: point.lng });
      });

      // Fit map to bounds with padding
      mapRef.current.fitBounds(bounds, { top: 100, right: 100, bottom: 100, left: 100 });
    }
  }, [route]);

  // Scroll to results when search is completed
  useEffect(() => {
    if (hasSearched) {
      setTimeout(() => {
        document.getElementById('available-rides-section')?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 300);
    }
  }, [hasSearched]);

  const selectRoute = (index: number) => {
    setSelectedRouteIndex(index);
    const selected = routeOptions[index];
    const decodedRoute = decodePolyline(selected.polyline);
    setRoute(decodedRoute);
  };

  // Filter rides based on route match with passenger's route (300m tolerance)
  const filterRidesByRoute = () => {
    if (!filters || !filters.route || filters.route.length === 0) {
      return rides; // Show all rides if no route selected
    }

    const TOLERANCE = 0.3; // 300 meters in km
    const BUFFER = 0.01; // ~1km buffer for bounding box (0.009 degrees ≈ 1km)

    // Get bounding box from route (fast pre-filter)
    const getRouteBox = () => {
      const lats = filters.route.map(p => p.lat);
      const lngs = filters.route.map(p => p.lng);
      
      return {
        minLat: Math.min(...lats) - BUFFER,
        maxLat: Math.max(...lats) + BUFFER,
        minLng: Math.min(...lngs) - BUFFER,
        maxLng: Math.max(...lngs) + BUFFER,
      };
    };

    const box = getRouteBox();

    return rides.filter((ride: FirebaseRide) => {
      if (!ride.originLatLng || !ride.destLatLng) {
        return false; // Exclude rides without location data
      }

      // FAST CHECK 1: Is origin in bounding box?
      const originInBox = 
        ride.originLatLng.lat >= box.minLat && ride.originLatLng.lat <= box.maxLat &&
        ride.originLatLng.lng >= box.minLng && ride.originLatLng.lng <= box.maxLng;

      if (!originInBox) return false; // Skip expensive check if not in box

      // FAST CHECK 2: Is destination in bounding box?
      const destInBox =
        ride.destLatLng.lat >= box.minLat && ride.destLatLng.lat <= box.maxLat &&
        ride.destLatLng.lng >= box.minLng && ride.destLatLng.lng <= box.maxLng;

      if (!destInBox) return false; // Skip expensive check if not in box

      // EXPENSIVE CHECK (only runs for rides in bounding box):
      // Check if driver's origin is near the passenger's route
      const originNearRoute = isPointNearPolyline(ride.originLatLng, filters.route, TOLERANCE);
      if (!originNearRoute) return false;

      // Check if driver's destination is near the passenger's route
      const destNearRoute = isPointNearPolyline(ride.destLatLng, filters.route, TOLERANCE);

      // Both origin and destination must be on or near the passenger's route
      return destNearRoute;
    });
  };

  const filteredRides = filters ? filterRidesByRoute() : rides;

  const onSubmit = () => {
    if (originLatLng && destLatLng && departureDate) {
      const time24h = getDepartureTime24h();
      const [hours, minutes] = time24h.split(':').map(Number);
      const finalDateTime = new Date(departureDate);
      finalDateTime.setHours(hours, minutes);

      setFilters({
        originLatLng,
        destLatLng,
        route,
        departureDate: finalDateTime,
        departureHour,
        departureMinute,
        departureAMPM,
      });
      setHasSearched(true);
    }
  };

  const clearFilters = () => {
    setFilters(undefined);
    setOriginLatLng(null);
    setDestLatLng(null);
    setRoute([]);
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
                            // Calculate route
                            getDirections(originLatLng, latLng).then(({ route }) => {
                              setRoute(route);
                            }).catch(() => {
                            setRoute([originLatLng, latLng]);
                            });
                          }
                        }}
                        onLoad={(map) => {
                          mapRef.current = map;
                        }}
                        mapContainerStyle={{ height: '100%', width: '100%' }}
                      >
                        {originLatLng && <Marker position={originLatLng} />}
                        {destLatLng && <Marker position={destLatLng} />}
                        {route.length > 1 && <Polyline path={route} />}
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

        {/* Route Options Section */}
        {routeOptions.length > 0 && (
          <div className="space-y-3 border-t pt-6">
            <h2 className="text-lg font-bold">Choose Your Route</h2>
            <p className="text-sm text-muted-foreground">Select the route that works best for you</p>

            <div className="space-y-2">
              {routeOptions.map((option, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectRoute(index)}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                    selectedRouteIndex === index
                      ? 'border-primary bg-primary/5'
                      : 'border-border/50 hover:border-primary/50 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedRouteIndex === index ? 'border-primary bg-primary' : 'border-border'}`}>
                      {selectedRouteIndex === index && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-foreground">Via {option.roads.slice(0, 2).join(', ') || 'Direct route'}</p>
                      <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span>⏱ {Math.round(option.eta)} min</span>
                        <span>📍 {option.distance.toFixed(1)} km</span>
                        {option.hasTolls && <span>🛣️ Tolls may apply</span>}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {hasSearched && (
          <div id="available-rides-section">
            <h3 className="font-display font-bold mb-4 flex items-center gap-2">
              Available Rides
              {filters && <span className="text-xs font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">Filtered</span>}
            </h3>

            {isLoading ? (
              <div className="space-y-4 pb-20">
                <RideCardSkeleton />
                <RideCardSkeleton />
                <RideCardSkeleton />
                <RideCardSkeleton />
              </div>
            ) : filteredRides && filteredRides.length > 0 ? (
              <div className="space-y-4 pb-20">
                {filteredRides.map((ride: FirebaseRide) => (
                  <RideCard key={ride.id} ride={ride} />
                ))}
              </div>
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
    </Layout>
  );
}
