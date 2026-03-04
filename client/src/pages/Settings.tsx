import { Layout } from "@/components/ui/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { FileText, HelpCircle, Headphones, ChevronRight, MapPin, AlertCircle, Loader2, Edit2 } from "lucide-react";
import { useState, useEffect } from "react";
import { LocationInput } from "@/components/LocationInput";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

export default function Settings() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"preferences" | "info">("preferences");
  const [isEditing, setIsEditing] = useState(false);
  const [homeAddress, setHomeAddress] = useState("");
  const [officeAddress, setOfficeAddress] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Initialize addresses from user data when component mounts or user changes
  useEffect(() => {
    if (user) {
      setHomeAddress(user.homeAddress || "");
      setOfficeAddress(user.officeAddress || "");
    }
  }, [user]);

  const handleEditClick = () => {
    setIsEditing(true);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset to current values
    if (user) {
      setHomeAddress(user.homeAddress || "");
      setOfficeAddress(user.officeAddress || "");
    }
  };

  const handleSaveAddresses = async () => {
    if (!user) return;

    if (!homeAddress.trim() || !officeAddress.trim()) {
      setSaveError("Both home and office addresses are required");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        homeAddress: homeAddress.trim(),
        officeAddress: officeAddress.trim(),
      });

      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving addresses:", err);
      setSaveError("Failed to save addresses. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout headerTitle="Settings" showNav={true}>
      <div className="px-4 py-8 pb-24 max-w-md mx-auto">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 bg-secondary rounded-lg p-1">
          <button
            onClick={() => setActiveTab("preferences")}
            className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${
              activeTab === "preferences"
                ? "bg-white text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Preferences
          </button>
          <button
            onClick={() => setActiveTab("info")}
            className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${
              activeTab === "info"
                ? "bg-white text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Your Info
          </button>
        </div>

        {/* Preferences Tab */}
        {activeTab === "preferences" && (
          <div className="space-y-4">
            <button onClick={() => setLocation("/privacy")} className="block w-full">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-border/50 hover:shadow-md transition-shadow flex items-center gap-4">
                <div className="w-12 h-12 rounded-md bg-primary/5 flex items-center justify-center text-primary flex-shrink-0">
                  <FileText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-foreground truncate">Privacy Policy</p>
                  <p className="text-sm text-muted-foreground truncate mt-1">Learn how we protect your data</p>
                </div>
                <ChevronRight size={18} className="text-muted-foreground" />
              </div>
            </button>

            <button onClick={() => setLocation("/faq")} className="block w-full">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-border/50 hover:shadow-md transition-shadow flex items-center gap-4">
                <div className="w-12 h-12 rounded-md bg-primary/5 flex items-center justify-center text-primary flex-shrink-0">
                  <HelpCircle size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-foreground truncate">FAQ</p>
                  <p className="text-sm text-muted-foreground truncate mt-1">Common questions & answers</p>
                </div>
                <ChevronRight size={18} className="text-muted-foreground" />
              </div>
            </button>

            <button onClick={() => setLocation("/help-support")} className="block w-full">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-border/50 hover:shadow-md transition-shadow flex items-center gap-4">
                <div className="w-12 h-12 rounded-md bg-primary/5 flex items-center justify-center text-primary flex-shrink-0">
                  <Headphones size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-foreground truncate">Help & Support</p>
                  <p className="text-sm text-muted-foreground truncate mt-1">Create a support ticket</p>
                </div>
                <ChevronRight size={18} className="text-muted-foreground" />
              </div>
            </button>

            <p className="text-xs text-muted-foreground mt-4 text-center">Quick access to FAQs, privacy and help.</p>
          </div>
        )}

        {/* Your Info Tab */}
        {activeTab === "info" && (
          <div className="space-y-6">
            {/* Success Message */}
            {saveSuccess && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
                <div className="text-green-600 flex-shrink-0">✓</div>
                <p className="text-sm text-green-800 font-medium">Addresses saved successfully!</p>
              </div>
            )}

            {/* Error Message */}
            {saveError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{saveError}</p>
              </div>
            )}

            {/* View Mode - Display Current Addresses */}
            {!isEditing && (
              <div className="space-y-4">
                {/* Home Address Card */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-border/50">
                  <div className="flex items-start gap-3 mb-3">
                    <MapPin size={18} className="text-primary mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Home Address</p>
                      <p className="text-base text-foreground mt-2 font-medium">
                        {homeAddress || "Not set"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Office Address Card */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-border/50">
                  <div className="flex items-start gap-3 mb-3">
                    <MapPin size={18} className="text-primary mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Office Address</p>
                      <p className="text-base text-foreground mt-2 font-medium">
                        {officeAddress || "Not set"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Edit Button */}
                <button
                  onClick={handleEditClick}
                  className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2"
                >
                  <Edit2 size={18} />
                  Change Addresses
                </button>

                <p className="text-xs text-muted-foreground text-center">
                  Your home and office addresses are used to auto-fill the search
                </p>
              </div>
            )}

            {/* Edit Mode - Edit Addresses */}
            {isEditing && (
              <div className="space-y-4">
                {/* Home Address */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <MapPin size={16} className="text-primary" />
                    Home Address
                  </label>
                  <LocationInput
                    value={homeAddress}
                    onChange={(address) => setHomeAddress(address)}
                    placeholder="Enter your home address"
                    label=""
                  />
                </div>

                {/* Office Address */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <MapPin size={16} className="text-primary" />
                    Office Address
                  </label>
                  <LocationInput
                    value={officeAddress}
                    onChange={(address) => setOfficeAddress(address)}
                    placeholder="Enter your office address"
                    label=""
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSaveAddresses}
                    disabled={isSaving}
                    className="flex-1 py-3.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold shadow-lg shadow-primary/25 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="flex-1 py-3.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl font-semibold transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
