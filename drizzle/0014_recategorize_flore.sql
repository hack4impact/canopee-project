ALTER TABLE "reports" ALTER COLUMN "category" SET DATA TYPE text;--> statement-breakpoint
UPDATE "reports" SET "category" = 'espece_exotique'
WHERE "category" = 'plante_vasculaire' AND "species" IN (
    'Alliaire officinale',
    'Châtaigne d’eau',
    'Érable de Norvège',
    'Myriophylle à épis',
    'Nerprun bourdaine',
    'Nerprun cathartique',
    'Renouée de Bohème',
    'Renouée de Sakhaline',
    'Renouée du Japon',
    'Roseau commun',
    'Stratiote faux-aloès',
    'Alpiste roseau',
    'Berce du Caucase',
    'Cabomba de Caroline',
    'Célastre asiatique',
    'Chèvrefeuille de Maack',
    'Dompte-venin de Russie',
    'Dompte-venin noir',
    'Égopode podagraire',
    'Élodée dense',
    'Épine-vinette du Japon',
    'Grand pétasite',
    'Hydrille verticillée',
    'Hydrocharide grenouillette',
    'Impatiente glanduleuse',
    'Microstégie en osier',
    'Myriophylle aquatique',
    'Nitelle étoilée',
    'Oléastre à ombelles',
    'Pétasite du Japon',
    'Petite naïade',
    'Potamot crépu',
    'Renoncule ficaire'
);--> statement-breakpoint
UPDATE "reports" SET "category" = 'espece_menacee'
WHERE "category" IN ('plante_vasculaire', 'bryophyte');--> statement-breakpoint
DROP TYPE "public"."report_category";--> statement-breakpoint
CREATE TYPE "public"."report_category" AS ENUM('dangerous_tree', 'fallen_tree', 'littering', 'blocked_trail', 'damaged_trail', 'unofficial_trail', 'bridge_repair', 'damaged_infrastructure', 'signage_fix', 'site_maintenance', 'maintenance_other', 'bicycles', 'motor_vehicle', 'foraging', 'off_trail', 'encroachment', 'unleashed_dog', 'dog_waste', 'campfire', 'built_shelter', 'homeless_camp', 'illegal_dumping', 'citizen_other', 'reptile', 'insecte', 'oiseau', 'amphibien', 'mammifere', 'invertebre', 'mollusque', 'poisson', 'espece_menacee', 'espece_exotique', 'faune_flore_other');--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "category" SET DATA TYPE "public"."report_category" USING "category"::"public"."report_category";