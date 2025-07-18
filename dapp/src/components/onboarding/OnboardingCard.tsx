import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface OnboardingCardProps {
  children: React.ReactNode;
  className?: string;
}

export const OnboardingCard: React.FC<OnboardingCardProps> = ({ children, className }) => (
  <Card className={className}>
    <CardContent>{children}</CardContent>
  </Card>
);

export default OnboardingCard; 