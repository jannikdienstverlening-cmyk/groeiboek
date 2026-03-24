/**
 * fotos.js — Foto uploaden naar Supabase Storage en galerij tonen
 * Verwacht: sb (Supabase client), window.fotosKindId
 * Bucket: 'fotos' (public)
 */

const MAX_BESTAND_MB = 20;

// ─── Preview ──────────────────────────────────────────────────────────────────

function fotoPreview(input) {
  const preview = document.getElementById('foto-preview');
  if (!input.files || !input.files[0]) { preview.style.display = 'none'; return; }

  const bestand = input.files[0];
  if (bestand.size > MAX_BESTAND_MB * 1024 * 1024) {
    fotoFeedback(`Bestand is te groot. Maximum is 20 MB.`, 'fout');
    input.value = '';
    preview.style.display = 'none';
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    preview.src = e.target.result;
    preview.style.display = 'block';
  };
  reader.readAsDataURL(bestand);
}

// ─── Uploaden ─────────────────────────────────────────────────────────────────

async function fotoUploaden() {
  const input  = document.getElementById('foto-input');
  const label  = document.getElementById('foto-label').value.trim();
  const bestand = input.files && input.files[0];

  if (!bestand) return fotoFeedback('Kies eerst een foto.', 'fout');
  if (bestand.size > MAX_BESTAND_MB * 1024 * 1024) {
    return fotoFeedback(`Bestand is te groot. Maximum is 20 MB.`, 'fout');
  }

  const { data: { user } } = await sb.auth.getUser();

  if (!user) return fotoFeedback('Niet ingelogd.', 'fout');
  if (!window.fotosKindId) return fotoFeedback('Geen kind geselecteerd.', 'fout');

  const ext      = bestand.name.split('.').pop();
  const pad      = `${user.id}/${window.fotosKindId}/${Date.now()}.${ext}`;

  // Upload naar Storage
  const { error: uploadError } = await sb.storage
    .from('fotos')
    .upload(pad, bestand, { contentType: bestand.type, upsert: false });

  if (uploadError) return fotoFeedback('Upload mislukt: ' + uploadError.message, 'fout');

  // Publieke URL ophalen
  const { data: urlData } = sb.storage.from('fotos').getPublicUrl(pad);
  const publiekUrl = urlData.publicUrl;

  // Opslaan in tabel
  const { error: dbError } = await sb.from('fotos').insert({
    kind_id: window.fotosKindId,
    user_id: user.id,
    url:     publiekUrl,
    pad,
    label:   label || null,
    datum:   new Date().toISOString().split('T')[0],
  });

  if (dbError) {
    console.error('[fotos] insert error:', dbError);
    return fotoFeedback('Opslaan mislukt: ' + dbError.message, 'fout');
  }

  // Reset
  input.value = '';
  document.getElementById('foto-label').value = '';
  document.getElementById('foto-preview').style.display = 'none';
  fotoFeedback('✅ Foto opgeslagen!', 'ok');
  await laadFotos(window.fotosKindId);
}

// ─── Laden & galerij ─────────────────────────────────────────────────────────

async function laadFotos(kindId) {
  window.fotosKindId = kindId;

  const { data, error } = await sb
    .from('fotos')
    .select('*')
    .eq('kind_id', kindId)
    .order('datum', { ascending: false });

  if (error) { console.error('fotos laden mislukt:', error.message); return; }

  renderGalerij(data || []);
}

function renderGalerij(fotos) {
  const container = document.getElementById('foto-galerij');
  if (!container) return;

  if (fotos.length === 0) {
    container.innerHTML = '<p class="galerij-leeg">Nog geen foto\'s — upload de eerste!</p>';
    return;
  }

  container.innerHTML = fotos.map(f => `
    <div class="galerij-item" onclick="openFotoModal('${escHtmlF(f.url)}', '${escHtmlF(f.label || '')}', '${escHtmlF(f.datum || '')}')">
      <img src="${escHtmlF(f.url)}" alt="${escHtmlF(f.label || 'Foto')}" loading="lazy">
      ${f.label ? `<div class="galerij-label">${escHtmlF(f.label)}</div>` : ''}
    </div>
  `).join('');
}

// ─── Foto lightbox ───────────────────────────────────────────────────────────

function openFotoModal(url, label, datum) {
  document.getElementById('lightbox-img').src   = url;
  document.getElementById('lightbox-label').textContent = label || '';
  document.getElementById('lightbox-datum').textContent = datum
    ? new Date(datum + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  document.getElementById('modal-lightbox').classList.add('open');
}

function sluitLightbox() {
  document.getElementById('modal-lightbox').classList.remove('open');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fotoFeedback(tekst, type) {
  const el = document.getElementById('foto-melding');
  if (!el) return;
  el.textContent = tekst;
  el.className = 'sectie-melding ' + type;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 5000);
}

function escHtmlF(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
