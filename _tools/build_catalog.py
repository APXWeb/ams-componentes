"""Gera src/data/catalog.json e public/produtos/* a partir do conteúdo raspado do site oficial
(amscomponentes.com.br). Nenhum dado de produto é inventado: tudo vem das páginas oficiais."""
import json, re, os, io, urllib.request, concurrent.futures as cf
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, '_tools', 'scrape')
extra = json.load(open(os.path.join(S, 'extra.json'), encoding='utf-8'))
site = json.load(open(os.path.join(S, 'site.json'), encoding='utf-8'))
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'


def norm(u):
    return u.rstrip('/')


def slug_of(u):
    return norm(u).split('/')[-1].replace('fusivel-lamina1', 'fusivel-lamina')


def title(s):
    small = {'de', 'do', 'da', 'dos', 'das', 'e', 'com', 'sem', 'para', 'em', 'até'}
    out = []
    for i, w in enumerate(s.lower().split()):
        out.append(w if (i and w in small) else w[:1].upper() + w[1:])
    return ' '.join(out).replace('Mcase', 'MCase').replace('Jcase', 'JCase')


CAT_SLUGS = {'FUSÍVEIS': 'fusiveis', 'PORTA FUSÍVEIS': 'porta-fusiveis', 'CORDOALHAS': 'cordoalhas',
             'CABOS PARA BATERIA': 'cabos-para-bateria', 'TERMINAIS E PONTEIRAS': 'terminais-e-ponteiras',
             'CABOS DE TRANSFERÊNCIA DE CARGA': 'cabos-de-transferencia', 'GARRAS E MANOPLAS': 'garras-e-manoplas',
             'ABRAÇADEIRAS DE NYLON': 'abracadeiras', 'SACADOR DE FUSÍVEL': 'acessorios'}
CATS, cat_of = [], {}
menu = next(m for m in extra['menu'] if m['t'] == 'PRODUTOS')['c']
for top in menu:
    cslug = CAT_SLUGS[top['t']]
    cat = {'slug': cslug, 'name': 'Acessórios' if cslug == 'acessorios' else title(top['t']), 'groups': []}

    def add(group, node):
        if node.get('c'):
            for ch in node['c']:
                add(title(node['t']), ch)
        elif '/produto/' in node['h'] or 'terminal-de-fio' in node['h']:
            g = next((g for g in cat['groups'] if g['name'] == group), None)
            if not g:
                g = {'name': group, 'items': []}
                cat['groups'].append(g)
            s = slug_of(node['h'])
            g['items'].append(s)
            cat_of[s] = (cslug, group)

    if top.get('c'):
        for ch in top['c']:
            add(cat['name'], ch)
    else:
        add(cat['name'], top)
    CATS.append(cat)

launch_names = [l.strip() for l in site['inst']['https://amscomponentes.com.br/pt/destaque/']['text'].split('\n')
                if l.strip() and l.strip() != 'Leia mais']

HEAD = {'CÓDIGO': 'Código', 'AMPERAGEM': 'Amperagem', 'COR': 'Cor', 'APLICAÇÃO': 'Aplicação', 'MEDIDAS': 'Medidas',
        'MEDIDA': 'Medida', 'N. ORIGINAL': 'Nº original', 'AMP.': 'Amp.', 'VOLTS': 'Volts', 'PESO': 'Peso',
        'ANO': 'Ano', 'TIPO': 'Tipo', 'MODELO': 'Modelo', 'QTD': 'Qtd.', 'CORRENTE NOMINAL': 'Corrente nominal'}


def clean_rows(table):
    rows = [[c.strip() for c in r] for r in table]
    rows = [r for r in rows if any(r)]
    width = max(len(r) for r in rows)
    keep = [i for i in range(width) if any(i < len(r) and r[i] for r in rows)]
    rows = [[(r[i] if i < len(r) else '') for i in keep] for r in rows]
    return [HEAD.get(h.upper(), h) for h in rows[0]], rows[1:]


products = []
by_url = {norm(p['url']): p for p in site['products']}
for p in extra['prods']:
    sp = by_url.get(norm(p['url']))
    if not sp:
        continue
    name = sp['main'].split('\n')[0].strip()
    slug = slug_of(p['url'])
    tables = [t for t in p['tables'] if len(t) > 1]
    head, rows = clean_rows(tables[0]) if tables else ([], [])
    desc = re.sub(r'\n{2,}', '\n', (sp.get('desc') or '').strip())
    app = [l.strip() for l in desc.split('\n') if l.strip() and l.strip().upper() != 'APLICAÇÃO']
    imgs = [g for g in p['gallery'] if not re.search(r'-\d+x\d+\.(jpe?g|png)$', g)]
    if not imgs:
        imgs = [re.sub(r'-\d+x\d+(\.\w+)$', r'\1', g) for g in p['gallery'][:1]]
    c = cat_of.get(slug, ('acessorios', 'Acessórios'))
    products.append({'slug': slug, 'name': name, 'category': c[0], 'group': c[1], 'application': app,
                     'columns': head, 'rows': rows, 'sourceImages': imgs, 'launch': name in launch_names,
                     'source': p['url']})

tf = site['inst']['https://amscomponentes.com.br/terminal-de-fio/']
seg = tf['text'][tf['text'].index('CÓDIGO'):]
pairs = re.findall(r'(810\d\d)\s*\n\s*([^\n]+)', seg)
tf_imgs = sorted({re.sub(r'-600x600', '', i.split(' [')[0]) for i in tf['imgs'] if '/810' in i})
products.append({'slug': 'terminal-de-fio', 'name': 'Terminais de Fio', 'category': 'terminais-e-ponteiras',
                 'group': cat_of.get('terminal-de-fio', ('', 'Terminais e Ponteiras'))[1], 'application': [],
                 'columns': ['Código', 'Aplicação'], 'rows': [[a, b.strip()] for a, b in pairs],
                 'sourceImages': tf_imgs, 'launch': 'Terminais de Fio' in launch_names,
                 'source': 'https://amscomponentes.com.br/terminal-de-fio/'})

order = [s for c in CATS for g in c['groups'] for s in g['items']]
products.sort(key=lambda p: order.index(p['slug']) if p['slug'] in order else 999)

OUT = os.path.join(ROOT, 'public', 'produtos')
os.makedirs(OUT, exist_ok=True)


def fetch(job):
    url, dest = job
    if os.path.exists(dest):
        return dest
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'image/*'})
    try:
        data = urllib.request.urlopen(req, timeout=60).read()
        im = Image.open(io.BytesIO(data)).convert('RGB')
        im.thumbnail((900, 900))
        im.save(dest, 'WEBP', quality=82, method=6)
        return dest
    except Exception as e:  # noqa
        print('ERR', url, e)
        return None


jobs = []
for p in products:
    p['images'] = []
    for i, u in enumerate(p['sourceImages'][:14]):
        dest = os.path.join(OUT, f"{p['slug']}-{i + 1}.webp")
        jobs.append((u, dest))
        p['images'].append(f"/produtos/{p['slug']}-{i + 1}.webp")
with cf.ThreadPoolExecutor(8) as ex:
    res = dict(zip([j[1] for j in jobs], ex.map(fetch, jobs)))
for p in products:
    p['images'] = [i for i in p['images'] if res.get(os.path.join(OUT, os.path.basename(i)))]
    del p['sourceImages']

json.dump({'_source': 'Conteúdo transcrito de https://amscomponentes.com.br (out/2026). Não alterar dados técnicos sem conferir com a AMS.',
           'categories': CATS, 'products': products},
          open(os.path.join(ROOT, 'src', 'data', 'catalog.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(products), 'produtos;', sum(len(p['images']) for p in products), 'imagens;', sum(p['launch'] for p in products), 'lançamentos')
for c in CATS:
    print(c['slug'], [(g['name'], len(g['items'])) for g in c['groups']])
print('sem categoria:', [p['slug'] for p in products if p['slug'] not in order])
