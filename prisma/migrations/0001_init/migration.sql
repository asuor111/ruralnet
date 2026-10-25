-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "adminLevel" TEXT NOT NULL,
    "parentName" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Nigeria',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "boundingBox" JSONB,
    "geocoder" TEXT NOT NULL,
    "geocoderUrl" TEXT,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "retrievedAt" TIMESTAMP(3) NOT NULL,
    "licence" TEXT,
    "scope" TEXT,
    "description" TEXT,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopulationData" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "population" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "geographicLevel" TEXT NOT NULL,
    "quality" TEXT NOT NULL,
    "note" TEXT,
    "sourceId" TEXT,

    CONSTRAINT "PopulationData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverageData" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "coveragePct" DOUBLE PRECISION,
    "operator" TEXT,
    "quality" TEXT NOT NULL,
    "year" INTEGER,
    "sourceId" TEXT,

    CONSTRAINT "CoverageData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternetData" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "year" INTEGER,
    "scope" TEXT NOT NULL,
    "quality" TEXT NOT NULL,
    "sourceId" TEXT,

    CONSTRAINT "InternetData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FibreInfrastructure" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "geometry" JSONB NOT NULL,
    "sourceId" TEXT,

    CONSTRAINT "FibreInfrastructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectricityInfrastructure" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "type" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "sourceId" TEXT,

    CONSTRAINT "ElectricityInfrastructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subtype" TEXT,
    "name" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "sourceId" TEXT,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalInfrastructure" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "sourceId" TEXT,

    CONSTRAINT "DigitalInfrastructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectivityAssessment" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "concern" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "severity" TEXT,
    "researchRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConnectivityAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchRun" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "scoreJson" JSONB,
    "completenessPct" DOUBLE PRECISION,
    "providerStatus" JSONB,
    "errors" JSONB,
    "reportJson" JSONB,

    CONSTRAINT "ResearchRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Location_slug_key" ON "Location"("slug");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopulationData" ADD CONSTRAINT "PopulationData_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopulationData" ADD CONSTRAINT "PopulationData_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverageData" ADD CONSTRAINT "CoverageData_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverageData" ADD CONSTRAINT "CoverageData_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternetData" ADD CONSTRAINT "InternetData_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternetData" ADD CONSTRAINT "InternetData_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FibreInfrastructure" ADD CONSTRAINT "FibreInfrastructure_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectricityInfrastructure" ADD CONSTRAINT "ElectricityInfrastructure_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalInfrastructure" ADD CONSTRAINT "DigitalInfrastructure_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalInfrastructure" ADD CONSTRAINT "DigitalInfrastructure_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectivityAssessment" ADD CONSTRAINT "ConnectivityAssessment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchRun" ADD CONSTRAINT "ResearchRun_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

