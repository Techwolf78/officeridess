import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface RatingFilterProps {
  minRating: number | undefined;
  onRatingChange: (rating: number | undefined) => void;
}

export function RatingFilter({ minRating, onRatingChange }: RatingFilterProps) {
  const ratings = [4.5, 4.0, 3.5, 3.0];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          <Label className="text-sm font-medium">Minimum Driver Rating</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={minRating === undefined ? "default" : "outline"}
              size="sm"
              onClick={() => onRatingChange(undefined)}
              className="text-xs"
            >
              Any
            </Button>
            {ratings.map((rating) => (
              <Button
                key={rating}
                variant={minRating === rating ? "default" : "outline"}
                size="sm"
                onClick={() => onRatingChange(rating)}
                className="text-xs flex items-center gap-1"
              >
                <Star className="w-3 h-3 fill-current" />
                {rating}+
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}