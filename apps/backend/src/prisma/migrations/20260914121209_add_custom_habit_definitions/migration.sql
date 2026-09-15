-- CreateTable
CREATE TABLE "CustomHabit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "unit" TEXT,
    "target" DOUBLE PRECISION,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomHabit_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CustomHabit" ADD CONSTRAINT "CustomHabit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
