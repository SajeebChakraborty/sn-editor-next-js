/**
 * Canva-style discovery carousels — branded SN Editor throughout.
 */
'use client';

import Link from 'next/link';
import { useRef, type ReactNode } from 'react';
import { useBrand } from '@/components/brand/BrandProvider';

function Carousel({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(420, el.clientWidth * 0.7), behavior: 'smooth' });
  };

  return (
    <div className="discover-carousel-wrap">
      <div ref={ref} className="discover-carousel" aria-label={label}>
        {children}
      </div>
      <button
        type="button"
        className="discover-nav"
        aria-label={`Scroll ${label}`}
        onClick={() => scroll(1)}
      >
        ›
      </button>
    </div>
  );
}

const EXPLORE = [
  {
    label: 'Presentation',
    tone: 'peach',
    img: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=280&q=80',
  },
  {
    label: 'Poster',
    tone: 'lilac',
    img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=280&q=80',
  },
  {
    label: 'Resume',
    tone: 'rose',
    img: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=280&q=80',
  },
  {
    label: 'Email',
    tone: 'sand',
    img: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=280&q=80',
  },
  {
    label: 'Logo',
    tone: 'mint',
    img: 'https://images.unsplash.com/photo-1626785774573-4b7993141ae2?auto=format&fit=crop&w=280&q=80',
  },
  {
    label: 'Flyer',
    tone: 'sky',
    img: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=280&q=80',
  },
  {
    label: 'Instagram Post',
    tone: 'peach',
    img: 'https://images.unsplash.com/photo-1611162617474-5b21e11e480f?auto=format&fit=crop&w=280&q=80',
  },
  {
    label: 'Instagram Story',
    tone: 'lilac',
    img: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&w=280&q=80',
  },
  {
    label: 'Landscape Video',
    tone: 'rose',
    img: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=280&q=80',
  },
  {
    label: 'Invitation',
    tone: 'sand',
    img: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=280&q=80',
  },
  {
    label: 'Mobile Video',
    tone: 'mint',
    img: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=280&q=80',
  },
  {
    label: 'Facebook Post',
    tone: 'sky',
    img: 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?auto=format&fit=crop&w=280&q=80',
  },
] as const;

const DISCOVER = [
  {
    title: 'The World Studios',
    img: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Business report',
    img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Creative company',
    img: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Modern resume',
    img: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Good morning post',
    img: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Product launch',
    img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
  },
] as const;

const AI_EFFECTS = [
  {
    label: 'Photo Booth',
    img: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=400&q=80',
  },
  {
    label: 'Unboxing',
    img: 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?auto=format&fit=crop&w=400&q=80',
  },
  {
    label: 'Street Art',
    img: 'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?auto=format&fit=crop&w=400&q=80',
  },
  {
    label: 'Sculpted',
    img: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=400&q=80',
  },
  {
    label: 'Cinematic Haze',
    img: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=400&q=80',
  },
  {
    label: 'Rocketship',
    img: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?auto=format&fit=crop&w=400&q=80',
  },
  {
    label: 'Copy Machine',
    img: 'https://images.unsplash.com/photo-1586281380117-5a4dcbd5d84b?auto=format&fit=crop&w=400&q=80',
  },
  {
    label: 'Subway Poster',
    img: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&w=400&q=80',
  },
] as const;

const TOP_PICKS = [
  {
    title: 'Brand new product drops',
    tone: 'blue',
    img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80',
  },
  {
    title: 'Mischief meets creativity',
    tone: 'violet',
    img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
  },
  {
    title: 'Print your wedding invites',
    tone: 'rose',
    img: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=400&q=80',
  },
  {
    title: 'Bring your style to life',
    tone: 'green',
    img: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?auto=format&fit=crop&w=400&q=80',
  },
] as const;

const MORE_TEMPLATES = [
  {
    title: 'AI professionals brochure',
    img: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=700&q=80',
  },
  {
    title: 'Elegant brand trifold',
    img: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=700&q=80',
  },
  {
    title: 'Online school admission',
    img: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=700&q=80',
  },
  {
    title: 'Retail sale flyer set',
    img: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=700&q=80',
  },
] as const;

export function DiscoverSections() {
  const { brandName } = useBrand();
  return (
    <div className="discover">
      {/* Explore templates */}
      <section className="discover-block">
        <div className="discover-head">
          <h2 className="discover-title">Explore templates</h2>
        </div>
        <Carousel label="Explore templates">
          {EXPLORE.map((item) => (
            <Link
              key={item.label}
              href="/editor"
              className={`discover-cat discover-cat-${item.tone}`}
            >
              <span className="discover-cat-label">{item.label}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.img} alt="" loading="lazy" />
            </Link>
          ))}
        </Carousel>
      </section>

      {/* Discover SN Editor */}
      <section className="discover-block">
        <div className="discover-head">
          <h2 className="discover-title">Discover {brandName}</h2>
        </div>
        <Carousel label={`Discover ${brandName}`}>
          {DISCOVER.map((item) => (
            <Link key={item.title} href="/editor" className="discover-tile">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.img} alt="" loading="lazy" />
              <span className="discover-tile-caption">{item.title}</span>
            </Link>
          ))}
        </Carousel>
      </section>

      {/* AI video effects */}
      <section className="discover-block">
        <div className="discover-head">
          <h2 className="discover-title">
            Meet AI video effects
            <span className="discover-badge">New</span>
          </h2>
          <Link href="/video" className="discover-see-all">
            See all
          </Link>
        </div>
        <Carousel label="AI video effects">
          {AI_EFFECTS.map((item) => (
            <Link key={item.label} href="/video" className="discover-effect">
              <div className="discover-effect-media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.img} alt="" loading="lazy" />
                <span className="discover-play" aria-hidden>
                  ▶
                </span>
                <span className="discover-ai" aria-hidden>
                  ✦
                </span>
              </div>
              <span className="discover-effect-label">{item.label}</span>
            </Link>
          ))}
        </Carousel>
      </section>

      {/* SN Editor top picks */}
      <section className="discover-block">
        <div className="discover-head">
          <h2 className="discover-title">{brandName}&apos;s top picks</h2>
        </div>
        <Carousel label={`${brandName} top picks`}>
          {TOP_PICKS.map((item) => (
            <Link
              key={item.title}
              href="/editor"
              className={`discover-pick discover-pick-${item.tone}`}
            >
              <span className="discover-pick-title">{item.title}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.img} alt="" loading="lazy" />
            </Link>
          ))}
        </Carousel>
      </section>

      {/* More templates */}
      <section className="discover-block">
        <div className="discover-head">
          <h2 className="discover-title">More templates for you</h2>
          <Link href="/editor" className="discover-see-all">
            See all
          </Link>
        </div>
        <Carousel label="More templates">
          {MORE_TEMPLATES.map((item) => (
            <Link key={item.title} href="/editor" className="discover-more">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.img} alt="" loading="lazy" />
              <span className="discover-more-caption">{item.title}</span>
            </Link>
          ))}
        </Carousel>
      </section>
    </div>
  );
}
