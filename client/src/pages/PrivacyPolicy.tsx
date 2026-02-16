import { Layout } from "@/components/ui/Layout";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <Layout headerTitle="Privacy Policy" showNav={true}>
      <div className="px-4 py-6 pb-24 max-w-2xl mx-auto font-sans">
        <Link href="/settings">
          <button className="flex items-center gap-2 text-primary hover:text-primary/80 mb-6 cursor-pointer transition-colors">
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back to Settings</span>
          </button>
        </Link>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/50 space-y-6">
          <div>
            <div className="mb-1">
              <h2 className="text-2xl font-bold text-foreground">Privacy Policy</h2>
              <p className="text-xs text-muted-foreground mt-1">Last updated: Feb 16, 2026 • Effective date: Feb 16, 2026</p>
            </div>
            <p className="text-sm text-muted-foreground">OFFICERIDES ("we", "us", "our") provides ride-matching services. This Privacy Policy explains what personal data we collect, why we collect it, how we use and share it, how long we retain it, and your rights.</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Quick summary</h3>
            <p className="text-sm text-muted-foreground">We collect only the data necessary to operate the app (account, booking and routing data). <strong>We do not collect or store payment card numbers or full payment credentials.</strong> Payments are handled in cash or by third-party payment providers and any card data is processed directly by those providers. We do not sell personal data. To request access, correction, deletion or export of your data, contact <span className="text-primary font-medium">support@officerides.com</span>.</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">1. Categories of personal data we collect</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li><strong>Account & profile:</strong> name, phone number, email, profile photo.</li>
              <li><strong>Ride & booking data:</strong> pickup/drop-off locations, timestamps, route, driver/passenger associations, seats booked, fare and receipts.</li>
              <li><strong>Payment & billing metadata:</strong> fare amount and non-sensitive receipt/reference identifiers (we do not collect or store card numbers or full payment credentials).</li>
              <li><strong>Device & diagnostics:</strong> device type, crash logs, and app usage for troubleshooting.</li>
              <li><strong>Location:</strong> live location while a ride is active (used for routing and safety).</li>
              <li><strong>Support & communications:</strong> chat messages, emails and support tickets.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">2. Why we collect data (primary purposes)</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Provide, maintain and operate ride-matching and navigation features.</li>
              <li>Facilitate booking records, invoicing, and refunds when applicable — actual card processing is handled by third-party providers or by cash outside the app.</li>
              <li>Communicate important trip updates and support messages.</li>
              <li>Detect and prevent fraud, abuse or policy violations.</li>
              <li>Improve product quality via analytics and aggregated metrics.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">3. Legal basis & retention</h3>
            <p className="text-sm text-muted-foreground">We retain personal data to the extent necessary to provide services, meet legal obligations, resolve disputes and enforce our agreements. Specific retention examples:</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Booking & transaction records (fare amounts and receipt references): retained for business, tax and legal compliance. We do not retain full payment card details.</li>
              <li>Location traces: retained short-term for routing, safety and dispute resolution.</li>
              <li>Support tickets and records: retained for customer service history and compliance.</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">If you need data erased or exported, contact us (we may retain limited data where required by law).</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">4. Sharing & third parties</h3>
            <p className="text-sm text-muted-foreground">We share data only with trusted partners and as required by law. Typical recipients include:</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Payment processors (only if you choose to pay via an integrated provider); card details are handled directly by that provider and are not stored by OFFICERIDES.</li>
              <li>Cloud and analytics providers for hosting and performance monitoring.</li>
              <li>Law enforcement or courts when legally required.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">5. Security measures</h3>
            <p className="text-sm text-muted-foreground">We implement technical and organizational safeguards such as encryption in transit, access controls and regular security reviews. However, no system is fully secure — report incidents to <span className="text-primary font-medium">support@officerides.com</span>.</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">6. Your rights & choices</h3>
            <p className="text-sm text-muted-foreground">You may request access, correction, deletion, export or restriction of your personal data. To exercise rights, contact <span className="text-primary font-medium">support@officerides.com</span>. We will verify requests to protect privacy.</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">7. Cookies & analytics</h3>
            <p className="text-sm text-muted-foreground">We use cookies and similar technologies for authentication, preferences and analytics. You can manage cookies via browser/device settings.</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">8. International transfers</h3>
            <p className="text-sm text-muted-foreground">Your data may be transferred to service providers in other countries. We apply safeguards to protect such transfers.</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">9. Children</h3>
            <p className="text-sm text-muted-foreground">Our services are not intended for children under 16. If you believe we collected data from a child, contact us for removal.</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">10. Complaints & legal</h3>
            <p className="text-sm text-muted-foreground">If you have a privacy complaint, contact <span className="text-primary font-medium">support@officerides.com</span>. For unresolved issues you may contact the appropriate data protection authority in your jurisdiction.</p>
            <p className="text-xs text-muted-foreground mt-2">This policy is informational and not legal advice — consult qualified counsel to ensure enforceability in your jurisdiction.</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
