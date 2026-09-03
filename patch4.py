p = 'app/api/shopify/submit-checkin/route.ts'
s = open(p).read()
for frag in [
    "    const ownedProductTitles: string[] = []\n",
    "            if (li?.title) ownedProductTitles.push(String(li.title))\n",
]:
    assert s.count(frag) == 1, f"non unico: {frag!r} -> {s.count(frag)}"
    s = s.replace(frag, "", 1)
open(p, 'w').write(s)
print('pulito')
