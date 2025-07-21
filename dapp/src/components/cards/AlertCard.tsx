import React from 'react';

interface AlertCardProps {
  message: string;
}

const AlertCard: React.FC<AlertCardProps> = ({ message }) => (
  <div style={{
    background: '#f87171',
    color: 'white',
    borderRadius: 12,
    padding: '20px 24px',
    fontWeight: 600,
    fontSize: 18,
    boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
    margin: '12px 0',
  }}>
    {message}
  </div>
);

export default AlertCard; 