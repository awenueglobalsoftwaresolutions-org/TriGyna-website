import React from "react";
import { BotanicalLeaf } from "./BotanicalFlourish";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center" | "right";
  leaf?: boolean;
  className?: string;
  theme?: "light" | "dark";
}

export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  leaf = true,
  className = "",
  theme = "light",
}: SectionHeadingProps) {
  const alignClass = {
    left: "text-left items-start",
    center: "text-center items-center",
    right: "text-right items-end",
  }[align];

  const eyebrowColor = theme === "dark" ? "text-[#A7C089]" : "text-[#154734]";
  const titleColor = theme === "dark" ? "text-white" : "text-[#154734]";
  const subtitleColor = theme === "dark" ? "text-[#EADFCF]" : "text-[#626B63]";

  return (
    <div className={`flex flex-col ${alignClass} ${className} max-w-3xl ${align === "center" ? "mx-auto" : ""}`}>
      {eyebrow && (
        <div className="flex items-center gap-1.5 mb-2.5">
          {leaf && align === "center" && (
            <BotanicalLeaf className="w-3.5 h-3.5 text-[#6B8F5B] opacity-80" />
          )}
          <span
            className={`text-xs md:text-sm font-semibold tracking-[0.2em] uppercase ${eyebrowColor}`}
          >
            {eyebrow}
          </span>
          {leaf && (
            <BotanicalLeaf className="w-3.5 h-3.5 text-[#6B8F5B] opacity-80" />
          )}
        </div>
      )}

      <h2
        className={`font-serif text-3xl sm:text-4xl md:text-[42px] leading-tight font-medium ${titleColor}`}
      >
        {title}
      </h2>

      {subtitle && (
        <p className={`mt-3.5 text-base sm:text-lg leading-relaxed ${subtitleColor}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
