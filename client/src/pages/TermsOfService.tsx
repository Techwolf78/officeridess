import { Layout } from "@/components/ui/Layout";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  return (
    <Layout headerTitle="Terms of Service" showNav={true}>
      <div className="px-4 py-6 pb-24 max-w-2xl mx-auto font-sans">
        <Link href="/">
          <button className="flex items-center gap-2 text-primary hover:text-primary/80 mb-6 cursor-pointer transition-colors">
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back</span>
          </button>
        </Link>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/50 space-y-6">
          <div>
            <div className="mb-1">
              <h2 className="text-2xl font-bold text-foreground">Terms of Service</h2>
              <p className="text-xs text-muted-foreground mt-1">Last updated: Feb 22, 2026 • Effective date: Feb 22, 2026</p>
            </div>
            <p className="text-sm text-muted-foreground">These Terms of Service govern your use of OFFICE RIDES ("Service"). By accessing or using OFFICE RIDES, you agree to be bound by these terms. If you do not agree, please do not use the Service.</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">1. Use License</h3>
            <p className="text-sm text-muted-foreground">We grant you a limited, non-exclusive, non-transferable license to use OFFICE RIDES for personal, non-commercial purposes. You may not:</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
              <li>Reverse engineer, decompile, or disassemble the Service.</li>
              <li>Use automated scripts, bots, or scrapers without written permission.</li>
              <li>Impersonate others or provide false information.</li>
              <li>Interfere with or disrupt the Service or its servers.</li>
              <li>Engage in fraud, harassment, abuse, or illegal activity.</li>
              <li>Resell, redistribute, or commercialize the Service.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">2. User Accounts & Responsibilities</h3>
            <p className="text-sm text-muted-foreground">You are responsible for maintaining the confidentiality of your account credentials and all activities under your account. You agree to:</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
              <li>Provide accurate, truthful information during registration.</li>
              <li>Notify us immediately of any unauthorized access.</li>
              <li>Comply with all applicable laws and these Terms.</li>
              <li>Not use the Service for illegal, harmful, or fraudulent purposes.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">3. Ride Matching & Booking</h3>
            <p className="text-sm text-muted-foreground">OFFICE RIDES is a platform for ride-sharing. By booking a ride:</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
              <li>You agree to follow traffic laws and respect the driver/passenger.</li>
              <li>Drivers and passengers are responsible for their own safety and conduct.</li>
              <li>We reserve the right to cancel rides for safety, legal, or policy violations.</li>
              <li>Ride details, including location and timing, are estimates and subject to change.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">4. Payment & Cancellation</h3>
            <p className="text-sm text-muted-foreground">Payment terms:</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
              <li>Fares are calculated based on distance, duration, and demand.</li>
              <li>Payments may be made in cash or through integrated payment providers.</li>
              <li>We do not store or process credit card information directly; third-party providers handle payment security.</li>
              <li>Cancellation policies may apply; see specific booking details for terms.</li>
              <li>Refund requests must be made within 30 days of the ride completion.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">5. Liability Disclaimer</h3>
            <p className="text-sm text-muted-foreground">To the fullest extent permitted by law, OFFICE RIDES and its affiliates are provided "as-is" without warranties of any kind. We disclaim liability for:</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
              <li>Accidents, injuries, or damages during or related to rides.</li>
              <li>Loss or damage to personal property.</li>
              <li>Driver or passenger conduct or negligence.</li>
              <li>Service interruptions, errors, or technical failures.</li>
              <li>Third-party payment processor failures or fraud.</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">OFFICE RIDES is not responsible for the actions of drivers or passengers. Use the Service at your own risk.</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">6. Safety & Conduct</h3>
            <p className="text-sm text-muted-foreground">All users must:</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
              <li>Treat others with respect and courtesy.</li>
              <li>Not engage in harassment, discrimination, or violence.</li>
              <li>Follow traffic and safety laws.</li>
              <li>Keep the vehicle clean and in good condition.</li>
              <li>Not consume alcohol, use drugs, or smoke during rides (unless explicitly permitted).</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">Violations may result in warnings, account suspension, or permanent termination.</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">7. Ratings & Reviews</h3>
            <p className="text-sm text-muted-foreground">Users may rate and review rides. We reserve the right to remove reviews that are false, defamatory, or abusive. Reviews should be based on actual experiences and factual information.</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">8. Intellectual Property</h3>
            <p className="text-sm text-muted-foreground">All content in OFFICE RIDES, including logos, text, graphics, and code, is owned by OFFICE RIDES or its licensors. You may not copy, distribute, or use this content without written permission.</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">9. Termination</h3>
            <p className="text-sm text-muted-foreground">We may suspend or terminate your account at any time for violating these Terms, illegal activity, or other valid reasons. Upon termination, your access to the Service ceases immediately.</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">10. Indemnification</h3>
            <p className="text-sm text-muted-foreground">You agree to defend, indemnify, and hold harmless OFFICE RIDES, its officers, and agents from any claims, losses, damages, or liabilities arising from your use of the Service, violation of these Terms, or infringement of third-party rights.</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">11. Dispute Resolution</h3>
            <p className="text-sm text-muted-foreground">Disputes shall be resolved through negotiation or arbitration. Claims must be filed within one year of the incident. Class actions are waived to the fullest extent permitted by law.</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">12. Limitation of Liability</h3>
            <p className="text-sm text-muted-foreground">Our liability is limited to the amount paid by you in the past 12 months. In no event shall we be liable for indirect, incidental, or consequential damages.</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">13. Modifications to Terms</h3>
            <p className="text-sm text-muted-foreground">We may update these Terms at any time. Changes become effective upon posting. Your continued use constitutes acceptance of modified Terms. For major changes, we will provide notice.</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">14. Governing Law</h3>
            <p className="text-sm text-muted-foreground">These Terms are governed by the laws of India and subject to its jurisdiction. Any legal action shall be brought exclusively in Indian courts.</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">15. Contact Us</h3>
            <p className="text-sm text-muted-foreground">For questions or concerns regarding these Terms, contact us at <span className="text-primary font-medium">support@officerides.com</span>.</p>
          </div>

          <div className="border-t border-border/50 pt-6">
            <p className="text-xs text-muted-foreground">These Terms of Service are informational and not legal advice. Consult qualified legal counsel to ensure enforceability in your jurisdiction.</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
