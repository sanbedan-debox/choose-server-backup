import crypto from "crypto";

const algorithm = "aes-256-gcm";

export const encryptData = (value: string): string => {
  const key = process.env.ENCRYPTION_KEY ?? "";

  // Generate a random IV
  const iv = crypto.randomBytes(16);

  // Create a cipher instance
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  // Encrypt the value
  let encrypted = cipher.update(value, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Get the authentication tag
  const authTag = cipher.getAuthTag().toString("hex");

  // Return the IV, auth tag, and encrypted text concatenated
  return `${iv.toString("hex")}$$${authTag}$$${encrypted}`;
};

export const decryptData = (encryptedValue: string): string => {
  const key = process.env.ENCRYPTION_KEY ?? "";

  // Split the encrypted data into its components
  const [ivHex, authTagHex, encryptedText] = encryptedValue.split("$$");

  // Convert components back to buffers
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  // Create a decipher instance
  const decipher = crypto.createDecipheriv(algorithm, key, iv);

  // Set the authentication tag
  decipher.setAuthTag(authTag);

  // Decrypt the text
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};
