-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('PLANNED', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "EventBudgetCategory" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "allocatedAmount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventBudgetCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "budgetCategoryId" TEXT,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'PLANNED',
    "expenseDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventBudgetCategory_eventId_createdAt_idx" ON "EventBudgetCategory"("eventId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventBudgetCategory_eventId_name_key" ON "EventBudgetCategory"("eventId", "name");

-- CreateIndex
CREATE INDEX "Expense_eventId_status_idx" ON "Expense"("eventId", "status");

-- CreateIndex
CREATE INDEX "Expense_budgetCategoryId_idx" ON "Expense"("budgetCategoryId");

-- CreateIndex
CREATE INDEX "Expense_eventId_dueDate_idx" ON "Expense"("eventId", "dueDate");

-- AddForeignKey
ALTER TABLE "EventBudgetCategory" ADD CONSTRAINT "EventBudgetCategory_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_budgetCategoryId_fkey" FOREIGN KEY ("budgetCategoryId") REFERENCES "EventBudgetCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
