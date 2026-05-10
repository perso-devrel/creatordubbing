import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies, headers } from "next/headers";
import Script from "next/script";
import "@fontsource/pretendard/400.css";
import "@fontsource/pretendard/500.css";
import "@fontsource/pretendard/600.css";
import "@fontsource/pretendard/700.css";
import "@fontsource/pretendard/800.css";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";
import { SUPPORTED_LANGUAGE_COUNT } from "@/utils/languages";
import {
  DEFAULT_APP_LOCALE,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  resolvePreferredLocale,
} from "@/lib/i18n/config";
import { message } from "@/lib/i18n/messages";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dubtube.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Dubtube",
    template: "%s | Dubtube",
  },
  description: message(DEFAULT_APP_LOCALE, "metadata.landing.description", { SUPPORTED_LANGUAGE_COUNT }),
};

const themeInitScript = `try{var raw=localStorage.getItem('dubtube-theme');var state=null;var preference=null;var mode=null;if(raw){try{var parsed=JSON.parse(raw);state=parsed&&parsed.state||parsed;preference=state&&state.preference;mode=state&&state.mode||state}catch(_){mode=raw}}if(!preference&&(mode==='dark'||mode==='light'))preference=mode;var systemDark=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;if(preference==='dark'||((!preference||preference==='system')&&systemDark)){document.documentElement.classList.add('dark')}}catch(e){}`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [headersList, cookieStore] = await Promise.all([headers(), cookies()]);
  const locale = resolvePreferredLocale(
    headersList.get(LOCALE_HEADER) ?? cookieStore.get(LOCALE_COOKIE)?.value,
    DEFAULT_APP_LOCALE,
  );

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Script
          id="dubtube-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
