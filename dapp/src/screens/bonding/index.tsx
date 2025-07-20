import * as React from "react";
import Link from "next/link";
import { CenteredFlexCol } from '@/components/atomic';
import { TradingCard } from '@/components/cards';

export default function BondingScreen() {
  return (
    <CenteredFlexCol>
        <TradingCard mode="crypto" />
        <button style={{ marginTop: 16 }}>
          <Link href="/home">Back to Home</Link>
        </button>
    </CenteredFlexCol>
  );
} 