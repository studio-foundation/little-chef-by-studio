-- DropForeignKey
ALTER TABLE "GroceryList" DROP CONSTRAINT "GroceryList_recipeId_fkey";

-- DropForeignKey
ALTER TABLE "Recipe" DROP CONSTRAINT "Recipe_planId_fkey";

-- DropIndex
DROP INDEX "GroceryList_recipeId_key";

-- AlterTable
ALTER TABLE "GroceryList" DROP COLUMN "recipeId",
ADD COLUMN     "planId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Recipe" DROP COLUMN "planId",
DROP COLUMN "rawJson",
ADD COLUMN     "calories" INTEGER,
ADD COLUMN     "cuisine" TEXT,
ADD COLUMN     "emoji" TEXT,
ADD COLUMN     "ingredients" JSONB NOT NULL,
ADD COLUMN     "notes" JSONB,
ADD COLUMN     "portions" INTEGER,
ADD COLUMN     "steps" JSONB NOT NULL,
ADD COLUMN     "timeMinutes" INTEGER,
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "WeeklyPlanRecipe" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyPlanRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyPlanRecipe_planId_recipeId_key" ON "WeeklyPlanRecipe"("planId", "recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyPlanRecipe_planId_position_key" ON "WeeklyPlanRecipe"("planId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "GroceryList_planId_key" ON "GroceryList"("planId");

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyPlanRecipe" ADD CONSTRAINT "WeeklyPlanRecipe_planId_fkey" FOREIGN KEY ("planId") REFERENCES "WeeklyPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyPlanRecipe" ADD CONSTRAINT "WeeklyPlanRecipe_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroceryList" ADD CONSTRAINT "GroceryList_planId_fkey" FOREIGN KEY ("planId") REFERENCES "WeeklyPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
