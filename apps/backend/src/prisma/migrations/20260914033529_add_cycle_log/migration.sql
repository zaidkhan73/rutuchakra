-- CreateTable
CREATE TABLE "CycleLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CycleLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CycleLog" ADD CONSTRAINT "CycleLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
