-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "isFavorite" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "studio_pipeline_runs" (
    "id" TEXT NOT NULL,
    "pipeline_name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "started_at" TEXT NOT NULL,
    "completed_at" TEXT,
    "log_path" TEXT,
    "parent_run_id" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studio_pipeline_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dietary" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dislikes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cuisines" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mealsPerWeek" INTEGER NOT NULL DEFAULT 5,
    "portions" INTEGER NOT NULL DEFAULT 2,
    "maxTimeMinutes" INTEGER NOT NULL DEFAULT 30,
    "budgetWeekly" TEXT NOT NULL DEFAULT 'medium',
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "onboardingCompletedAt" TIMESTAMP(3),

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatQuota" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "max" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "ChatQuota_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_studio_pipeline_runs_created" ON "studio_pipeline_runs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_studio_pipeline_runs_parent" ON "studio_pipeline_runs"("parent_run_id");

-- CreateIndex
CREATE INDEX "idx_studio_pipeline_runs_status" ON "studio_pipeline_runs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatQuota_userId_key" ON "ChatQuota"("userId");

-- CreateIndex
CREATE INDEX "Recipe_userId_isFavorite_idx" ON "Recipe"("userId", "isFavorite");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatQuota" ADD CONSTRAINT "ChatQuota_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
