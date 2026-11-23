import type { NextApiRequest, NextApiResponse } from 'next';
import { getOndatoService } from '../../../services/ondatoService';

/**
 * API Route: POST /api/kyc/webhook
 * Receives webhooks from Ondato for KYC status updates
 * 
 * Configure in Ondato dashboard:
 * - URL: https://yourdomain.com/api/kyc/webhook
 * - Events: identification.*, identity_verification.*
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const signature = req.headers['x-ondato-signature'] as string;
    const payload = JSON.stringify(req.body);

    // Verify webhook signature
    const ondatoService = getOndatoService();
    if (signature && !ondatoService.verifyWebhookSignature(payload, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const webhook = req.body;

    console.log('Ondato webhook received:', {
      eventType: webhook.eventType,
      resourceId: webhook.resourceId,
      timestamp: webhook.timestamp,
    });

    // Process webhook based on event type
    switch (webhook.eventType) {
      case 'identity_verification.completed':
        await handleVerificationCompleted(webhook);
        break;

      case 'identity_verification.failed':
        await handleVerificationFailed(webhook);
        break;

      case 'identification.approved':
        await handleIdentificationApproved(webhook);
        break;

      case 'identification.declined':
        await handleIdentificationDeclined(webhook);
        break;

      case 'identification.suspected':
        await handleIdentificationSuspected(webhook);
        break;

      default:
        console.log('Unhandled webhook event:', webhook.eventType);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function handleVerificationCompleted(webhook: any) {
  const { resourceId, payload } = webhook;

  // TODO: Update database with verification completion
  // const verificationId = resourceId;
  // await db.kycVerifications.update({
  //   where: { verificationId },
  //   data: {
  //     status: 'completed',
  //     completedAt: new Date(),
  //     identificationId: payload.step?.kycIdentification?.id,
  //   },
  // });

  console.log('Verification completed:', resourceId);
}

async function handleVerificationFailed(webhook: any) {
  const { resourceId, payload } = webhook;

  // TODO: Update database
  // await db.kycVerifications.update({
  //   where: { verificationId: resourceId },
  //   data: {
  //     status: 'failed',
  //     failureReason: payload.statusReason,
  //   },
  // });

  console.log('Verification failed:', resourceId);
}

async function handleIdentificationApproved(webhook: any) {
  const { resourceId, payload } = webhook;

  // TODO: Update database and grant access
  // const identification = payload;
  // await db.kycVerifications.update({
  //   where: { identificationId: resourceId },
  //   data: {
  //     status: 'approved',
  //     approvedAt: new Date(),
  //     documentData: identification.document,
  //   },
  // });

  // Grant wallet access to token purchase
  // await grantTokenAccess(identification.externalReferenceId);

  console.log('Identification approved:', resourceId);
}

async function handleIdentificationDeclined(webhook: any) {
  const { resourceId, payload } = webhook;

  // TODO: Update database
  // await db.kycVerifications.update({
  //   where: { identificationId: resourceId },
  //   data: {
  //     status: 'declined',
  //     declineReason: payload.statusReason,
  //   },
  // });

  console.log('Identification declined:', resourceId);
}

async function handleIdentificationSuspected(webhook: any) {
  const { resourceId, payload } = webhook;

  // TODO: Flag for manual review
  // await db.kycVerifications.update({
  //   where: { identificationId: resourceId },
  //   data: {
  //     status: 'suspected',
  //     requiresReview: true,
  //   },
  // });

  console.log('Identification suspected (requires review):', resourceId);
}
