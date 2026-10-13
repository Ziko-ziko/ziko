import json, re, sys
readme, out = sys.argv[1], sys.argv[2]
cat = None; rows = []
link = re.compile(r'\[([^\]]+)\]\(([^)]+)\)')
for line in open(readme, encoding='utf-8'):
    line = line.rstrip('\n')
    m = re.match(r'^###\s+(.+?)\s*$', line)
    if m:
        cat = m.group(1).strip(); continue
    if not cat or not line.startswith('|') or line.startswith('|:') or line.startswith('| API') or line.startswith('|---'):
        continue
    cells = [c.strip() for c in line.strip('|').split('|')]
    if len(cells) < 5: continue
    lm = link.search(cells[0])
    if not lm: continue
    auth = cells[2].strip('`') or 'No'
    rows.append({
        'name': lm.group(1), 'url': lm.group(2), 'category': cat,
        'description': cells[1], 'auth': 'none' if auth.lower() == 'no' else auth,
        'https': cells[3].lower() == 'yes', 'cors': cells[4].lower(),
    })
json.dump(rows, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
from collections import Counter
print(len(rows), 'apis,', len(set(r['category'] for r in rows)), 'categories')
print(Counter(r['auth'] for r in rows).most_common())
