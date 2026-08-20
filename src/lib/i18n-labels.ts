import type { UiLang } from "@/lib/geo-locale";
import { translate } from "@/lib/i18n";

export function fragranceFamilyLabel(family: string, lang: UiLang = "en"): string {
  const key: Record<string, string> = {
    FLORAL: "label.floral",
    ORIENTAL: "label.oriental",
    WOODY: "label.woody",
    FRESH: "label.fresh",
    CITRUS: "label.citrus",
    SPICY: "label.spicy",
  };
  return key[family] ? translate(lang, key[family]) : family;
}

export function bottleMaterialLabel(material: string, lang: UiLang = "en"): string {
  const key: Record<string, string> = {
    GLASS: "label.glass",
    CRYSTAL: "label.crystal",
    METAL: "label.metal",
    CERAMIC: "label.ceramic",
    ACRYLIC: "label.acrylic",
  };
  return key[material] ? translate(lang, key[material]) : material;
}

export function capTypeLabel(cap: string, lang: UiLang = "en"): string {
  const key: Record<string, string> = {
    MAGNETIC: "label.magnetic",
    SPRAY: "label.spray",
    DAB_ON: "label.dabOn",
    SCREW: "label.screw",
  };
  return key[cap] ? translate(lang, key[cap]) : cap;
}

export function concentrationLabel(concentration: string, lang: UiLang = "en"): string {
  const key: Record<string, string> = {
    EDT: "label.edt",
    EDP: "label.edp",
    PARFUM: "label.parfum",
    EXTRAIT: "label.extrait",
  };
  return key[concentration] ? translate(lang, key[concentration]) : concentration;
}

export function sillageLabel(sillage: string, lang: UiLang = "en"): string {
  const key: Record<string, string> = {
    SUBTLE: "label.subtle",
    MODERATE: "label.moderate",
    INTENSE: "label.intense",
    POWERFUL: "label.powerful",
  };
  return key[sillage] ? translate(lang, key[sillage]) : sillage;
}

export function conditionLabel(_condition: string, lang: UiLang = "en"): string {
  return translate(lang, "label.new");
}
