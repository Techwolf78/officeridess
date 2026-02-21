import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface PriceRangeSliderProps {
  minPrice: number;
  maxPrice: number;
  onPriceChange: (min: number, max: number) => void;
  maxValue?: number;
  step?: number;
}

export function PriceRangeSlider({
  minPrice,
  maxPrice,
  onPriceChange,
  maxValue = 2000,
  step = 50
}: PriceRangeSliderProps) {
  const handleValueChange = (values: number[]) => {
    const [min, max] = values;
    onPriceChange(min, max);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          <Label className="text-sm font-medium">Price Range (₹ per seat)</Label>
          <div className="px-2">
            <Slider
              value={[minPrice, maxPrice]}
              onValueChange={handleValueChange}
              max={maxValue}
              min={0}
              step={step}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>₹{minPrice}</span>
              <span>₹{maxPrice}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}