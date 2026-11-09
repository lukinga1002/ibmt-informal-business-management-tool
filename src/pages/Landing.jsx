import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ArrowRight, Mail, MapPin, Phone } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useT } from '@/i18n/I18nContext';
import LandingTopBar from '@/components/landing/LandingTopBar';
import { LANDING_COPY as copy, orderedProducts, statusLabel } from '@/config/products';

const hero = '/landing/dar-1920.webp';
const sources = '/landing/dar-960.webp 960w, ' + hero + ' 1920w';
const contacts = [['phone', Phone], ['email', Mail], ['office', MapPin]];

export default function Landing() {
  const { lang, tt } = useT();
  const reduce = useReducedMotion();
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    const preload = document.createElement('link');
    preload.rel = 'preload';
    preload.as = 'image';
    preload.href = hero;
    preload.setAttribute('imagesrcset', sources);
    preload.setAttribute('imagesizes', '100vw');
    document.head.appendChild(preload);
    return () => preload.remove();
  }, []);
  const reveal = reduce ? {} : {
    initial: { opacity: 0, y: 10 }, whileInView: { opacity: 1, y: 0 },
    viewport: { once: true }, transition: { duration: 0.32 },
  };

  return <div className="l3">
    <LandingTopBar />
    <main>
      <section aria-labelledby="landing-title" className="l3-hero">
        {!imageFailed && <img src={hero} srcSet={sources} sizes="100vw" fetchpriority="high"
          alt={tt(copy.scene)} onError={() => setImageFailed(true)} />}
        <div className="l3-wrap l3-hero-copy">
          <h1 id="landing-title">{tt(copy.headline)}</h1>
          <p>{tt(copy.subline)}</p>
        </div>
        <a className="l3-chevron" href="#services" aria-label={tt(copy.title)}><ChevronDown /></a>
      </section>
      <section id="services" className="l3-section l3-services" aria-labelledby="services-title">
        <motion.div className="l3-wrap" {...reveal}>
          <h2 id="services-title">{tt(copy.title)}</h2>
          <div className="l3-grid">
            {orderedProducts.map(({ id, name, tagline, route, icon: Icon, image, status }) => {
              const available = status === 'live' && route;
              return <article key={id} className="l3-card">
                {image ? <img loading="lazy" src={image} alt="" /> : <Icon className="l3-icon" aria-hidden="true" />}
                <span className="l3-status">{statusLabel(status, lang)}</span>
                <h3>{name}</h3><p>{tt(tagline)}</p>
                {available && <Link className="l3-open" to={route} aria-label={tt(copy.open) + ' ' + name}>
                  {tt(copy.open)} <ArrowRight size={18} aria-hidden="true" />
                </Link>}
              </article>;
            })}
          </div>
        </motion.div>
      </section>
      <section id="about" className="l3-about" aria-labelledby="about-title">
        <motion.div className="l3-section l3-wrap" {...reveal}>
          <h2 id="about-title">{tt(copy.wordmark)}</h2><p>{tt(copy.intro)}</p>
        </motion.div>
        <div className="l3-band">{tt(copy.statement)}</div>
      </section>
      <section id="contact" className="l3-section" aria-labelledby="contact-title">
        <motion.div className="l3-wrap" {...reveal}>
          <h2 id="contact-title">{tt(copy.contact)}</h2>
          <dl className="l3-contacts">{contacts.map(([key, Icon]) =>
            <div key={key}><dt><Icon size={22} aria-hidden="true" />{tt(copy[key])}</dt><dd>{tt(copy.pending)}</dd></div>
          )}</dl>
        </motion.div>
      </section>
    </main>
    <footer><div className="l3-wrap l3-footer-row">
      <strong>{tt(copy.wordmark)}</strong>
      <small>© {new Date().getFullYear()} {tt(copy.wordmark)}. {tt(copy.copyright)}</small>
      <Link to="/privacy">{tt(copy.privacy)}</Link><Link to="/verify">{tt(copy.verify)}</Link>
    </div></footer>
  </div>;
}
