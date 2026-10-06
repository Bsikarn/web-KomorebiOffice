ALTER TABLE "User"
ADD COLUMN "avatarData" BYTEA,
ADD COLUMN "avatarMime" TEXT,
ADD COLUMN "avatarUpdatedAt" TIMESTAMP(3);

UPDATE "MeetingSpace"
SET "externalUrl" = CASE
  WHEN "room" = 'MEETING_A' THEN 'https://meet.jit.si/KomorebiOfficeMeetingA'
  WHEN "room" = 'MEETING_B' THEN 'https://meet.jit.si/KomorebiOfficeMeetingB'
  ELSE "externalUrl"
END;
