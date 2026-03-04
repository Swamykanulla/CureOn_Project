import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Stethoscope } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSelector from "@/components/dashboard/LanguageSelector";
import { useUser } from "../../context/UserContext";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, logout } = useUser();

  const handleLogout = () => {
    logout();
    navigate("/");
    setIsOpen(false);
  };

  const getDashboardLink = () => {
    if (!user) return "/";
    return `/${user.role}/dashboard`;
  };

  const navLinks = [
    { name: t("landing.nav.home"), href: "/" },
    { name: t("landing.nav.services"), href: "/#services" },
    { name: t("landing.nav.about"), href: "/#about" },
    { name: t("landing.nav.contact"), href: "/#contact" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">
              {t("landing.brandName")}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="nav-link text-sm font-medium"
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-4">
            {/* Language Selector */}
            <LanguageSelector />

            {user ? (
              <>
                <Button variant="ghost" onClick={() => navigate(getDashboardLink())}>
                  Dashboard
                </Button>
                <Button variant="hero" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/login")}>
                  {t("landing.nav.signIn")}
                </Button>
                <Button variant="hero" onClick={() => navigate("/register")}>
                  {t("landing.nav.getStarted")}
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? (
              <X className="w-6 h-6 text-foreground" />
            ) : (
              <Menu className="w-6 h-6 text-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="lg:hidden py-4 border-t border-border/50 animate-fade-in">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="px-4 py-3 text-foreground hover:bg-secondary rounded-lg transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <div className="px-4 py-2">
                <LanguageSelector />
              </div>
              <hr className="my-2 border-border/50" />
              <div className="flex flex-col gap-2 px-4">
                {user ? (
                  <>
                    <Button variant="outline" onClick={() => {
                      navigate(getDashboardLink());
                      setIsOpen(false);
                    }}>
                      Dashboard
                    </Button>
                    <Button variant="hero" onClick={handleLogout}>
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => navigate("/login")}>
                      {t("landing.nav.signIn")}
                    </Button>
                    <Button variant="hero" onClick={() => navigate("/register")}>
                      {t("landing.nav.getStarted")}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
