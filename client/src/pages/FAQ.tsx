import { Layout } from "@/components/ui/Layout";
import { Link } from "wouter";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { useState } from "react";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    id: "1",
    question: "How do I book a ride?",
    answer: "Go to the Home page, click on 'Find a Ride', select your pickup and dropoff locations, choose your date and time, and browse available rides. Click on a ride to view details and confirm your booking."
  },
  {
    id: "2",
    question: "How do I post a ride as a driver?",
    answer: "Switch your role to 'Driver' in Settings, add your vehicle details in your Profile, then go to 'Post Ride'. Fill in your starting point, destination, departure time, and price per seat. Your ride will appear for passengers to book."
  },
  {
    id: "3",
    question: "Can I cancel my booking?",
    answer: "Yes, you can cancel a booking by going to 'My Bookings' and clicking the cancel button on the ride. Note that cancellations close to departure may have penalties."
  },
  {
    id: "4",
    question: "How do I communicate with my ride partner?",
    answer: "Once a booking is confirmed, you can message the driver or passenger through the in-app chat feature. This allows you to discuss pickup details and coordinate."
  },
  {
    id: "5",
    question: "What documents do drivers need to verify?",
    answer: "Drivers need to provide a valid driver's license and vehicle registration. These are verified through our partner verification system for safety and security."
  },
  {
    id: "6",
    question: "Is my payment information secure?",
    answer: "Yes, we use industry-standard encryption and secure payment gateways. Your payment information is never stored on our servers."
  },
  {
    id: "7",
    question: "How are drivers and passengers rated?",
    answer: "After each completed ride, both parties can rate each other from 1-5 stars and leave comments. Ratings help build trust in the community."
  },
  {
    id: "8",
    question: "What should I do if there's an issue with a ride?",
    answer: "Report the issue through the app's support feature. Go to Settings > Help & Support and describe the problem. Our team will investigate and assist you."
  },
  {
    id: "9",
    question: "Can I choose my route preferences?",
    answer: "Yes, when posting or booking rides, you can view and select from multiple route options with different distances, times, and toll information."
  },
  {
    id: "10",
    question: "What if I'm running late to my pickup?",
    answer: "Use the chat feature to notify your driver immediately. Most drivers are understanding about minor delays, but notifying them helps prevent cancellations."
  }
];

export default function FAQ() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <Layout headerTitle="FAQ" showNav={true}>
      <div className="px-4 py-6 pb-24 max-w-2xl mx-auto">
        <Link href="/settings">
          <button className="flex items-center gap-2 text-primary hover:text-primary/80 mb-6 cursor-pointer transition-colors">
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back to Settings</span>
          </button>
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-border/50 overflow-hidden divide-y divide-border/50">
          {faqs.map((item) => (
            <div key={item.id}>
              <button
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.question}</p>
                </div>
                <ChevronDown
                  size={18}
                  className={`text-muted-foreground flex-shrink-0 transition-transform ${expandedId === item.id ? 'rotate-180' : ''}`}
                />
              </button>

              {expandedId === item.id && (
                <div className="px-4 py-2 bg-secondary/10 text-xs text-muted-foreground">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
