import { AISettings } from './settings';
import { VersionedConfig, CURRENT_SCHEMA_VERSION, AIConfigV1 } from './configSchema';
import { migrateConfig } from './migration';
import { validateSchema, aiConfigSchemaV1 } from './configSchema';

// Get app version from package.json
const APP_VERSION = '0.1.0'; // In production, this would be imported from package.json

type UnknownRecord = Record<string, unknown>;

/**
 * Wrap config in a versioned container for export
 */
function wrapConfigForExport(config: AISettings): VersionedConfig {
  // Ensure config has version field
  const versionedConfig: AIConfigV1 = {
    ...config,
    _version: CURRENT_SCHEMA_VERSION,
  };

  return {
    version: CURRENT_SCHEMA_VERSION,
    config: versionedConfig,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
  };
}

/**
 * Encrypt config data with password using AES-GCM
 */
export async function encryptConfig(config: AISettings, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const versionedData = wrapConfigForExport(config);
  const data = encoder.encode(JSON.stringify(versionedData));

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
 * Decrypt config data with password
 */
export async function decryptConfig(encryptedData: string, password: string): Promise<AISettings> {
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
  const parsed: unknown = JSON.parse(jsonString);

  // Check if this is a versioned config object
  if (isVersionedConfig(parsed)) {
    return unwrapAndMigrateConfig(parsed);
  }

  // Handle legacy config without versioning
  console.warn('Importing legacy config without version information');
  return migrateLegacyConfig(parsed as UnknownRecord);
}

/**
 * Type guard to check if data is a versioned config object
 */
function isVersionedConfig(data: unknown): data is VersionedConfig {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as UnknownRecord;
  return (
    typeof obj.version === 'number' &&
    typeof obj.config === 'object' &&
    obj.config !== null
  );
}

/**
 * Unwrap and migrate versioned config to current schema
 */
function unwrapAndMigrateConfig(versionedData: VersionedConfig): AISettings {
  const { version, config, exportedAt, appVersion } = versionedData;

  console.log(`Importing config from version ${version} (exported: ${exportedAt}, app: ${appVersion || 'unknown'})`);

  // Migrate config to current version if needed
  const migratedConfig = migrateConfig(config as UnknownRecord);

  // Validate against current schema
  const validation = validateSchema<AISettings>(migratedConfig, aiConfigSchemaV1);

  if (!validation.valid) {
    console.error('Config validation errors:', validation.errors);
    throw new Error(
      `Imported config is invalid:\n${validation.errors.join('\n')}\n\n` +
      'The imported config may be corrupted or incompatible.'
    );
  }

  return validation.data as AISettings;
}

/**
 * Handle legacy config that doesn't have version information
 * Assumes version 0 and migrates to current
 */
function migrateLegacyConfig(legacyConfig: UnknownRecord): AISettings {
  const migratedConfig = migrateConfig(legacyConfig);

  // Validate against current schema
  const validation = validateSchema<AISettings>(migratedConfig, aiConfigSchemaV1);

  if (!validation.valid) {
    console.error('Legacy config validation errors:', validation.errors);
    // For legacy config, we're more lenient - apply defaults for invalid fields
    return validation.data as AISettings;
  }

  return validation.data as AISettings;
}

/**
 * Export config to an encrypted file
 */
export async function exportConfigToFile(config: AISettings, password: string): Promise<void> {
  const encrypted = await encryptConfig(config, password);
  const blob = new Blob([encrypted], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `tabitomo-config-${Date.now()}.ttconfig`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import config from an encrypted file
 */
export async function importConfigFromFile(file: File, password: string): Promise<AISettings> {
  const text = await file.text();
  return await decryptConfig(text, password);
}

/**
 * Generate QR code data URL from encrypted config
 */
export async function generateConfigQRCode(config: AISettings, password: string): Promise<string> {
  const encrypted = await encryptConfig(config, password);

  // QR codes have a maximum data capacity, so we need to check the size
  if (encrypted.length > 2953) {
    throw new Error('Config data is too large for QR code. Please use file export instead.');
  }

  // We'll use the qrcode library to generate the QR code
  const QRCode = (await import('qrcode')).default;
  return await QRCode.toDataURL(encrypted, {
    errorCorrectionLevel: 'M',
    width: 512,
    margin: 2,
  });
}

/**
 * Import config from QR code data
 */
export async function importConfigFromQRCode(qrData: string, password: string): Promise<AISettings> {
  return await decryptConfig(qrData, password);
}
