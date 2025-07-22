import React, { useState, useEffect } from 'react';
import QRCodeStyling from 'qr-code-styling';

// Polygon ID SDK imports (mocked for now)
// import { PolygonIdSdk } from '@0xpolygonid/js-sdk';

const KYC_PROOF_KEY = 'polygonid-kyc-verified';

type QrModalProps = { onClose?: () => void };

type UsePolygonIdReturn = {
  isVerified: boolean;
  triggerVerification: () => Promise<void>;
  QrModal: React.FC<QrModalProps>;
};

/**
 * Hook for integrating Polygon ID-based KYC verification via QR code.
 * Uses localStorage to persist verification status.
 *
 * @returns {UsePolygonIdReturn} Object containing verification state,
 * trigger function, and a modal component to render the QR code.
 */
const usePolygonId = (): UsePolygonIdReturn => {
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [showQR, setShowQR] = useState(false);
  const [qr, setQr] = useState<InstanceType<typeof QRCodeStyling> | null>(null);

  /**
   * On mount, check localStorage for prior verification flag.
   */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(KYC_PROOF_KEY);
      setIsVerified(stored === 'true');
    }
  }, []);

  /**
   * Triggers KYC verification by displaying QR modal with a placeholder proof request URL.
   */
  const triggerVerification = async () => {
    setShowQR(true);
    const proofRequestUrl = 'https://example.com/polygonid/kyc-proof-request'; // Placeholder
    const qrCode = new QRCodeStyling({
      width: 300,
      height: 300,
      type: 'svg',
      data: proofRequestUrl,
      image: '',
      dotsOptions: { color: '#222', type: 'rounded' },
      backgroundOptions: { color: '#fff' },
    });
    setQr(qrCode);
  };

  /**
   * Modal component rendering the QR code for Polygon ID verification.
   *
   * @param {QrModalProps} props - Optional close handler.
   * @returns {JSX.Element | null}
   */
  const QrModal: React.FC<QrModalProps> = ({ onClose }) => {
    if (!showQR || !qr) return null;
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', color: '#222', fontSize: 16, fontFamily: 'Inter, sans-serif' }}>
          {onClose && (
            <button
              style={{
                alignSelf: 'flex-end',
                background: '#eee',
                color: '#2563eb',
                border: 'none',
                borderRadius: 6,
                padding: '4px 12px',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(56,189,248,0.04)',
                fontFamily: 'Inter, sans-serif',
                marginBottom: 12
              }}
              onClick={onClose}
            >
              Close
            </button>
          )}
          <div id="polygonid-qr-modal" style={{ width: 300, height: 300 }} />
          <div style={{ marginTop: 16, textAlign: 'center', color: '#222', fontSize: 16, fontFamily: 'Inter, sans-serif' }}>Scan with Polygon ID app to verify KYC</div>
          <button
            style={{
              marginTop: 24,
              background: '#2563eb',
              color: '#fff',
              borderRadius: 8,
              padding: '12px 32px',
              fontWeight: 600,
              fontSize: 18,
              cursor: 'pointer',
              border: 'none',
              boxShadow: '0 2px 8px rgba(56,189,248,0.08)',
              fontFamily: 'Inter, sans-serif'
            }}
            onClick={() => {
              setIsVerified(true);
              setShowQR(false);
              if (typeof window !== 'undefined') {
                localStorage.setItem(KYC_PROOF_KEY, 'true');
              }
            }}
          >
            Mark as Verified
          </button>
        </div>
      </div>
    );
  };

  /**
   * Renders QR code into DOM after it is created and modal is visible.
   */
  useEffect(() => {
    if (showQR && qr) {
      const el = document.getElementById('polygonid-qr-modal');
      if (el) {
        el.innerHTML = '';
        qr.append(el);
      }
    }
  }, [showQR, qr]);

  return {
    isVerified,
    triggerVerification,
    QrModal,
  };
};
