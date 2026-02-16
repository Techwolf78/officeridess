import { Layout } from "@/components/ui/Layout";
import { Link } from "wouter";
import { FileText, HelpCircle, Headphones } from "lucide-react";

export default function Settings() {
  return (
    <Layout headerTitle="Settings" showNav={true}>
      <div className="px-4 py-8 pb-24 max-w-md mx-auto">
        <div className="space-y-4">
          {/* Privacy Policy */}
          <Link href="/privacy">
            <button className="w-full bg-white rounded-2xl p-6 shadow-sm border border-border/50 hover:shadow-md transition-shadow cursor-pointer text-left">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText size={24} className="text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground mb-1">Privacy Policy</h3>
                  <p className="text-sm text-muted-foreground">Learn how we protect your data</p>
                </div>
                <div className="text-muted-foreground">→</div>
              </div>
            </button>
          </Link>

          {/* FAQ */}
          <Link href="/faq">
            <button className="w-full bg-white rounded-2xl p-6 shadow-sm border border-border/50 hover:shadow-md transition-shadow cursor-pointer text-left">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <HelpCircle size={24} className="text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground mb-1">FAQ</h3>
                  <p className="text-sm text-muted-foreground">Common questions & answers</p>
                </div>
                <div className="text-muted-foreground">→</div>
              </div>
            </button>
          </Link>

          {/* Help & Support */}
          <Link href="/help-support">
            <button className="w-full bg-white rounded-2xl p-6 shadow-sm border border-border/50 hover:shadow-md transition-shadow cursor-pointer text-left">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Headphones size={24} className="text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground mb-1">Help & Support</h3>
                  <p className="text-sm text-muted-foreground">Create a support ticket</p>
                </div>
                <div className="text-muted-foreground">→</div>
              </div>
            </button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
