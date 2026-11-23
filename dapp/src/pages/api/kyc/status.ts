import type { NextApiRequest, NextApiResponse } from 'next';
import { getOndatoService } from '../../../services/ondatoService';

interface KycStatusResponse {
  verificationId: string;
  status: string;
  identificationId?: string;
  identificationStatus?: string;
  document?: {
    fullName: string;
    dateOfBirth: string;
    nationality: string;
    documentType: string;
    verified: boolean;
  };
}

interface ErrorResponse {
  error: string;
}

/**
 * API Route: GET /api/kyc/status?verificationId=xxx
 * Retrieves KYC verification status
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<KycStatusResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { verificationId } = req.query;

    if (!verificationId || typeof verificationId !== 'string') {
      return res.status(400).json({ error: 'Missing verificationId parameter' });
    }

    const ondatoService = getOndatoService();

    // Retrieve verification status
    const verification = await ondatoService.getIdentityVerification(verificationId);

    const response: KycStatusResponse = {
      verificationId: verification.id,
      status: verification.status,
    };

    // If KYC identification completed, fetch detailed data
    if (verification.step?.kycIdentification?.id) {
      const identification = await ondatoService.getIdentification(
        verification.step.kycIdentification.id
      );

      response.identificationId = identification.id;
      response.identificationStatus = identification.status;

      if (identification.document) {
        response.document = {
          fullName: identification.document.fullName,
          dateOfBirth: identification.document.dateOfBirth,
          nationality: identification.document.nationalityIso3,
          documentType: identification.document.type,
          verified: identification.document.mrzVerified,
        };
      }
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error('KYC status check error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to check KYC status',
    });
  }
}
