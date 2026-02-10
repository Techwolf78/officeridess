import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Layout } from "@/components/ui/Layout";
import { useCreateRide } from "@/hooks/use-rides";
import { useVehicles } from "@/hooks/use-vehicles";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, Calendar, Users, Car } from "lucide-react";
import { CreateRideRequest } from "@/lib/types";
import { LoadScript, GoogleMap, Marker, Polyline, Autocomplete } from "@react-google-maps/api";
import { useState, useEffect, useRef } from "react";
import { haversineDistance } from "@/lib/utils";
import { getDirections } from "@/lib/utils";

// Static libraries array to prevent re-renders
const GOOGLE_MAPS_LIBRARIES: ("places")[] = ["places"];

// Client-side schema adjustment: string dates from input[type="datetime-local"] need coercion
const createRideFormSchema = z.object({
  vehicleId: z.string(),
  origin: z.string().min(1, "Origin is required"),
  destination: z.string().min(1, "Destination is required"),
  originLatLng: z.object({ lat: z.number(), lng: z.number() }),
  destLatLng: z.object({ lat: z.number(), lng: z.number() }),
  route: z.array(z.object({ lat: z.number(), lng: z.number() })),
  stops: z.array(z.object({ lat: z.number(), lng: z.number() })),
  distance: z.number(),
  eta: z.number(),
  departureTime: z.string().transform((str) => new Date(str)),
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

  // Check if Google Maps API key is available
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const isGoogleMapsReady = !!googleMapsApiKey;

  const [originLatLng, setOriginLatLng] = useState<{lat: number, lng: number} | null>(null);
  const [destLatLng, setDestLatLng] = useState<{lat: number, lng: number} | null>(null);
  const [route, setRoute] = useState<{lat: number, lng: number}[]>([]);
  const [stops, setStops] = useState<{lat: number, lng: number}[]>([]);
  const [distance, setDistance] = useState(0);
  const [eta, setEta] = useState(0);
  const [addingStops, setAddingStops] = useState(false);

  const [originText, setOriginText] = useState('');
  const [destText, setDestText] = useState('');

  const originAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const destAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const calculateRoute = async () => {
    if (originLatLng && destLatLng) {
      try {
        const { route, distance, eta } = await getDirections(originLatLng, destLatLng, stops);
        setRoute(route);
        setDistance(distance);
        setEta(eta);
        form.setValue('route', route);
        form.setValue('distance', distance);
        form.setValue('eta', eta);
        form.setValue('stops', stops);
      } catch (error) {
        console.error('Error calculating route:', error);
        // Fallback
        const fullRoute = [originLatLng, ...stops, destLatLng];
        const totalDist = fullRoute.reduce((acc, curr, i) => {
          if (i === 0) return 0;
          return acc + haversineDistance(fullRoute[i-1].lat, fullRoute[i-1].lng, curr.lat, curr.lng);
        }, 0);
        setDistance(totalDist);
        setEta(Math.round(totalDist / 50 * 60));
        setRoute(fullRoute);
        form.setValue('route', fullRoute);
        form.setValue('distance', totalDist);
        form.setValue('eta', Math.round(totalDist / 50 * 60));
        form.setValue('stops', stops);
      }
    }
  };

  useEffect(() => {
    calculateRoute();
  }, [originLatLng, destLatLng, stops]);

  const form = useForm<CreateRideForm>({
    resolver: zodResolver(createRideFormSchema),
    defaultValues: {
      totalSeats: 3,
      originLatLng: {lat: 0, lng: 0},
      destLatLng: {lat: 0, lng: 0},
      route: [],
      stops: [],
      distance: 0,
      eta: 0,
    }
  });

  const onSubmit = (data: CreateRideForm) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
      return;
    }

    // Convert dollars to cents for storage
    const submissionData: CreateRideRequest = {
      driverId: user.uid,
      vehicleId: data.vehicleId,
      origin: data.origin,
      destination: data.destination,
      originLatLng: data.originLatLng,
      destLatLng: data.destLatLng,
      route: data.route,
      stops: data.stops,
      distance: data.distance,
      eta: data.eta,
      departureTime: data.departureTime,
      totalSeats: data.totalSeats,
      pricePerSeat: data.pricePerSeat,
      status: "scheduled",
    };

    createRide(submissionData, {
      onSuccess: () => {
        toast({
          title: "Ride Published!",
          description: "Passengers can now book your ride.",
          className: "bg-green-50 border-green-200 text-green-900",
        });
        setLocation("/rides");
      },
      onError: (err) => {
        toast({
          title: "Failed to create ride",
          description: err.message,
          variant: "destructive",
        });
      },
    });
  };

  if (loadingVehicles) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-primary" />
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
          <Link href="/profile" className="px-6 py-3 bg-primary text-white rounded-xl font-semibold shadow-lg shadow-primary/20">
            Add Vehicle
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout headerTitle="Post a Ride">
      <div className="px-6 py-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-20">
            
            {/* Route Section */}
            <section className="space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Route Details</h3>
              
              <div className="bg-white p-4 rounded-xl border border-border/50 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Select Route</h3>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (position) => {
                            const latLng = { lat: position.coords.latitude, lng: position.coords.longitude };
                            setOriginLatLng(latLng);
                            form.setValue('originLatLng', latLng);
                            form.setValue('origin', 'Current Location');
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
                {isGoogleMapsReady ? (
                  <LoadScript googleMapsApiKey={googleMapsApiKey} libraries={GOOGLE_MAPS_LIBRARIES} onError={(error) => console.error('LoadScript error:', error)}>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Origin</label>
                        <Autocomplete
                          onLoad={(autocomplete) => (originAutocompleteRef.current = autocomplete)}
                          onPlaceChanged={() => {
                            const place = originAutocompleteRef.current?.getPlace();
                            if (place?.geometry?.location) {
                              const latLng = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
                              setOriginLatLng(latLng);
                              form.setValue('originLatLng', latLng);
                              form.setValue('origin', place.formatted_address || place.name || '');
                              setOriginText(place.formatted_address || place.name || '');
                            }
                          }}
                        >
                          <input
                            type="text"
                            value={originText}
                            onChange={(e) => setOriginText(e.target.value)}
                            placeholder="Enter origin location"
                            className="w-full bg-secondary rounded-lg px-3 py-2.5 outline-none text-sm"
                          />
                        </Autocomplete>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Destination</label>
                        <Autocomplete
                          onLoad={(autocomplete) => (destAutocompleteRef.current = autocomplete)}
                          onPlaceChanged={() => {
                            const place = destAutocompleteRef.current?.getPlace();
                            if (place?.geometry?.location) {
                              const latLng = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
                              setDestLatLng(latLng);
                              form.setValue('destLatLng', latLng);
                              form.setValue('destination', place.formatted_address || place.name || '');
                              setDestText(place.formatted_address || place.name || '');
                            }
                          }}
                        >
                          <input
                            type="text"
                            value={destText}
                            onChange={(e) => setDestText(e.target.value)}
                            placeholder="Enter destination location"
                            className="w-full bg-secondary rounded-lg px-3 py-2.5 outline-none text-sm"
                          />
                        </Autocomplete>
                      </div>
                    </div>
                    <div className="h-64 w-full">
                      <GoogleMap
                        center={originLatLng || {lat: 37.7749, lng: -122.4194}}
                        zoom={10}
                        onClick={(e: google.maps.MapMouseEvent) => {
                          const latLng = {lat: e.latLng!.lat(), lng: e.latLng!.lng()};
                          if (!originLatLng) {
                            setOriginLatLng(latLng);
                            form.setValue('originLatLng', latLng);
                            form.setValue('origin', 'Selected Origin');
                            setOriginText('Selected Origin');
                          } else if (!destLatLng) {
                            setDestLatLng(latLng);
                            form.setValue('destLatLng', latLng);
                            form.setValue('destination', 'Selected Destination');
                            setDestText('Selected Destination');
                          } else if (addingStops) {
                            setStops(prev => [...prev, latLng]);
                          }
                        }}
                        mapContainerStyle={{ height: '100%', width: '100%' }}
                      >
                        {originLatLng && <Marker position={originLatLng} />}
                        {destLatLng && <Marker position={destLatLng} />}
                        {stops.map((stop, i) => <Marker key={i} position={stop} />)}
                        {route.length > 1 && <Polyline path={route} />}
                      </GoogleMap>
                    </div>
                  </LoadScript>
                ) : (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm">
                      Google Maps is not configured properly. Please check your API key configuration.
                    </p>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">Click on map to set origin, then destination. {destLatLng && !addingStops && <button onClick={() => setAddingStops(true)} className="text-primary underline">Add stops</button>} {addingStops && <button onClick={() => setAddingStops(false)} className="text-primary underline">Finish adding stops</button>}</p>
                <p className="text-sm text-muted-foreground">Click on map to set origin, then destination. {destLatLng && !addingStops && <button onClick={() => setAddingStops(true)} className="text-primary underline">Add stops</button>} {addingStops && <button onClick={() => setAddingStops(false)} className="text-primary underline">Finish adding stops</button>}</p>
                {form.formState.errors.origin && <p className="text-xs text-red-500">{form.formState.errors.origin.message}</p>}
                {form.formState.errors.destination && <p className="text-xs text-red-500">{form.formState.errors.destination.message}</p>}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Departure Time</label>
                  <div className="flex items-center gap-3 bg-secondary rounded-lg px-3 py-2.5">
                    <Calendar size={18} className="text-muted-foreground" />
                    <input
                      type="datetime-local"
                      {...form.register("departureTime")}
                      className="bg-transparent w-full outline-none text-sm"
                    />
                  </div>
                  {form.formState.errors.departureTime && <p className="text-xs text-red-500">{String(form.formState.errors.departureTime.message)}</p>}
                </div>
              </div>
            </section>

          {/* Ride Details Section */}
          <section className="space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Ride Details</h3>
            
            <div className="bg-white p-4 rounded-xl border border-border/50 shadow-sm space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Vehicle</label>
                <div className="flex items-center gap-3 bg-secondary rounded-lg px-3 py-2.5">
                  <Car size={18} className="text-muted-foreground" />
                  <select
                    {...form.register("vehicleId")}
                    className="bg-transparent w-full outline-none text-sm"
                  >
                    {vehicles?.map(v => (
                      <option key={v.id} value={v.id}>{v.color} {v.model} ({v.plateNumber})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Available Seats</label>
                <div className="flex items-center gap-3 bg-secondary rounded-lg px-3 py-2.5">
                  <Users size={18} className="text-muted-foreground" />
                  <input
                    type="number"
                    max={6}
                    min={1}
                    {...form.register("totalSeats")}
                    className="bg-transparent w-full outline-none text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Price per Seat (₹)</label>
                <div className="flex items-center gap-3 bg-secondary rounded-lg px-3 py-2.5">
                  <span className="text-muted-foreground font-medium">₹</span>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    {...form.register("pricePerSeat")}
                    placeholder="e.g., 50"
                    className="bg-transparent w-full outline-none text-sm"
                  />
                </div>
                {form.formState.errors.pricePerSeat && <p className="text-xs text-red-500">{form.formState.errors.pricePerSeat.message}</p>}
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isPending ? <Loader2 className="animate-spin" /> : "Publish Ride"}
          </button>
        </form>
      </div>
    </Layout>
  );
}
