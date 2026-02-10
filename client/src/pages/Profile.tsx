import { Layout } from "@/components/ui/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useVehicles, useCreateVehicle } from "@/hooks/use-vehicles";
import { Loader2, LogOut, User, MapPin, Briefcase, Settings, Shield, Car, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useState } from "react";
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

export default function Profile() {
  const { user, logout, updateProfile } = useAuth();
  const { data: vehicles, isLoading: loadingVehicles } = useVehicles();
  const createVehicle = useCreateVehicle();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({
    model: '',
    plateNumber: '',
    color: '',
    capacity: 4
  });

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
        setVehicleForm({ model: '', plateNumber: '', color: '', capacity: 4 });
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
      <div className="px-6 py-8 pb-24">
        {/* Profile Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center text-4xl font-bold text-muted-foreground mb-4 border-4 border-white shadow-lg">
             {user.profileImage ? (
               <img src={user.profileImage} alt="Profile" className="w-full h-full rounded-full object-cover" />
             ) : (
               user.firstName?.[0] || "U"
             )}
          </div>
          <h2 className="text-xl font-bold">{user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : "User"}</h2>
          <p className="text-muted-foreground text-sm">{user.phoneNumber}</p>
          <span className="mt-2 text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full capitalize">
            {user.role}
          </span>
        </div>

        {/* Menu Items */}
        <div className="space-y-4">
          {/* Driver Vehicle Management */}
          {user.role === 'driver' && (
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-border/50">
              <div className="p-4 border-b border-border/50">
                <div className="flex items-center justify-between mb-3">
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
                            max="8"
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
                  <div className="space-y-3">
                    {vehicles.map((vehicle) => (
                      <div key={vehicle.id} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Car size={18} className="text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{vehicle.color} {vehicle.model}</p>
                          <p className="text-xs text-muted-foreground">{vehicle.plateNumber} • {vehicle.capacity} seats</p>
                        </div>
                      </div>
                    ))}
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

          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-border/50">
             <div className="p-4 border-b border-border/50 flex items-center gap-3 hover:bg-secondary/50 cursor-pointer">
               <Settings size={18} className="text-muted-foreground" />
               <span className="text-sm font-medium">Settings</span>
             </div>
             <button 
               onClick={() => logout.mutate()}
               className="w-full p-4 flex items-center gap-3 hover:bg-red-50 cursor-pointer text-red-500 text-left"
             >
               <LogOut size={18} />
               <span className="text-sm font-medium">Logout</span>
             </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
