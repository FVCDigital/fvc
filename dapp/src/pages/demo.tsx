import React from 'react';
import Head from 'next/head';
import PortfolioCard from '@/components/cards/PortfolioCard';

const DemoPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>FVC Portfolio demo</title>
      </Head>
      <PortfolioCard presentation />
    </>
  );
};

export default DemoPage;
