"use client";

// Hidden for V1 (keep for later restore): language switcher dropdown
// import LocaleSwitcher from "@/components/LocaleSwitcher";
// Hidden for V1 (keep for later restore): dark/light theme toggle
// import { ThemeToggle } from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  // DropdownMenuGroup,
  // DropdownMenuItem,
  DropdownMenuLabel,
  // DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link as I18nLink } from "@/i18n/routing";
// Hidden for V1 (keep for later restore): header links
// import { HeaderLink } from "@/types/common";
import { Menu } from "lucide-react";
// Hidden for V1 (keep for later restore): brand title translation
// import { useTranslations } from "next-intl";
// Hidden for V1 (keep for later restore): logo image
// import Image from "next/image";
import RestaurantMailAILogo from "@/components/RestaurantMailAILogo";

export default function MobileMenu() {
  // Hidden for V1 (keep for later restore): brand title translation
  // const t = useTranslations("Home");
  // Hidden for V1 (keep for later restore): header links
  // const tHeader = useTranslations("Header");
  // const headerLinks: HeaderLink[] = tHeader.raw("links");

  return (
    <div className="flex items-center gap-1 md:hidden">
      {/* Hidden for V1 (keep for later restore): <LocaleSwitcher /> */}
      {/* Hidden for V1 (keep for later restore): <ThemeToggle /> */}
      <DropdownMenu>
        <DropdownMenuTrigger className="p-2">
          <Menu className="h-5 w-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <I18nLink
              href="/"
              title="Restaurant Mail AI"
              prefetch={true}
              className="flex items-center space-x-2 font-bold"
            >
              <RestaurantMailAILogo className="w-7 h-7" />
              {/* Hidden for V1 (keep for later restore): logo
              <Image
                alt="Restaurant Mail AI"
                src="/logo.svg"
                className="w-6 h-6"
                width={32}
                height={32}
              />
              */}
              <span className="highlight-text">Restaurant Mail AI</span>
            </I18nLink>
          </DropdownMenuLabel>
          {/* Hidden for V1 (keep for later restore): header links dropdown */}
          {/*
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {headerLinks.map((link) => (
              <DropdownMenuItem key={link.name}>
                <I18nLink
                  href={link.href}
                  title={link.name}
                  prefetch={
                    link.target && link.target === "_blank" ? false : true
                  }
                  target={link.target || "_self"}
                  rel={link.rel || undefined}
                >
                  {link.name}
                </I18nLink>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          */}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
