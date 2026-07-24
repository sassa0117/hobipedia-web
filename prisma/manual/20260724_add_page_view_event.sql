CREATE TABLE IF NOT EXISTS "PageViewEvent" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "itemId" TEXT NOT NULL,
  "referrerHost" TEXT,
  CONSTRAINT "PageViewEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PageViewEvent_createdAt_idx"
  ON "PageViewEvent"("createdAt");

CREATE INDEX IF NOT EXISTS "PageViewEvent_itemId_createdAt_idx"
  ON "PageViewEvent"("itemId", "createdAt");
