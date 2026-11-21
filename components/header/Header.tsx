// Hidden for V1 (keep for later restore): header links (Blog/About/Source Code/Pro Version)
// import HeaderLinks from "@/components/header/HeaderLinks";
import MobileMenu from "@/components/header/MobileMenu";
// Hidden for V1 (keep for later restore): language switcher dropdown
// import LocaleSwitcher from "@/components/LocaleSwitcher";
// Hidden for V1 (keep for later restore): dark/light theme toggle
// import { ThemeToggle } from "@/components/ThemeToggle";
// Hidden for V1 (keep for later restore): site config (used by logo)
// import { siteConfig } from "@/config/site";
import { Link as I18nLink } from "@/i18n/routing";
// Hidden for V1 (keep for later restore): brand title translation
// import { useTranslations } from "next-intl";
// Hidden for V1 (keep for later restore): logo image
// import Image from "next/image";
import RestaurantMailAILogo from "@/components/RestaurantMailAILogo";

const Header = () => {
  // Hidden for V1 (keep for later restore): brand title translation
  // const t = useTranslations("Home");

  return (
    <header className="py-2 px-6 backdrop-blur-md sticky top-0 z-50">
      <nav className="flex justify-between items-center w-full mx-auto">
        <div className="flex items-center space-x-6 md:space-x-12">
          <I18nLink
            href="/"
            prefetch={false}
            className="flex items-center space-x-2 font-bold"
          >
            <RestaurantMailAILogo className="w-7 h-7" />
            {/* Hidden for V1 (keep for later restore): logo
            <Image
              alt={siteConfig.name}
              src="/logo.svg"
              className="w-6 h-6"
              width={32}
              height={32}
            />
            */}
            <span className="text-gray-800 dark:text-gray-200">
              Restaurant Mail AI
            </span>
          </I18nLink>
          {/* Hidden for V1 (keep for later restore): <HeaderLinks /> */}
        </div>

        <div className="flex items-center gap-x-2 md:gap-x-4 lg:gap-x-6 flex-1 justify-end">
          {/* PC */}
          <div className="hidden md:flex items-center gap-x-4">
            {/* Hidden for V1 (keep for later restore): <LocaleSwitcher /> */}
            {/* Hidden for V1 (keep for later restore): <ThemeToggle /> */}
          </div>

          {/* Mobile */}
          <MobileMenu />
        </div>
      </nav>
    </header>
  );
};

export default Header;
