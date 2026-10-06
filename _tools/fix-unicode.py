# O editor grava escapes \u0300-\u036f como caracteres reais; normaliza de volta para escapes.
import glob
for p in glob.glob('scripts/*.ts')+glob.glob('src/**/*.ts*',recursive=True)+glob.glob('tests/**/*.ts',recursive=True):
    s=open(p,encoding='utf-8').read()
    if '\u0300' in s or '\u036f' in s:
        open(p,'w',encoding='utf-8').write(s.replace('[\u0300-\u036f]', r'[\u0300-\u036f]')); print('fixed',p)
