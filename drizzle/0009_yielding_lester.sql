-- First, free the column from enum constraints
ALTER TABLE "reports" ALTER COLUMN "category" SET DATA TYPE text;

-- Now we can safely map old enum values to new ones
UPDATE "reports" SET "category" = 'reptile' WHERE "category" = 'fauna_observation';
UPDATE "reports" SET "category" = 'plante_vasculaire' WHERE "category" = 'flora_observation';

-- Recreate the enum with all 33 values
DROP TYPE IF EXISTS "public"."report_category";
CREATE TYPE "public"."report_category" AS ENUM(
  'dangerous_tree',
  'fallen_tree',
  'littering',
  'blocked_trail',
  'damaged_trail',
  'unofficial_trail',
  'bridge_repair',
  'damaged_infrastructure',
  'signage_fix',
  'site_maintenance',
  'maintenance_other',
  'bicycles',
  'motor_vehicle',
  'foraging',
  'off_trail',
  'encroachment',
  'unleashed_dog',
  'dog_waste',
  'campfire',
  'built_shelter',
  'homeless_camp',
  'illegal_dumping',
  'citizen_other',
  'reptile',
  'insecte',
  'oiseau',
  'amphibien',
  'mammifere',
  'invertebre',
  'mollusque',
  'poisson',
  'plante_vasculaire',
  'bryophyte'
);

-- Convert back to enum
ALTER TABLE "reports" ALTER COLUMN "category" SET DATA TYPE "public"."report_category" USING "category"::"public"."report_category";

-- Add statut column
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "statut" text;