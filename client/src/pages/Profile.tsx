import { Layout } from "@/components/ui/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useVehiclesRealtime } from "@/hooks/use-vehicles-realtime";
import { useCreateVehicle } from "@/hooks/use-vehicles";
import { Loader2, LogOut, Settings, Shield, Car, Plus, Bike, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import React, { useState } from "react";
import { DriverBadge } from "@/components/DriverBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";

export default function Profile() {
  const { user, logout, updateProfile } = useAuth();
  const { vehicles, loading: loadingVehicles } = useVehiclesRealtime();
  const createVehicle = useCreateVehicle();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [vehicleForm, setVehicleForm] = useState<{
    model: string;
    plateNumber: string;
    color: string;
    capacity: number;
    type: 'car' | 'bike';
  }>({
    model: '',
    plateNumber: '',
    color: '',
    capacity: 4,
    type: 'car' // Add vehicle type
  });
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentVehicleIndex, setCurrentVehicleIndex] = useState(0);

  // Handle carousel API and track current slide
  React.useEffect(() => {
    if (!carouselApi) return;

    const handleSelect = () => {
      setCurrentVehicleIndex(carouselApi.selectedScrollSnap());
    };

    carouselApi.on("select", handleSelect);

    return () => {
      carouselApi.off("select", handleSelect);
    };
  }, [carouselApi]);

  if (!user) return null;

  const handleAddVehicle = () => {
    if (!vehicleForm.model || !vehicleForm.plateNumber || !vehicleForm.color) {
      toast({
        title: "Error",
        description: "Please fill in all vehicle details",
        variant: "destructive",
      });
      return;
    }

    createVehicle.mutate({
      ...vehicleForm,
      userId: user.uid, // Add userId here
    }, {
      onSuccess: () => {
        setShowAddVehicle(false);
        setVehicleForm({ model: '', plateNumber: '', color: '', capacity: 4, type: 'car' });
        toast({
          title: "Vehicle Added!",
          description: "Your vehicle has been added successfully.",
          className: "bg-green-50 border-green-200 text-green-900",
        });
      },
      onError: (err) => {
        toast({
          title: "Failed to add vehicle",
          description: err.message,
          variant: "destructive",
        });
      },
    });
  };

  return (
    <Layout headerTitle="Profile" showNav={true}>
      <div className="px-4 py-2 pb-24">
        {/* Profile Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-2xl font-bold text-muted-foreground mb-2 border-2 border-white shadow-md">
             {user.profileImage ? (
               <img src={user.profileImage} alt="Profile" className="w-full h-full rounded-full object-cover" />
             ) : (
               user.firstName?.[0] || "U"
             )}
          </div>
          <h2 className="text-lg font-bold">{user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : "User"}</h2>
          <p className="text-muted-foreground text-xs">{user.phoneNumber}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">
              {user.role}
            </span>
            {user.role === 'driver' && user.verificationStatus && (
              <DriverBadge verificationStatus={user.verificationStatus} size="sm" />
            )}
          </div>
        </div>

        {/* Driver Verification Section */}
        {user.role === 'driver' && user.verificationStatus !== 'verified' && (
          <Link href="/verification-required">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 border border-blue-200 rounded-2xl p-4 mb-4 cursor-pointer hover:border-blue-300 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-blue-900">Get Verified</p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    {user.verificationStatus === 'pending'
                      ? 'Your verification is in progress...'
                      : 'Unlock verified badge and get more ride requests'}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Menu Items */}
        <div className="space-y-4 ">
          {/* Driver Vehicle Management */}
          {user.role === 'driver' && (
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-border/50">
              <div className="p-3 border-b border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">My Vehicles</h3>
                  <Dialog open={showAddVehicle} onOpenChange={setShowAddVehicle}>
                    <DialogTrigger asChild>
                      <button className="flex items-center gap-2 text-primary text-sm font-medium hover:bg-primary/10 px-3 py-1 rounded-lg transition-colors">
                        <Plus size={16} />
                        Add Vehicle
                      </button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Vehicle</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="type">Vehicle Type</Label>
                          <select
                            id="type"
                            value={vehicleForm.type}
                            onChange={(e) => setVehicleForm(prev => ({ ...prev, type: e.target.value as 'car' | 'bike' }))}
                            className="w-full px-3 py-2 border border-border rounded-lg outline-none text-sm bg-white focus:border-primary transition-colors"
                          >
                            <option value="car">Car</option>
                            <option value="bike">Bike</option>
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="model">Vehicle Model</Label>
                          <Input
                            id="model"
                            placeholder="e.g. Toyota Camry"
                            value={vehicleForm.model}
                            onChange={(e) => setVehicleForm(prev => ({ ...prev, model: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="plate">License Plate</Label>
                          <Input
                            id="plate"
                            placeholder="e.g. ABC-123"
                            value={vehicleForm.plateNumber}
                            onChange={(e) => setVehicleForm(prev => ({ ...prev, plateNumber: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="color">Color</Label>
                          <Input
                            id="color"
                            placeholder="e.g. White"
                            value={vehicleForm.color}
                            onChange={(e) => setVehicleForm(prev => ({ ...prev, color: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="capacity">Seating Capacity</Label>
                          <Input
                            id="capacity"
                            type="number"
                            min="1"
                            max={vehicleForm.type === 'bike' ? '2' : '8'}
                            value={vehicleForm.capacity}
                            onChange={(e) => setVehicleForm(prev => ({ ...prev, capacity: parseInt(e.target.value) || 4 }))}
                          />
                        </div>
                        <div className="flex gap-3 pt-4">
                          <Button
                            onClick={() => setShowAddVehicle(false)}
                            variant="outline"
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleAddVehicle}
                            disabled={createVehicle.isPending}
                            className="flex-1"
                          >
                            {createVehicle.isPending && <Loader2 className="animate-spin mr-2" size={16} />}
                            Add Vehicle
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                {loadingVehicles ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="animate-spin text-muted-foreground" size={20} />
                  </div>
                ) : vehicles && vehicles.length > 0 ? (
                  <div className="space-y-2">
                    {/* Carousel */}
                    <Carousel setApi={setCarouselApi} className="w-full">
                      <CarouselContent>
                        {vehicles.map((vehicle) => (
                          <CarouselItem key={vehicle.id} className="px-6">
                            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl px-4 py-2 border border-primary/20 shadow-sm hover:shadow-md transition-shadow">
                              {/* Vehicle Type Icon */}
                              <div className="flex items-center justify-between mb-1">
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                  {vehicle.type === 'bike' ? (
                                    <Bike size={16} className="text-primary" />
                                  ) : (
                                    <Car size={16} className="text-primary" />
                                  )}
                                </div>
                                <span className="text-[10px] font-semibold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full capitalize">
                                  {vehicle.type || 'car'}
                                </span>
                              </div>

                              {/* Vehicle Details */}
                              <div className="space-y-0.5 mb-1.5">
                                <h3 className="text-sm font-bold text-foreground leading-tight">
                                  {vehicle.color} {vehicle.model}
                                </h3>
                                <p className="text-[10px] text-muted-foreground">
                                  {vehicle.plateNumber}
                                </p>
                              </div>

                              {/* Capacity */}
                              <div className="bg-white/50 rounded-md p-1.5 flex items-center justify-between">
                                <span className="text-[10px] font-medium text-muted-foreground">Capacity</span>
                                <span className="text-[10px] font-bold text-foreground">{vehicle.capacity} seats</span>
                              </div>
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      {vehicles.length > 1 && (
                        <>
                          <CarouselPrevious className="hidden sm:flex" />
                          <CarouselNext className="hidden sm:flex" />
                        </>
                      )}
                    </Carousel>

                    {/* Navigation Dots */}
                    {vehicles.length > 1 && (
                      <div className="flex items-center justify-center gap-2 pt-1">
                        {vehicles.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => carouselApi?.scrollTo(index)}
                            className={`h-2 rounded-full transition-all ${
                              index === currentVehicleIndex
                                ? 'bg-primary w-6'
                                : 'bg-border/50 w-2 hover:bg-border'
                            }`}
                            aria-label={`Go to vehicle ${index + 1}`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Vehicle Count */}
                    {vehicles.length > 1 && (
                      <div className="text-center text-xs text-muted-foreground">
                        {currentVehicleIndex + 1} of {vehicles.length} vehicles
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Car size={32} className="text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No vehicles added yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Add a vehicle to start posting rides</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-border/50">
             <button 
               onClick={() => updateProfile.mutate({ role: user.role === 'passenger' ? 'driver' : 'passenger' })}
               disabled={updateProfile.isPending}
               className="w-full p-4 border-b border-border/50 flex items-center gap-3 hover:bg-secondary/50 transition-colors text-left"
             >
               <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-primary">
                 <Shield size={16} />
               </div>
               <div className="flex-1">
                 <p className="text-sm font-medium">Switch to {user.role === 'passenger' ? 'Driver' : 'Passenger'}</p>
                 <p className="text-xs text-muted-foreground">{user.role === 'passenger' ? 'Post rides & help others' : 'Book rides'}</p>
               </div>
               {updateProfile.isPending && <Loader2 className="animate-spin text-muted-foreground" size={16} />}
             </button>
          </div>

          <Link href="/settings">
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-border/50 cursor-pointer hover:shadow-md transition-shadow mt-3">
               <button className="w-full p-4 border-b border-border/50 flex items-center gap-3 hover:bg-secondary/50 text-left">
                 <Settings size={18} className="text-muted-foreground" />
                 <span className="text-sm font-medium">Settings</span>
               </button>
               <button 
                 onClick={() => logout.mutate()}
                 className="w-full p-4 flex items-center gap-3 hover:bg-red-50 cursor-pointer text-red-500 text-left"
               >
                 <LogOut size={18} />
                 <span className="text-sm font-medium">Logout</span>
               </button>
            </div>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
