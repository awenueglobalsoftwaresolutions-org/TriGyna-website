"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import {
  FacebookIcon,
  InstagramIcon,
  YouTubeIcon,
  LinkedInIcon,
} from "@/components/ui/BrandIcons";
import { siteConfig } from "@/data/siteData";

const emptySubscribe = () => () => {};

export default function Footer() {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const isMounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newsletterEmail)) {
      return;
    }
    setSubscribed(true);
  };

  return (
    <footer className="bg-[#0E3828] text-white pt-16 pb-8 border-t border-[#154734]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-14 border-b border-[#154734]/80">
          {/* Brand Col */}
          <div className="lg:col-span-4 space-y-4">
            <Link href="/" className="inline-block">
              {/* White inverted logo presentation */}
              <div className="relative h-14 w-52 brightness-0 invert">
                <Image
                  src="/images/brand/logo.png"
                  alt="TriGyna — Women | Health | Wellness"
                  fill
                  sizes="208px"
                  className="object-contain object-left"
                />
              </div>
            </Link>
            <p className="text-sm text-[#EADFCF]/80 leading-relaxed max-w-sm pt-2">
              Comprehensive healthcare consultation and holistic solutions for a healthier, happier life for men and women.
            </p>
            <div className="pt-2 text-xs text-[#A7C089] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              <span>Accepting Online Video &amp; Prayagraj In-Clinic Consultations</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-2">
            <h4 className="font-serif text-lg text-white font-medium mb-4">Quick Links</h4>
            <ul className="space-y-2.5 text-sm text-[#EADFCF]/80">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-white transition-colors">
                  Services
                </Link>
              </li>
              <li>
                <Link href="/doctor" className="hover:text-white transition-colors">
                  Doctor
                </Link>
              </li>
              <li>
                <Link href="/health-tips" className="hover:text-white transition-colors">
                  Health Tips
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Our Services */}
          <div className="lg:col-span-3">
            <h4 className="font-serif text-lg text-white font-medium mb-4">Our Services</h4>
            <ul className="space-y-2.5 text-sm text-[#EADFCF]/80">
              <li>
                <Link href="/services/skin-hair" className="hover:text-white transition-colors">
                  Skin &amp; Hair
                </Link>
              </li>
              <li>
                <Link href="/services/homoeopathy" className="hover:text-white transition-colors">
                  Homoeopathy
                </Link>
              </li>
              <li>
                <Link href="/services/diet-nutrition" className="hover:text-white transition-colors">
                  Diet &amp; Nutrition
                </Link>
              </li>
              <li>
                <Link href="/services/pcod-pcos" className="hover:text-white transition-colors">
                  PCOD/PCOS Management
                </Link>
              </li>
              <li>
                <Link href="/services/general-medicine" className="hover:text-white transition-colors">
                  General Medicine
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Us & Stay Updated */}
          <div className="lg:col-span-3 space-y-6">
            <div>
              <h4 className="font-serif text-lg text-white font-medium mb-4">Contact Us</h4>
              <ul className="space-y-3 text-sm text-[#EADFCF]/80">
                <li className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-[#A7C089] flex-shrink-0" />
                  <a href={`tel:${siteConfig.phone.replace(/[^0-9+]/g, "")}`} className="hover:text-white">
                    {siteConfig.phone}
                  </a>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[#A7C089] flex-shrink-0" />
                  <a href={`mailto:${siteConfig.email}`} className="hover:text-white">
                    {siteConfig.email}
                  </a>
                </li>
                <li className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#A7C089] flex-shrink-0 mt-0.5" />
                  <span>{siteConfig.location}</span>
                </li>
              </ul>

              {/* Social icons using clean SVGs */}
              <div className="flex items-center gap-3 pt-4">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-[#154734] hover:bg-[#A7C089] hover:text-[#0E3828] text-white flex items-center justify-center transition-all"
                  aria-label="Facebook"
                >
                  <FacebookIcon className="w-4 h-4 fill-current" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-[#154734] hover:bg-[#A7C089] hover:text-[#0E3828] text-white flex items-center justify-center transition-all"
                  aria-label="Instagram"
                >
                  <InstagramIcon className="w-4 h-4 fill-current" />
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-[#154734] hover:bg-[#A7C089] hover:text-[#0E3828] text-white flex items-center justify-center transition-all"
                  aria-label="YouTube"
                >
                  <YouTubeIcon className="w-4 h-4 fill-current" />
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-[#154734] hover:bg-[#A7C089] hover:text-[#0E3828] text-white flex items-center justify-center transition-all"
                  aria-label="LinkedIn"
                >
                  <LinkedInIcon className="w-4 h-4 fill-current" />
                </a>
              </div>
            </div>

            {/* Newsletter */}
            <div className="pt-2">
              <h5 className="text-xs uppercase font-semibold text-[#A7C089] tracking-wider mb-2">
                Stay Updated
              </h5>
              <p className="text-xs text-[#EADFCF]/70 mb-3">
                Get the latest evidence-based health tips and wellness updates.
              </p>
              {subscribed ? (
                <div className="flex items-center gap-2 text-xs text-[#A7C089] bg-[#154734]/80 p-2.5 rounded-xl border border-[#A7C089]/30">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Subscribed successfully! Thank you.</span>
                </div>
              ) : !isMounted ? (
                <div className="flex items-center">
                  <input
                    type="text"
                    readOnly
                    placeholder="Enter your email"
                    className="w-full px-3.5 py-2 rounded-l-full bg-white text-sm text-[#17221D] placeholder-gray-400 focus:outline-none pointer-events-none"
                  />
                  <button
                    type="button"
                    aria-label="Subscribe"
                    className="px-4 py-2 bg-[#154734] text-white rounded-r-full flex items-center justify-center border-l border-white/20"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex items-center" suppressHydrationWarning>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Enter your email"
                    suppressHydrationWarning
                    className="w-full px-3.5 py-2 rounded-l-full bg-white text-sm text-[#17221D] placeholder-gray-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    aria-label="Subscribe"
                    className="px-4 py-2 bg-[#154734] hover:bg-[#A7C089] hover:text-[#0E3828] text-white rounded-r-full transition-all flex items-center justify-center border-l border-white/20"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#EADFCF]/60">
          <p>© 2026 TriGyna. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy-policy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <span>|</span>
            <Link href="/terms-and-conditions" className="hover:text-white transition-colors">
              Terms &amp; Conditions
            </Link>
            <span>|</span>
            <Link href="/refund-policy" className="hover:text-white transition-colors">
              Refund Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
