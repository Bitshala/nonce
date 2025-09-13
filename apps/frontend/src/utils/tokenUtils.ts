// Secure token utilities for encoding/decoding usernames
// This prevents URL manipulation by using encoded tokens instead of plain usernames

const SECRET_KEY = 'student-detail-security-key-2024'; // In production, use env variable

// Simple base64 encoding with timestamp for basic security
export const encodeUsername = (username: string): string => {
  const timestamp = Date.now();
  const payload = JSON.stringify({ username, timestamp });
  
  // Create a simple checksum using the secret key
  const checksum = btoa(SECRET_KEY + payload).slice(0, 8);
  
  // Combine payload and checksum
  const tokenData = { payload, checksum };
  
  return btoa(JSON.stringify(tokenData));
};

// Decode and validate the token
export const decodeUsername = (token: string): string | null => {
  try {
    const tokenData = JSON.parse(atob(token));
    const { payload, checksum } = tokenData;
    
    // Verify checksum
    const expectedChecksum = btoa(SECRET_KEY + payload).slice(0, 8);
    if (checksum !== expectedChecksum) {
      console.error('Token validation failed: Invalid checksum');
      return null;
    }
    
    const { username, timestamp } = JSON.parse(payload);
    
    // Check if token is too old (24 hours)
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    if (Date.now() - timestamp > maxAge) {
      console.error('Token validation failed: Token expired');
      return null;
    }
    
    return username;
  } catch (error) {
    console.error('Token validation failed: Invalid token format', error);
    return null;
  }
};

// Validate that the decoded username matches the authenticated user
export const validateUserAccess = (decodedUsername: string): boolean => {
  const authenticatedUsername = localStorage.getItem('user_username');
  
  if (!authenticatedUsername) {
    console.error('No authenticated user found');
    return false;
  }
  
  if (decodedUsername !== authenticatedUsername) {
    console.error('Username mismatch: URL manipulation detected');
    return false;
  }
  
  return true;
};