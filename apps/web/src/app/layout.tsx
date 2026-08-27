import type { Metadata } from 'next';
import { Fraunces, Source_Sans_3 } from 'next/font/google';
import './globals.css';
import { GOOGLE_FONTS_HREF } from '@/lib/textPresets';
import { ThemeProvider } from '@/components/ThemeProvider';
import { MeProvider } from '@/components/auth/MeProvider';
import { BrandProvider } from '@/components/brand/BrandProvider';

const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SN Editor',
  description: 'SN Editor — online image and video design editor for social content and ads.',
};

const themeInitScript = `
(function(){try{
  var t=localStorage.getItem('sn-editor-theme');
  var dark=t!=='light';
  if(dark)document.documentElement.classList.add('dark');
  document.documentElement.style.colorScheme=dark?'dark':'light';
}catch(e){document.documentElement.classList.add('dark');}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={GOOGLE_FONTS_HREF} rel="stylesheet" />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <BrandProvider>
            <MeProvider>{children}</MeProvider>
          </BrandProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
