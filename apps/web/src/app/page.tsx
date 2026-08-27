import Link from 'next/link';
import { DiscoverSections } from '@/components/landing/DiscoverSections';
import { LandingHeroBackground } from '@/components/landing/LandingHeroBackground';
import { LandingHeroVideo } from '@/components/landing/LandingHeroVideo';
import { LandingMedia3D } from '@/components/landing/LandingMedia3D';
import { LiveTutorialLazy } from '@/components/landing/LiveTutorialLazy';
import { ProductScreenshotGallery } from '@/components/landing/ProductScreenshotGallery';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LandingFooter, LandingHeroAside, LandingHeroTitle } from '@/components/landing/LandingBrand';
import { BrandWordmark } from '@/components/brand/BrandWordmark';
import { AccountMenu } from '@/components/auth/AccountMenu';

/**
 * Landing — advanced hero (copy + YouTube tutorial) + product sections.
 */
export default function HomePage() {
  return (
    <main className="landing relative overflow-x-hidden">
      <section className="landing-hero landing-hero-compose relative min-h-[100svh] text-white">
        <LandingHeroBackground />

        <header className="landing-header relative z-30">
          <div className="landing-header-inner">
            <BrandWordmark className="landing-logo font-display" />

            <nav className="landing-menu" aria-label="Primary">
              <a className="landing-nav-link-on-dark" href="#discover">
                Templates
              </a>
              <a className="landing-nav-link-on-dark" href="#screenshots">
                Screenshots
              </a>
              <a className="landing-nav-link-on-dark" href="#tutorial">
                Live tutorial
              </a>
              <Link className="landing-nav-link-on-dark" href="/pricing">
                Pricing
              </Link>
              <Link className="landing-nav-link-on-dark" href="/editor">
                Image Editor
              </Link>
              <Link className="landing-nav-link-on-dark" href="/video">
                Video Editor
              </Link>
            </nav>

            <div className="landing-header-actions">
              <ThemeToggle className="theme-toggle-on-dark" />
              <AccountMenu onDark />
              <Link href="/editor" className="landing-cta-primary landing-cta-compact">
                Design now
              </Link>
            </div>
          </div>
        </header>

        <div className="landing-hero-split relative z-20">
          <div className="landing-hero-copy">
            <LandingHeroTitle className="landing-fade font-display text-5xl leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl" />
            <p className="landing-fade-delay landing-hero-headline mt-5 font-display text-xl leading-snug text-white sm:text-2xl lg:text-[1.75rem]">
              Design that feels finished — before you export.
            </p>
            <p className="landing-fade-delay mt-4 max-w-md text-base leading-relaxed text-white/78 sm:text-lg">
              Canva-class image editing and CapCut-simple video for brands that ship ads, posts, and
              product creatives every day.
            </p>
            <div className="landing-fade-delay mt-8 flex flex-wrap items-center gap-3">
              <Link href="/editor" className="landing-cta-primary">
                Open Image Editor
              </Link>
              <Link href="/video" className="landing-cta-on-dark">
                Open Video Editor
              </Link>
            </div>
            <LandingHeroAside className="landing-fade-delay landing-hero-aside mt-6 text-sm text-white/55" />
          </div>

          <div className="landing-fade-delay landing-hero-media">
            <LandingHeroVideo />
          </div>
        </div>
      </section>

      <section id="discover" className="discover-section scroll-mt-8">
        <div className="discover-section-inner">
          <DiscoverSections />
        </div>
      </section>

      <section id="screenshots" className="landing-section relative scroll-mt-8 px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <ProductScreenshotGallery />
        </div>
      </section>

      <section id="tutorial" className="landing-section-alt scroll-mt-8 px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <LiveTutorialLazy />
        </div>
      </section>

      <section className="landing-section relative px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl text-ink-950 sm:text-4xl">
              Formats that fill the feed
            </h2>
            <p className="mt-4 text-base text-ink-700 sm:text-lg">
              Image and video creatives across every ratio your channels need.
            </p>
          </div>
          <LandingMedia3D />
        </div>
      </section>

      <section className="landing-section-cta px-6 py-16 sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 text-center sm:flex-row sm:text-left">
          <div>
            <h2 className="font-display text-3xl text-ink-950 sm:text-4xl">Your turn on the canvas</h2>
            <p className="mt-2 max-w-md text-ink-700">
              Open the image editor or video timeline and ship the next asset.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/editor" className="landing-cta-primary">
              Open Image Editor
            </Link>
            <Link href="/video" className="landing-cta-secondary">
              Open Video Editor
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
