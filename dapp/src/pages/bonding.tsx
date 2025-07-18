import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function BondingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md">
        <Card>
          <CardContent className="flex flex-col items-center p-8 space-y-6">
            <h1 className="text-2xl font-bold">Bonding</h1>
            <p className="text-center">Bonding functionality coming soon.</p>
            <Button asChild variant="outline" size="lg">
              <Link href="/welcome">Back to Welcome</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 