import React from "react";

export function BotanicalLeaf({
  className = "w-6 h-6 text-[#6B8F5B]",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2C7.03 2 3 6.03 3 11C3 16.97 8.03 21 14 21C18.97 21 21 16.97 21 12C21 6.03 16.97 2 12 2ZM13.8 19C9.4 19 5.8 15.4 5.8 11C5.8 8.1 7.4 5.5 9.9 4.3C8.6 6.5 8 9.1 8 12C8 14.2 8.7 16.2 9.9 17.8L13.8 19ZM19 12C19 14.8 17.5 17.3 15.2 18.6C16.3 16.6 17 14.4 17 12C17 7.6 13.4 4 9 4C14.5 4 19 7.6 19 12Z" />
    </svg>
  );
}

export function CurvedBranch({
  className = "w-12 h-6 text-[#A7C089]",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2 20C12 20 18 10 32 8C38 7 42 10 46 14" />
      <path d="M14 16C16 12 20 10 24 11C23 15 20 17 14 16Z" fill="currentColor" fillOpacity="0.2" />
      <path d="M26 10C29 6 34 5 37 7C35 11 31 12 26 10Z" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

export function ArchFrameDecorator({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`absolute inset-0 border-2 border-[#154734]/15 pointer-events-none rounded-t-full rounded-b-[32px] ${className}`}
    />
  );
}

export function FoliageBranch({
  className = "w-16 h-12 text-[#6B8F5B]",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M5 65 C35 55, 60 40, 95 10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeOpacity="0.8"
      />
      {/* Leaf 1 */}
      <path
        d="M25 58 C25 45, 10 40, 5 44 C8 55, 18 60, 25 58 Z"
        fill="currentColor"
        fillOpacity="0.75"
      />
      {/* Leaf 2 */}
      <path
        d="M45 48 C45 32, 60 28, 65 32 C62 45, 52 50, 45 48 Z"
        fill="currentColor"
        fillOpacity="0.85"
      />
      {/* Leaf 3 */}
      <path
        d="M62 38 C58 24, 40 22, 36 28 C42 38, 54 41, 62 38 Z"
        fill="currentColor"
        fillOpacity="0.75"
      />
      {/* Leaf 4 */}
      <path
        d="M80 24 C82 10, 96 8, 98 14 C94 25, 85 27, 80 24 Z"
        fill="currentColor"
        fillOpacity="0.9"
      />
      {/* Tip leaf */}
      <path
        d="M95 10 C92 2, 85 0, 80 2 C82 7, 88 10, 95 10 Z"
        fill="currentColor"
        fillOpacity="0.75"
      />
    </svg>
  );
}

export function DelicateTwig({
  className = "w-10 h-10 text-[#6B8F5B]",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M8 34 C16 28, 24 20, 32 8" />
      <path d="M18 26 C15 22, 12 22, 11 25 C14 27, 16 27, 18 26 Z" fill="currentColor" fillOpacity="0.25" />
      <path d="M23 20 C27 17, 30 18, 29 21 C26 22, 24 21, 23 20 Z" fill="currentColor" fillOpacity="0.25" />
      <path d="M28 13 C26 9, 23 10, 23 12 C25 14, 27 14, 28 13 Z" fill="currentColor" fillOpacity="0.25" />
    </svg>
  );
}

