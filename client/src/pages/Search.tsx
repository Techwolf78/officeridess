import { useState } from "react";
import { Layout } from "@/components/ui/Layout";
import { useRides } from "@/hooks/use-rides";
import { RideCard } from "@/components/RideCard";
import { Loader2, MapPin, Calendar, Search as SearchIcon, X } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { LoadScript, GoogleMap, Marker, Polyline, Autocomplete } from "@react-google-maps/api";
import { haversineDistance, isPointNearPolyline, getDirections } from "@/lib/utils";
import { useRef } from "react";

// Static libraries array to prevent re-renders
const GOOGLE_MAPS_LIBRARIES: ("places")[] = ["places"];

type SearchFilters = {
  originLatLng: { lat: number; lng: number };
  destLatLng: { lat: number; lng: number };
  route: { lat: number; lng: number }[];
  pickupLatLng: { lat: number; lng: number };
  date: string;
};

export default function Search() {
  const [filters, setFilters] = useState<SearchFilters | undefined>();
  const { data: rides, isLoading } = useRides(filters);
  const { register, handleSubmit, reset } = useForm<SearchFilters>();

  const [originLatLng, setOriginLatLng] = useState<{lat: number, lng: number} | null>(null);
  const [destLatLng, setDestLatLng] = useState<{lat: number, lng: number} | null>(null);
  const [route, setRoute] = useState<{lat: number, lng: number}[]>([]);
  const [pickupLatLng, setPickupLatLng] = useState<{lat: number, lng: number} | null>(null);

  const [originText, setOriginText] = useState('');
  const [destText, setDestText] = useState('');

  const originAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const destAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Check if Google Maps API key is available
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const isGoogleMapsReady = !!googleMapsApiKey;

  const onSubmit = (data: SearchFilters) => {
    if (originLatLng && destLatLng && pickupLatLng) {
      setFilters({
        originLatLng,
        destLatLng,
        route,
        pickupLatLng,
        date: data.date,
      });
    }
  };

  const clearFilters = () => {
    setFilters(undefined);
    reset();
    setOriginLatLng(null);
    setDestLatLng(null);
    setRoute([]);
    setPickupLatLng(null);
    setOriginText('');
    setDestText('');
  };

  return (
    <Layout headerTitle="Find a Ride" showNav={true}>
      <div className="px-6 py-6 space-y-6">
          {/* Search Form */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-border/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Select Route</h3>
              <button
                type="button"
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        const latLng = { lat: position.coords.latitude, lng: position.coords.longitude };
                        setOriginLatLng(latLng);
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
                <div className="space-y-4 mb-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Origin</label>
                    <Autocomplete
                      onLoad={(autocomplete) => (originAutocompleteRef.current = autocomplete)}
                      onPlaceChanged={() => {
                        const place = originAutocompleteRef.current?.getPlace();
                        if (place?.geometry?.location) {
                          const latLng = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
                          setOriginLatLng(latLng);
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
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="h-64 w-full">
                    <GoogleMap
                      center={originLatLng || {lat: 37.7749, lng: -122.4194}}
                      zoom={10}
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
                        } else if (!pickupLatLng && route.length > 1) {
                          // Check if pickup is near route
                          if (isPointNearPolyline(latLng, route, 300)) {
                            setPickupLatLng(latLng);
                          } else {
                            alert('Pickup must be within 300m of the route');
                          }
                        }
                      }}
                      mapContainerStyle={{ height: '100%', width: '100%' }}
                    >
                      {originLatLng && <Marker position={originLatLng} />}
                      {destLatLng && <Marker position={destLatLng} />}
                      {pickupLatLng && <Marker position={pickupLatLng} />}
                      {route.length > 1 && <Polyline path={route} />}
                    </GoogleMap>
                  </div>
                  <p className="text-sm text-muted-foreground">Click to set origin, then destination, then pickup on route.</p>
                  
                  <div className="flex items-center gap-3 bg-secondary/50 rounded-xl px-3 py-2 border border-transparent focus-within:border-primary/20 focus-within:bg-white transition-all">
                    <Calendar className="text-muted-foreground shrink-0" size={18} />
                    <input
                      type="date"
                      {...register("date")}
                      className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground/70 min-h-[24px]"
                    />
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
                      disabled={!pickupLatLng}
                      className="flex-1 py-2.5 bg-primary text-white rounded-xl font-medium text-sm shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <SearchIcon size={16} />
                      Search Rides
                    </button>
                  </div>
                </form>
              </LoadScript>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">
                  Google Maps is not configured properly. Please check your API key configuration.
                </p>
              </div>
            )}
          </div>

        {/* Results */}
        <div>
          <h3 className="font-display font-bold mb-4 flex items-center gap-2">
            Available Rides
            {filters && <span className="text-xs font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">Filtered</span>}
          </h3>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="animate-spin text-primary" size={32} />
              <p className="text-sm text-muted-foreground">Looking for rides...</p>
            </div>
          ) : rides && rides.length > 0 ? (
            <div className="space-y-4 pb-20">
              {rides.map((ride) => (
                <RideCard key={ride.id} ride={ride} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-border px-6">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                <SearchIcon size={24} />
              </div>
              <h4 className="font-medium text-foreground mb-1">No rides found</h4>
              <p className="text-muted-foreground text-sm">Try adjusting your filters or check back later.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
