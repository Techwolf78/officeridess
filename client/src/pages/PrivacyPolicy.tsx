import { Layout } from "@/components/ui/Layout";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <Layout headerTitle="Privacy Policy" showNav={true}>
      <div className="px-4 py-6 pb-24 max-w-2xl mx-auto">
        <Link href="/settings">
          <button className="flex items-center gap-2 text-primary hover:text-primary/80 mb-6 cursor-pointer transition-colors">
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back to Settings</span>
          </button>
        </Link>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/50 space-y-6">
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-3">Privacy Policy</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Last Updated: February 2026
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-foreground mb-3">1. Introduction</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              OFFICERIDES ("we", "us", "our") operates the OFFICERIDES application. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-foreground mb-3">2. Information Collection</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              We collect information you provide directly, including:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Phone number and name</li>
              <li>Email address (optional)</li>
              <li>Gender (optional)</li>
              <li>Home and office addresses</li>
              <li>Vehicle information (for drivers)</li>
              <li>Profile images</li>
              <li>Location data during rides</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-foreground mb-3">3. Use of Personal Data</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Provide and maintain our services</li>
              <li>Notify you about changes to our service</li>
              <li>Enable you to participate in interactive features</li>
              <li>Provide customer support</li>
              <li>Gather analysis or valuable information to improve our service</li>
              <li>Monitor the usage of our service</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-foreground mb-3">4. Security of Data</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The security of your data is important to us, but remember that no method of transmission over the Internet or electronic storage is 100% secure. We strive to use commercially acceptable means to protect your personal data.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-foreground mb-3">5. Changes to This Privacy Policy</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-foreground mb-3">6. Contact Us</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at support@officerides.com
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
