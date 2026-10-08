ALTER TABLE "User"
ADD COLUMN "phoneNumber" TEXT;

ALTER TABLE "Task"
ADD COLUMN "responsibility" TEXT;

ALTER TABLE "Notification"
ADD COLUMN "actionType" TEXT,
ADD COLUMN "actionTargetId" TEXT;
