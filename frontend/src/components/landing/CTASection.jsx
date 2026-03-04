import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Shield, Clock, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

const CTASection = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const stats = [
    { icon: Users, value: "50K+", label: t("landing.cta.stats.activePatients") },
    { icon: Clock, value: "24/7", label: t("landing.cta.stats.availableSupport") },
    { icon: Shield, value: "100%", label: t("landing.cta.stats.securePlatform") },
  ];

  return (
    <section className="py-20 lg:py-32 relative overflow-hidden bg-primary">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-primary-dark/20 pointer-events-none rounded-l-[100px]" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
           <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground leading-relaxed pb-4">
  {t("landing.cta.title")}
</h2>

<p className="text-primary-foreground/90 text-lg mb-8 max-w-xl mx-auto lg:mx-0">
  {t("landing.cta.description")}
</p>


            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <Button 
                variant="secondary"
                size="xl"
                onClick={() => navigate("/register")}
                className="w-full sm:w-auto bg-background text-foreground hover:bg-background/90"
              >
                {t("landing.cta.createAccount")}
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost"
                size="xl"
                className="w-full sm:w-auto text-primary-foreground border-2 border-primary-foreground/30 hover:bg-primary-foreground/10"
              >
                {t("landing.cta.talkSupport")}
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 lg:gap-6">
            {stats.map((stat) => (
              <div 
                key={stat.label}
                className="bg-primary-foreground/10 backdrop-blur-sm rounded-2xl p-6 text-center"
              >
                <div className="w-12 h-12 mx-auto rounded-xl bg-primary-foreground/10 flex items-center justify-center mb-4">
                  <stat.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <p className="font-display text-2xl lg:text-3xl font-bold text-primary-foreground mb-1">
                  {stat.value}
                </p>
                <p className="text-primary-foreground/70 text-sm">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
