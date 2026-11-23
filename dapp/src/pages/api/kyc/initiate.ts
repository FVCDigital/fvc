import type { NextApiRequest, NextApiResponse } from 'next';
import { getOndatoService } from '../../../services/ondatoService';

interface InitiateKycRequest {
  walletAddress: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string; // YYYY-MM-DD
  phoneNumber?: string;
  countryCode?: string;
}

interface InitiateKycResponse {
  verificationId: string;
  verificationUrl: string;
}

interface ErrorResponse {
  error: string;
}

/**
 * API Route: POST /api/kyc/initiate
 * Creates Ondato Identity Verification session and returns URL
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<InitiateKycResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data: InitiateKycRequest = req.body;

    // Validate required fields
    if (!data.walletAddress || !data.email || !data.firstName || !data.lastName || !data.dateOfBirth) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const ondatoService = getOndatoService();

    // Create identity verification
    const verification = await ondatoService.createIdentityVerification({
      externalReferenceId: data.walletAddress,
      registration: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName,
        dateOfBirth: data.dateOfBirth,
        phoneNumber: data.phoneNumber ? parseInt(data.phoneNumber) : undefined,
        countryCode: data.countryCode,
      },
      setupId: process.env.ONDATO_SETUP_ID || '',
    });

    // Generate verification URL
    const verificationUrl = ondatoService.generateVerificationUrl(
      verification.id,
      process.env.ONDATO_WHITELABEL_DOMAIN
    );

    // TODO: Store verification ID mapped to wallet address in database
    // await db.kycVerifications.create({
    //   walletAddress: data.walletAddress,
    //   verificationId: verification.id,
    //   status: 'pending',
    //   createdAt: new Date(),
    // });

    return res.status(200).json({
      verificationId: verification.id,
      verificationUrl,
    });
  } catch (error) {
    console.error('KYC initiation error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to initiate KYC',
    });
  }
}
