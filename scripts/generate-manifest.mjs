import { readdir, writeFile, mkdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const IMMAGINI = join(ROOT, 'immagini');
const OUT = join(ROOT, 'manifest.json');
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);

async function listImages(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && IMAGE_EXT.has(extname(e.name).toLowerCase()))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

async function main() {
  const entries = await readdir(IMMAGINI, { withFileTypes: true });
  const categories = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const images = await listImages(join(IMMAGINI, entry.name));
    categories.push({
      id: entry.name,
      label: entry.name.charAt(0).toUpperCase() + entry.name.slice(1),
      images: images.map((name) => `immagini/${entry.name}/${name}`),
    });
  }

  categories.sort((a, b) => {
    const order = ['articoli', 'disegni', 'stemmi', 'necropoli', 'poesie', 'scacchi'];
    const aIndex = order.indexOf(a.id);
    const bIndex = order.indexOf(b.id);
    const aOrder = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
    const bOrder = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.id.localeCompare(b.id);
  });

  const manifest = {
    logo: 'immagini/logo.svg',
    categories,
    generatedAt: new Date().toISOString(),
  };

  await writeFile(OUT, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`Wrote ${categories.length} categories to manifest.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
