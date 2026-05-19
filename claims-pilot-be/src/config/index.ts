import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  db: {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT || "16751", 10),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
    ssl: process.env.DB_SSL === "true",
  },

  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  },

  objectStorage: {
    accessKey: process.env.VULTR_OBJECT_STORAGE_ACCESS_KEY!,
    secretKey: process.env.VULTR_OBJECT_STORAGE_SECRET_KEY!,
    endpoint: process.env.VULTR_OBJECT_STORAGE_ENDPOINT!,
    bucket: process.env.VULTR_OBJECT_STORAGE_BUCKET!,
    region: process.env.VULTR_OBJECT_STORAGE_REGION || "ewr1",
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY!,
    flashModel: process.env.GEMINI_FLASH_MODEL || "gemini-2.5-flash",
    proModel: process.env.GEMINI_PRO_MODEL || "gemini-2.5",
  },

  logLevel: process.env.LOG_LEVEL || "info",
};
