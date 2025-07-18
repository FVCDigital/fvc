import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function WelcomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md">
        <Card>
          <CardContent className="flex flex-col items-center p-8 space-y-6">
            <h1 className="text-2xl font-bold">Welcome to FVC Protocol!</h1>
            <p className="text-center">You have completed onboarding. Choose where to go next:</p>
            <div className="flex gap-4 w-full">
              <Button asChild className="w-1/2" variant="default" size="lg">
                <Link href="/bonding">Bonding</Link>
              </Button>
              <Button asChild className="w-1/2" variant="secondary" size="lg">
                <Link href="/staking">Staking</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 