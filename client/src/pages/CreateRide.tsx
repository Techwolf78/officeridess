import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRideSchema } from "@shared/schema";
import { z } from "zod";
import { Layout } from "@/components/ui/Layout";
import { useCreateRide } from "@/hooks/use-rides";
import { useVehicles } from "@/hooks/use-vehicles";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, Calendar, DollarSign, Users, Car } from "lucide-react";

// Client-side schema adjustment: string dates from input[type="datetime-local"] need coercion
const createRideFormSchema = insertRideSchema.omit({ driverId: true }).extend({
  departureTime: z.string().transform((str) => new Date(str)),
  vehicleId: z.coerce.number(),
  pricePerSeat: z.coerce.number(), // Input is dollars, we'll multiply by 100
  totalSeats: z.coerce.number(),
});

type CreateRideForm = z.infer<typeof createRideFormSchema>;

export default function CreateRide() {
  const { mutate: createRide, isPending } = useCreateRide();
  const { data: vehicles, isLoading: loadingVehicles } = useVehicles();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<CreateRideForm>({
    resolver: zodResolver(createRideFormSchema),
    defaultValues: {
      pricePerSeat: 0,
      totalSeats: 3,
    }
  });

  const onSubmit = (data: CreateRideForm) => {
    // Convert dollars to cents for backend
    const submissionData = {
      ...data,
      pricePerSeat: Math.round(data.pricePerSeat * 100),
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
              <div className="space-y-2">
                <label className="text-sm font-medium">Origin</label>
                <div className="flex items-center gap-3 bg-secondary rounded-lg px-3 py-2.5">
                  <MapPin size={18} className="text-muted-foreground" />
                  <input
                    {...form.register("origin")}
                    placeholder="Where are you starting?"
                    className="bg-transparent w-full outline-none text-sm"
                  />
                </div>
                {form.formState.errors.origin && <p className="text-xs text-red-500">{form.formState.errors.origin.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Destination</label>
                <div className="flex items-center gap-3 bg-secondary rounded-lg px-3 py-2.5">
                  <MapPin size={18} className="text-primary" />
                  <input
                    {...form.register("destination")}
                    placeholder="Where are you going?"
                    className="bg-transparent w-full outline-none text-sm"
                  />
                </div>
                {form.formState.errors.destination && <p className="text-xs text-red-500">{form.formState.errors.destination.message}</p>}
              </div>

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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Price per Seat ($)</label>
                  <div className="flex items-center gap-3 bg-secondary rounded-lg px-3 py-2.5">
                    <DollarSign size={18} className="text-muted-foreground" />
                    <input
                      type="number"
                      step="0.01"
                      {...form.register("pricePerSeat")}
                      className="bg-transparent w-full outline-none text-sm"
                    />
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
