import { Activity, Heart, Award, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

const AboutSection = () => {
  const { t } = useTranslation();

  return (
    <section id="about" className="pt-10 lg:pt-16 pb-20 lg:pb-32 bg-secondary/30 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            {t("landing.about.tag")}
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-relaxed pb-2">
            {t("landing.about.title")}
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {t("landing.about.description")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-card p-6 rounded-2xl border border-border/50 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-xl text-foreground mb-2">{t("landing.about.features.advancedTechnology.title")}</h3>
            <p className="text-muted-foreground">{t("landing.about.features.advancedTechnology.desc")}</p>
          </div>

          <div className="bg-card p-6 rounded-2xl border border-border/50 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Heart className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-xl text-foreground mb-2">{t("landing.about.features.patientCentric.title")}</h3>
            <p className="text-muted-foreground">{t("landing.about.features.patientCentric.desc")}</p>
          </div>

          <div className="bg-card p-6 rounded-2xl border border-border/50 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-xl text-foreground mb-2">{t("landing.about.features.certifiedSpecialists.title")}</h3>
            <p className="text-muted-foreground">{t("landing.about.features.certifiedSpecialists.desc")}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
