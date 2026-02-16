import { Layout } from "@/components/ui/Layout";
import { Link } from "wouter";
import { FileText, HelpCircle, Headphones, ChevronRight } from "lucide-react";

export default function Settings() {
  return (
    <Layout headerTitle="Settings" showNav={true}>
      <div className="px-4 py-8 pb-24 max-w-md mx-auto font-sans">
        <div className="space-y-4">
          <Link href="/privacy" className="block">
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
          </Link>

          <Link href="/faq" className="block">
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
          </Link>

          <Link href="/help-support" className="block">
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
          </Link>
        </div>

        <p className="text-xs text-muted-foreground mt-4 text-center">Quick access to FAQs, privacy and help.</p>
      </div>
    </Layout>
  );
}
