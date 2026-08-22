-- CreateTable
CREATE TABLE "ComplaintPhoto" (
    "id" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "complaintId" TEXT,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplaintPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ComplaintPhoto_complaintId_key" ON "ComplaintPhoto"("complaintId");

-- CreateIndex
CREATE INDEX "ComplaintPhoto_uploaderId_idx" ON "ComplaintPhoto"("uploaderId");
