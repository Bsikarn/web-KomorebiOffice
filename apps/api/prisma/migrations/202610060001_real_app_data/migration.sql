ALTER TABLE "User" ADD COLUMN "jobTitle" TEXT;

CREATE TABLE "UserPreference" (
  "userId" TEXT NOT NULL,
  "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
  "language" TEXT NOT NULL DEFAULT 'English',
  "theme" TEXT NOT NULL DEFAULT 'komorebi-light',
  CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "LeaveAllowance" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "LeaveType" NOT NULL,
  "allowance" INTEGER NOT NULL,
  CONSTRAINT "LeaveAllowance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DirectMessage" (
  "id" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MeetingSpace" (
  "id" TEXT NOT NULL,
  "room" "OfficeRoom" NOT NULL,
  "name" TEXT NOT NULL,
  "externalUrl" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "MeetingSpace_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeaveAllowance_userId_type_key" ON "LeaveAllowance"("userId", "type");
CREATE INDEX "DirectMessage_senderId_recipientId_createdAt_idx" ON "DirectMessage"("senderId", "recipientId", "createdAt");
CREATE INDEX "DirectMessage_recipientId_senderId_createdAt_idx" ON "DirectMessage"("recipientId", "senderId", "createdAt");
CREATE UNIQUE INDEX "MeetingSpace_room_key" ON "MeetingSpace"("room");

ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaveAllowance" ADD CONSTRAINT "LeaveAllowance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
