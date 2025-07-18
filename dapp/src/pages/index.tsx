import * as React from "react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">FVC Protocol Home</h1>
      <Link href="/onboarding" className="text-blue-600 underline">Go to Onboarding</Link>
    </div>
  );
} 