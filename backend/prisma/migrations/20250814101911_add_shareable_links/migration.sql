-- CreateTable
CREATE TABLE "shareable_links" (
    "id" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "organogramData" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "shareable_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shareable_links_shareId_key" ON "shareable_links"("shareId");
