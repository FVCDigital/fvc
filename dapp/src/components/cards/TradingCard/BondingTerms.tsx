import React from 'react';

const BondingTerms: React.FC = () => (
  <div className="bg-sky-500/10 p-4 rounded-xl mt-5 w-full text-sm text-muted-foreground leading-relaxed">
    <div className="font-semibold mb-2 text-foreground">
      Bonding Terms & Conditions
    </div>
    <ul className="list-disc pl-4 space-y-1">
      <li>$FVC is sold at a discount (20% initial, decreasing to 10% over epoch).</li>
      <li>Target valuation: $0.80 - $0.90 per FVC in Round 1.</li>
      <li>Tokens are locked until the bonding round concludes.</li>
      <li>Max 1M FVC per wallet during bonding (0.1% of total supply).</li>
      <li>KYC required for all transactions.</li>
      <li>Discount decreases as epoch progresses (early buyers get better rates).</li>
      <li>See Litepaper for full details.</li>
    </ul>
  </div>
);

export default BondingTerms;
