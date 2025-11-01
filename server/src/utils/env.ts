import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().default(5000),
    AFFILIATE_AMAZON_TAG: z.string().optional(),
    AFFILIATE_ALI_CAMPAIGN_ID: z.string().optional(),
    AFFILIATE_ALI_APP_ID: z.string().optional(),
    AFFILIATE_SHEIN_SITE_ID: z.string().optional(),
    AFFILIATE_EBAY_CAMPAIGN_ID: z.string().optional(),
    LLM_API_KEY: z.string().optional(),
    LLM_API_URL: z.string().optional(),
    ORIGIN_ALLOWLIST: z.string().optional(),
    RAPIDAPI_KEY: z.string().optional(),
    RAPIDAPI_AMAZON_HOST: z.string().optional(),
    RAPIDAPI_EBAY_HOST: z.string().optional(),
    RAPIDAPI_ALIEXPRESS_HOST: z.string().optional(),
    RAPIDAPI_WALMART_HOST: z.string().optional(),
    RAPIDAPI_ETSY_HOST: z.string().optional(),
    EBAY_APP_ID: z.string().optional(),
    BESTBUY_API_KEY: z.string().optional(),
    ETSY_API_KEY: z.string().optional(),
    FIREBASE_PROJECT_ID: z.string().optional(),
    FIREBASE_CLIENT_EMAIL: z.string().optional(),
    FIREBASE_PRIVATE_KEY: z.string().optional(),
    FIREBASE_SESSION_COOKIE_TTL_DAYS: z.coerce.number().default(5),
    SERVER_BASE_URL: z.string().url().optional(),
    CLIENT_BASE_URL: z.string().url().optional()
  })
  .transform((values) => ({
    ...values,
    ORIGIN_ALLOWLIST: values.ORIGIN_ALLOWLIST
      ? values.ORIGIN_ALLOWLIST.split(",").map((origin) => origin.trim())
      : []
  }));

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);

export const isProd = env.NODE_ENV === "production";
