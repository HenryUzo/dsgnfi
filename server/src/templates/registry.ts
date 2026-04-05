import { agencyStarterManifest } from "./manifests/agencyStarter";
import { clinicStarterManifest } from "./manifests/clinicStarter";
import { logisticsStarterManifest } from "./manifests/logisticsStarter";
import { realEstateStarterManifest } from "./manifests/realEstateStarter";
import { restaurantStarterManifest } from "./manifests/restaurantStarter";
import { schoolStarterManifest } from "./manifests/schoolStarter";
import type { TemplateManifest } from "./types";

const manifests = [
  agencyStarterManifest,
  clinicStarterManifest,
  schoolStarterManifest,
  restaurantStarterManifest,
  realEstateStarterManifest,
  logisticsStarterManifest,
] as const satisfies readonly TemplateManifest[];

export function listTemplateManifests(): TemplateManifest[] {
  return [...manifests];
}

export function getTemplateManifest(templateKey: string): TemplateManifest | null {
  return manifests.find((manifest) => manifest.key === templateKey) ?? null;
}

