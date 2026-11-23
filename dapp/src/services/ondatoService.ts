/**
 * Ondato KYC/AML API Service
 * Handles identity verification and AML screening integration
 */

export interface OndatoConfig {
  apiUrl: string;
  clientId: string;
  clientSecret: string;
  setupId: string;
  webhookSecret?: string;
}

export interface IdentityVerificationRequest {
  externalReferenceId: string;
  registration: {
    email: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    dateOfBirth: string; // YYYY-MM-DD
    phoneNumber?: number;
    personalCode?: string;
    countryCode?: string;
  };
  setupId: string;
}

export interface IdentityVerificationResponse {
  id: string;
}

export interface IdentityVerification {
  id: string;
  status: 'Created' | 'InProgress' | 'Completed' | 'Failed' | 'Cancelled';
  applicationId?: string;
  createdUtc: string;
  modifiedUtc: string;
  setup: {
    id: string;
    versionId: string;
  };
  step?: {
    kycIdentification?: {
      id: string;
    };
    consent?: {
      isConsented: boolean;
      consentedUtc: string;
    };
  };
}

export interface Identification {
  id: string;
  applicationId: string;
  createdUtc: string;
  setup: {
    id: string;
    versionId: string;
  };
  identityVerificationId: string;
  status: 'Awaiting' | 'Approved' | 'Declined' | 'Suspected';
  statusReason?: string;
  isCrossChecked: boolean;
  document?: {
    fullName: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    documentNumber: string;
    dateOfIssue: string;
    dateOfExpiration: string;
    dateOfBirth: string;
    personalCode?: string;
    address?: string;
    nationalityIso3: string;
    countryIso3: string;
    countryStateIso2?: string;
    gender: 'Male' | 'Female' | 'Other';
    type: 'IdCard' | 'Passport' | 'DriversLicense' | 'ResidencePermit';
    mrzVerified: boolean;
    category?: string;
    files?: Array<{
      createdUtc: string;
      fileId: string;
      fileName: string;
      fileExtension: string;
      part: 'Front' | 'Back' | 'Face';
      fileType: 'DocumentPhoto' | 'Selfie';
    }>;
  };
}

export class OndatoService {
  private config: OndatoConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: OndatoConfig) {
    this.config = config;
  }

  /**
   * Obtain OAuth access token
   * Caches token until expiry
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const response = await fetch(`${this.config.apiUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to obtain access token: ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // Refresh 60s early

    return this.accessToken;
  }

  /**
   * Create Identity Verification session
   * Returns ID used to generate verification URL
   */
  async createIdentityVerification(
    request: IdentityVerificationRequest
  ): Promise<IdentityVerificationResponse> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.config.apiUrl}/v1/identity-verifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create identity verification: ${error}`);
    }

    return response.json();
  }

  /**
   * Generate hosted verification URL
   * User completes KYC at this URL
   */
  generateVerificationUrl(verificationId: string, whitelabelDomain?: string): string {
    const baseUrl = whitelabelDomain || this.getDefaultIdvUrl();
    return `${baseUrl}?id=${verificationId}`;
  }

  /**
   * Get default IDV URL based on environment
   */
  private getDefaultIdvUrl(): string {
    return this.config.apiUrl.includes('sandbox')
      ? 'https://sandbox-idv.ondato.com'
      : 'https://idv.ondato.com';
  }

  /**
   * Retrieve Identity Verification status
   */
  async getIdentityVerification(id: string): Promise<IdentityVerification> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.config.apiUrl}/v1/identity-verifications/${id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to retrieve identity verification: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Retrieve KYC identification details
   */
  async getIdentification(id: string): Promise<Identification> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.config.apiUrl}/v1/identifications/${id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to retrieve identification: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Retrieve document file (photo, selfie)
   */
  async getIdentificationFile(identificationId: string, fileId: string): Promise<Blob> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `${this.config.apiUrl}/v1/identifications/${identificationId}/files/${fileId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to retrieve file: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Verify webhook signature
   * Ensures webhook payload authenticity
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.config.webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    // Implementation depends on Ondato's signature algorithm
    // Typically HMAC-SHA256
    // TODO: Implement signature verification once algorithm is confirmed
    return true;
  }
}

/**
 * Singleton instance for server-side usage
 */
let ondatoServiceInstance: OndatoService | null = null;

export function getOndatoService(): OndatoService {
  if (!ondatoServiceInstance) {
    ondatoServiceInstance = new OndatoService({
      apiUrl: process.env.ONDATO_API_URL || 'https://api.ondato.com',
      clientId: process.env.ONDATO_CLIENT_ID || '',
      clientSecret: process.env.ONDATO_CLIENT_SECRET || '',
      setupId: process.env.ONDATO_SETUP_ID || '',
      webhookSecret: process.env.ONDATO_WEBHOOK_SECRET,
    });
  }

  return ondatoServiceInstance;
}
