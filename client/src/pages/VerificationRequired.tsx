import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Layout } from "@/components/ui/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, CheckCircle2, Users, TrendingUp, AlertCircle, Upload, X } from "lucide-react";
import { DriverBadge } from "@/components/DriverBadge";
import { useDriverVerification } from "@/hooks/use-driver-verification";

export default function VerificationRequired() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const submitVerification = useDriverVerification();
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string>("");
  const [backPreview, setBackPreview] = useState<string>("");

  // Redirect if not a driver
  if (!user || user.role !== "driver") {
    return (
      <Layout headerTitle="Verification" showNav={true}>
        <div className="px-4 py-8 text-center">
          <p className="text-muted-foreground">
            Only drivers can access this page.
          </p>
          <Button
            onClick={() => setLocation("/home")}
            className="mt-4"
          >
            Back to Home
          </Button>
        </div>
      </Layout>
    );
  }

  // If already verified, show that status
  if (user.verificationStatus === "verified") {
    return (
      <Layout headerTitle="Verification" showNav={true}>
        <div className="px-4 py-8 pb-24 max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">You're Verified! ✅</h1>
            <p className="text-muted-foreground">
              Your account is fully verified. You can now enjoy all the benefits of a verified driver.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                Your verified badge is now visible on all your rides, helping build trust with passengers.
              </p>
            </div>
            <Button
              onClick={() => setLocation("/home")}
              className="w-full"
            >
              Return to Home
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // If pending, show pending status
  if (user.verificationStatus === "pending") {
    return (
      <Layout headerTitle="Verification" showNav={true}>
        <div className="px-4 py-8 pb-24 max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Verification Pending ⏳</h1>
            <p className="text-muted-foreground">
              Thank you! Your documents are being reviewed. This usually takes between 1-4 hours.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                We'll notify you as soon as your verification is complete. You'll receive a confirmation and your verified badge will appear on your profile.
              </p>
            </div>
            <Button
              onClick={() => setLocation("/home")}
              className="w-full"
            >
              Return to Home
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const handleImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "front" | "back"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    if (type === "front") {
      setFrontImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFrontPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setBackImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBackPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!frontImage || !backImage) {
      toast({
        title: "Missing documents",
        description: "Please upload both front and back of your driver's license",
        variant: "destructive",
      });
      return;
    }

    submitVerification.mutate(
      { front: frontImage, back: backImage },
      {
        onSuccess: () => {
          toast({
            title: "Documents submitted!",
            description:
              "Thank you! Your verification is in progress. We'll review your documents shortly.",
            className: "bg-green-50 border-green-200 text-green-900",
          });

          // Refresh to show pending status
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        },
        onError: (error) => {
          toast({
            title: "Upload failed",
            description:
              error instanceof Error ? error.message : "Failed to submit documents",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Layout headerTitle="Get Verified" showNav={true}>
      <div className="px-4 py-2 pb-24 max-w-2xl mx-auto">
        {/* Current Status */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Current Status:
            </span>
            <DriverBadge verificationStatus="basic" />
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Why Get Verified?
          </h2>
          <div className="space-y-3">
            <div className="flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">
                  Display Verified Badge
                </p>
                <p className="text-xs text-muted-foreground">
                  Show a green verified checkmark on your profile and all your rides
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Users className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">
                  More Bookings
                </p>
                <p className="text-xs text-muted-foreground">
                  Verified drivers get more ride requests from passengers who trust verification
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <TrendingUp className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">
                  Priority Matching
                </p>
                <p className="text-xs text-muted-foreground">
                  Better matching with passengers and priority in our system
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">
                  Build Trust
                </p>
                <p className="text-xs text-muted-foreground">
                  Gain confidence from passengers with a badge backed by identity verification
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <Card className="p-6 border-2">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Driver's License
          </h3>

          <p className="text-sm text-muted-foreground mb-6">
            Upload clear, well-lit photos of your driver's license (front and back). This helps us verify your identity and build a safer community.
          </p>

          <div className="space-y-6">
            {/* Front Side */}
            <div>
              <label className="block text-sm font-medium mb-3">Front Side</label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:bg-secondary/30 transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageSelect(e, "front")}
                  className="hidden"
                  id="front-input"
                />
                <label htmlFor="front-input" className="cursor-pointer block">
                  {frontPreview ? (
                    <div className="relative">
                      <img
                        src={frontPreview}
                        alt="Front preview"
                        className="max-h-40 mx-auto rounded"
                      />
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setFrontImage(null);
                          setFrontPreview("");
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="py-6">
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm font-medium">
                        Click to upload front side
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG up to 5MB
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Back Side */}
            <div>
              <label className="block text-sm font-medium mb-3">Back Side</label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:bg-secondary/30 transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageSelect(e, "back")}
                  className="hidden"
                  id="back-input"
                />
                <label htmlFor="back-input" className="cursor-pointer block">
                  {backPreview ? (
                    <div className="relative">
                      <img
                        src={backPreview}
                        alt="Back preview"
                        className="max-h-40 mx-auto rounded"
                      />
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setBackImage(null);
                          setBackPreview("");
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="py-6">
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm font-medium">
                        Click to upload back side
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG up to 5MB
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Privacy Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs text-blue-800">
                <strong>Privacy:</strong> Your images are encrypted and stored securely. We'll review them within 1-4 hours and never share them with third parties.
              </p>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!frontImage || !backImage || submitVerification.isPending}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                !frontImage || !backImage || submitVerification.isPending
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {submitVerification.isPending ? "Uploading..." : "Submit for Verification"}
            </button>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
