import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import User from '../models/User.js';

/* =========================================================
   HELPERS
   ========================================================= */

const normalizeEmail = (email) => {
  if (typeof email !== 'string') {
    return '';
  }

  return email.trim().toLowerCase();
};

const getEmailDomain = (email) => {
  const normalizedEmail = normalizeEmail(email);

  const match = normalizedEmail.match(
    /^[^\s@]+@([^\s@]+)$/
  );

  return match ? match[1].toLowerCase() : '';
};

/**
 * Check whether an email belongs to an approved
 * college domain.
 *
 * NOTE:
 * This helper is kept for compatibility with the
 * rest of the project, but SOCIAL LOGIN no longer
 * requires a college email address.
 */
const isCollegeEmail = (email) => {
  const domain = getEmailDomain(email);

  if (!domain) {
    return false;
  }

  const allowedDomains = Array.isArray(env.collegeEmailDomains)
    ? env.collegeEmailDomains
        .map((item) => String(item).trim().toLowerCase())
        .filter(Boolean)
    : [];

  if (allowedDomains.length === 0) {
    return false;
  }

  return allowedDomains.includes(domain);
};

/**
 * Fetch JSON from a remote endpoint.
 */
const fetchJson = async (url) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch identity metadata. HTTP ${response.status}`
    );
  }

  return response.json();
};

/* =========================================================
   JWT / JWKS VERIFICATION
   ========================================================= */

/**
 * Verify an RS256 JWT against a remote JWKS endpoint.
 *
 * The token is NOT trusted until:
 *
 * 1. The JWT structure is valid.
 * 2. The signing algorithm is RS256.
 * 3. The correct public key is found.
 * 4. The signature is valid.
 * 5. The audience matches our OAuth client ID.
 * 6. The issuer matches when one is configured.
 */
const verifyWithJwks = async ({
  token,
  jwksUrl,
  audience,
  issuers
}) => {
  if (
    typeof token !== 'string' ||
    token.trim() === ''
  ) {
    throw new Error('Invalid identity token.');
  }

  if (
    typeof audience !== 'string' ||
    audience.trim() === ''
  ) {
    throw new Error('OAuth audience is not configured.');
  }

  const decoded = jwt.decode(token, {
    complete: true
  });

  if (
    !decoded ||
    !decoded.header ||
    !decoded.payload
  ) {
    throw new Error('Invalid identity token.');
  }

  const { header } = decoded;

  if (!header.kid) {
    throw new Error(
      'Identity token is missing a key identifier.'
    );
  }

  if (header.alg !== 'RS256') {
    throw new Error(
      'Unsupported identity token algorithm.'
    );
  }

  const jwks = await fetchJson(jwksUrl);

  if (
    !jwks ||
    !Array.isArray(jwks.keys)
  ) {
    throw new Error(
      'Invalid identity key metadata.'
    );
  }

  const key = jwks.keys.find(
    (candidate) =>
      candidate.kid === header.kid
  );

  if (!key) {
    throw new Error(
      'No matching identity key found.'
    );
  }

  const publicKey = crypto.createPublicKey({
    key,
    format: 'jwk'
  });

  const pem = publicKey.export({
    format: 'pem',
    type: 'spki'
  });

  const verifyOptions = {
    algorithms: ['RS256'],
    audience
  };

  if (
    Array.isArray(issuers) &&
    issuers.length > 0
  ) {
    verifyOptions.issuer = issuers;
  }

  return jwt.verify(
    token,
    pem,
    verifyOptions
  );
};

/* =========================================================
   SOCIAL USER RESOLUTION
   ========================================================= */

/**
 * Resolve a social-login user.
 *
 * Priority:
 *
 * 1. Provider + provider ID
 * 2. Existing email
 * 3. New student account
 *
 * IMPORTANT:
 * Any valid verified Google/Microsoft email can be
 * used. There is NO college-email restriction here.
 */
export function resolveSocialLoginUser({
  existingUsers,
  provider,
  providerId,
  email,
  name
}) {
  const normalizedEmail =
    normalizeEmail(email);

  const providerMatch =
    existingUsers.find(
      (user) =>
        user.authProvider === provider &&
        user.providerId === providerId
    );

  if (providerMatch) {
    return {
      user: providerMatch,
      isNewUser: false
    };
  }

  const emailMatch =
    existingUsers.find(
      (user) =>
        normalizeEmail(user.email) ===
        normalizedEmail
    );

  if (emailMatch) {
    return {
      user: {
        ...emailMatch,

        /*
         * Do not overwrite an existing LOCAL
         * authentication provider.
         *
         * If social information is missing,
         * it will be linked below.
         */
        authProvider:
          emailMatch.authProvider || provider,

        providerId:
          emailMatch.providerId || providerId
      },

      isNewUser: false
    };
  }

  return {
    user: {
      name:
        name ||
        normalizedEmail.split('@')[0],

      email: normalizedEmail,

      /*
       * New social accounts remain STUDENT accounts.
       *
       * This does NOT restrict which email can log in.
       */
      role: 'STUDENT',

      authProvider: provider,

      providerId,

      password: null,

      verificationStatus: 'PENDING',

      accountStatus: 'ACTIVE'
    },

    isNewUser: true
  };
}

/* =========================================================
   FIND OR CREATE SOCIAL USER
   ========================================================= */

export async function findOrCreateSocialLoginUser({
  provider,
  providerId,
  email,
  name
}) {
  const normalizedEmail =
    normalizeEmail(email);

  if (!normalizedEmail) {
    throw new Error(
      'Your account could not be authenticated.'
    );
  }

  if (!provider) {
    throw new Error(
      'Authentication provider is required.'
    );
  }

  if (!providerId) {
    throw new Error(
      'Your social account could not be identified.'
    );
  }

  /*
   * =======================================================
   * COLLEGE EMAIL RESTRICTION REMOVED
   * =======================================================
   *
   * Previously this function contained:
   *
   * if (!isCollegeEmail(normalizedEmail)) {
   *   throw new Error(
   *     'Only college email addresses are allowed...'
   *   );
   * }
   *
   * That validation has intentionally been removed.
   *
   * Therefore:
   *
   * Gmail       -> allowed
   * Outlook     -> allowed
   * Microsoft   -> allowed
   * Yahoo       -> allowed
   * College     -> allowed
   * Other valid -> allowed
   *
   * The email is still required to come from the
   * VERIFIED Google/Microsoft identity token.
   */

  const existingUsers =
    await User.find({
      $or: [
        {
          email: normalizedEmail
        },
        {
          authProvider: provider,
          providerId
        }
      ]
    }).lean();

  const resolved =
    resolveSocialLoginUser({
      existingUsers,
      provider,
      providerId,
      email: normalizedEmail,
      name
    });

  /* -------------------------------------------------------
     CREATE NEW USER
     ------------------------------------------------------- */

  if (resolved.isNewUser) {
    const created =
      await User.create({
        name:
          resolved.user.name,

        email:
          resolved.user.email,

        /*
         * New social users are students by default.
         */
        role: 'STUDENT',

        authProvider:
          provider,

        providerId,

        verificationStatus:
          'PENDING',

        accountStatus:
          'ACTIVE',

        password: null
      });

    return created.toObject
      ? created.toObject()
      : created;
  }

  /* -------------------------------------------------------
     UPDATE EXISTING USER
     ------------------------------------------------------- */

  const update = {};

  /*
   * Only add social authentication information
   * when it does not already exist.
   */
  if (
    !resolved.user.authProvider
  ) {
    update.authProvider =
      provider;
  }

  if (
    !resolved.user.providerId
  ) {
    update.providerId =
      providerId;
  }

  if (
    !resolved.user.name ||
    resolved.user.name.trim() === ''
  ) {
    update.name =
      name ||
      normalizedEmail.split('@')[0];
  }

  if (
    Object.keys(update).length > 0
  ) {
    await User.findByIdAndUpdate(
      resolved.user._id,
      {
        $set: update
      },
      {
        new: true
      }
    );
  }

  const user =
    await User.findById(
      resolved.user._id
    ).lean();

  if (!user) {
    throw new Error(
      'Unable to retrieve your Campus Commute account.'
    );
  }

  return user;
}

/* =========================================================
   GOOGLE
   ========================================================= */

export async function verifyGoogleIdentity(
  credential
) {
  if (!env.googleClientId) {
    throw new Error(
      'Missing Google OAuth configuration.'
    );
  }

  if (
    typeof credential !== 'string' ||
    credential.trim() === ''
  ) {
    throw new Error(
      'Google identity credential is missing.'
    );
  }

  try {
    const verified =
      await verifyWithJwks({
        token: credential,

        jwksUrl:
          'https://www.googleapis.com/oauth2/v3/certs',

        audience:
          env.googleClientId,

        issuers: [
          'https://accounts.google.com',
          'accounts.google.com'
        ]
      });

    if (!verified?.sub) {
      throw new Error(
        'Google identity is missing a subject.'
      );
    }

    if (!verified?.email) {
      throw new Error(
        'Google account does not provide an email address.'
      );
    }

    /*
     * We still require the Google email to be verified.
     *
     * This is an identity-security check and is NOT
     * a college-email restriction.
     */
    if (
      verified.email_verified !== true &&
      verified.email_verified !== 'true'
    ) {
      throw new Error(
        'Google email address is not verified.'
      );
    }

    return {
      ...verified,

      email:
        normalizeEmail(
          verified.email
        )
    };
  } catch (error) {
    if (
      error?.message ===
      'Missing Google OAuth configuration.'
    ) {
      throw error;
    }

    if (
      error?.message ===
      'Google email address is not verified.'
    ) {
      throw new Error(
        'Please use a verified Google account.'
      );
    }

    /*
     * Do not expose JWT/JWKS verification
     * implementation details to the browser.
     */
    throw new Error(
      'Google sign-in failed.'
    );
  }
}

/* =========================================================
   MICROSOFT
   ========================================================= */

export async function verifyMicrosoftIdentity(
  credential
) {
  if (!env.microsoftClientId) {
    throw new Error(
      'Missing Microsoft OAuth configuration.'
    );
  }

  if (
    typeof credential !== 'string' ||
    credential.trim() === ''
  ) {
    throw new Error(
      'Microsoft identity credential is missing.'
    );
  }

  const tenantId =
    env.microsoftTenantId || 'common';

  try {
    const verified =
      await verifyWithJwks({
        token: credential,

        jwksUrl:
          `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,

        audience:
          env.microsoftClientId,

        /*
         * When using "common", Microsoft tokens
         * can originate from different tenants,
         * so issuer validation is handled differently.
         *
         * For a specific tenant, validate the
         * expected issuer.
         */
        issuers:
          tenantId === 'common'
            ? undefined
            : [
                `https://login.microsoftonline.com/${tenantId}/v2.0`,
                `https://sts.windows.net/${tenantId}/`
              ]
      });

    if (
      !verified?.oid &&
      !verified?.sub
    ) {
      throw new Error(
        'Microsoft identity is missing a subject.'
      );
    }

    /*
     * Microsoft may provide the account email
     * through either claim.
     */
    const microsoftEmail =
      verified.email ||
      verified.preferred_username ||
      '';

    const normalizedEmail =
      normalizeEmail(
        microsoftEmail
      );

    if (!normalizedEmail) {
      throw new Error(
        'Microsoft account does not provide an email address.'
      );
    }

    return {
      ...verified,

      email:
        normalizedEmail
    };
  } catch (error) {
    if (
      error?.message ===
      'Missing Microsoft OAuth configuration.'
    ) {
      throw error;
    }

    throw new Error(
      'Microsoft sign-in failed.'
    );
  }
}
