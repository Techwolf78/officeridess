import { useState } from "react";
import { Layout } from "@/components/ui/Layout";
import { useRides } from "@/hooks/use-rides";
import { RideCard } from "@/components/RideCard";
import { Loader2, MapPin, Calendar, Search as SearchIcon, X } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";

type SearchFilters = {
  origin: string;
  destination: string;
  date: string;
};

export default function Search() {
  const [filters, setFilters] = useState<SearchFilters | undefined>();
  const { data: rides, isLoading } = useRides(filters);
  const { register, handleSubmit, reset } = useForm<SearchFilters>();

  const onSubmit = (data: SearchFilters) => {
    // Only set filters if at least one field is filled
    if (data.origin || data.destination || data.date) {
      setFilters(data);
    }
  };

  const clearFilters = () => {
    setFilters(undefined);
    reset();
  };

  return (
    <Layout headerTitle="Find a Ride" showNav={true}>
      <div className="px-6 py-6 space-y-6">
        {/* Search Form */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-border/50">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-secondary/50 rounded-xl px-3 py-2 border border-transparent focus-within:border-primary/20 focus-within:bg-white transition-all">
                <MapPin className="text-muted-foreground shrink-0" size={18} />
                <input
                  {...register("origin")}
                  placeholder="From (e.g. Downtown)"
                  className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground/70"
                />
              </div>
              <div className="flex items-center gap-3 bg-secondary/50 rounded-xl px-3 py-2 border border-transparent focus-within:border-primary/20 focus-within:bg-white transition-all">
                <MapPin className="text-primary shrink-0" size={18} />
                <input
                  {...register("destination")}
                  placeholder="To (e.g. Tech Park)"
                  className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground/70"
                />
              </div>
              <div className="flex items-center gap-3 bg-secondary/50 rounded-xl px-3 py-2 border border-transparent focus-within:border-primary/20 focus-within:bg-white transition-all">
                <Calendar className="text-muted-foreground shrink-0" size={18} />
                <input
                  type="date"
                  {...register("date")}
                  className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground/70 min-h-[24px]"
                />
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
                className="flex-1 py-2.5 bg-primary text-white rounded-xl font-medium text-sm shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-2"
              >
                <SearchIcon size={16} />
                Search Rides
              </button>
            </div>
          </form>
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
