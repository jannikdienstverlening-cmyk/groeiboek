/**
 * zwangerschap.js — Optionele zwangerschapssectie
 * Verwacht: sb (Supabase client), window.zwKindId, window.zwUserId
 */

// ─── Schrijfprompts per trimester ──────────────────────────────────────────

const ZW_PROMPTS = {
  1: [
    'Hoe ontdekte je dat je zwanger was? Beschrijf het moment.',
    'Wat was je allereerste gedachte toen je de positieve test zag?',
    'Hoe reageerde je partner toen je het nieuws vertelde?',
    'Hoe voelde je je de eerste weken — lichamelijk en van binnen?',
    'Welk geheim bewaarde je het liefst, en hoe lang lukte dat?',
    'Wat hoopte je dat de baby van jou zou erven?',
  ],
  2: [
    'Beschrijf de allereerste beweging die je voelde. Waar was je? Hoe laat?',
    'Hoe kozen jullie de naam? Was er een moment dat je wist: dit is het?',
    'Wat verraste je het meest aan zwanger zijn?',
    'Schrijf een brief aan je baby. Vertel wie je bent en wat je wenst.',
    'Hoe is de relatie met je partner veranderd in deze periode?',
    'Wat was het mooiste moment van dit trimester?',
  ],
  3: [
    'Hoe stel je je de bevalling voor? Waar kijk je naar uit?',
    'Hoe beweegt de baby nu — heeft hij/zij al een ritme?',
    'Hoe ziet je babykamer er uit, en welke keuzes heb je bewust gemaakt?',
    'Wat wil je dat je kind weet over deze periode als het dit boek later leest?',
    'Wat wil je over deze tijd nooit vergeten?',
    'Beschrijf de bevalling — begin bij het begin.',
  ],
};

// ─── Mijlpalen-lijst ───────────────────────────────────────────────────────

const ZW_MIJLPALEN = [
  // Trimester 1
  { sleutel: 'positieve_test',   naam: 'Positieve zwangerschapstest', trimester: 1 },
  { sleutel: 'partner_verteld',  naam: 'Partner verteld',             trimester: 1 },
  { sleutel: 'familie_verteld',  naam: 'Familie verteld',             trimester: 1 },
  { sleutel: 'verloskundige',    naam: 'Eerste verloskundige afspraak', trimester: 1 },
  { sleutel: 'eerste_echo',      naam: 'Eerste echo gezien',          trimester: 1 },
  { sleutel: 'hartslag_gehoord', naam: 'Hartslag gehoord',            trimester: 1 },
  // Trimester 2
  { sleutel: 'eerste_beweging',  naam: 'Eerste beweging gevoeld',     trimester: 2 },
  { sleutel: 'partner_schop',    naam: 'Partner voelde eerste schop', trimester: 2 },
  { sleutel: 'geslacht_bekend',  naam: 'Geslacht bekend',             trimester: 2 },
  { sleutel: 'naam_gekozen',     naam: 'Naam gekozen',                trimester: 2 },
  { sleutel: 'structuurecho',    naam: '20-wekenecho (structuurecho)', trimester: 2 },
  { sleutel: 'buikfoto_eerste',  naam: 'Eerste buikfoto gemaakt',     trimester: 2 },
  // Trimester 3
  { sleutel: 'babykamer_klaar',  naam: 'Babykamer ingericht',         trimester: 3 },
  { sleutel: 'tas_ingepakt',     naam: 'Ziekenhuistas ingepakt',      trimester: 3 },
  { sleutel: 'kraamzorg',        naam: 'Kraamzorg geregeld',          trimester: 3 },
  { sleutel: 'baby_geboren',     naam: 'Baby geboren 🎉',             trimester: 3 },
];

// ─── State ────────────────────────────────────────────────────────────────

let zwInfo        = null;
let zwHerinn      = [];
let zwFotos       = [];
let zwMijlpalen   = [];
let activeTrimester = 1;

// ─── Init ─────────────────────────────────────────────────────────────────

async function zwangerschapInit() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return window.location.href = 'inlog.html';
  window.zwUserId = session.user.id;

  await laadKinderenZw();
}

// ─── Kinderen ─────────────────────────────────────────────────────────────

async function laadKinderenZw() {
  const { data: kinderen } = await sb.from('kinderen').select('*').order('created_at');
  const sel = document.getElementById('kind-select');
  sel.innerHTML = '';

  if (!kinderen || kinderen.length === 0) {
    sel.innerHTML = '<option>Geen kinderen</option>';
    document.getElementById('zw-leeg').style.display = 'block';
    document.getElementById('zw-inhoud').style.display = 'none';
    return;
  }

  kinderen.forEach(k => {
    const opt = document.createElement('option');
    opt.value = k.id;
    opt.textContent = k.naam;
    sel.appendChild(opt);
  });

  window.zwKindId = kinderen[0].id;
  await laadAllesZw();
}

async function kindWisselenZw() {
  window.zwKindId = document.getElementById('kind-select').value;
  await laadAllesZw();
}

// ─── Alles laden ──────────────────────────────────────────────────────────

async function laadAllesZw() {
  const [infoRes, herrinnRes, fotosRes, mijlRes] = await Promise.all([
    sb.from('zwangerschap_info').select('*').eq('kind_id', window.zwKindId).maybeSingle(),
    sb.from('zwangerschap_herinneringen').select('*').eq('kind_id', window.zwKindId).order('datum', { ascending: false }),
    sb.from('zwangerschap_fotos').select('*').eq('kind_id', window.zwKindId).order('datum', { ascending: false }),
    sb.from('zwangerschap_mijlpalen').select('*').eq('kind_id', window.zwKindId),
  ]);

  zwInfo      = infoRes.data;
  zwHerinn    = herrinnRes.data || [];
  zwFotos     = fotosRes.data  || [];
  zwMijlpalen = mijlRes.data   || [];

  if (!zwInfo) {
    document.getElementById('zw-setup').style.display = 'block';
    document.getElementById('zw-inhoud').style.display = 'none';
  } else {
    document.getElementById('zw-setup').style.display = 'none';
    document.getElementById('zw-inhoud').style.display = 'block';
    renderInfoBalk();
    renderTrimesterInhoud(activeTrimester);
    renderMijlpalen();
  }
}

// ─── Setup opslaan ────────────────────────────────────────────────────────

async function zwSetupOpslaan() {
  const uitgerekend = document.getElementById('zw-uitgerekend').value || null;
  const ontdekt     = document.getElementById('zw-ontdekt').value     || null;

  const { error } = await sb.from('zwangerschap_info').upsert({
    kind_id:           window.zwKindId,
    user_id:           window.zwUserId,
    uitgerekende_datum: uitgerekend,
    ontdekt_datum:     ontdekt,
  }, { onConflict: 'kind_id' });

  if (error) { zwFeedback('setup', 'Fout: ' + error.message, 'fout'); return; }
  await laadAllesZw();
}

// ─── Info balk ────────────────────────────────────────────────────────────

function renderInfoBalk() {
  const uitgerekend = zwInfo.uitgerekende_datum
    ? new Date(zwInfo.uitgerekende_datum + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';
  const ontdekt = zwInfo.ontdekt_datum
    ? new Date(zwInfo.ontdekt_datum + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  document.getElementById('zw-info-uitgerekend').textContent = uitgerekend;
  document.getElementById('zw-info-ontdekt').textContent     = ontdekt;
}

// ─── Trimester tabs ───────────────────────────────────────────────────────

function kiesTrimester(nr) {
  activeTrimester = nr;
  document.querySelectorAll('.trim-tab').forEach((t, i) =>
    t.classList.toggle('actief', i + 1 === nr)
  );
  renderTrimesterInhoud(nr);
}

function renderTrimesterInhoud(nr) {
  renderPrompt(nr);
  renderHerinneringen(nr);
  renderFotosZw(nr);
}

// ─── Schrijfprompt ────────────────────────────────────────────────────────

function renderPrompt(nr) {
  const lijst = ZW_PROMPTS[nr];
  document.getElementById('zw-prompt').textContent =
    lijst[Math.floor(Math.random() * lijst.length)];
  document.getElementById('zw-trim-hidden').value = nr;
}

function nieuwePromptZw() {
  renderPrompt(activeTrimester);
}

// ─── Herinnering opslaan ──────────────────────────────────────────────────

async function zwHerinnOpslaan() {
  const inhoud   = document.getElementById('zw-inhoud-inp').value.trim();
  const datum    = document.getElementById('zw-datum-inp').value;
  const trimester = parseInt(document.getElementById('zw-trim-hidden').value);

  if (!inhoud) return zwFeedback('herinn', 'Schrijf eerst iets.', 'fout');
  if (!datum)  return zwFeedback('herinn', 'Kies een datum.', 'fout');

  const { error } = await sb.from('zwangerschap_herinneringen').insert({
    kind_id:  window.zwKindId,
    user_id:  window.zwUserId,
    trimester,
    inhoud,
    datum,
  });

  if (error) return zwFeedback('herinn', 'Fout: ' + error.message, 'fout');

  document.getElementById('zw-inhoud-inp').value = '';
  renderPrompt(trimester);
  zwFeedback('herinn', '✅ Opgeslagen!', 'ok');

  const { data } = await sb.from('zwangerschap_herinneringen').select('*')
    .eq('kind_id', window.zwKindId).order('datum', { ascending: false });
  zwHerinn = data || [];
  renderHerinneringen(trimester);
}

function renderHerinneringen(nr) {
  const container = document.getElementById('zw-herinn-lijst');
  const gefilterd = zwHerinn.filter(h => h.trimester === nr);

  if (gefilterd.length === 0) {
    container.innerHTML = '<p class="zw-leeg-tekst">Nog niets opgeschreven voor dit trimester.</p>';
    return;
  }

  container.innerHTML = gefilterd.map(h => `
    <div class="zw-herinn-kaart">
      <div class="zw-herinn-datum">${zwFormatDatum(h.datum)}</div>
      <div class="zw-herinn-tekst">${escZw(h.inhoud).replace(/\n/g, '<br>')}</div>
    </div>
  `).join('');
}

// ─── Foto's ───────────────────────────────────────────────────────────────

function zwFotoPreview(input) {
  const preview = document.getElementById('zw-foto-preview');
  if (!input.files?.[0]) { preview.style.display = 'none'; return; }
  const reader = new FileReader();
  reader.onload = e => { preview.src = e.target.result; preview.style.display = 'block'; };
  reader.readAsDataURL(input.files[0]);
}

async function zwFotoUploaden() {
  const input  = document.getElementById('zw-foto-input');
  const label  = document.getElementById('zw-foto-label').value.trim();
  const soort  = document.getElementById('zw-foto-soort').value;
  const datum  = document.getElementById('zw-foto-datum').value;
  const bestand = input.files?.[0];

  if (!bestand) return zwFeedback('foto', 'Kies eerst een foto.', 'fout');
  if (!datum)   return zwFeedback('foto', 'Kies een datum.', 'fout');
  if (bestand.size > 20 * 1024 * 1024) return zwFeedback('foto', 'Bestand te groot (max 20 MB).', 'fout');

  const ext = bestand.name.split('.').pop();
  const pad = `${window.zwUserId}/${window.zwKindId}/${Date.now()}_zw.${ext}`;

  const { error: uploadErr } = await sb.storage.from('fotos').upload(pad, bestand, {
    contentType: bestand.type, upsert: false,
  });
  if (uploadErr) return zwFeedback('foto', 'Upload mislukt: ' + uploadErr.message, 'fout');

  const { data: urlData } = sb.storage.from('fotos').getPublicUrl(pad);

  const { error: dbErr } = await sb.from('zwangerschap_fotos').insert({
    kind_id: window.zwKindId,
    user_id: window.zwUserId,
    url:     urlData.publicUrl,
    pad,
    label:   label || null,
    soort,
    datum,
  });

  if (dbErr) return zwFeedback('foto', 'Opslaan mislukt: ' + dbErr.message, 'fout');

  input.value = '';
  document.getElementById('zw-foto-label').value = '';
  document.getElementById('zw-foto-preview').style.display = 'none';
  zwFeedback('foto', '✅ Foto opgeslagen!', 'ok');

  const { data } = await sb.from('zwangerschap_fotos').select('*')
    .eq('kind_id', window.zwKindId).order('datum', { ascending: false });
  zwFotos = data || [];
  renderFotosZw(activeTrimester);
}

function renderFotosZw(nr) {
  // Toon alle foto's gesorteerd — tab-filter is per soort, niet trimester
  // (foto's zijn niet aan een trimester gebonden, wel aan soort)
  const container = document.getElementById('zw-foto-galerij');
  const soortFilter = { 1: 'echo', 2: ['buik', 'aankondiging'], 3: ['buik', 'overig'] };
  const toegestaan = soortFilter[nr];
  const gefilterd  = typeof toegestaan === 'string'
    ? zwFotos.filter(f => f.soort === toegestaan)
    : zwFotos.filter(f => toegestaan.includes(f.soort));

  // Toon álle foto's als de gefilterde set leeg is
  const tonen = gefilterd.length > 0 ? gefilterd : zwFotos;

  if (tonen.length === 0) {
    container.innerHTML = '<p class="zw-leeg-tekst">Nog geen foto\'s toegevoegd.</p>';
    return;
  }

  container.innerHTML = tonen.map(f => `
    <div class="zw-galerij-item" onclick="zwOpenLightbox('${escZwAttr(f.url)}','${escZwAttr(f.label||'')}','${escZwAttr(f.datum||'')}','${escZwAttr(f.soort||'')}')">
      <img src="${escZwAttr(f.url)}" alt="${escZwAttr(f.label || 'Foto')}" loading="lazy">
      <div class="zw-galerij-badge">${zwSoortLabel(f.soort)}</div>
      ${f.label ? `<div class="zw-galerij-label">${escZw(f.label)}</div>` : ''}
    </div>
  `).join('');
}

function zwSoortLabel(soort) {
  return { echo: '🔊 Echo', buik: '🤰 Buik', aankondiging: '🎉 Aankondiging', overig: '📷 Foto' }[soort] || '📷';
}

function zwOpenLightbox(url, label, datum, soort) {
  document.getElementById('zw-lightbox-img').src    = url;
  document.getElementById('zw-lightbox-label').textContent = label || zwSoortLabel(soort);
  document.getElementById('zw-lightbox-datum').textContent = datum
    ? new Date(datum + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  document.getElementById('modal-zw-lightbox').classList.add('open');
}

function zwSluitLightbox() {
  document.getElementById('modal-zw-lightbox').classList.remove('open');
}

// ─── Mijlpalen ────────────────────────────────────────────────────────────

function renderMijlpalen() {
  [1, 2, 3].forEach(nr => {
    const container = document.getElementById(`zw-mijl-${nr}`);
    const bereiktMap = {};
    zwMijlpalen.forEach(m => { bereiktMap[m.sleutel] = m.datum; });

    const items = ZW_MIJLPALEN.filter(m => m.trimester === nr);
    container.innerHTML = items.map(m => {
      const gedaan = m.sleutel in bereiktMap;
      const datum  = bereiktMap[m.sleutel]
        ? new Date(bereiktMap[m.sleutel] + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';
      return `
        <div class="zw-mijl-item ${gedaan ? 'gedaan' : ''}" id="zwmijl-${m.sleutel}">
          <label class="zw-mijl-label">
            <input type="checkbox" ${gedaan ? 'checked' : ''}
              onchange="toggleZwMijlpaal('${m.sleutel}','${escZw(m.naam)}',this)">
            <span class="zw-mijl-naam">${escZw(m.naam)}</span>
          </label>
          ${gedaan && datum ? `<span class="zw-mijl-datum">${datum}</span>` : ''}
        </div>
      `;
    }).join('');
  });
}

// Pending state voor datum-modal
let _zwPendingMijl = null;

async function toggleZwMijlpaal(sleutel, naam, checkbox) {
  if (checkbox.checked) {
    _zwPendingMijl = { sleutel, naam, checkbox };
    document.getElementById('zw-mijl-datum-naam').textContent = naam;
    document.getElementById('zw-mijl-datum-input').value = new Date().toISOString().split('T')[0];
    document.getElementById('modal-zw-mijl-datum').classList.add('open');
  } else {
    const { error } = await sb.from('zwangerschap_mijlpalen')
      .delete().eq('kind_id', window.zwKindId).eq('sleutel', sleutel);
    if (error) { checkbox.checked = true; return; }
    const { data } = await sb.from('zwangerschap_mijlpalen').select('*').eq('kind_id', window.zwKindId);
    zwMijlpalen = data || [];
    renderMijlpalen();
  }
}

async function bevestigZwMijlDatum() {
  if (!_zwPendingMijl) return;
  const datum = document.getElementById('zw-mijl-datum-input').value;
  if (!datum) return;

  document.getElementById('modal-zw-mijl-datum').classList.remove('open');
  const { sleutel, naam, checkbox } = _zwPendingMijl;

  const { error } = await sb.from('zwangerschap_mijlpalen').upsert({
    kind_id: window.zwKindId,
    user_id: window.zwUserId,
    sleutel, naam, datum,
  }, { onConflict: 'kind_id,sleutel' });

  if (error) { checkbox.checked = false; _zwPendingMijl = null; return; }

  const { data } = await sb.from('zwangerschap_mijlpalen').select('*').eq('kind_id', window.zwKindId);
  zwMijlpalen = data || [];
  renderMijlpalen();
  _zwPendingMijl = null;
}

function annuleerZwMijlDatum() {
  document.getElementById('modal-zw-mijl-datum').classList.remove('open');
  if (_zwPendingMijl) { _zwPendingMijl.checkbox.checked = false; _zwPendingMijl = null; }
}

// ─── PDF hoofdstuk ────────────────────────────────────────────────────────

async function zwangerschapPdfData(kindId) {
  const [infoRes, herrinnRes, fotosRes, mijlRes] = await Promise.all([
    sb.from('zwangerschap_info').select('*').eq('kind_id', kindId).maybeSingle(),
    sb.from('zwangerschap_herinneringen').select('*').eq('kind_id', kindId).order('datum'),
    sb.from('zwangerschap_fotos').select('*').eq('kind_id', kindId).order('datum'),
    sb.from('zwangerschap_mijlpalen').select('*').eq('kind_id', kindId).order('created_at'),
  ]);
  return {
    info:      infoRes.data,
    herinn:    herrinnRes.data || [],
    fotos:     fotosRes.data  || [],
    mijlpalen: mijlRes.data   || [],
  };
}

// ─── Feedback ─────────────────────────────────────────────────────────────

function zwFeedback(id, tekst, type) {
  const el = document.getElementById(`zw-melding-${id}`);
  if (!el) return;
  el.textContent = tekst;
  el.className = 'sectie-melding ' + type;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function zwFormatDatum(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function escZw(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function escZwAttr(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

async function uitloggen() {
  await sb.auth.signOut();
  window.location.href = 'inlog.html';
}
