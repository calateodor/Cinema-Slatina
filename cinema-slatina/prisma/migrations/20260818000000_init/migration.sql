-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CASHIER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hall" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL,
    "baseCapacity" INTEGER NOT NULL DEFAULT 100,
    "extraCapacity" INTEGER NOT NULL DEFAULT 20,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Hall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movie" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "originalTitle" TEXT,
    "imdbId" TEXT,
    "imdbUrl" TEXT,
    "tmdbId" INTEGER,
    "synopsis" TEXT,
    "posterUrl" TEXT,
    "backdropUrl" TEXT,
    "trailerUrl" TEXT,
    "genres" TEXT,
    "runtimeMin" INTEGER,
    "releaseYear" INTEGER,
    "ageRating" TEXT DEFAULT 'AG',
    "imdbRating" DOUBLE PRECISION,
    "director" TEXT,
    "cast" TEXT,
    "metadataSyncedAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "comingSoon" BOOLEAN NOT NULL DEFAULT false,
    "comingSoonFrom" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeekSchedule" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeekSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Screening" (
    "id" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "hallId" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "is3D" BOOLEAN NOT NULL DEFAULT false,
    "isDubbed" BOOLEAN NOT NULL DEFAULT false,
    "reservationsOpen" BOOLEAN NOT NULL DEFAULT true,
    "capacityOverride" INTEGER,
    "allowExtraSeats" BOOLEAN NOT NULL DEFAULT true,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Screening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "screeningId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "age" INTEGER,
    "isAdult" BOOLEAN NOT NULL DEFAULT true,
    "seats" INTEGER NOT NULL DEFAULT 1,
    "extraSeats" INTEGER NOT NULL DEFAULT 0,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "source" TEXT NOT NULL DEFAULT 'ONLINE',
    "note" TEXT,
    "createdById" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'RESERVATION',
    "payload" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallTicket" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "phone" TEXT,
    "customerName" TEXT,
    "age" INTEGER,
    "isAdult" BOOLEAN,
    "seats" INTEGER NOT NULL DEFAULT 1,
    "screeningId" TEXT,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reservationId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClosureNotice" (
    "id" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClosureNotice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceBani" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Hall_slug_key" ON "Hall"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Movie_slug_key" ON "Movie"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Movie_imdbId_key" ON "Movie"("imdbId");

-- CreateIndex
CREATE UNIQUE INDEX "WeekSchedule_weekStart_key" ON "WeekSchedule"("weekStart");

-- CreateIndex
CREATE INDEX "Screening_startsAt_idx" ON "Screening"("startsAt");

-- CreateIndex
CREATE INDEX "Screening_weekId_idx" ON "Screening"("weekId");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_code_key" ON "Reservation"("code");

-- CreateIndex
CREATE INDEX "Reservation_screeningId_status_idx" ON "Reservation"("screeningId", "status");

-- CreateIndex
CREATE INDEX "Reservation_phone_idx" ON "Reservation"("phone");

-- CreateIndex
CREATE INDEX "OtpCode_phone_purpose_idx" ON "OtpCode"("phone", "purpose");

-- CreateIndex
CREATE INDEX "CallTicket_status_createdAt_idx" ON "CallTicket"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ClosureNotice_isActive_startDate_idx" ON "ClosureNotice"("isActive", "startDate");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Screening" ADD CONSTRAINT "Screening_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screening" ADD CONSTRAINT "Screening_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "Hall"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screening" ADD CONSTRAINT "Screening_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "WeekSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_screeningId_fkey" FOREIGN KEY ("screeningId") REFERENCES "Screening"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallTicket" ADD CONSTRAINT "CallTicket_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallTicket" ADD CONSTRAINT "CallTicket_screeningId_fkey" FOREIGN KEY ("screeningId") REFERENCES "Screening"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
