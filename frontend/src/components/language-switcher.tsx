import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SUPPORTED_LANGUAGES } from '@/i18n';

const LANG_NAMES: Record<string, string> = {
  uz: "O'zbekcha",
  ru: 'Русский',
};

type Props = {
  compact?: boolean;
};

export function LanguageSwitcher({ compact = false }: Props) {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage ?? 'uz';

  const handleChange = (value: string) => {
    void i18n.changeLanguage(value);
  };

  if (compact) {
    return (
      <Select value={current} onValueChange={handleChange}>
        <SelectTrigger
          className="h-9 w-auto gap-1.5 border-0 bg-transparent px-2 text-sm text-slate-700 hover:bg-slate-100 focus:ring-0 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <Languages className="size-4" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_LANGUAGES.map((lng) => (
            <SelectItem key={lng} value={lng}>
              {LANG_NAMES[lng]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="flex gap-1">
      {SUPPORTED_LANGUAGES.map((lng) => (
        <Button
          key={lng}
          size="sm"
          variant={current === lng ? 'secondary' : 'ghost'}
          onClick={() => handleChange(lng)}
        >
          {LANG_NAMES[lng]}
        </Button>
      ))}
    </div>
  );
}
