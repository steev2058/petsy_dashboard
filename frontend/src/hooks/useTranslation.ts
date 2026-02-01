import { useStore } from '../store/useStore';
import { translations, TranslationKey } from '../i18n/translations';

export const useTranslation = () => {
  const language = useStore((state) => state.language);
  
  const t = (key: TranslationKey): string => {
    return translations[language][key] || key;
  };
  
  const isRTL = language === 'ar';
  
  return { t, language, isRTL };
};
