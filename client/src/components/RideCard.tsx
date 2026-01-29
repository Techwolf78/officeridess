import { Ride, User, Vehicle } from "@shared/schema";
import { format } from "date-fns";
import { MapPin, Clock, Users, ChevronRight, Calendar } from "lucide-react";
import { Link } from "wouter";

interface RideCardProps {
  ride: Ride & { driver: User; vehicle: Vehicle };
  showStatus?: boolean;
}

export function RideCard({ ride, showStatus }: RideCardProps) {
  const isFull = ride.availableSeats === 0;

  return (
    <Link href={`/ride/${ride.id}`} className="block">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-border/50 hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
              {ride.driver.fullName?.[0] || "D"}
            </div>
            <div>
              <h3 className="font-semibold text-sm">{ride.driver.fullName || "Driver"}</h3>
              <p className="text-xs text-muted-foreground">{ride.vehicle.color} {ride.vehicle.model}</p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-display font-bold text-primary text-lg">
              ${(ride.pricePerSeat / 100).toFixed(2)}
            </span>
            {showStatus && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium mt-1 ${
                ride.status === 'scheduled' ? 'bg-blue-50 text-blue-600' :
                ride.status === 'in_progress' ? 'bg-green-50 text-green-600' :
                ride.status === 'completed' ? 'bg-gray-100 text-gray-500' :
                'bg-red-50 text-red-500'
              }`}>
                {ride.status.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3 relative">
          {/* Connecting line */}
          <div className="absolute left-[7px] top-2 bottom-6 w-[2px] bg-border/50" />

          <div className="flex items-start gap-3 relative z-10">
            <div className="w-4 h-4 rounded-full border-2 border-primary bg-white mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium leading-tight">{ride.origin}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(ride.departureTime), "h:mm a")}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 relative z-10">
            <div className="w-4 h-4 rounded-full bg-primary mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium leading-tight">{ride.destination}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Approx. arrival depending on traffic
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t flex justify-between items-center text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar size={14} />
            <span>{format(new Date(ride.departureTime), "MMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={14} />
            <span className={isFull ? "text-red-500 font-medium" : ""}>
              {isFull ? "Full" : `${ride.availableSeats} seats left`}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
