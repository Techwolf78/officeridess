import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Filter, Star } from "lucide-react";

export interface SearchFilters {
  // Price filters
  minPrice?: number;
  maxPrice?: number;

  // Seat availability
  minSeats?: number;

  // Driver preferences
  verifiedDriversOnly?: boolean;
  smoking?: boolean; // false means no smoking allowed
  pets?: boolean; // false means no pets allowed
  music?: boolean; // false means no music allowed
  ac?: boolean; // false means no AC required

  // Vehicle filters
  vehicleComfort?: 'basic' | 'comfort' | 'premium';

  // Rating filters
  minRating?: number;

  // Instant booking
  instantBookingOnly?: boolean;

  // Sort options
  sortBy?: 'price_asc' | 'price_desc' | 'departure_asc' | 'departure_desc' | 'rating_desc' | 'duration_asc';
}

interface SearchFiltersPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function SearchFiltersPanel({ filters, onFiltersChange, onClose, isOpen }: SearchFiltersPanelProps) {
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local filters with incoming filters prop
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const debouncedOnFiltersChange = (newFilters: SearchFilters) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      onFiltersChange(newFilters);
    }, 300); // 300ms debounce delay
  };

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    debouncedOnFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters: SearchFilters = {};
    setLocalFilters(emptyFilters);
    // Clear any pending debounce and apply immediately for clear action
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    onFiltersChange(emptyFilters);
  };

  const activeFilterCount = Object.values(localFilters).filter(value =>
    value !== undefined && value !== null && value !== false && value !== ''
  ).length;

  if (!isOpen) return null;

  return (
    <Card className="w-full max-w-md mx-auto h-fit max-h-[80vh] overflow-y-auto md:max-w-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Price Range */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Price Range (₹)</Label>
          <div className="px-2">
            <Slider
              value={[localFilters.minPrice || 0, localFilters.maxPrice || 1000]}
              onValueChange={([min, max]) => {
                updateFilter('minPrice', min);
                updateFilter('maxPrice', max);
              }}
              max={2000}
              min={0}
              step={50}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>₹{localFilters.minPrice || 0}</span>
              <span>₹{localFilters.maxPrice || 1000}</span>
            </div>
          </div>
        </div>

        {/* Seats Available */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Minimum Seats Available</Label>
          <Select
            value={localFilters.minSeats?.toString() || "1"}
            onValueChange={(value) => updateFilter('minSeats', parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1+ seats</SelectItem>
              <SelectItem value="2">2+ seats</SelectItem>
              <SelectItem value="3">3+ seats</SelectItem>
              <SelectItem value="4">4+ seats</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Driver Preferences */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Driver Preferences</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="verified"
                checked={localFilters.verifiedDriversOnly || false}
                onCheckedChange={(checked) => updateFilter('verifiedDriversOnly', checked)}
              />
              <Label htmlFor="verified" className="text-sm">Verified drivers only</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="instant"
                checked={localFilters.instantBookingOnly || false}
                onCheckedChange={(checked) => updateFilter('instantBookingOnly', checked)}
              />
              <Label htmlFor="instant" className="text-sm">Instant booking only</Label>
            </div>
          </div>
        </div>

        {/* Ride Preferences */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Ride Preferences</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="no-smoking"
                checked={localFilters.smoking === false}
                onCheckedChange={(checked) => updateFilter('smoking', checked ? false : undefined)}
              />
              <Label htmlFor="no-smoking" className="text-sm">No smoking</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="pets-allowed"
                checked={localFilters.pets || false}
                onCheckedChange={(checked) => updateFilter('pets', checked)}
              />
              <Label htmlFor="pets-allowed" className="text-sm">Pets allowed</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="music-allowed"
                checked={localFilters.music || false}
                onCheckedChange={(checked) => updateFilter('music', checked)}
              />
              <Label htmlFor="music-allowed" className="text-sm">Music allowed</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="ac-required"
                checked={localFilters.ac || false}
                onCheckedChange={(checked) => updateFilter('ac', checked)}
              />
              <Label htmlFor="ac-required" className="text-sm">AC required</Label>
            </div>
          </div>
        </div>

        {/* Vehicle Comfort */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Vehicle Comfort</Label>
          <Select
            value={localFilters.vehicleComfort || ""}
            onValueChange={(value) => updateFilter('vehicleComfort', value || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Any comfort level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any</SelectItem>
              <SelectItem value="basic">Basic</SelectItem>
              <SelectItem value="comfort">Comfort</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Minimum Rating */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Minimum Driver Rating</Label>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            <Select
              value={localFilters.minRating?.toString() || ""}
              onValueChange={(value) => updateFilter('minRating', value ? parseFloat(value) : undefined)}
            >
              <SelectTrigger className="w-24">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any</SelectItem>
                <SelectItem value="4.5">4.5+</SelectItem>
                <SelectItem value="4.0">4.0+</SelectItem>
                <SelectItem value="3.5">3.5+</SelectItem>
                <SelectItem value="3.0">3.0+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Sort Options */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Sort By</Label>
          <Select
            value={localFilters.sortBy || "departure_asc"}
            onValueChange={(value) => updateFilter('sortBy', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="departure_asc">Departure Time (Earliest)</SelectItem>
              <SelectItem value="departure_desc">Departure Time (Latest)</SelectItem>
              <SelectItem value="price_asc">Price (Lowest)</SelectItem>
              <SelectItem value="price_desc">Price (Highest)</SelectItem>
              <SelectItem value="rating_desc">Driver Rating</SelectItem>
              <SelectItem value="duration_asc">Duration (Shortest)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters */}
        {activeFilterCount > 0 && (
          <Button
            variant="outline"
            onClick={clearFilters}
            className="w-full"
          >
            Clear All Filters ({activeFilterCount})
          </Button>
        )}
      </CardContent>
    </Card>
  );
}