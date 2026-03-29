-- CreateTable
CREATE TABLE "LightUploadHistory" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "sheetName" TEXT NOT NULL,
    "sheetNames" JSONB NOT NULL,
    "headers" JSONB NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "previewCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LightUploadHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LightUploadHistory_createdAt_idx" ON "LightUploadHistory"("createdAt");
