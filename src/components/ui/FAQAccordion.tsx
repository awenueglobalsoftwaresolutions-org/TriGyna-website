"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FAQItemProps {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItemProps[];
  className?: string;
  defaultOpenIndex?: number;
}

export default function FAQAccordion({
  items,
  className = "",
  defaultOpenIndex = 0,
}: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(defaultOpenIndex);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className={`space-y-3.5 ${className}`}>
      {items.map((item, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div
            key={idx}
            className={`border rounded-2xl transition-all duration-300 overflow-hidden ${
              isOpen
                ? "bg-white border-[#154734]/30 shadow-sm"
                : "bg-white/70 border-[#E8E2D6] hover:border-[#A7C089]"
            }`}
          >
            <button
              type="button"
              onClick={() => toggle(idx)}
              aria-expanded={isOpen}
              className="w-full py-4 px-5 sm:px-6 flex items-center justify-between gap-4 text-left font-serif text-base sm:text-lg text-[#154734] font-medium transition-colors"
            >
              <span>{item.question}</span>
              <div
                className={`p-1 rounded-full transition-transform duration-300 flex-shrink-0 ${
                  isOpen ? "rotate-180 bg-[#154734] text-white" : "bg-[#F9F7F1] text-[#154734]"
                }`}
              >
                <ChevronDown className="w-4 h-4" />
              </div>
            </button>

            <div
              className={`transition-all duration-300 ease-in-out px-5 sm:px-6 overflow-hidden ${
                isOpen ? "max-h-96 pb-5 opacity-100" : "max-h-0 pb-0 opacity-0"
              }`}
            >
              <p className="text-sm sm:text-base text-[#626B63] leading-relaxed border-t border-[#E8E2D6]/40 pt-3">
                {item.answer}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
