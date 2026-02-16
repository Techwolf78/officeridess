import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Layout } from "@/components/ui/Layout";
import { useCreateRide } from "@/hooks/use-rides";
import { useVehicles } from "@/hooks/use-vehicles";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, Car, Check, ChevronRight, Clock, Calendar as CalendarIcon } from "lucide-react";
import { CreateRideRequest, RouteOption } from "@/lib/types";
import { GoogleMap, Marker, Polyline, Autocomplete } from "@react-google-maps/api";
import { useState, useEffect, useRef } from "react";
import { haversineDistance, decodePolyline } from "@/lib/utils";
import { getRecentFromSearches, getRecentToSearches, addRecentFromSearch, addRecentToSearch, type RecentSearch } from "@/lib/recentSearches";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

// Client-side schema adjustment: string dates from input[type="datetime-local"] need coercion
const createRideFormSchema = z.object({
  vehicleId: z.string().optional(),
  origin: z.string().min(1, "Origin is required"),
  destination: z.string().min(1, "Destination is required"),
  originLatLng: z.object({ lat: z.number(), lng: z.number() }),
  destLatLng: z.object({ lat: z.number(), lng: z.number() }),
  route: z.array(z.object({ lat: z.number(), lng: z.number() })),
  routePolyline: z.string(),
  routeSteps: z.array(z.string()),
  routeRoads: z.array(z.string()),
  stops: z.array(z.object({ lat: z.number(), lng: z.number() })),
  distance: z.number(),
  eta: z.number(),
  originDisplayName: z.string().optional(),
  destDisplayName: z.string().optional(),
  departureTime: z.string().optional(),
  totalSeats: z.coerce.number().min(1, "At least 1 seat required"),
  pricePerSeat: z.coerce.number().min(0, "Price must be positive"),
});

type CreateRideForm = z.infer<typeof createRideFormSchema>;

export default function CreateRide() {
  const { mutate: createRide, isPending } = useCreateRide();
  const { data: vehicles, isLoading: loadingVehicles } = useVehicles();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [originLatLng, setOriginLatLng] = useState<{lat: number, lng: number} | null>(null);
  const [destLatLng, setDestLatLng] = useState<{lat: number, lng: number} | null>(null);
  const [route, setRoute] = useState<{lat: number, lng: number}[]>([]);
  const [routePolyline, setRoutePolyline] = useState('');
  const [routeSteps, setRouteSteps] = useState<string[]>([]);
  const [routeRoads, setRouteRoads] = useState<string[]>([]);
  const [distance, setDistance] = useState(0);
  const [eta, setEta] = useState(0);
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  const [originText, setOriginText] = useState('');
  const [destText, setDestText] = useState('');

  // Recent searches state
  const [recentFromSearches, setRecentFromSearches] = useState<RecentSearch[]>([]);
  const [recentToSearches, setRecentToSearches] = useState<RecentSearch[]>([]);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);

  const originAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const destAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);

  // Departure date and time state
  const [departureDate, setDepartureDate] = useState<Date | undefined>(undefined);
  const [departureHour, setDepartureHour] = useState("09");
  const [departureMinute, setDepartureMinute] = useState("00");
  const [departureAMPM, setDepartureAMPM] = useState<"AM" | "PM">("AM");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [validationErrors, setValidationErrors] = useState({
    route: false,
    vehicle: false,
    date: false,
    price: false,
  });

  const getDepartureTime24h = () => {
    let hour = parseInt(departureHour);
    if (departureAMPM === "PM" && hour !== 12) hour += 12;
    if (departureAMPM === "AM" && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${departureMinute}`;
  };

  const calculateRoute = async () => {
    if (!originLatLng || !destLatLng) return;
    
    try {
      // Use google.maps.DirectionsService to avoid CORS issues
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

      // Parse all routes
      const options: RouteOption[] = results.routes.map((route) => {
        const polyline = google.maps.geometry.encoding.encodePath(
          route.overview_path.map(p => ({ lat: p.lat(), lng: p.lng() }))
        );
        const distance = route.legs.reduce((acc, leg) => acc + (leg.distance?.value || 0), 0) / 1000; // km
        const eta = route.legs.reduce((acc, leg) => acc + (leg.duration?.value || 0), 0) / 60; // minutes

        // Extract step instructions and roads
        const steps: string[] = [];
        const roads: Set<string> = new Set();
        let hasTolls = false;

        route.legs.forEach((leg) => {
          leg.steps.forEach((step) => {
            const instruction = step.instructions.replace(/<[^>]*>/g, '');
            steps.push(instruction);
            
            // Extract road names from instructions
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
          hasTolls,
        };
      });

      setRouteOptions(options);
      if (options.length > 0) {
        const selected = options[0];
        const decodedRoute = decodePolyline(selected.polyline);
        setRoute(decodedRoute);
        setRoutePolyline(selected.polyline);
        setDistance(selected.distance);
        setEta(selected.eta);
        setRouteSteps(selected.steps);
        setRouteRoads(selected.roads);
        form.setValue('route', decodedRoute);
        form.setValue('routePolyline', selected.polyline);
        form.setValue('distance', selected.distance);
        form.setValue('eta', selected.eta);
        form.setValue('routeSteps', selected.steps);
        form.setValue('routeRoads', selected.roads);
        form.setValue('stops', []);
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      // Fallback
      const fullRoute = [originLatLng, ...[], destLatLng];
      const totalDist = fullRoute.reduce((acc, curr, i) => {
        if (i === 0) return 0;
        return acc + haversineDistance(fullRoute[i-1].lat, fullRoute[i-1].lng, curr.lat, curr.lng);
      }, 0);
      setDistance(totalDist);
      setEta(Math.round(totalDist / 50 * 60));
      setRoute(fullRoute);
      setRoutePolyline('');
      setRouteSteps([`Drive from ${originLatLng.lat.toFixed(6)}, ${originLatLng.lng.toFixed(6)} to ${destLatLng.lat.toFixed(6)}, ${destLatLng.lng.toFixed(6)}`]);
      setRouteRoads([]);
      form.setValue('route', fullRoute);
      form.setValue('routePolyline', '');
      form.setValue('distance', totalDist);
      form.setValue('eta', Math.round(totalDist / 50 * 60));
      form.setValue('routeSteps', [`Drive from ${originLatLng.lat.toFixed(6)}, ${originLatLng.lng.toFixed(6)} to ${destLatLng.lat.toFixed(6)}, ${destLatLng.lng.toFixed(6)}`]);
      form.setValue('routeRoads', []);
      form.setValue('stops', []);
    }
  };

  useEffect(() => {
    calculateRoute();
  }, [originLatLng, destLatLng]);

  const form = useForm<CreateRideForm>({
    resolver: zodResolver(createRideFormSchema),
    defaultValues: {
      vehicleId: "",
      totalSeats: 3,
      originLatLng: {lat: 0, lng: 0},
      destLatLng: {lat: 0, lng: 0},
      route: [],
      stops: [],
      distance: 0,
      eta: 0,
    }
  });

  // Load recent searches on mount
  useEffect(() => {
    setRecentFromSearches(getRecentFromSearches());
    setRecentToSearches(getRecentToSearches());
  }, []);

  const onSubmit = (data: CreateRideForm) => {
    console.log('onSubmit called with data:', data);
    setHasAttemptedSubmit(true);
    
    // Reset validation errors
    setValidationErrors({ route: false, vehicle: false, date: false, price: false });
    
    if (!user) {
      toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
      return;
    }

    // Validate route selection
    if (!originLatLng || !destLatLng) {
      console.log('Validation Error: Missing route - originLatLng:', originLatLng, 'destLatLng:', destLatLng);
      setValidationErrors(prev => ({ ...prev, route: true }));
      toast({ title: "Missing Route", description: "Please select both pickup and dropoff locations", variant: "destructive" });
      document.getElementById('route-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    // Validate vehicle selection
    if (!data.vehicleId) {
      console.log('Validation Error: Missing vehicle - vehicleId:', data.vehicleId);
      setValidationErrors(prev => ({ ...prev, vehicle: true }));
      toast({ title: "Missing Vehicle", description: "Please select a vehicle for your ride", variant: "destructive" });
      document.getElementById('ride-details-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    // Validate price per seat
    if (!data.pricePerSeat || data.pricePerSeat <= 0) {
      console.log('Validation Error: Missing or invalid price - pricePerSeat:', data.pricePerSeat);
      setValidationErrors(prev => ({ ...prev, price: true }));
      toast({ title: "Missing Price", description: "Please set a price per seat for your ride", variant: "destructive" });
      document.getElementById('ride-details-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    // Combine departure date and time
    if (!departureDate) {
      console.log('Validation Error: Missing departure date - departureDate:', departureDate);
      setValidationErrors(prev => ({ ...prev, date: true }));
      toast({ title: "Missing Date", description: "Please select departure date", variant: "destructive" });
      document.getElementById('ride-details-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const time24h = getDepartureTime24h();
    const [hours, minutes] = time24h.split(':').map(Number);
    const finalDateTime = new Date(departureDate);
    finalDateTime.setHours(hours, minutes);

    // Validate that departure time is in the future
    if (finalDateTime <= new Date()) {
      console.log('Validation Error: Departure time is not in the future - finalDateTime:', finalDateTime);
      setValidationErrors(prev => ({ ...prev, date: true }));
      toast({ title: "Invalid Time", description: "Please select a departure time in the future", variant: "destructive" });
      document.getElementById('ride-details-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    console.log('Validation passed! Submitting ride with data:', {
      origin: data.origin,
      destination: data.destination,
      vehicleId: data.vehicleId,
      departureTime: finalDateTime,
      totalSeats: data.totalSeats,
      pricePerSeat: data.pricePerSeat
    });

    const submissionData: CreateRideRequest = {
      driverId: user.uid,
      vehicleId: data.vehicleId,
      origin: data.origin,
      destination: data.destination,
      originLatLng: data.originLatLng,
      destLatLng: data.destLatLng,
      route: data.route,
      routePolyline: data.routePolyline,
      routeSteps: data.routeSteps,
      routeRoads: data.routeRoads,
      stops: data.stops,
      distance: data.distance,
      eta: data.eta,
      originDisplayName: data.originDisplayName,
      destDisplayName: data.destDisplayName,
      departureTime: finalDateTime,
      totalSeats: data.totalSeats,
      pricePerSeat: data.pricePerSeat,
      status: "scheduled",
    };

    createRide(submissionData, {
      onSuccess: () => {
        console.log('Ride creation successful!');
        toast({
          title: "Ride Published!",
          description: "Passengers can now book your ride.",
          className: "bg-green-50 border-green-200 text-green-900",
        });
        setLocation("/rides");
      },
      onError: (err) => {
        console.log('Ride creation failed:', err);
        toast({
          title: "Failed to create ride",
          description: err.message,
          variant: "destructive",
        });
      },
    });
  };

  const selectRoute = (index: number) => {
    setSelectedRouteIndex(index);
    const selected = routeOptions[index];
    const decodedRoute = decodePolyline(selected.polyline);
    setRoute(decodedRoute);
    setRoutePolyline(selected.polyline);
    setDistance(selected.distance);
    setEta(selected.eta);
    setRouteSteps(selected.steps);
    setRouteRoads(selected.roads);
    form.setValue('route', decodedRoute);
    form.setValue('routePolyline', selected.polyline);
    form.setValue('distance', selected.distance);
    form.setValue('eta', selected.eta);
    form.setValue('routeSteps', selected.steps);
    form.setValue('routeRoads', selected.roads);
  };

  if (loadingVehicles) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (vehicles && vehicles.length === 0) {
    return (
      <Layout headerTitle="Post a Ride">
        <div className="p-8 text-center flex flex-col items-center justify-center h-[60vh]">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Car size={40} className="text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">No Vehicle Found</h2>
          <p className="text-muted-foreground mb-6">You need to add a vehicle to your profile before posting rides.</p>
          <Link href="/profile" className="px-4 py-3 bg-primary text-white rounded-xl font-semibold shadow-lg shadow-primary/20">
            Add Vehicle
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout headerTitle="Post a Ride">
      <div className="px-4 pb-8 pt-4 max-w-2xl mx-auto">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Route Selection Section */}
          <div id="route-section" className="space-y-4">
            <h2 className="text-2xl font-bold">Select Your Route</h2>
            <p className="text-muted-foreground">Enter origin and destination locations</p>
    
            <div className="space-y-4">
                  {/* Origin */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">From</label>
                    <Autocomplete
                      onLoad={(autocomplete) => (originAutocompleteRef.current = autocomplete)}
                      onPlaceChanged={() => {
                        const place = originAutocompleteRef.current?.getPlace();
                        if (place?.geometry?.location) {
                          const latLng = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
                          const displayName = place.name || (place.formatted_address ? place.formatted_address.split(',')[0] : '');
                          setOriginLatLng(latLng);
                          form.setValue('originLatLng', latLng);
                          form.setValue('origin', place.formatted_address || place.name || '');
                          setOriginText(place.formatted_address || place.name || '');
                          form.setValue('originDisplayName', displayName);
                          // Save to recent searches
                          addRecentFromSearch({ name: displayName, lat: latLng.lat, lng: latLng.lng });
                          setRecentFromSearches(getRecentFromSearches());
                          setShowFromSuggestions(false);
                        }
                      }}
                    >
                      <input
                        type="text"
                        value={originText}
                        onChange={(e) => setOriginText(e.target.value)}
                        onFocus={() => setShowFromSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowFromSuggestions(false), 200)}
                        placeholder="Enter pickup location"
                        className="w-full bg-secondary rounded-lg px-4 py-3 outline-none text-sm border border-border/50 focus:border-primary transition-colors"
                      />
                    </Autocomplete>
                    {/* Recent From Searches */}
                    {showFromSuggestions && recentFromSearches.length > 0 && (
                      <div className="absolute z-50 w-full max-w-sm mt-1 bg-white border border-border/50 rounded-lg shadow-lg overflow-hidden">
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
                              onClick={() => {
                                setOriginLatLng({ lat: search.lat, lng: search.lng });
                                form.setValue('originLatLng', { lat: search.lat, lng: search.lng });
                                form.setValue('origin', search.name);
                                form.setValue('originDisplayName', search.name);
                                setOriginText(search.name);
                                setShowFromSuggestions(false);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-secondary border-b border-border/30 last:border-0 transition-colors flex items-center gap-2"
                            >
                              <MapPin size={16} className="text-muted-foreground" />
                              <span className="text-sm">{search.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Destination */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">To</label>
                    <Autocomplete
                      onLoad={(autocomplete) => (destAutocompleteRef.current = autocomplete)}
                      onPlaceChanged={() => {
                        const place = destAutocompleteRef.current?.getPlace();
                        if (place?.geometry?.location) {
                          const latLng = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
                          const displayName = place.name || (place.formatted_address ? place.formatted_address.split(',')[0] : '');
                          setDestLatLng(latLng);
                          form.setValue('destLatLng', latLng);
                          form.setValue('destination', place.formatted_address || place.name || '');
                          setDestText(place.formatted_address || place.name || '');
                          form.setValue('destDisplayName', displayName);
                          // Save to recent searches
                          addRecentToSearch({ name: displayName, lat: latLng.lat, lng: latLng.lng });
                          setRecentToSearches(getRecentToSearches());
                          setShowToSuggestions(false);
                        }
                      }}
                    >
                      <input
                        type="text"
                        value={destText}
                        onChange={(e) => setDestText(e.target.value)}
                        onFocus={() => setShowToSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowToSuggestions(false), 200)}
                        placeholder="Enter dropoff location"
                        className="w-full bg-secondary rounded-lg px-4 py-3 outline-none text-sm border border-border/50 focus:border-primary transition-colors"
                      />
                    </Autocomplete>

                    {/* Recent To Searches */}
                    {showToSuggestions && recentToSearches.length > 0 && (
                      <div className="absolute z-50 w-full max-w-sm mt-1 bg-white border border-border/50 rounded-lg shadow-lg overflow-hidden">
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
                              onClick={() => {
                                setDestLatLng({ lat: search.lat, lng: search.lng });
                                form.setValue('destLatLng', { lat: search.lat, lng: search.lng });
                                form.setValue('destination', search.name);
                                form.setValue('destDisplayName', search.name);
                                setDestText(search.name);
                                setShowToSuggestions(false);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-secondary border-b border-border/30 last:border-0 transition-colors flex items-center gap-2"
                            >
                              <MapPin size={16} className="text-muted-foreground" />
                              <span className="text-sm">{search.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Map */}
                  {(originLatLng || destLatLng) && (
                    <div className="h-64 w-full rounded-xl overflow-hidden border border-border/50">
                      <GoogleMap
                        center={originLatLng || {lat: 37.7749, lng: -122.4194}}
                        zoom={12}
                        onClick={(e: google.maps.MapMouseEvent) => {
                          const latLng = {lat: e.latLng!.lat(), lng: e.latLng!.lng()};
                          if (!originLatLng) {
                            setOriginLatLng(latLng);
                            form.setValue('originLatLng', latLng);
                            form.setValue('origin', 'Selected Location');
                            setOriginText('Selected Location');
                          } else if (!destLatLng) {
                            setDestLatLng(latLng);
                            form.setValue('destLatLng', latLng);
                            form.setValue('destination', 'Selected Location');
                            setDestText('Selected Location');
                          }
                        }}
                        mapContainerStyle={{ height: '100%', width: '100%' }}
                      >
                        {originLatLng && <Marker position={originLatLng} />}
                        {destLatLng && <Marker position={destLatLng} />}
                        {route.length > 1 && <Polyline path={route} options={{ strokeColor: '#3b82f6', strokeWeight: 3 }} />}
                      </GoogleMap>
                    </div>
                  )}
                </div>
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

          {/* Ride Details Section */}
          <div id="ride-details-section" className="space-y-4 border-t pt-4">
            <h2 className="text-2xl font-bold">Ride Details</h2>
            <p className="text-muted-foreground">Set departure time, seats, and price</p>

            <div className="space-y-4">
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

              {/* Vehicle Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium block">Select Vehicle</label>
                {vehicles && vehicles.length > 0 ? (
                  <select
                    value={form.watch('vehicleId') || ''}
                    onChange={(e) => form.setValue('vehicleId', e.target.value)}
                    className="w-full bg-secondary rounded-lg px-4 py-3 outline-none text-sm border border-border/50 focus:border-primary transition-colors"
                  >
                    <option value="">Choose a vehicle...</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.model} • {vehicle.color} • {vehicle.plateNumber} ({vehicle.capacity} seats)
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-center text-muted-foreground py-4">No vehicles found</p>
                )}
              </div>

              {/* Seats */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Available Seats</label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  {...form.register("totalSeats")}
                  className="w-full bg-secondary rounded-lg px-4 py-3 outline-none text-sm border border-border/50 focus:border-primary transition-colors"
                />
              </div>

              {/* Price */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Price per Seat (₹)</label>
                <input
                  type="number"
                  min={0}
                  step={10}
                  {...form.register("pricePerSeat")}
                  placeholder="e.g., 50"
                  className="w-full bg-secondary rounded-lg px-4 py-3 outline-none text-sm border border-border/50 focus:border-primary transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Summary Section */}
          {form.getValues('origin') && form.getValues('destination') && (
            <div className="space-y-4 border-t pt-4 bg-secondary p-6 rounded-xl">
              <h3 className="font-bold text-lg">Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">From</span>
                  <span className="font-medium">{form.getValues('originDisplayName') || form.getValues('origin')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">To</span>
                  <span className="font-medium">{form.getValues('destDisplayName') || form.getValues('destination')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Distance</span>
                  <span className="font-medium">{distance.toFixed(1)} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{Math.round(eta)} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Departure</span>
                  <span className="font-medium">
                    {departureDate ? `${format(departureDate, "MMM dd, yyyy")} at ${departureHour}:${departureMinute} ${departureAMPM}` : "Not set"}
                  </span>
                </div>
                <div className="h-px bg-border" />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-4 rounded-lg font-bold bg-primary text-white hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-8"
          >
            {isPending ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Publishing...
              </>
            ) : (
              <>
                <Check size={20} />
                Publish Ride
              </>
            )}
          </button>
        </form>
      </div>
    </Layout>
  );
}
