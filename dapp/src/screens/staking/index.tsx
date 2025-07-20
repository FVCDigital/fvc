import * as React from "react";
import Link from "next/link";
import { CenteredFlexCol } from '@/components/atomic/CenteredFlexCol';
import Card from '@/components/cards/BaseCard';

export default function StakingScreen() {
  return (
    <CenteredFlexCol>
        <Card
          title="Staking"
          description="Staking functionality coming soon."
        />
        <button style={{ marginTop: 16 }}>
          <Link href="/home">Back to Home</Link>
        </button>
    </CenteredFlexCol>
  );
} 