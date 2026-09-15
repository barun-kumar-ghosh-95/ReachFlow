// src/config/app.ts
// Centralized application configuration — no magic numbers scattered in code

export const APP_CONFIG = {
  name: 'ReachFlow',
  tagline: 'One place to reach your audience.',
  description: 'Create, personalize, schedule and analyze WhatsApp and email campaigns from one powerful workspace.',
  url: process.env.APP_URL || 'http://localhost:3000',
  supportEmail: 'support@reachflow.app',
  isDemoMode: process.env.DEMO_MODE === 'true',
  isProduction: process.env.NODE_ENV === 'production',
}

export const PLAN_CONFIG = {
  free: {
    messagesPerMonth: 30,
    contactsLimit: 100,
    teamMembers: 1,
    campaigns: 3,
    templates: 3,
    aiRequests: 10,
  },
  starter: {
    messagesPerMonth: 1000,
    contactsLimit: 500,
    teamMembers: 3,
    campaigns: -1, // unlimited
    templates: 20,
    aiRequests: 100,
  },
  pro: {
    messagesPerMonth: 10000,
    contactsLimit: 5000,
    teamMembers: 10,
    campaigns: -1,
    templates: -1,
    aiRequests: 500,
  },
}

export const RATE_LIMITS = {
  anonymous: {
    windowMs: 60_000,
    max: 20,
  },
  authenticated: {
    windowMs: 60_000,
    max: 100,
  },
  campaignCreate: {
    windowMs: 60_000,
    max: 5,
  },
  aiRequests: {
    windowMs: 60_000,
    max: 10,
  },
  csvImport: {
    windowMs: 300_000,
    max: 3,
  },
}

export const QUEUE_CONFIG = {
  names: {
    campaignProcessing: 'campaign-processing',
    messageSending: 'message-sending',
    scheduledCampaigns: 'scheduled-campaigns',
    emailSending: 'email-sending',
    whatsappSending: 'whatsapp-sending',
    webhookProcessing: 'webhook-processing',
    analyticsProcessing: 'analytics-processing',
    cleanup: 'cleanup',
    notifications: 'notifications',
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
}

export const STORAGE_CONFIG = {
  maxFileSizeMB: 10,
  allowedMimeTypes: {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/3gpp', 'video/quicktime'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    audio: ['audio/mpeg', 'audio/ogg', 'audio/aac'],
  },
}

export const WHATSAPP_CONFIG = {
  apiVersion: 'v20.0',
  baseUrl: 'https://graph.facebook.com',
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'reachflow-verify',
}

export const PAGINATION_DEFAULTS = {
  pageSize: 20,
  maxPageSize: 100,
}
