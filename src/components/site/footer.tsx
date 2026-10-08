import Link from "next/link";
import { ArrowUpRight, Phone, MessageCircle, MapPin, Clock } from "lucide-react";
import { InstagramIcon, FacebookIcon, LinkedinIcon } from "@/components/ui/brand-icons";
import { SITE } from "@/lib/site";
import { categories } from "@/lib/catalog";
import { asset } from "@/lib/asset";

export function SiteFooter() {
  return (
    <footer className="site-footer on-dark">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset("/img/logo-ams.png")} alt="AMS Componentes" width={64} height={57} />
            <p>
              A maior fabricante nacional na linha de fusíveis automotivos. Fornecedora dos mais conceituados distribuidores de autopeças e da indústria do país.
            </p>
            <div className="footer-social">
              <a href={SITE.social.instagram} target="_blank" rel="noopener" aria-label="Instagram da AMS">
                <InstagramIcon aria-hidden />
              </a>
              <a href={SITE.social.facebook} target="_blank" rel="noopener" aria-label="Facebook da AMS">
                <FacebookIcon aria-hidden />
              </a>
              <a href={SITE.social.linkedin} target="_blank" rel="noopener" aria-label="LinkedIn da AMS">
                <LinkedinIcon aria-hidden />
              </a>
            </div>
          </div>

          <nav className="footer-col" aria-label="Institucional">
            <h2>Institucional</h2>
            <ul>
              <li><Link href="/empresa">Empresa</Link></li>
              <li><Link href="/lancamentos">Lançamentos</Link></li>
              <li><Link href="/representantes">Representantes</Link></li>
              <li><Link href="/eventos">Eventos</Link></li>
              <li><Link href="/trabalhe-conosco">Trabalhe conosco</Link></li>
              <li><Link href="/contato">Contato</Link></li>
            </ul>
          </nav>

          <nav className="footer-col" aria-label="Linhas de produto">
            <h2>Produtos</h2>
            <ul>
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/produtos?linha=${c.slug}`}>{c.name}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="footer-col footer-contact">
            <h2>Contato</h2>
            <ul>
              <li>
                <MapPin aria-hidden /> {SITE.city}, {SITE.state}
              </li>
              <li>
                <Clock aria-hidden /> {SITE.hours}
              </li>
              <li>
                <Phone aria-hidden /> <a href={SITE.phoneHref}>{SITE.phone}</a>
              </li>
              <li>
                <MessageCircle aria-hidden />{" "}
                <a href={SITE.whatsappHref} target="_blank" rel="noopener">
                  WhatsApp {SITE.whatsapp}
                </a>
              </li>
            </ul>
            <dl className="footer-emails">
              <div><dt>Geral</dt><dd><a href={`mailto:${SITE.emails.contato}`}>{SITE.emails.contato}</a></dd></div>
              <div><dt>Vendas</dt><dd><a href={`mailto:${SITE.emails.vendas}`}>{SITE.emails.vendas}</a></dd></div>
              <div><dt>Indústria</dt><dd><a href={`mailto:${SITE.emails.industria}`}>{SITE.emails.industria}</a></dd></div>
              <div><dt>Exportação</dt><dd><a href={`mailto:${SITE.emails.exportacao}`}>{SITE.emails.exportacao}</a></dd></div>
            </dl>
          </div>
        </div>

        <div className="footer-catalog">
          <span className="mono">Catálogo AMS 2025</span>
          <a href={SITE.catalogPdf} target="_blank" rel="noopener">
            PDF <ArrowUpRight aria-hidden />
          </a>
          <a href={SITE.catalogOnline} target="_blank" rel="noopener">
            Catálogo eletrônico <ArrowUpRight aria-hidden />
          </a>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} {SITE.name}. Todos os direitos reservados.</span>
          <span className="grow" />
          <Link href="/privacidade">Privacidade e LGPD</Link>
          <Link href="/rh/login">Área do colaborador</Link>
        </div>
      </div>
    </footer>
  );
}
