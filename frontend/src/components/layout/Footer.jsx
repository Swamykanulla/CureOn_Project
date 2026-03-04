import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram, Stethoscope } from "lucide-react";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { t } = useTranslation();

  const footerLinks = {
    company: [
      { name: t("landing.footer.links.aboutUs"), href: "/#about" },
      { name: t("landing.footer.links.careers"), href: "#" },
      { name: t("landing.footer.links.press"), href: "#" },
      { name: t("landing.footer.links.blog"), href: "#" },
    ],
    services: [
      { name: t("landing.footer.links.videoConsultation"), href: "#" },
      { name: t("landing.footer.links.findDoctors"), href: "#" },
      { name: t("landing.footer.links.bookAppointment"), href: "#" },
      { name: t("landing.footer.links.healthRecords"), href: "#" },
    ],
    support: [
      { name: t("landing.footer.links.helpCenter"), href: "#" },
      { name: t("landing.footer.links.contactUs"), href: "/#contact" },
      { name: t("landing.footer.links.privacyPolicy"), href: "#" },
      { name: t("landing.footer.links.termsOfService"), href: "#" },
    ],
  };

  const socialLinks = [
    { icon: Facebook, href: "#" },
    { icon: Twitter, href: "#" },
    { icon: Linkedin, href: "#" },
    { icon: Instagram, href: "#" },
  ];

  return (
    <footer id="contact" className="bg-foreground text-primary-foreground scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer */}
        <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Stethoscope className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-xl">{t("landing.brandName")}</span>
            </Link>
            <p className="text-primary-foreground/70 mb-6 max-w-sm">
              {t("landing.footer.brandDescription")}
            </p>
            <div className="space-y-3">
              <a href="mailto:support@cureon.com" className="flex items-center gap-3 text-primary-foreground/70 hover:text-primary transition-colors">
                <Mail className="w-5 h-5" />
                <span>support@cureon.com</span>
              </a>
              <a href="tel:+1-800-CUREON" className="flex items-center gap-3 text-primary-foreground/70 hover:text-primary transition-colors">
                <Phone className="w-5 h-5" />
                <span>1-800-CUREON</span>
              </a>
              <div className="flex items-center gap-3 text-primary-foreground/70">
                <MapPin className="w-5 h-5" />
                <span>123 Health Street, Medical City</span>
              </div>
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h4 className="font-semibold mb-4">{t("landing.footer.columns.company")}</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link to={link.href} className="text-primary-foreground/70 hover:text-primary transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t("landing.footer.columns.services")}</h4>
            <ul className="space-y-3">
              {footerLinks.services.map((link) => (
                <li key={link.name}>
                  <Link to={link.href} className="text-primary-foreground/70 hover:text-primary transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t("landing.footer.columns.support")}</h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link to={link.href} className="text-primary-foreground/70 hover:text-primary transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-primary-foreground/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-primary-foreground/60 text-sm">
            © {currentYear} {t("landing.footer.rightsReserved")}
          </p>
          <div className="flex items-center gap-4">
            {socialLinks.map((social, index) => (
              <a
                key={index}
                href={social.href}
                className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all"
              >
                <social.icon className="w-5 h-5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
