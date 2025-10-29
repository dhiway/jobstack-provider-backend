interface CreateUserPayload {
  accessToken: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName?: string;
  profileImage?: string;
  termsAccepted: boolean;
  details?: {
    designation?: string;
    location?: string;
  };
}

interface SSOAccountData {
  email: string;
  name: string;
  phoneNumber?: string | null;
  
}

/**
 * Creates an account in mark studio application when email is verified
 * This acts as SSO - when user verifies email in this app, they are automatically
 * created in the mark studio application
 */
export async function createSSOAccount(
  userData: SSOAccountData
): Promise<void> {
  const {
    SSO_ENABLED,
    SSO_ENDPOINT,
    SSO_ACCESS_TOKEN,
    SSO_TIMEOUT_MS,
  } = process.env;

  // Skip if SSO is not enabled
  if (SSO_ENABLED !== 'true') {
    return;
  }

  // Validate required environment variables
  if (!SSO_ENDPOINT) {
    console.error(
      '❌ [SSO] SSO_ENDPOINT is required but not set'
    );
    return;
  }

  if (!SSO_ACCESS_TOKEN) {
    console.error(
      '❌ [SSO] SSO_ACCESS_TOKEN is required but not set'
    );
    return;
  }

  try {
    console.log(
      `🔄 [SSO] Creating account for user: ${userData.email}`
    );

    // Parse name into firstName and lastName
    const nameParts = userData.name.trim().split(' ');
    const firstName =
      nameParts[0] || userData.name || 'User';
    const lastName =
      nameParts.slice(1).join(' ') || firstName;

    const payload: CreateUserPayload = {
      accessToken: SSO_ACCESS_TOKEN,
      firstName: firstName,
      lastName: lastName,
      email: userData.email,
      phone: userData.phoneNumber || '',
      companyName: 'HashMark Studio',
      termsAccepted: true,
    };

    const response = await fetch(SSO_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(
        parseInt(SSO_TIMEOUT_MS || '20000')
      ),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `SSO API returned ${response.status}: ${errorText}`
      );
    }

    const responseData = await response.json();
    console.log(
      `✅ [SSO] Account created successfully for: ${userData.email}`,
      { responseId: responseData?.id || responseData?.userId }
    );
  } catch (error: any) {
    // Log but don't fail the verification process
    console.error(
      `❌ [SSO] Failed to create account for ${userData.email}:`,
      error.message
    );
  }
}

