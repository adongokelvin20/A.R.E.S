"use client";

import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Check } from "lucide-react";

interface OnboardingGuideProps {
  open: boolean;
  onClose: () => void;
}

const SLIDES = [
  {
    title: "Welcome to ChattBiz 👋",
    subtitle: "Your digital employee is ready",
    description: "ChattBiz is an AI agent that chats with your customers, takes orders, verifies payments, and runs your store — 24/7. Let's show you how it works.",
    color: "from-ares-sea to-ares-navy",
    icon: "🚀",
  },
  {
    title: "Add Your Products 📦",
    subtitle: "Upload up to 3 images per product",
    description: "Go to the Products tab and click 'Add product'. Upload up to 3 images, set the price, and our AI will automatically analyze each image to recognize the product when customers describe it.",
    color: "from-emerald-500 to-ares-sea",
    icon: "📦",
  },
  {
    title: "Share Your Store Link 🔗",
    subtitle: "Your store is live instantly",
    description: "Every business gets a store link like chattbiz.com/store/your-business. Share it on WhatsApp, Instagram, Facebook, or your website. Customers can browse products and chat with your AI agent directly.",
    color: "from-blue-500 to-indigo-600",
    icon: "🔗",
  },
  {
    title: "AI Agent Takes Orders 💬",
    subtitle: "Humanlike conversations, 24/7",
    description: "When a customer visits your store, they can chat with your AI agent. The agent greets them by name, recommends products, asks about pickup or delivery, and logs the order — all automatically. It even negotiates prices!",
    color: "from-violet-500 to-purple-600",
    icon: "💬",
  },
  {
    title: "Payments Verified Automatically 💰",
    subtitle: "Upload a screenshot, get verified",
    description: "When a customer pays via MoMo, they upload a payment screenshot. Our AI reads it — checks the amount, recipient name, order code, and date — and verifies the payment automatically. You can review all screenshots in the Payments tab.",
    color: "from-amber-500 to-orange-600",
    icon: "💰",
  },
  {
    title: "Voice Notes Too 🎤",
    subtitle: "Customers can speak, not just type",
    description: "Customers can tap the microphone button in the chat to send voice notes. Our AI transcribes their speech and responds — perfect for customers who prefer talking over typing.",
    color: "from-pink-500 to-rose-600",
    icon: "🎤",
  },
  {
    title: "Track Everything in Your Dashboard 📊",
    subtitle: "Orders, revenue, customers, archives",
    description: "Your dashboard shows today's revenue, pending orders, top products, and weekly archives. Every Monday, the previous week's data is archived and the dashboard resets for a fresh week. You'll never lose track of your business.",
    color: "from-cyan-500 to-blue-600",
    icon: "📊",
  },
  {
    title: "You're All Set! 🎉",
    subtitle: "Start selling with ChattBiz",
    description: "Add your first product, share your store link, and let ChattBiz handle the rest. If you need help, just ask your AI assistant in the 'Ask my AI' tab. Welcome to the future of business — built by Kelvin Ayinbisa & Jesse.",
    color: "from-ares-sea to-ares-navy",
    icon: "🎉",
  },
];

export function OnboardingGuide({ open, onClose }: OnboardingGuideProps) {
  const [current, setCurrent] = useState(0);

  // Reset to first slide when opened
  useEffect(() => {
    if (open) setCurrent(0);
  }, [open]);

  // Handle swipe gestures
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }

  function onTouchMove(e: React.TouchEvent) {
    setTouchEnd(e.targetTouches[0].clientX);
  }

  function onTouchEnd() {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;
    if (distance > minSwipeDistance) {
      // Swiped left → next
      if (current < SLIDES.length - 1) setCurrent(current + 1);
    } else if (distance < -minSwipeDistance) {
      // Swiped right → previous
      if (current > 0) setCurrent(current - 1);
    }
  }

  if (!open) return null;

  const slide = SLIDES[current];
  const isLast = current === SLIDES.length - 1;

  function next() {
    if (current < SLIDES.length - 1) setCurrent(current + 1);
    else onClose();
  }

  function prev() {
    if (current > 0) setCurrent(current - 1);
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Slide content */}
        <div
          className={`bg-gradient-to-br ${slide.color} p-8 text-white`}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
            <div className="mb-4 text-6xl">{slide.icon}</div>
            <h2 className="text-2xl font-bold">{slide.title}</h2>
            <p className="mt-1 text-sm font-medium text-white/80">{slide.subtitle}</p>
            <p className="mt-4 text-sm leading-relaxed text-white/90">{slide.description}</p>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 py-3">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === current ? "w-6 bg-ares-navy" : "w-1.5 bg-ares-line"
              }`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between gap-3 p-4 pt-0">
          {current > 0 ? (
            <button
              onClick={prev}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-ares-navy hover:bg-ares-mist"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            {!isLast && (
              <button
                onClick={onClose}
                className="rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-ares-mist"
              >
                Skip
              </button>
            )}
            <button
              onClick={next}
              className="flex items-center gap-1 rounded-lg bg-ares-navy px-4 py-2 text-xs font-semibold text-white hover:bg-ares-sea-deep"
            >
              {isLast ? (
                <>
                  <Check className="h-4 w-4" /> Got it!
                </>
              ) : (
                <>
                  Next <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Swipe hint (only on first slide) */}
        {current === 0 && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 animate-pulse text-[10px] text-ares-navy/60">
            ← swipe to navigate →
          </div>
        )}
      </div>
    </div>
  );
}
