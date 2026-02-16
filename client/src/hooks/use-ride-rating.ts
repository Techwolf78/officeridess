import { useState } from "react";
import { FirebaseRating } from "@/lib/types";

interface RatingFormData {
  rating: number;
  review?: string;
  categories?: {
    cleanliness?: number;
    behaviour?: number;
    communication?: number;
    punctuality?: number;
  };
}

export function useRideRating() {
  const [ratingData, setRatingData] = useState<RatingFormData>({
    rating: 0,
    categories: {
      cleanliness: 0,
      behaviour: 0,
      communication: 0,
      punctuality: 0,
    },
  });

  const [submitted, setSubmitted] = useState(false);

  const setRating = (rating: number) => {
    setRatingData(prev => ({ ...prev, rating }));
  };

  const setReview = (review: string) => {
    setRatingData(prev => ({ ...prev, review }));
  };

  const setCategoryRating = (category: "cleanliness" | "behaviour" | "communication" | "punctuality", value: number) => {
    setRatingData(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: value,
      },
    }));
  };

  const submitRating = (bookingId: string, fromUserId: string, toUserId: string): FirebaseRating => {
    const rating: FirebaseRating = {
      id: `${bookingId}_${fromUserId}_${Date.now()}`,
      bookingId,
      fromUserId,
      toUserId,
      rating: ratingData.rating,
      ...(ratingData.review && { review: ratingData.review }),
      categories: ratingData.categories,
      createdAt: new Date(),
    };

    setSubmitted(true);
    return rating;
  };

  const reset = () => {
    setRatingData({
      rating: 0,
      categories: {
        cleanliness: 0,
        behaviour: 0,
        communication: 0,
        punctuality: 0,
      },
    });
    setSubmitted(false);
  };

  return {
    ratingData,
    submitted,
    setRating,
    setReview,
    setCategoryRating,
    submitRating,
    reset,
  };
}
