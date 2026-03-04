import { 
  Video, 
  Calendar, 
  FileText, 
  Shield, 
  Clock, 
  MessageSquare,
  Stethoscope,
  Pill
} from "lucide-react";
import { useTranslation } from "react-i18next";

const FeaturesSection = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: Video,
      title: t("landing.features.items.videoConsultations.title"),
      description: t("landing.features.items.videoConsultations.desc"),
      color: "bg-primary/10 text-primary",
    },
    {
      icon: Calendar,
      title: t("landing.features.items.easyScheduling.title"),
      description: t("landing.features.items.easyScheduling.desc"),
      color: "bg-accent/10 text-accent",
    },
    {
      icon: FileText,
      title: t("landing.features.items.digitalRecords.title"),
      description: t("landing.features.items.digitalRecords.desc"),
      color: "bg-success/10 text-success",
    },
    {
      icon: Shield,
      title: t("landing.features.items.securePrivate.title"),
      description: t("landing.features.items.securePrivate.desc"),
      color: "bg-warning/10 text-warning",
    },
    {
      icon: Clock,
      title: t("landing.features.items.support247.title"),
      description: t("landing.features.items.support247.desc"),
      color: "bg-primary/10 text-primary",
    },
    {
      icon: MessageSquare,
      title: t("landing.features.items.instantMessaging.title"),
      description: t("landing.features.items.instantMessaging.desc"),
      color: "bg-accent/10 text-accent",
    },
    {
      icon: Stethoscope,
      title: t("landing.features.items.expertDoctors.title"),
      description: t("landing.features.items.expertDoctors.desc"),
      color: "bg-success/10 text-success",
    },
    {
      icon: Pill,
      title: t("landing.features.items.ePrescriptions.title"),
      description: t("landing.features.items.ePrescriptions.desc"),
      color: "bg-warning/10 text-warning",
    },
  ];

  return (
    <section id="services" className="pt-10 lg:pt-16 pb-10 lg:pb-16 bg-background scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            {t("landing.features.tag")}
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-relaxed pb-2">
            {t("landing.features.title")}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t("landing.features.description")}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group dashboard-card p-6 hover-lift cursor-pointer"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`w-14 h-14 rounded-2xl ${feature.color} flex items-center justify-center mb-5 transition-transform group-hover:scale-110`}>
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="font-semibold text-lg text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
