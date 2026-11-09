import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';
import { LANDING_COPY as copy } from '@/config/products';

const menuSections = ['home', 'about', 'services'];
const pageSections = ['home', 'services', 'about', 'contact'];

export default function LandingTopBar() {
  const { lang, setLang, tt } = useT();
  const dialog = useRef(null);
  const [active, setActive] = useState('home');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let frame = 0;
    function update() {
      frame = 0;
      const current = pageSections.filter(id =>
        document.getElementById(id)?.getBoundingClientRect().top <= window.innerHeight * 0.45
      ).pop();
      setActive(current || 'home');
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const wide = matchMedia('(min-width: 900px)');
    const closeOnResize = () => { if (wide.matches) dialog.current?.close(); };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    wide.addEventListener('change', closeOnResize);
    return () => {
      document.body.style.overflow = previous;
      wide.removeEventListener('change', closeOnResize);
    };
  }, [open]);

  function navigation(mobile) {
    return <nav aria-label={tt(copy.menu)}>
      {menuSections.map(id => <a key={id} href={'#' + id}
        aria-current={id === active ? 'location' : undefined}
        onClick={() => { if (mobile) dialog.current.close(); }}>
        {tt(copy[id])}
      </a>)}
      <button type="button" aria-label={tt(copy.language)} onClick={() => setLang(lang === 'sw' ? 'en' : 'sw')}>
        <span className={lang === 'sw' ? 'l3-chosen' : ''}>SW</span> / <span className={lang === 'en' ? 'l3-chosen' : ''}>EN</span>
      </button>
      <Link className="l3-login" to="/login">{tt(copy.login)}</Link>
    </nav>;
  }

  return <header className="l3-header" id="home">
    <div className="l3-wrap l3-header-row">
      <a href="#home" className="l3-brand"><strong>{tt(copy.wordmark)}</strong><span>{tt(copy.subtitle)}</span></a>
      <div className="l3-desktop">{navigation(false)}</div>
      <button className="l3-menu-button" aria-label={tt(copy.menu)} aria-expanded={open}
        aria-controls="l3-menu" onClick={() => { dialog.current.showModal(); setOpen(true); }}><Menu /></button>
    </div>
    <dialog id="l3-menu" ref={dialog} aria-label={tt(copy.menu)} onClose={() => setOpen(false)}>
      <button className="l3-close" aria-label={tt(copy.close)} onClick={() => dialog.current.close()}><X /></button>
      {navigation(true)}
    </dialog>
  </header>;
}
