import * as crypto from 'crypto';

/**
 * Utilidad criptográfica para cifrado y descifrado autenticado AES-256-GCM
 * de secretos sensibles (ej. llaves privadas TOTP).
 * Formato resultante: "ivHex:tagHex:cipherHex"
 */
export class CryptoUtil {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 12; // 96-bit recomendado para GCM

  private static getKeyBuffer(keyHex?: string): Buffer {
    const rawKey = keyHex || process.env.TOTP_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    if (rawKey.length === 64) {
      return Buffer.from(rawKey, 'hex');
    }
    // Si la longitud no es exactamente 64 hex, derivamos 32 bytes con SHA-256
    return crypto.createHash('sha256').update(rawKey).digest();
  }

  static encrypt(plainText: string, customKeyHex?: string): string {
    const key = this.getKeyBuffer(customKeyHex);
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  static decrypt(encryptedCombined: string, customKeyHex?: string): string {
    if (!encryptedCombined || !encryptedCombined.includes(':')) {
      throw new Error('Formato cifrado inválido');
    }

    const parts = encryptedCombined.split(':');
    if (parts.length !== 3) {
      throw new Error('Formato cifrado AES-256-GCM inválido');
    }

    const [ivHex, authTagHex, cipherHex] = parts;
    const key = this.getKeyBuffer(customKeyHex);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
