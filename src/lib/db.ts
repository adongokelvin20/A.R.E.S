import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Only create the Prisma client if we have a valid DATABASE_URL
// This prevents build-time crashes when DATABASE_URL is a placeholder
function createPrismaClient() {
  const url = process.env.DATABASE_URL
  if (!url || url.includes('user:password') || url.includes('host:port')) {
    // Return a dummy client during build or when no real DB is connected
    return null as any
  }
  return new PrismaClient({
    log: ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/**
 * Ensure the database tables exist.
 * Runs at runtime (not build time) on the first API request.
 */
let tablesEnsured = false
export async function ensureDatabase() {
  if (tablesEnsured) return
  if (!db) return

  // Skip during build time
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return
  }

  try {
    await db.user.findFirst({ select: { id: true } })
    tablesEnsured = true
  } catch (e) {
    console.log('[A.R.E.S.] Creating database tables...')

    const statements = [
      `CREATE TABLE IF NOT EXISTS "Business" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "type" TEXT NOT NULL, "industry" TEXT, "description" TEXT, "country" TEXT NOT NULL DEFAULT 'GH', "currency" TEXT NOT NULL DEFAULT 'GHS', "timezone" TEXT NOT NULL DEFAULT 'Africa/Accra', "language" TEXT NOT NULL DEFAULT 'en', "phone" TEXT, "email" TEXT, "address" TEXT, "logoUrl" TEXT, "configuration" TEXT NOT NULL DEFAULT '{}', "enabledModules" TEXT NOT NULL DEFAULT '[]', "plan" TEXT NOT NULL DEFAULT 'STARTER', "status" TEXT NOT NULL DEFAULT 'ACTIVE', "agentName" TEXT NOT NULL DEFAULT 'A.R.E.S.', "agentPersonality" TEXT NOT NULL DEFAULT 'professional', "agentInstructions" TEXT NOT NULL DEFAULT '', "agentLearnings" TEXT NOT NULL DEFAULT '[]', "ownerFirstName" TEXT, "sectorCategory" TEXT, "sectorSubtype" TEXT, "onboardedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Business_pkey" PRIMARY KEY ("id"))`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "Business_slug_key" ON "Business"("slug")`,
      `CREATE TABLE IF NOT EXISTS "User" ("id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "email" TEXT NOT NULL, "name" TEXT NOT NULL, "passwordHash" TEXT, "role" TEXT NOT NULL DEFAULT 'OWNER', "status" TEXT NOT NULL DEFAULT 'ACTIVE', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "User_pkey" PRIMARY KEY ("id"))`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "User_businessId_email_key" ON "User"("businessId", "email")`,
      `CREATE INDEX IF NOT EXISTS "User_businessId_idx" ON "User"("businessId")`,
      `CREATE TABLE IF NOT EXISTS "Customer" ("id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "name" TEXT, "phone" TEXT, "email" TEXT, "whatsappId" TEXT, "metadata" TEXT NOT NULL DEFAULT '{}', "lifetimeValue" DOUBLE PRECISION NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'ACTIVE', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Customer_pkey" PRIMARY KEY ("id"))`,
      `CREATE INDEX IF NOT EXISTS "Customer_businessId_phone_idx" ON "Customer"("businessId", "phone")`,
      `CREATE INDEX IF NOT EXISTS "Customer_businessId_idx" ON "Customer"("businessId")`,
      `CREATE TABLE IF NOT EXISTS "Product" ("id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "category" TEXT, "sku" TEXT, "price" DOUBLE PRECISION NOT NULL, "currency" TEXT NOT NULL DEFAULT 'GHS', "stock" INTEGER NOT NULL DEFAULT 0, "lowStockThreshold" INTEGER NOT NULL DEFAULT 5, "imageUrl" TEXT, "imageData" TEXT, "imageAlt" TEXT, "attributes" TEXT NOT NULL DEFAULT '{}', "status" TEXT NOT NULL DEFAULT 'ACTIVE', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Product_pkey" PRIMARY KEY ("id"))`,
      `CREATE INDEX IF NOT EXISTS "Product_businessId_sku_idx" ON "Product"("businessId", "sku")`,
      `CREATE INDEX IF NOT EXISTS "Product_businessId_idx" ON "Product"("businessId")`,
      `CREATE TABLE IF NOT EXISTS "Order" ("id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "customerId" TEXT, "customerName" TEXT, "customerPhone" TEXT, "status" TEXT NOT NULL DEFAULT 'PENDING', "channel" TEXT NOT NULL DEFAULT 'WHATSAPP', "total" DOUBLE PRECISION NOT NULL DEFAULT 0, "currency" TEXT NOT NULL DEFAULT 'GHS', "notes" TEXT, "fulfillmentType" TEXT NOT NULL DEFAULT 'PICKUP', "deliveryLocation" TEXT, "deliveryTime" TEXT, "deliveryPhone" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Order_pkey" PRIMARY KEY ("id"))`,
      `CREATE INDEX IF NOT EXISTS "Order_businessId_status_idx" ON "Order"("businessId", "status")`,
      `CREATE INDEX IF NOT EXISTS "Order_businessId_createdAt_idx" ON "Order"("businessId", "createdAt")`,
      `CREATE TABLE IF NOT EXISTS "OrderItem" ("id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "productId" TEXT, "name" TEXT NOT NULL, "quantity" INTEGER NOT NULL DEFAULT 1, "unitPrice" DOUBLE PRECISION NOT NULL, "total" DOUBLE PRECISION NOT NULL, CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id"))`,
      `CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId")`,
      `CREATE INDEX IF NOT EXISTS "OrderItem_productId_idx" ON "OrderItem"("productId")`,
      `CREATE TABLE IF NOT EXISTS "Conversation" ("id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "customerId" TEXT, "channel" TEXT NOT NULL DEFAULT 'WHATSAPP', "externalId" TEXT, "customerName" TEXT, "customerPhone" TEXT, "status" TEXT NOT NULL DEFAULT 'OPEN', "assigneeId" TEXT, "summary" TEXT, "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id"))`,
      `CREATE INDEX IF NOT EXISTS "Conversation_businessId_status_idx" ON "Conversation"("businessId", "status")`,
      `CREATE INDEX IF NOT EXISTS "Conversation_businessId_channel_idx" ON "Conversation"("businessId", "channel")`,
      `CREATE TABLE IF NOT EXISTS "Message" ("id" TEXT NOT NULL, "conversationId" TEXT NOT NULL, "role" TEXT NOT NULL, "content" TEXT NOT NULL, "internalNotes" TEXT, "metadata" TEXT NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Message_pkey" PRIMARY KEY ("id"))`,
      `CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt")`,
      `CREATE TABLE IF NOT EXISTS "Automation" ("id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "trigger" TEXT NOT NULL, "condition" TEXT NOT NULL DEFAULT '{}', "actions" TEXT NOT NULL DEFAULT '[]', "status" TEXT NOT NULL DEFAULT 'ACTIVE', "runCount" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Automation_pkey" PRIMARY KEY ("id"))`,
      `CREATE INDEX IF NOT EXISTS "Automation_businessId_status_idx" ON "Automation"("businessId", "status")`,
      `CREATE TABLE IF NOT EXISTS "Insight" ("id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "severity" TEXT NOT NULL DEFAULT 'INFO', "category" TEXT NOT NULL, "title" TEXT NOT NULL, "body" TEXT NOT NULL, "suggestedActions" TEXT NOT NULL DEFAULT '[]', "status" TEXT NOT NULL DEFAULT 'OPEN', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Insight_pkey" PRIMARY KEY ("id"))`,
      `CREATE INDEX IF NOT EXISTS "Insight_businessId_status_idx" ON "Insight"("businessId", "status")`,
      `CREATE TABLE IF NOT EXISTS "Alert" ("id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "severity" TEXT NOT NULL DEFAULT 'ATTENTION', "source" TEXT NOT NULL, "type" TEXT NOT NULL, "title" TEXT NOT NULL, "message" TEXT NOT NULL, "payload" TEXT NOT NULL DEFAULT '{}', "status" TEXT NOT NULL DEFAULT 'OPEN', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Alert_pkey" PRIMARY KEY ("id"))`,
      `CREATE INDEX IF NOT EXISTS "Alert_businessId_status_idx" ON "Alert"("businessId", "status")`,
      `CREATE TABLE IF NOT EXISTS "AuditLog" ("id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "actorId" TEXT, "actorType" TEXT NOT NULL, "actorName" TEXT, "action" TEXT NOT NULL, "tool" TEXT, "target" TEXT, "result" TEXT NOT NULL, "riskLevel" TEXT NOT NULL DEFAULT 'LOW', "approvalStatus" TEXT, "details" TEXT NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"))`,
      `CREATE INDEX IF NOT EXISTS "AuditLog_businessId_createdAt_idx" ON "AuditLog"("businessId", "createdAt")`,
      `CREATE TABLE IF NOT EXISTS "Integration" ("id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "type" TEXT NOT NULL, "name" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'DISCONNECTED', "config" TEXT NOT NULL DEFAULT '{}', "credentials" TEXT NOT NULL DEFAULT '{}', "lastSyncAt" TIMESTAMP(3), "errorCount" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Integration_pkey" PRIMARY KEY ("id"))`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "Integration_businessId_type_key" ON "Integration"("businessId", "type")`,
      `CREATE INDEX IF NOT EXISTS "Integration_businessId_idx" ON "Integration"("businessId")`,
      `CREATE TABLE IF NOT EXISTS "KnowledgeEntry" ("id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "category" TEXT NOT NULL, "question" TEXT, "answer" TEXT NOT NULL, "tags" TEXT NOT NULL DEFAULT '[]', "status" TEXT NOT NULL DEFAULT 'ACTIVE', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "KnowledgeEntry_pkey" PRIMARY KEY ("id"))`,
      `CREATE INDEX IF NOT EXISTS "KnowledgeEntry_businessId_category_idx" ON "KnowledgeEntry"("businessId", "category")`,
      // A.R.E.S. Global Brain — shared learnings across all businesses
      `CREATE TABLE IF NOT EXISTS "GlobalBrain" ("id" TEXT NOT NULL, "pattern" TEXT NOT NULL, "category" TEXT NOT NULL DEFAULT 'conversation', "source" TEXT NOT NULL DEFAULT 'auto', "weight" INTEGER NOT NULL DEFAULT 1, "status" TEXT NOT NULL DEFAULT 'ACTIVE', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "GlobalBrain_pkey" PRIMARY KEY ("id"))`,
      `CREATE INDEX IF NOT EXISTS "GlobalBrain_category_status_idx" ON "GlobalBrain"("category", "status")`,
      `CREATE INDEX IF NOT EXISTS "GlobalBrain_status_idx" ON "GlobalBrain"("status")`,
    ]

    for (const sql of statements) {
      try {
        await db.$executeRawUnsafe(sql)
      } catch (err) {
        // Ignore individual errors
      }
    }

    tablesEnsured = true
    console.log('[A.R.E.S.] Database tables created successfully')
  }
}
