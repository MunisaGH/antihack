import { motion } from 'framer-motion';
import { ArrowRight, Bot, FileCheck, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

export function LandingPage() {
  const { t } = useTranslation();

  return (
    <div className="bg-orbs relative min-h-svh bg-slate-50 dark:bg-slate-950">
      <header className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <LanguageSwitcher compact />
          <ThemeToggle />
          <Link to="/login">
            <Button variant="ghost" size="sm">
              {t('auth.login')}
            </Button>
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="glass mb-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-brand-700 dark:text-brand-300">
            Powered by CAREER AI Team
          </div>

          <h1 className="text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl dark:text-slate-50">
            <span className="gradient-text">{t('landing.hero.title')}</span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
            {t('landing.hero.subtitle')}
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/login">
              <Button size="lg" className="gap-2">
                {t('landing.hero.cta')}
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mx-auto mt-24 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3"
        >
          {[
            { icon: FileCheck, key: 'resume' },
            { icon: Bot, key: 'chat' },
            { icon: Sparkles, key: 'match' },
          ].map(({ icon: Icon, key }) => (
            <div key={key} className="glass rounded-2xl p-6">
              <div className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-600 text-white shadow-sm">
                <Icon className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                {key === 'resume' && 'AI Resume Analysis'}
                {key === 'chat' && 'Adaptive Chat Interviews'}
                {key === 'match' && 'Smart Candidate Matching'}
              </h3>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
                {key === 'resume' && "Rezyumelarni vakansiyaga mosligi bo'yicha avtomatik baholash."}
                {key === 'chat' && "10 ta adaptiv savol, mavzudan chetlashsa to'xtatish."}
                {key === 'match' && "Eng mos nomzodlarni balli bo'yicha saralab chiqarish."}
              </p>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
