"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X, Phone, Clock, Mail, Download, ArrowRight, Lock } from "lucide-react";
import { NAV, SITE } from "@/lib/site";

export type NavCategory = { slug: string; name: string; count: number; cover: string };

export function SiteHeader({ categories }: { categories: NavCategory[] }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const megaRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // fecha menus ao navegar
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
    setProductsOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!productsOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setProductsOpen(false);
    const onClick = (e: MouseEvent) => {
      if (megaRef.current && !megaRef.current.contains(e.target as Node)) setProductsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [productsOpen]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className={`site-header ${scrolled ? "is-scrolled" : ""} ${menuOpen ? "menu-open" : ""}`}>
      <div className="utility">
        <div className="container utility__inner">
          <span className="utility__item">
            <Clock aria-hidden /> {SITE.hours}
          </span>
          <a className="utility__item" href={SITE.phoneHref}>
            <Phone aria-hidden /> {SITE.phone}
          </a>
          <a className="utility__item hide-md" href={`mailto:${SITE.emails.contato}`}>
            <Mail aria-hidden /> {SITE.emails.contato}
          </a>
          <span className="grow" />
          <Link className="utility__item utility__strong" href="/trabalhe-conosco">
            Trabalhe conosco
          </Link>
          <Link className="utility__item" href="/rh/login">
            <Lock aria-hidden /> Área do colaborador
          </Link>
        </div>
      </div>

      <div className="mainbar">
        <div className="container mainbar__inner">
          <Link href="/" className="brand" aria-label="AMS Componentes, página inicial">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/logo-ams.png" alt="" width={46} height={41} className="brand__mark" />
            <span className="brand__text">
              <span className="brand__name">AMS Componentes</span>
              <span className="brand__sub">Desde {SITE.founded}</span>
            </span>
          </Link>

          <nav className="nav" aria-label="Principal">
            <ul>
              <li>
                <Link href="/" className="nav__link" aria-current={pathname === "/" ? "page" : undefined}>
                  Início
                </Link>
              </li>
              {NAV.map((item) =>
                item.href === "/produtos" ? (
                  <li key={item.href} className="nav__mega" ref={megaRef}>
                    <span className="nav__split">
                      <Link href="/produtos" className="nav__link" aria-current={isActive("/produtos") ? "page" : undefined}>
                        Produtos
                      </Link>
                      <button
                        type="button"
                        className="nav__toggle"
                        aria-expanded={productsOpen}
                        aria-controls="mega-produtos"
                        aria-label="Abrir linhas de produto"
                        onClick={() => setProductsOpen((v) => !v)}
                      >
                        <ChevronDown aria-hidden />
                      </button>
                    </span>
                    <div id="mega-produtos" className={`mega ${productsOpen ? "is-open" : ""}`} hidden={!productsOpen}>
                      <div className="mega__grid">
                        {categories.map((c) => (
                          <Link key={c.slug} href={`/produtos?linha=${c.slug}`} className="mega__item">
                            <span className="mega__img">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={c.cover} alt="" loading="lazy" width={64} height={64} />
                            </span>
                            <span>
                              <span className="mega__name">{c.name}</span>
                              <span className="mega__count mono">{String(c.count).padStart(2, "0")} itens</span>
                            </span>
                          </Link>
                        ))}
                      </div>
                      <div className="mega__foot">
                        <Link href="/produtos" className="link">
                          Ver catálogo completo <ArrowRight size={14} aria-hidden style={{ display: "inline", verticalAlign: "-2px" }} />
                        </Link>
                        <a href={SITE.catalogPdf} className="link" target="_blank" rel="noopener">
                          Catálogo em PDF
                        </a>
                      </div>
                    </div>
                  </li>
                ) : (
                  <li key={item.href}>
                    <Link href={item.href} className="nav__link" aria-current={isActive(item.href) ? "page" : undefined}>
                      {item.label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>

          <div className="mainbar__cta">
            <a href={SITE.catalogPdf} className="btn btn--outline hide-lg" target="_blank" rel="noopener">
              <Download aria-hidden /> Catálogo
            </a>
            <Link href="/contato" className="btn">
              Fale com a AMS
            </Link>
          </div>

          <button
            type="button"
            className="btn btn--ghost btn--icon burger"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
            aria-controls="menu-mobile"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X aria-hidden /> : <Menu aria-hidden />}
          </button>
        </div>
      </div>

      <div id="menu-mobile" className="mobile-menu" hidden={!menuOpen}>
        <nav aria-label="Menu" className="container">
          <ul className="mobile-menu__list">
            <li>
              <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>
                Início <span className="mono">00</span>
              </Link>
            </li>
            {NAV.map((n, i) => (
              <li key={n.href}>
                <Link href={n.href} aria-current={isActive(n.href) ? "page" : undefined}>
                  {n.label} <span className="mono">{String(i + 1).padStart(2, "0")}</span>
                </Link>
              </li>
            ))}
            <li>
              <Link href="/trabalhe-conosco" aria-current={isActive("/trabalhe-conosco") ? "page" : undefined}>
                Trabalhe conosco <span className="mono">07</span>
              </Link>
            </li>
          </ul>
          <div className="mobile-menu__foot">
            <a className="btn btn--signal btn--block btn--lg" href={SITE.catalogPdf} target="_blank" rel="noopener">
              <Download aria-hidden /> Baixar catálogo
            </a>
            <a className="btn btn--outline btn--block" href={SITE.phoneHref}>
              <Phone aria-hidden /> {SITE.phone}
            </a>
            <Link className="btn btn--ghost btn--block" href="/rh/login">
              <Lock aria-hidden /> Área do colaborador
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
