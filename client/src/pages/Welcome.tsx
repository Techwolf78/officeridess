import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Car, Users, Heart, Shield, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function Welcome() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      icon: <Car className="w-20 h-20 text-primary" />,
      title: (
        <span>
          Share Your{" "}
          <span className="relative inline-block">
            Ride
            <svg
              className="absolute w-full h-2 -bottom-1 left-0 text-green-300"
              viewBox="0 0 100 10"
              preserveAspectRatio="none"
            >
              <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="4" fill="none" />
            </svg>
          </span>
        </span>
      ),
      description: "Offer seats in your car and help others commute sustainably while sharing the journey.",
      color: "from-green-400 to-green-600"
    },
    {
      icon: <Users className="w-20 h-20 text-primary" />,
      title: (
        <span>
          Find{" "}
          <span className="relative inline-block">
            Companions
            <svg
              className="absolute w-full h-2 -bottom-1 left-0 text-green-300"
              viewBox="0 0 100 10"
              preserveAspectRatio="none"
            >
              <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="4" fill="none" />
            </svg>
          </span>
        </span>
      ),
      description: "Connect with people going the same way. Travel together, make friends, and reduce traffic.",
      color: "from-blue-400 to-blue-600"
    },
    {
      icon: <Heart className="w-20 h-20 text-primary" />,
      title: (
        <span>
          Sustainable{" "}
          <span className="relative inline-block">
            Travel
            <svg
              className="absolute w-full h-2 -bottom-1 left-0 text-green-300"
              viewBox="0 0 100 10"
              preserveAspectRatio="none"
            >
              <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="4" fill="none" />
            </svg>
          </span>
        </span>
      ),
      description: "Reduce your carbon footprint by sharing rides and making commuting more eco-friendly.",
      color: "from-purple-400 to-purple-600"
    },
    {
      icon: <Shield className="w-20 h-20 text-primary" />,
      title: (
        <span>
          Safe &{" "}
          <span className="relative inline-block">
            Verified
            <svg
              className="absolute w-full h-2 -bottom-1 left-0 text-green-300"
              viewBox="0 0 100 10"
              preserveAspectRatio="none"
            >
              <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="4" fill="none" />
            </svg>
          </span>
        </span>
      ),
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

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F4]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-primary font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't redirect here - let Login.tsx and Register.tsx handle redirects after successful auth
  // This page is only shown when fully logged out

  return (
    <div className="h-screen bg-gradient-to-br from-[#FAF9F4] to-primary/5 flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-6 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Car size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-display font-bold text-foreground">
            OFFICE<span className="text-primary">RIDES</span>
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
      <div className="absolute inset-0 opacity-15">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(to right, rgba(156, 163, 175, 0.7) 1.5px, transparent 1.5px), linear-gradient(to bottom, rgba(156, 163, 175, 0.7) 1.5px, transparent 1.5px)",
            backgroundSize: "48px 48px",
          }}
        />
        
        {/* Glass morphism left side */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white/20 to-transparent backdrop-blur-sm"></div>
        
        {/* Glass morphism right side */}
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white/20 to-transparent backdrop-blur-sm"></div>
        
        {/* Original blur circles with reduced opacity */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-primary rounded-full blur-3xl opacity-10"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-primary rounded-full blur-3xl opacity-10"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-primary rounded-full blur-3xl opacity-10"></div>
      </div>

      {/* Additional glass morphism overlays for depth */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-0 top-0 bottom-0 w-48 bg-gradient-to-r from-white/10 to-transparent"></div>
        <div className="absolute right-0 top-0 bottom-0 w-48 bg-gradient-to-l from-white/10 to-transparent"></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 z-10">
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