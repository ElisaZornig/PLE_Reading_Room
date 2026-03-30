import { getLocales } from "expo-localization";
import { I18n } from "i18n-js";
import en from "./en";
import nl from "./nl";

export const i18n = new I18n({
    nl,
    en,
});

const deviceLanguage = getLocales()[0]?.languageCode ?? "nl";

i18n.defaultLocale = "en";
i18n.enableFallback = true;
// i18n.locale = deviceLanguage;
i18n.locale = "en"

export const t = (key: string, options?: Record<string, unknown>) =>
    i18n.t(key, options) as string;