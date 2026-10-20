/**
 * Algreen admin — small vanilla-TS app for /admin/ (no framework, no deps).
 *
 * Model: every tab edits one "section" (gallery, slots, docs, settings, faq, texts,
 * announcement). Edits stay local until "Sačuvaj" (PUT /api/admin/section/:name →
 * D1 draft). "Objavi na sajt" saves, freezes the drafts into the published snapshot
 * and triggers the static rebuild (~2 min). A section saved as `null` = site default.
 */

type L10n = { sr: string; en: string };
interface Media {
  id: string;
  kind: 'image' | 'pdf';
  name: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  created_at: number;
}
interface GalleryItem {
  id: string;
  src?: string;
  media?: string;
  caption: L10n;
  hidden?: boolean;
}
interface Branch {
  id: string;
  city: L10n;
  street: L10n;
  postal: L10n;
  phones: string[];
  email: string;
  mapsUrl: string;
}
interface Settings {
  email: string;
  facebook: string;
  instagram: string;
  whatsapp: string;
  branches: Branch[];
}
interface FaqItem {
  q: L10n;
  a: L10n;
}
interface Texts {
  sr: Record<string, string>;
  en: Record<string, string>;
}
interface Announcement {
  enabled: boolean;
  text: L10n;
  link: string;
  linkLabel: L10n;
}
interface Sections {
  gallery: GalleryItem[];
  slots: Record<string, string>;
  docs: Record<string, string>;
  settings: Settings;
  faq: FaqItem[];
  texts: Texts;
  announcement: Announcement;
}
type Name = keyof Sections;
interface SectionState {
  data: unknown;
  updatedAt: number;
  updatedBy?: string | null;
}
interface State {
  user: { username: string; name: string };
  sections: Record<Name, SectionState>;
  media: Media[];
  publish: { at: number; by: string } | null;
  unpublished: boolean;
  publishConfigured: boolean;
}
interface Defaults {
  slots: { key: string; group: string; label: string; src: string; preview: string }[];
  docs: { key: string; group: string; label: string; href: string }[];
  gallery: { id: string; src: string; preview: string }[];
  faq: FaqItem[];
  settings: Settings;
  texts: { path: string; group: string; sr: string; en: string }[];
}

const D: Defaults = JSON.parse(document.getElementById('admin-defaults')!.textContent || '{}');
const app = document.getElementById('app')!;

// ---------------------------------------------------------------- utilities
type Kid = Node | string | number | null | undefined | false | Kid[];
const PROPS = new Set(['value', 'checked', 'disabled', 'multiple', 'selected']);

function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, ...kids: Kid[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else if (PROPS.has(k)) (el as unknown as Record<string, unknown>)[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  const add = (c: Kid) => {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(add);
    else el.append(typeof c === 'number' ? String(c) : c);
  };
  kids.forEach(add);
  return el;
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const mediaUrl = (id: string) => `/api/media/${id}`;
const fmtTime = (ms: number) =>
  new Date(ms).toLocaleString('sr-Latn-RS', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

let toastTimer = 0;
function toast(msg: string, err = false) {
  document.querySelector('.toast')?.remove();
  const t = h('div', { class: `toast${err ? ' err' : ''}`, role: 'status' }, msg);
  document.body.append(t);
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.remove(), err ? 7000 : 3000);
}

class ApiError extends Error {
  constructor(public status: number, message: string, public data?: unknown) {
    super(message);
  }
}

async function api<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: { 'x-admin': '1', ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Nema veze sa serverom. Proverite internet i pokušajte ponovo.');
  }
  let data: any = {};
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }
  if (res.status === 401 && path !== '/api/admin/login') {
    // First visit → plain login; mid-session → explain why they're back here.
    renderLogin(S ? 'Sesija je istekla — prijavite se ponovo.' : '');
    throw new ApiError(401, 'Niste prijavljeni.');
  }
  if (res.status === 404 && !data.error) throw new ApiError(404, 'Servis za uređivanje nije dostupan na ovoj adresi (API ne odgovara).');
  if (!res.ok || data.ok === false) throw new ApiError(res.status, data.error || `Greška (${res.status}).`, data);
  return data as T;
}

/** Multipart upload with progress (fetch has no upload progress → XHR). */
function uploadBlob(blob: Blob, name: string, dims: { width?: number; height?: number }, onProgress?: (p: number) => void): Promise<Media> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('file', blob, name);
    if (dims.width) fd.append('width', String(dims.width));
    if (dims.height) fd.append('height', String(dims.height));
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/media');
    xhr.setRequestHeader('x-admin', '1');
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onerror = () => reject(new ApiError(0, 'Otpremanje nije uspelo — proverite internet.'));
    xhr.onload = () => {
      let data: any = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* */
      }
      if (xhr.status === 401) {
        renderLogin('Sesija je istekla — prijavite se ponovo.');
        return reject(new ApiError(401, 'Niste prijavljeni.'));
      }
      if (xhr.status !== 200 || !data.ok) return reject(new ApiError(xhr.status, data.error || `Greška (${xhr.status}).`));
      resolve(data.media as Media);
    };
    xhr.send(fd);
  });
}

function loadImgEl(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('decode'));
    img.src = url;
  });
}

function hasAlpha(src: CanvasImageSource, w: number, hgt: number): boolean {
  const s = 160;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0, w, hgt, 0, 0, s, s);
  const d = ctx.getImageData(0, 0, s, s).data;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 250) return true;
  return false;
}

const MAX_SIDE = 2400;

/**
 * Decode (EXIF-rotated), downscale to ≤2400px and re-encode in the browser, so
 * phone photos (5–12 MB) upload as ~0.5–1.5 MB. Transparent PNG/WebP stay PNG.
 */
async function prepareImage(file: File): Promise<{ blob: Blob; name: string; width: number; height: number }> {
  if (/\.(heic|heif)$/i.test(file.name) || /hei[cf]/i.test(file.type)) {
    // Safari (Mac/iPhone) can decode HEIC; other browsers can't.
    try {
      await createImageBitmap(file);
    } catch {
      throw new Error('HEIC fotografije (iPhone) ovaj pregledač ne može da otvori. Pošaljite JPG ili otpremite iz Safarija / sa telefona.');
    }
  }
  let src: ImageBitmap | HTMLImageElement;
  try {
    src = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  } catch {
    try {
      src = await loadImgEl(file);
    } catch {
      throw new Error(`„${file.name}” nije slika koju možemo da otvorimo. Koristite JPG ili PNG.`);
    }
  }
  const w0 = src.width;
  const h0 = src.height;
  const scale = Math.min(1, MAX_SIDE / Math.max(w0, h0));
  const w = Math.round(w0 * scale);
  const hgt = Math.round(h0 * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = hgt;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  const alpha = file.type !== 'image/jpeg' && hasAlpha(src, w0, h0);
  if (!alpha) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, hgt);
  }
  ctx.drawImage(src, 0, 0, w, hgt);
  const type = alpha ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Kodiranje slike nije uspelo.'))), type, 0.88));
  const base = file.name.replace(/\.[^.]+$/, '') || 'slika';
  return { blob, name: `${base}.${alpha ? 'png' : 'jpg'}`, width: w, height: hgt };
}

async function uploadImage(file: File, onProgress?: (p: number) => void): Promise<Media> {
  const img = await prepareImage(file);
  const m = await uploadBlob(img.blob, img.name, { width: img.width, height: img.height }, onProgress);
  S.media.unshift(m);
  return m;
}

async function uploadPdf(file: File, onProgress?: (p: number) => void): Promise<Media> {
  if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') throw new Error('Izaberite PDF fajl.');
  if (file.size > 40 * 1024 * 1024) throw new Error('PDF je prevelik (najviše 40 MB).');
  const m = await uploadBlob(file, file.name, {}, onProgress);
  S.media.unshift(m);
  return m;
}

/** A hidden <input type=file> + the button that opens it. */
function filePicker(label: string, accept: string, multiple: boolean, onFiles: (files: File[]) => void, cls = 'btn') {
  const input = h('input', {
    type: 'file',
    accept,
    multiple,
    class: 'sr-only',
    onchange: () => {
      const files = [...(input.files || [])];
      input.value = '';
      if (files.length) onFiles(files);
    },
  });
  const btn = h('button', { type: 'button', class: cls, onclick: () => input.click() }, label);
  return h('span', {}, btn, input);
}

// ---------------------------------------------------------------- state
let S: State;
const work: Partial<Sections> = {};
const dirty = new Set<Name>();
const toNull = new Set<Name>(); // sections being reset to the site default

function defaultsFor<N extends Name>(n: N): Sections[N] {
  const d: Sections = {
    gallery: D.gallery.map((g) => ({ id: g.id, src: g.src, caption: { sr: '', en: '' }, hidden: false })),
    slots: {},
    docs: {},
    settings: clone(D.settings),
    faq: clone(D.faq),
    texts: { sr: {}, en: {} },
    announcement: { enabled: false, text: { sr: '', en: '' }, link: '', linkLabel: { sr: '', en: '' } },
  };
  return d[n];
}

function get<N extends Name>(n: N): Sections[N] {
  if (!(n in work)) work[n] = clone((S.sections[n]?.data as Sections[N]) ?? defaultsFor(n));
  return work[n] as Sections[N];
}

const customized = (n: Name) => (toNull.has(n) ? false : dirty.has(n) || S.sections[n]?.data != null);

function touch(n: Name) {
  dirty.add(n);
  toNull.delete(n);
  updateChrome();
}

function resetSection(n: Name, msg: string) {
  if (!confirm(msg)) return;
  (work as Record<Name, unknown>)[n] = clone(defaultsFor(n));
  dirty.add(n);
  toNull.add(n);
  updateChrome();
  renderView();
}

async function saveAll(quiet = false): Promise<boolean> {
  if (!dirty.size) return true;
  setBusy(true);
  try {
    for (const n of [...dirty]) {
      try {
        const r = await api<{ data: unknown; updatedAt: number }>('PUT', `/api/admin/section/${n}`, {
          data: toNull.has(n) ? null : work[n],
          base: S.sections[n].updatedAt,
        });
        S.sections[n] = { data: r.data, updatedAt: r.updatedAt, updatedBy: S.user.username };
        delete work[n];
        dirty.delete(n);
        toNull.delete(n);
        S.unpublished = true;
      } catch (e) {
        const err = e as ApiError;
        if (err.status === 409) {
          toast('Neko drugi je u međuvremenu menjao ovaj deo. Osvežite stranicu (vaše izmene u tom delu neće biti sačuvane).', true);
        } else toast(err.message, true);
        return false;
      }
    }
    if (!quiet) toast('Sačuvano. Kliknite „Objavi na sajt” kada želite da se izmene pojave na sajtu.');
    return true;
  } finally {
    setBusy(false);
    updateChrome();
    renderView();
  }
}

function discardAll() {
  if (!confirm('Odbaciti sve nesačuvane izmene?')) return;
  for (const n of dirty) delete work[n];
  dirty.clear();
  toNull.clear();
  updateChrome();
  renderView();
}

// ---------------------------------------------------------------- publish
let pollTimer = 0;
let pubStatus: { text: string; cls: string } | null = null;

async function publish() {
  if (dirty.size && !(await saveAll(true))) return;
  if (!S.unpublished) {
    toast('Nema novih izmena za objavu.');
    return;
  }
  if (!confirm('Objaviti izmene na sajtu?\n\nSajt se ažurira za oko 2 minuta.')) return;
  setBusy(true);
  try {
    const r = await api<{ publishedAt: number }>('POST', '/api/admin/publish');
    S.unpublished = false;
    S.publish = { at: r.publishedAt, by: S.user.username };
    pubStatus = { text: 'Objavljivanje u toku… (oko 2 min)', cls: '' };
    toast('Objava je pokrenuta. Sajt će biti ažuriran za oko 2 minuta.');
    pollPublish(r.publishedAt);
  } catch (e) {
    toast((e as Error).message, true);
  } finally {
    setBusy(false);
    updateChrome();
  }
}

function pollPublish(since: number, started = Date.now()) {
  clearTimeout(pollTimer);
  pollTimer = window.setTimeout(async () => {
    try {
      const r = await api<{ runs: { status: string; conclusion: string | null; createdAt: string }[] | null }>('GET', '/api/admin/publish');
      const run = (r.runs || []).find((x) => Date.parse(x.createdAt) >= since - 60_000);
      if (run && run.status === 'completed') {
        pubStatus =
          run.conclusion === 'success'
            ? { text: '✓ Objavljeno — izmene su na sajtu.', cls: 'ok' }
            : { text: 'Objava nije uspela. Pokušajte ponovo ili javite Milošu.', cls: 'on' };
        updateChrome();
        return;
      }
    } catch {
      /* keep polling */
    }
    if (Date.now() - started < 10 * 60_000) pollPublish(since, started);
    else {
      pubStatus = { text: 'Objava traje duže nego obično — proverite sajt za par minuta.', cls: 'on' };
      updateChrome();
    }
  }, 10_000);
  updateChrome();
}

// ---------------------------------------------------------------- shell
const TABS: [string, string, Name | null][] = [
  ['gallery', 'Naši radovi', 'gallery'],
  ['slots', 'Slike sajta', 'slots'],
  ['docs', 'Katalozi i PDF', 'docs'],
  ['settings', 'Kontakt podaci', 'settings'],
  ['faq', 'Česta pitanja', 'faq'],
  ['texts', 'Tekstovi', 'texts'],
  ['announcement', 'Obaveštenje', 'announcement'],
  ['account', 'Nalog', null],
  ['help', 'Pomoć', null],
];
let tab = 'gallery';

function setBusy(b: boolean) {
  document.querySelectorAll<HTMLButtonElement>('[data-busy]').forEach((el) => (el.disabled = b));
}

function updateChrome() {
  const bar = document.querySelector('.savebar');
  bar?.classList.toggle('show', dirty.size > 0);
  const cnt = document.querySelector('[data-dirty-count]');
  if (cnt) cnt.textContent = [...dirty].map((n) => TABS.find((t) => t[2] === n)?.[1]).join(', ');
  document.querySelectorAll<HTMLElement>('.tabs button').forEach((b) => {
    const n = TABS.find((t) => t[0] === b.dataset.tab)?.[2];
    b.querySelector('.dot')?.remove();
    if (n && dirty.has(n)) b.append(h('span', { class: 'dot', title: 'Nesačuvane izmene' }));
  });
  const st = document.querySelector('[data-pub-status]');
  if (st) {
    st.className = 'st badge ' + (pubStatus ? pubStatus.cls : S.unpublished || dirty.size ? 'on' : 'ok');
    st.textContent = pubStatus
      ? pubStatus.text
      : S.unpublished || dirty.size
        ? 'Ima neobjavljenih izmena'
        : S.publish
          ? `Sve je objavljeno (${fmtTime(S.publish.at)})`
          : 'Sajt prikazuje originalni sadržaj';
  }
}

function renderShell() {
  app.replaceChildren(
    h(
      'header',
      { class: 'top' },
      h(
        'div',
        { class: 'top-in' },
        h('img', { src: '/img/logo-white.png', alt: 'Algreen' }),
        h('strong', {}, 'Uređivanje sajta'),
        h(
          'div',
          { class: 'pub' },
          h('span', { class: 'st badge', 'data-pub-status': true }),
          h('button', { type: 'button', class: 'btn primary', 'data-busy': true, onclick: publish }, 'Objavi na sajt'),
          h('a', { class: 'btn ghost small', href: '/', target: '_blank', rel: 'noopener' }, 'Pogledaj sajt ↗'),
        ),
        h('span', { class: 'who' }, S.user.name),
      ),
      h(
        'nav',
        { class: 'tabs', role: 'tablist' },
        TABS.map(([id, label]) =>
          h('button', { type: 'button', role: 'tab', 'data-tab': id, 'aria-selected': String(id === tab), onclick: () => go(id) }, label),
        ),
      ),
    ),
    h('main', { id: 'view' }),
    h(
      'div',
      { class: 'savebar', role: 'region', 'aria-label': 'Čuvanje' },
      h(
        'div',
        { class: 'in' },
        h('strong', {}, 'Nesačuvane izmene:'),
        h('span', { class: 'muted', 'data-dirty-count': true }),
        h('span', { style: 'flex:1' }),
        h('button', { type: 'button', class: 'btn', 'data-busy': true, onclick: discardAll }, 'Odbaci'),
        h('button', { type: 'button', class: 'btn primary', 'data-busy': true, onclick: () => saveAll() }, 'Sačuvaj izmene'),
      ),
    ),
  );
  renderView();
  updateChrome();
}

function go(id: string) {
  tab = TABS.some((t) => t[0] === id) ? id : 'gallery';
  if (location.hash !== `#${tab}`) history.replaceState(null, '', `#${tab}`);
  document.querySelectorAll<HTMLElement>('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  renderView();
  window.scrollTo(0, 0);
}

function renderView() {
  const view = document.getElementById('view');
  if (!view) return;
  const render = VIEWS[tab] || VIEWS.gallery;
  view.replaceChildren(...render());
  updateChrome();
}

const resetBtn = (n: Name, label: string, msg: string) =>
  customized(n) ? h('button', { type: 'button', class: 'btn small', onclick: () => resetSection(n, msg) }, label) : null;

const l10nInputs = (v: L10n, onChange: () => void, opts: { area?: boolean; placeholder?: L10n; label?: string } = {}) => {
  const field = (lang: 'sr' | 'en') => {
    const props = {
      value: v[lang],
      placeholder: opts.placeholder?.[lang] || '',
      oninput: (e: Event) => {
        v[lang] = (e.target as HTMLInputElement).value;
        onChange();
      },
    };
    return h('div', {}, h('span', { class: 'lang' }, lang === 'sr' ? 'SRPSKI' : 'ENGLISH'), opts.area ? h('textarea', props) : h('input', { type: 'text', ...props }));
  };
  return h('div', {}, opts.label ? h('label', {}, opts.label) : null, h('div', { class: 'two' }, field('sr'), field('en')));
};

// ---------------------------------------------------------------- views
const VIEWS: Record<string, () => Node[]> = {
  gallery: viewGallery,
  slots: viewSlots,
  docs: viewDocs,
  settings: viewSettings,
  faq: viewFaq,
  texts: viewTexts,
  announcement: viewAnnouncement,
  account: viewAccount,
  help: viewHelp,
};

function progressBox() {
  const bar = h('div');
  const label = h('div', { class: 'muted' });
  const box = h('div', { class: 'stack', style: 'display:none;margin-top:10px' }, label, h('div', { class: 'progress' }, bar));
  return {
    box,
    set(text: string, p: number) {
      box.style.display = '';
      label.textContent = text;
      bar.style.width = `${Math.round(p * 100)}%`;
    },
    done() {
      box.style.display = 'none';
    },
  };
}

function viewGallery(): Node[] {
  const items = get('gallery');
  const prog = progressBox();

  const addFiles = async (files: File[]) => {
    const imgs = files.filter((f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name));
    if (!imgs.length) return toast('Izaberite fotografije (JPG, PNG).', true);
    setBusy(true);
    let ok = 0;
    try {
      for (let i = 0; i < imgs.length; i++) {
        const label = `Otpremanje ${i + 1} od ${imgs.length}: ${imgs[i].name}`;
        prog.set(label, 0);
        try {
          const m = await uploadImage(imgs[i], (p) => prog.set(label, p));
          // New photos go first — the newest work is what visitors should see.
          get('gallery').splice(ok, 0, { id: `m${m.id}`, media: m.id, caption: { sr: '', en: '' }, hidden: false });
          ok++;
          touch('gallery');
        } catch (e) {
          toast((e as Error).message, true);
        }
      }
    } finally {
      setBusy(false);
      prog.done();
    }
    if (ok) {
      renderView();
      toast(`Dodato fotografija: ${ok}. Dodajte opis i kliknite „Sačuvaj izmene”.`);
    }
  };

  const drop = h(
    'div',
    {
      class: 'drop',
      ondragover: (e: DragEvent) => {
        if (!e.dataTransfer?.types.includes('Files')) return;
        e.preventDefault();
        drop.classList.add('over');
      },
      ondragleave: () => drop.classList.remove('over'),
      ondrop: (e: DragEvent) => {
        if (!e.dataTransfer?.files.length) return;
        e.preventDefault();
        drop.classList.remove('over');
        addFiles([...e.dataTransfer.files]);
      },
    },
    h('p', { style: 'margin:0 0 10px' }, 'Prevucite fotografije ovde ili'),
    filePicker('+ Dodaj fotografije', 'image/*', true, addFiles, 'btn primary'),
    h('p', { class: 'muted', style: 'margin:10px 0 0' }, 'Možete izabrati više slika odjednom. Slike se automatski smanjuju i optimizuju.'),
    prog.box,
  );

  const visible = items.filter((i) => !i.hidden).length;
  let dragFrom = -1;
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const [it] = items.splice(from, 1);
    items.splice(to, 0, it);
    touch('gallery');
    renderView();
  };

  const cards = items.map((it, i) => {
    const preview = it.media ? mediaUrl(it.media) : D.gallery.find((g) => g.src === it.src)?.preview || it.src || '';
    const card = h(
      'div',
      {
        class: `gi${it.hidden ? ' hid' : ''}`,
        draggable: 'true',
        ondragstart: (e: DragEvent) => {
          dragFrom = i;
          card.classList.add('drag');
          e.dataTransfer?.setData('text/plain', String(i));
        },
        ondragend: () => card.classList.remove('drag'),
        ondragover: (e: DragEvent) => {
          if (dragFrom < 0) return;
          e.preventDefault();
          card.classList.add('over');
        },
        ondragleave: () => card.classList.remove('over'),
        ondrop: (e: DragEvent) => {
          if (dragFrom < 0) return;
          e.preventDefault();
          card.classList.remove('over');
          const from = dragFrom;
          dragFrom = -1;
          move(from, i);
        },
      },
      h(
        'div',
        { class: 'thumb', title: 'Prevucite da promenite redosled' },
        h('img', { src: preview, alt: '', loading: 'lazy', draggable: 'false' }),
        h('span', { class: 'n' }, String(i + 1)),
        it.hidden ? h('span', { class: 'h' }, 'Sakriveno') : null,
      ),
      h(
        'div',
        { class: 'body' },
        h('input', {
          type: 'text',
          value: it.caption.sr,
          placeholder: 'Opis (npr. Ulazna vrata AG 77, Niš)',
          'aria-label': 'Opis slike (srpski)',
          maxlength: '300',
          oninput: (e: Event) => {
            it.caption.sr = (e.target as HTMLInputElement).value;
            touch('gallery');
          },
        }),
        h(
          'details',
          { class: 'en' },
          h('summary', {}, it.caption.en ? `EN: ${it.caption.en}` : 'Opis na engleskom'),
          h('input', {
            type: 'text',
            value: it.caption.en,
            placeholder: 'Caption (English)',
            'aria-label': 'Caption (English)',
            maxlength: '300',
            oninput: (e: Event) => {
              it.caption.en = (e.target as HTMLInputElement).value;
              touch('gallery');
            },
          }),
        ),
        h(
          'div',
          { class: 'tools' },
          h('button', { type: 'button', class: 'btn icon small', title: 'Pomeri levo / gore', 'aria-label': 'Pomeri unazad', onclick: () => move(i, i - 1), disabled: i === 0 }, '←'),
          h('button', { type: 'button', class: 'btn icon small', title: 'Pomeri desno / dole', 'aria-label': 'Pomeri unapred', onclick: () => move(i, i + 1), disabled: i === items.length - 1 }, '→'),
          h('button', { type: 'button', class: 'btn small', title: 'Stavi na početak', onclick: () => move(i, 0), disabled: i === 0 }, 'Na početak'),
          h(
            'button',
            {
              type: 'button',
              class: 'btn small',
              title: it.hidden ? 'Ponovo prikaži na sajtu' : 'Privremeno sakrij sa sajta (ne briše)',
              onclick: () => {
                it.hidden = !it.hidden;
                touch('gallery');
                renderView();
              },
            },
            it.hidden ? 'Prikaži' : 'Sakrij',
          ),
          h(
            'button',
            {
              type: 'button',
              class: 'btn small danger',
              title: 'Obriši sa sajta',
              onclick: () => {
                if (!confirm('Obrisati ovu fotografiju iz galerije?')) return;
                items.splice(i, 1);
                touch('gallery');
                renderView();
              },
            },
            'Obriši',
          ),
        ),
      ),
    );
    return card;
  });

  return [
    h('h1', {}, 'Naši radovi'),
    h(
      'p',
      { class: 'lead' },
      'Fotografije sa stranice „Naši radovi”. Redosled menjate prevlačenjem slika (ili strelicama). Opis slike se prikazuje kada posetilac otvori sliku i pomaže da vas Google pronađe.',
    ),
    drop,
    h(
      'div',
      { class: 'row', style: 'margin:18px 0 10px' },
      h('strong', {}, `${visible} fotografija na sajtu`),
      items.length > visible ? h('span', { class: 'muted' }, `+ ${items.length - visible} sakriveno`) : null,
      h('span', { style: 'flex:1' }),
      resetBtn('gallery', 'Vrati originalnu galeriju', 'Vratiti originalnu galeriju (27 fotografija)? Vaše promene galerije biće poništene.'),
    ),
    h('div', { class: 'gal' }, cards),
  ];
}

function groupBy<T extends { group: string }>(list: T[]) {
  const m = new Map<string, T[]>();
  for (const x of list) m.set(x.group, [...(m.get(x.group) || []), x]);
  return m;
}

function viewSlots(): Node[] {
  const slots = get('slots');
  const out: Node[] = [
    h('h1', {}, 'Slike sajta'),
    h('p', { class: 'lead' }, 'Sve ostale slike na sajtu. Kliknite „Zameni” i izaberite novu sliku; „Vrati original” vraća prvobitnu.'),
    h('div', { class: 'hint' }, 'Savet: izaberite sliku sličnog oblika kao trenutna (položena ili uspravna) — slika se automatski seče da popuni prostor.'),
  ];
  for (const [group, list] of groupBy(D.slots)) {
    out.push(
      h('h2', {}, group),
      h(
        'div',
        { class: 'grid' },
        list.map((s) => {
          const id = slots[s.key];
          const prog = progressBox();
          return h(
            'div',
            { class: 'slot' },
            h('div', { class: 'pic' }, h('img', { src: id ? mediaUrl(id) : s.preview, alt: '', loading: 'lazy' })),
            h(
              'div',
              { class: 'body stack' },
              h('div', { class: 'row' }, h('span', { class: 'name' }, s.label), id ? h('span', { class: 'badge on' }, 'Promenjeno') : null),
              h(
                'div',
                { class: 'row' },
                filePicker(
                  'Zameni',
                  'image/*',
                  false,
                  async ([f]) => {
                    setBusy(true);
                    try {
                      const m = await uploadImage(f, (p) => prog.set('Otpremanje…', p));
                      get('slots')[s.key] = m.id;
                      touch('slots');
                      renderView();
                    } catch (e) {
                      toast((e as Error).message, true);
                    } finally {
                      setBusy(false);
                      prog.done();
                    }
                  },
                  'btn small',
                ),
                id
                  ? h(
                      'button',
                      {
                        type: 'button',
                        class: 'btn small',
                        onclick: () => {
                          delete get('slots')[s.key];
                          touch('slots');
                          renderView();
                        },
                      },
                      'Vrati original',
                    )
                  : null,
              ),
              prog.box,
            ),
          );
        }),
      ),
    );
  }
  return out;
}

function viewDocs(): Node[] {
  const docs = get('docs');
  const out: Node[] = [
    h('h1', {}, 'Katalozi i PDF dokumenti'),
    h('p', { class: 'lead' }, 'Zamenite PDF katalog ili tehnički list novom verzijom. Link na sajtu ostaje na istom mestu, samo vodi na novi fajl.'),
  ];
  const nameOf = (id: string) => S.media.find((m) => m.id === id)?.name || 'novi PDF';
  for (const [group, list] of groupBy(D.docs)) {
    out.push(
      h('h2', {}, group),
      h(
        'div',
        { class: 'stack' },
        list.map((d) => {
          const id = docs[d.key];
          const prog = progressBox();
          return h(
            'div',
            { class: 'card stack' },
            h('div', { class: 'row' }, h('strong', {}, d.label), id ? h('span', { class: 'badge on' }, 'Promenjeno') : null),
            h(
              'div',
              { class: 'row' },
              h('a', { href: id ? mediaUrl(id) : d.href, target: '_blank', rel: 'noopener' }, id ? nameOf(id) : decodeURIComponent(d.href.split('/').pop() || '')),
              h('span', { style: 'flex:1' }),
              filePicker(
                'Zameni PDF',
                'application/pdf,.pdf',
                false,
                async ([f]) => {
                  setBusy(true);
                  try {
                    const m = await uploadPdf(f, (p) => prog.set('Otpremanje…', p));
                    get('docs')[d.key] = m.id;
                    touch('docs');
                    renderView();
                  } catch (e) {
                    toast((e as Error).message, true);
                  } finally {
                    setBusy(false);
                    prog.done();
                  }
                },
                'btn small',
              ),
              id
                ? h(
                    'button',
                    {
                      type: 'button',
                      class: 'btn small',
                      onclick: () => {
                        delete get('docs')[d.key];
                        touch('docs');
                        renderView();
                      },
                    },
                    'Vrati original',
                  )
                : null,
            ),
            prog.box,
          );
        }),
      ),
    );
  }
  return out;
}

function input(label: string, value: string, onInput: (v: string) => void, type = 'text', placeholder = '') {
  return h(
    'div',
    {},
    h('label', {}, label),
    h('input', { type, value, placeholder, oninput: (e: Event) => onInput((e.target as HTMLInputElement).value) }),
  );
}

function viewSettings(): Node[] {
  const s = get('settings');
  const t = () => touch('settings');
  return [
    h('h1', {}, 'Kontakt podaci'),
    h('p', { class: 'lead' }, 'Telefoni, e-mail i adrese — menjaju se svuda na sajtu odjednom (zaglavlje, podnožje, kontakt stranica, dugme „Pozovite” na telefonu i podaci za Google).'),
    h(
      'div',
      { class: 'card stack' },
      h('h2', { style: 'margin-top:0' }, 'Opšte'),
      h(
        'div',
        { class: 'two' },
        input('Glavni e-mail (prikazuje se na sajtu)', s.email, (v) => ((s.email = v), t()), 'email'),
        input('WhatsApp broj (za dugme u podnožju)', s.whatsapp, (v) => ((s.whatsapp = v), t()), 'text', '+381 63 …'),
        input('Facebook link', s.facebook, (v) => ((s.facebook = v), t()), 'url', 'https://…'),
        input('Instagram link', s.instagram, (v) => ((s.instagram = v), t()), 'url', 'https://…'),
      ),
    ),
    ...s.branches.map((b, bi) =>
      h(
        'div',
        { class: 'card stack', style: 'margin-top:14px' },
        h('h2', { style: 'margin-top:0' }, `Poslovnica ${b.city.sr || bi + 1}`),
        l10nInputs(b.city, t, { label: 'Grad' }),
        l10nInputs(b.street, t, { label: 'Ulica i broj' }),
        l10nInputs(b.postal, t, { label: 'Poštanski broj, mesto, država' }),
        h(
          'div',
          { class: 'two' },
          h(
            'div',
            {},
            h('label', {}, 'Telefoni (svaki u novom redu; prvi je glavni)'),
            h('textarea', {
              value: b.phones.join('\n'),
              oninput: (e: Event) => {
                b.phones = (e.target as HTMLTextAreaElement).value.split('\n');
                t();
              },
            }),
            bi === 0 ? h('p', { class: 'muted', style: 'margin:4px 0 0' }, 'Prvi broj Niša koristi i dugme „Pozovite” na telefonu.') : null,
          ),
          h(
            'div',
            { class: 'stack' },
            input('E-mail poslovnice', b.email, (v) => ((b.email = v), t()), 'email'),
            input('Link za mapu (Google Maps)', b.mapsUrl, (v) => ((b.mapsUrl = v), t()), 'url', 'https://maps.google.com/…'),
          ),
        ),
      ),
    ),
    h('div', { class: 'row', style: 'margin-top:14px' }, resetBtn('settings', 'Vrati originalne podatke', 'Vratiti originalne kontakt podatke?')),
  ];
}

function viewFaq(): Node[] {
  const items = get('faq');
  const t = () => touch('faq');
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const [x] = items.splice(from, 1);
    items.splice(to, 0, x);
    t();
    renderView();
  };
  return [
    h('h1', {}, 'Česta pitanja'),
    h('p', { class: 'lead' }, 'Pitanja i odgovori na početnoj strani. Google ih može prikazati direktno u rezultatima pretrage, zato pišite jasno i kratko.'),
    h(
      'div',
      { class: 'stack' },
      items.map((f, i) =>
        h(
          'div',
          { class: 'card stack' },
          h(
            'div',
            { class: 'row' },
            h('strong', {}, `Pitanje ${i + 1}`),
            h('span', { style: 'flex:1' }),
            h('button', { type: 'button', class: 'btn icon small', 'aria-label': 'Gore', onclick: () => move(i, i - 1), disabled: i === 0 }, '↑'),
            h('button', { type: 'button', class: 'btn icon small', 'aria-label': 'Dole', onclick: () => move(i, i + 1), disabled: i === items.length - 1 }, '↓'),
            h(
              'button',
              {
                type: 'button',
                class: 'btn small danger',
                onclick: () => {
                  if (!confirm('Obrisati ovo pitanje?')) return;
                  items.splice(i, 1);
                  t();
                  renderView();
                },
              },
              'Obriši',
            ),
          ),
          l10nInputs(f.q, t, { label: 'Pitanje' }),
          l10nInputs(f.a, t, { label: 'Odgovor', area: true }),
        ),
      ),
    ),
    h(
      'div',
      { class: 'row', style: 'margin-top:14px' },
      h(
        'button',
        {
          type: 'button',
          class: 'btn primary',
          onclick: () => {
            items.push({ q: { sr: '', en: '' }, a: { sr: '', en: '' } });
            t();
            renderView();
          },
        },
        '+ Dodaj pitanje',
      ),
      resetBtn('faq', 'Vrati originalna pitanja', 'Vratiti originalnih 6 pitanja?'),
    ),
    h('p', { class: 'muted' }, 'Pitanje bez srpskog teksta ili odgovora se ne prikazuje. Ako engleski nije popunjen, na engleskoj verziji se prikazuje srpski.'),
  ];
}

let textQuery = '';
let textGroup = '';
function viewTexts(): Node[] {
  const texts = get('texts');
  const groups = [...new Set(D.texts.map((x) => x.group))];
  const list = h('div', { class: 'stack' });
  const counter = h('span', { class: 'muted' });

  const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'dj');
  const draw = () => {
    const q = norm(textQuery.trim());
    const rows = D.texts.filter(
      (x) =>
        (!textGroup || x.group === textGroup) &&
        (!q || norm(`${x.sr} ${x.en} ${texts.sr[x.path] || ''} ${texts.en[x.path] || ''} ${x.path}`).includes(q)),
    );
    counter.textContent = `${rows.length} tekstova`;
    list.replaceChildren(
      ...rows.slice(0, 150).map((x) => {
        const isMeta = /\.meta(Title|Description)$/.test(x.path);
        const limit = x.path.endsWith('metaTitle') ? 60 : x.path.endsWith('metaDescription') ? 160 : 0;
        const box = h('div', { class: 'txt stack' });
        const mod = () => box.classList.toggle('mod', x.path in texts.sr || x.path in texts.en);
        const field = (lang: 'sr' | 'en') => {
          const def = x[lang];
          const cur = texts[lang][x.path] ?? def;
          const len = h('span', { class: 'muted' });
          const showLen = (v: string) => limit && (len.textContent = `${v.length}/${limit} karaktera${v.length > limit ? ' — predugačko za Google' : ''}`);
          const el = h((cur.length > 70 ? 'textarea' : 'input') as 'input', {
            type: 'text',
            value: cur,
            placeholder: def,
            oninput: (e: Event) => {
              const v = (e.target as HTMLInputElement).value;
              if (v.trim() === '' || v === def) delete texts[lang][x.path];
              else texts[lang][x.path] = v;
              showLen(v);
              mod();
              touch('texts');
            },
          });
          showLen(cur);
          return h('div', {}, h('span', { class: 'lang' }, lang === 'sr' ? 'SRPSKI' : 'ENGLISH'), el, limit ? len : null);
        };
        box.append(
          h(
            'div',
            { class: 'row' },
            h('span', { class: 'badge' }, x.group),
            isMeta ? h('span', { class: 'badge on' }, x.path.endsWith('metaTitle') ? 'Google naslov' : 'Google opis') : null,
            h('span', { class: 'path' }, x.path),
            h('span', { style: 'flex:1' }),
            x.path in texts.sr || x.path in texts.en
              ? h(
                  'button',
                  {
                    type: 'button',
                    class: 'btn small',
                    onclick: () => {
                      delete texts.sr[x.path];
                      delete texts.en[x.path];
                      touch('texts');
                      draw();
                    },
                  },
                  'Vrati original',
                )
              : null,
          ),
          h('div', { class: 'two' }, field('sr'), field('en')),
        );
        mod();
        return box;
      }),
      ...(rows.length > 150 ? [h('p', { class: 'muted' }, 'Prikazano prvih 150 — suzite pretragu.')] : []),
    );
  };

  const search = h('input', {
    type: 'search',
    value: textQuery,
    placeholder: 'Pretraga — upišite deo teksta koji želite da promenite…',
    oninput: (e: Event) => {
      textQuery = (e.target as HTMLInputElement).value;
      draw();
    },
  });
  const select = h(
    'select',
    {
      class: 'btn',
      onchange: (e: Event) => {
        textGroup = (e.target as HTMLSelectElement).value;
        draw();
      },
    },
    h('option', { value: '' }, 'Sve stranice'),
    groups.map((g) => h('option', { value: g, selected: g === textGroup }, g)),
  );
  draw();
  const changed = Object.keys(texts.sr).length + Object.keys(texts.en).length;
  return [
    h('h1', {}, 'Tekstovi'),
    h(
      'p',
      { class: 'lead' },
      'Svi tekstovi sa sajta, na srpskom i engleskom. Pronađite tekst pretragom, izmenite ga i sačuvajte. Promenjeni tekstovi su označeni crvenom linijom.',
    ),
    h('div', { class: 'hint' }, '„Google naslov” i „Google opis” se ne vide na stranici — to je ono što ljudi vide u Google pretrazi. Menjajte ih pažljivo.'),
    h('div', { class: 'row', style: 'margin:14px 0' }, h('div', { style: 'flex:1;min-width:240px' }, search), select, counter),
    h('div', { class: 'row', style: 'margin-bottom:10px' }, changed ? h('span', { class: 'badge on' }, `Promenjeno: ${changed}`) : null, resetBtn('texts', 'Vrati sve originalne tekstove', 'Vratiti SVE tekstove na original?')),
    list,
  ];
}

function viewAnnouncement(): Node[] {
  const a = get('announcement');
  const t = () => {
    touch('announcement');
    drawPreview();
  };
  const preview = h('div');
  const drawPreview = () =>
    preview.replaceChildren(
      a.enabled && a.text.sr
        ? h(
            'div',
            { style: 'background:#e01f26;color:#fff;padding:8px 12px;border-radius:8px;text-align:center;font-size:14px' },
            a.text.sr,
            a.link ? h('u', { style: 'margin-left:6px;font-weight:600' }, a.linkLabel.sr || 'Saznajte više') : null,
          )
        : h('p', { class: 'muted' }, 'Obaveštenje je isključeno — ne prikazuje se na sajtu.'),
    );
  drawPreview();
  return [
    h('h1', {}, 'Obaveštenje na vrhu sajta'),
    h('p', { class: 'lead' }, 'Crvena traka na vrhu svake stranice — npr. „Kolektivni godišnji odmor od 1. do 15. avgusta” ili akcija. Posetilac je može zatvoriti.'),
    h(
      'div',
      { class: 'card stack' },
      h(
        'label',
        { style: 'display:flex;gap:8px;align-items:center;font-size:15px' },
        h('input', {
          type: 'checkbox',
          checked: a.enabled,
          onchange: (e: Event) => {
            a.enabled = (e.target as HTMLInputElement).checked;
            t();
          },
        }),
        'Prikaži obaveštenje na sajtu',
      ),
      l10nInputs(a.text, t, { label: 'Tekst obaveštenja', placeholder: { sr: 'Npr. Radimo i subotom od 9 do 14h', en: 'E.g. Open on Saturdays 9am–2pm' } }),
      input('Link (nije obavezno)', a.link, (v) => ((a.link = v), t()), 'text', 'https://… ili /kontakt/'),
      l10nInputs(a.linkLabel, t, { label: 'Tekst linka', placeholder: { sr: 'Saznajte više', en: 'Learn more' } }),
      h('h2', {}, 'Pregled'),
      preview,
    ),
  ];
}

function viewAccount(): Node[] {
  const cur = h('input', { type: 'password', autocomplete: 'current-password' });
  const n1 = h('input', { type: 'password', autocomplete: 'new-password' });
  const n2 = h('input', { type: 'password', autocomplete: 'new-password' });
  const form = h(
    'form',
    {
      class: 'card stack',
      style: 'max-width:420px',
      onsubmit: async (e: Event) => {
        e.preventDefault();
        if (n1.value !== n2.value) return toast('Nove lozinke se ne poklapaju.', true);
        try {
          await api('POST', '/api/admin/password', { current: cur.value, next: n1.value });
          form.reset();
          toast('Lozinka je promenjena.');
        } catch (err) {
          toast((err as Error).message, true);
        }
      },
    },
    h('h2', { style: 'margin-top:0' }, 'Promena lozinke'),
    h('div', {}, h('label', {}, 'Trenutna lozinka'), cur),
    h('div', {}, h('label', {}, 'Nova lozinka (najmanje 10 karaktera)'), n1),
    h('div', {}, h('label', {}, 'Ponovite novu lozinku'), n2),
    h('button', { type: 'submit', class: 'btn primary' }, 'Promeni lozinku'),
  );
  return [
    h('h1', {}, 'Nalog'),
    h('p', { class: 'lead' }, `Prijavljeni ste kao ${S.user.name} (${S.user.username}).`),
    form,
    h(
      'p',
      {},
      h(
        'button',
        {
          type: 'button',
          class: 'btn',
          onclick: async () => {
            if (dirty.size && !confirm('Imate nesačuvane izmene. Ipak se odjaviti?')) return;
            dirty.clear();
            await api('POST', '/api/admin/logout').catch(() => {});
            renderLogin('Odjavljeni ste.');
          },
        },
        'Odjavi se',
      ),
    ),
  ];
}

function viewHelp(): Node[] {
  const li = (s: string) => h('li', {}, s);
  return [
    h('h1', {}, 'Pomoć'),
    h(
      'div',
      { class: 'card stack' },
      h('h2', { style: 'margin-top:0' }, 'Kako se menja sajt'),
      h(
        'ol',
        {},
        li('Izmenite šta želite u bilo kojoj kartici (slike, tekstovi, kontakt…).'),
        li('Kliknite „Sačuvaj izmene” (traka na dnu ekrana). Izmene su sačuvane, ali još nisu na sajtu.'),
        li('Kada ste spremni, kliknite „Objavi na sajt”. Za oko 2 minuta izmene su vidljive svima.'),
      ),
      h('p', { class: 'muted' }, 'Ako sajt ne prikazuje izmene ni posle 5 minuta, osvežite stranicu (povucite nadole na telefonu ili Ctrl+F5 na računaru).'),
      h('h2', {}, 'Fotografije'),
      h(
        'ul',
        {},
        li('Najbolje su JPG fotografije sa telefona ili fotoaparata — ne morate ih smanjivati, to radimo automatski.'),
        li('„Sakrij” privremeno sklanja sliku sa sajta (možete je vratiti). „Obriši” je trajno uklanja iz galerije.'),
        li('Dodajte kratak opis slike (npr. „Ulazna vrata EXCLUSIVE AG 77, Niš”) — pomaže da vas ljudi pronađu na Google-u.'),
      ),
      h('h2', {}, 'Vraćanje na staro'),
      h('p', {}, 'Svaka kartica ima dugme „Vrati original” koje vraća prvobitni sadržaj. Ništa ne može trajno da „pokvari” sajt.'),
    ),
  ];
}

// ---------------------------------------------------------------- login / boot
function renderLogin(msg = '') {
  clearTimeout(pollTimer);
  const user = h('input', { type: 'text', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', required: true });
  const pass = h('input', { type: 'password', autocomplete: 'current-password', required: true });
  const err = h('p', { class: 'muted', role: 'alert', style: msg ? 'color:#b8161c' : '' }, msg);
  const btn = h('button', { type: 'submit', class: 'btn primary', style: 'width:100%' }, 'Prijava');
  app.replaceChildren(
    h(
      'div',
      { class: 'login' },
      h('img', { src: '/img/logo.png', alt: 'Algreen' }),
      h(
        'form',
        {
          class: 'card stack',
          onsubmit: async (e: Event) => {
            e.preventDefault();
            btn.disabled = true;
            err.textContent = '';
            try {
              await api('POST', '/api/admin/login', { username: user.value, password: pass.value });
              await boot();
            } catch (e2) {
              err.textContent = (e2 as Error).message;
              err.setAttribute('style', 'color:#b8161c');
            } finally {
              btn.disabled = false;
            }
          },
        },
        h('h1', { style: 'text-align:center' }, 'Uređivanje sajta'),
        h('div', {}, h('label', {}, 'Korisničko ime'), user),
        h('div', {}, h('label', {}, 'Lozinka'), pass),
        btn,
        err,
      ),
    ),
  );
  user.focus();
}

async function boot() {
  try {
    S = await api<State>('GET', '/api/admin/state');
  } catch (e) {
    if ((e as ApiError).status !== 401) app.replaceChildren(h('p', { class: 'boot' }, (e as Error).message));
    return;
  }
  for (const k of Object.keys(work) as Name[]) delete work[k];
  dirty.clear();
  toNull.clear();
  tab = TABS.some((t) => `#${t[0]}` === location.hash) ? location.hash.slice(1) : 'gallery';
  renderShell();
  if (!S.publishConfigured) pubStatus = { text: 'Objavljivanje još nije podešeno', cls: 'on' };
  updateChrome();
}

window.addEventListener('beforeunload', (e) => {
  if (dirty.size) {
    e.preventDefault();
    e.returnValue = '';
  }
});

boot();
