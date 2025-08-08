const { google } = require('googleapis');

/**
 * Token Refresh Utility
 * Handles automatic refresh of OAuth tokens for Google API access
 */

/**
 * Ensure account has valid tokens, refresh if necessary
 * @param {Account} account - Account model instance
 * @returns {Object} - { success: boolean, tokens?: object, error?: string }
 */
async function ensureValidTokens(account) {
  try {
    // Check if we have required tokens
    if (!account.googleAccessToken) {
      return { 
        success: false, 
        error: 'Account missing access token - re-authentication required',
        needsReauth: true
      };
    }

    if (!account.googleRefreshToken) {
      return { 
        success: false, 
        error: 'Account missing refresh token - re-authentication required',
        needsReauth: true
      };
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    // Set current credentials
    oauth2Client.setCredentials({
      access_token: account.googleAccessToken,
      refresh_token: account.googleRefreshToken
    });

    // Try to refresh the access token
    console.log(`🔄 Refreshing tokens for account: ${account.googleEmail}`);
    
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // Update account with new tokens
      await account.updateTokens(
        credentials.access_token, 
        credentials.refresh_token || account.googleRefreshToken // Keep existing refresh token if not provided
      );
      
      console.log(`✅ Successfully refreshed tokens for: ${account.googleEmail}`);
      
      return { 
        success: true, 
        tokens: credentials,
        oauth2Client: oauth2Client // Return configured client
      };
      
    } catch (refreshError) {
      console.error(`❌ Token refresh failed for ${account.googleEmail}:`, refreshError.message);
      
      // Check if it's a refresh token error
      if (refreshError.message.includes('invalid_grant') || 
          refreshError.message.includes('refresh_token') ||
          refreshError.code === 400) {
        return { 
          success: false, 
          error: 'Refresh token expired - re-authentication required',
          needsReauth: true
        };
      }
      
      return { 
        success: false, 
        error: `Token refresh failed: ${refreshError.message}`,
        needsReauth: true
      };
    }
    
  } catch (error) {
    console.error(`❌ Token validation error for ${account.googleEmail}:`, error);
    return { 
      success: false, 
      error: `Token validation failed: ${error.message}`,
      needsReauth: true
    };
  }
}

/**
 * Test if account tokens are working by making a simple API call
 * @param {Account} account - Account model instance
 * @returns {Object} - { success: boolean, error?: string }
 */
async function testAccountTokens(account) {
  try {
    const tokenResult = await ensureValidTokens(account);
    
    if (!tokenResult.success) {
      return tokenResult;
    }

    // Test the tokens with a simple API call
    const oauth2 = google.oauth2({ version: 'v2', auth: tokenResult.oauth2Client });
    
    try {
      const profileResponse = await oauth2.userinfo.get();
      
      console.log(`✅ Token test successful for: ${account.googleEmail}`);
      return { 
        success: true,
        profile: profileResponse.data
      };
      
    } catch (apiError) {
      console.error(`❌ API test failed for ${account.googleEmail}:`, apiError.message);
      
      if (apiError.code === 401 || apiError.code === 403) {
        return { 
          success: false, 
          error: 'API access denied - re-authentication required',
          needsReauth: true
        };
      }
      
      return { 
        success: false, 
        error: `API test failed: ${apiError.message}`
      };
    }
    
  } catch (error) {
    console.error(`❌ Token test error for ${account.googleEmail}:`, error);
    return { 
      success: false, 
      error: `Token test failed: ${error.message}`
    };
  }
}

/**
 * Get configured OAuth2 client with valid tokens
 * @param {Account} account - Account model instance
 * @returns {Object} - { success: boolean, oauth2Client?: OAuth2Client, error?: string }
 */
async function getValidOAuth2Client(account) {
  const tokenResult = await ensureValidTokens(account);
  
  if (!tokenResult.success) {
    return tokenResult;
  }
  
  return {
    success: true,
    oauth2Client: tokenResult.oauth2Client
  };
}

module.exports = {
  ensureValidTokens,
  testAccountTokens,
  getValidOAuth2Client
};