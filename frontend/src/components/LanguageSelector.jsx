import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Globe } from 'lucide-react';

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'kz', name: 'Қазақша', flag: '🇰🇿' },
];

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0];

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative overflow-hidden backdrop-blur-xl bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-xl border border-white/30 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-white/20 before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/10 before:to-white/0 before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700 flex items-center gap-2"
        aria-label="Select language"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Globe className="w-5 h-5" />
        <span className="text-xl">{currentLanguage.flag}</span>
        <span className="hidden sm:inline font-semibold">{currentLanguage.name}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 mt-2 w-56 backdrop-blur-2xl bg-gradient-to-br from-indigo-950/95 via-purple-950/95 to-indigo-950/95 border border-white/20 rounded-2xl shadow-2xl z-50 py-2 overflow-hidden">
            <div className="px-2 py-1">
              <p className="text-xs font-semibold text-gray-400 px-3 py-2 uppercase tracking-wider">
                {currentLanguage.code === 'en' ? 'Select Language' : currentLanguage.code === 'ru' ? 'Выберите язык' : 'Тілді таңдаңыз'}
              </p>
            </div>
            <div className="border-t border-white/10 my-1" />
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all duration-200 hover:bg-white/10 ${
                  currentLanguage.code === lang.code
                    ? 'bg-gradient-to-r from-orange-600/30 via-pink-600/30 to-violet-600/30 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
                role="option"
                aria-selected={currentLanguage.code === lang.code}
              >
                <span className="text-2xl">{lang.flag}</span>
                <span className="font-medium">{lang.name}</span>
                {currentLanguage.code === lang.code && (
                  <span className="ml-auto text-pink-400">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
