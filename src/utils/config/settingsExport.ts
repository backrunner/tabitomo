import { AISettings } from './settings';

/**
 * Encrypt settings data with password using AES-GCM
 */
export async function encryptSettings(settings: AISettings, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(settings));

  // Generate a random salt for key derivation
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Generate a random IV for AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Derive a key from the password using PBKDF2
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const encryptionKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  // Encrypt the data
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    encryptionKey,
    data
  );

  // Combine salt, iv, and encrypted data
  const combined = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encryptedData), salt.length + iv.length);

  // Convert to base64 for easy storage/transmission
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt settings data with password
 */
export async function decryptSettings(encryptedData: string, password: string): Promise<AISettings> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  // Decode from base64
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

  // Extract salt, iv, and encrypted data
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const data = combined.slice(28);

  // Derive the same key from the password
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const decryptionKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  // Decrypt the data
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    decryptionKey,
    data
  );

  const jsonString = decoder.decode(decryptedData);
  return JSON.parse(jsonString);
}

/**
 * Export settings to an encrypted file
 */
export async function exportSettingsToFile(settings: AISettings, password: string): Promise<void> {
  const encrypted = await encryptSettings(settings, password);
  const blob = new Blob([encrypted], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `tabitomo-settings-${Date.now()}.ttconfig`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import settings from an encrypted file
 */
export async function importSettingsFromFile(file: File, password: string): Promise<AISettings> {
  const text = await file.text();
  return await decryptSettings(text, password);
}

/**
 * Generate QR code data URL from encrypted settings
 */
export async function generateSettingsQRCode(settings: AISettings, password: string): Promise<string> {
  const encrypted = await encryptSettings(settings, password);

  // QR codes have a maximum data capacity, so we need to check the size
  if (encrypted.length > 2953) {
    throw new Error('Settings data is too large for QR code. Please use file export instead.');
  }

  // We'll use the qrcode library to generate the QR code
  // This will be implemented after installing the library
  const QRCode = (await import('qrcode')).default;
  return await QRCode.toDataURL(encrypted, {
    errorCorrectionLevel: 'M',
    width: 512,
    margin: 2,
  });
}

/**
 * Import settings from QR code data
 */
export async function importSettingsFromQRCode(qrData: string, password: string): Promise<AISettings> {
  return await decryptSettings(qrData, password);
}
