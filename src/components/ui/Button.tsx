"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "whatsapp" | "outline" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  href?: string;
  arrow?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  href,
  arrow = false,
  fullWidth = false,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98]";

  const variantStyles = {
    primary:
      "bg-[#154734] hover:bg-[#0E3828] text-white shadow-sm hover:shadow-md focus:ring-[#154734]",
    whatsapp:
      "bg-[#EBF3E8] hover:bg-[#DCEAD6] text-[#154734] border border-[#C5DDBB] focus:ring-[#6B8F5B]",
    outline:
      "bg-transparent hover:bg-[#F9F7F1] text-[#154734] border border-[#154734] focus:ring-[#154734]",
    secondary:
      "bg-[#F6E8DD] hover:bg-[#EADFCF] text-[#17221D] border border-[#E8E2D6] focus:ring-[#A7C089]",
    ghost:
      "bg-transparent hover:bg-black/5 text-[#17221D] focus:ring-gray-400",
  };

  const sizeStyles = {
    sm: "text-xs px-4 py-2 gap-1.5",
    md: "text-sm md:text-base px-6 py-2.5 gap-2",
    lg: "text-base md:text-lg px-8 py-3.5 gap-2.5",
  };

  const widthStyle = fullWidth ? "w-full" : "w-auto";
  const combinedClasses = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`;

  if (href) {
    if (href.startsWith("http") || href.startsWith("tel:") || href.startsWith("mailto:")) {
      return (
        <a href={href} className={combinedClasses} target="_blank" rel="noopener noreferrer">
          {children}
          {arrow && <ArrowRight className="w-4 h-4 ml-0.5 transition-transform group-hover:translate-x-1" />}
        </a>
      );
    }
    return (
      <Link href={href} className={combinedClasses}>
        {children}
        {arrow && <ArrowRight className="w-4 h-4 ml-0.5 transition-transform group-hover:translate-x-1" />}
      </Link>
    );
  }

  return (
    <button className={combinedClasses} {...props}>
      {children}
      {arrow && <ArrowRight className="w-4 h-4 ml-0.5 transition-transform group-hover:translate-x-1" />}
    </button>
  );
}
