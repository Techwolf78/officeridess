import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Car, Users, Heart, Shield, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function Welcome() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      icon: <Car className="w-20 h-20 text-primary" />,
      title: "Share Your Ride",
      description: "Offer seats in your car and help others commute sustainably while sharing the journey.",
      color: "from-green-400 to-green-600"
    },
    {
      icon: <Users className="w-20 h-20 text-primary" />,
      title: "Find Companions",
      description: "Connect with people going the same way. Travel together, make friends, and reduce traffic.",
      color: "from-blue-400 to-blue-600"
    },
    {
      icon: <Heart className="w-20 h-20 text-primary" />,
      title: "Sustainable Travel",
      description: "Reduce your carbon footprint by sharing rides and making commuting more eco-friendly.",
      color: "from-purple-400 to-purple-600"
    },
    {
      icon: <Shield className="w-20 h-20 text-primary" />,
      title: "Safe & Verified",
      description: "Verified drivers and passengers with ratings and reviews for your peace of mind.",
      color: "from-orange-400 to-orange-600"
    }
  ];

  // Auto-advance slides every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [slides.length]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      setLocation("/home");
    }
  }, [user, setLocation]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F4]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-[#FAF9F4] to-primary/5 flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-6 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Car size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-display font-bold text-foreground">
            Commute<span className="text-primary">Sync</span>
          </h1>
        </div>
        <button
          onClick={() => setLocation("/login")}
          className="text-primary font-medium hover:underline"
        >
          Sign In
        </button>
      </div>

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-32 h-32 bg-primary rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-primary rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-primary rounded-full blur-3xl"></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 z-10">
        <div className="text-center max-w-md mx-auto">
          {/* Slide Content */}
          <div className="mb-12 transition-all duration-500 ease-in-out">
            <div className="mb-8 flex justify-center transform transition-transform duration-500">
              {slides[currentSlide].icon}
            </div>
            <h2 className="text-4xl font-display font-bold text-foreground mb-6 transition-all duration-500">
              {slides[currentSlide].title}
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed transition-all duration-500">
              {slides[currentSlide].description}
            </p>
          </div>

          {/* Slide Indicators */}
          <div className="flex justify-center gap-3 mb-12">
            {slides.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentSlide ? "bg-primary scale-125" : "bg-primary/30"
                }`}
              />
            ))}
          </div>

          {/* Get Started Button */}
          <button
            onClick={() => setLocation("/login")}
            className="px-8 py-4 bg-primary text-white rounded-2xl font-semibold text-lg shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all flex items-center justify-center gap-3 hover:scale-105 transform duration-200 mx-auto"
          >
            Get Started <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}