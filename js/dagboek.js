/**
 * dagboek.js — Dagboek logica voor Groeiboek
 * Verwacht: sb (Supabase client), berekenLeeftijd(), willekeurigePrompt() in globale scope
 */

let actieveKindId = null;
let actieveKindGeboortedatum = null;

// ─── Init ────────────────────────────────────────────────────────────────────

async function dagboekInit() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return window.location.href = 'inlog.html';
  await laadKinderen();
  periodeGewijzigd(); // zet prompt voor standaard periode
}

// ─── Kinderen ────────────────────────────────────────────────────────────────

async function laadKinderen() {
  const { data: kinderen } = await sb.from('kinderen').select('*').order('created_at');
  const sel = document.getElementById('kind-select');
  sel.innerHTML = '';

  if (!kinderen || kinderen.length === 0) {
    sel.innerHTML = '<option>Geen kinderen</option>';
    toonLeegscherm();
    return;
  }

  kinderen.forEach(k => {
    const opt = document.createElement('option');
    opt.value = k.id;
    opt.dataset.geboortedatum = k.geboortedatum;
    opt.textContent = k.naam;
    sel.appendChild(opt);
  });

  const eerste = kinderen[0];
  actieveKindId = eerste.id;
  actieveKindGeboortedatum = eerste.geboortedatum;
  updateLeeftijdLabel();
  await laadTijdlijn();
}

async function kindWisselen() {
  const sel = document.getElementById('kind-select');
  const opt = sel.options[sel.selectedIndex];
  actieveKindId = opt.value;
  actieveKindGeboortedatum = opt.dataset.geboortedatum;
  updateLeeftijdLabel();
  await laadTijdlijn();
}

function updateLeeftijdLabel() {
  const datum = document.getElementById('inp-datum').value || vandaag();
  const el = document.getElementById('leeftijd-label');
  if (!el) return;
  if (actieveKindGeboortedatum) {
    el.textContent = berekenLeeftijd(actieveKindGeboortedatum, datum);
  } else {
    el.textContent = '';
  }
}

// ─── Periode & prompt ────────────────────────────────────────────────────────

function periodeGewijzigd() {
  const periode = gekozenPeriode();
  document.getElementById('schrijfprompt').textContent = willekeurigePrompt(periode);

  // Ververs leeftijdslabel op basis van geselecteerde datum
  updateLeeftijdLabel();
}

function gekozenPeriode() {
  const actief = document.querySelector('.periode-btn.actief');
  return actief ? actief.dataset.periode : 'dag';
}

function kiesPeriode(btn) {
  document.querySelectorAll('.periode-btn').forEach(b => b.classList.remove('actief'));
  btn.classList.add('actief');
  periodeGewijzigd();
}

function nieuwePrompt() {
  document.getElementById('schrijfprompt').textContent = willekeurigePrompt(gekozenPeriode());
}

// ─── Sfeer ───────────────────────────────────────────────────────────────────

let gekozenSfeer = '';

function kiesSfeer(waarde, btn) {
  gekozenSfeer = gekozenSfeer === waarde ? '' : waarde;
  document.querySelectorAll('.sfeer-btn').forEach(b => b.classList.remove('actief'));
  if (gekozenSfeer) btn.classList.add('actief');
}

// ─── Opslaan ─────────────────────────────────────────────────────────────────

async function opslaan() {
  const inhoud = document.getElementById('inp-inhoud').value.trim();
  const datum = document.getElementById('inp-datum').value;
  const periode = gekozenPeriode();

  if (!inhoud) return toonMelding('Schrijf eerst iets voordat je opslaat.', 'fout');
  if (!datum) return toonMelding('Kies een datum.', 'fout');
  if (!actieveKindId) return toonMelding('Selecteer eerst een kind.', 'fout');

  const leeftijd = actieveKindGeboortedatum
    ? berekenLeeftijd(actieveKindGeboortedatum, datum)
    : null;

  const { data: { user } } = await sb.auth.getUser();

  const { error } = await sb.from('dagboek').insert({
    kind_id: actieveKindId,
    user_id: user.id,
    inhoud,
    datum,
    periode,
    sfeer: gekozenSfeer || null,
    leeftijd,
  });

  if (error) {
    if (error.code === '23505') {
      return toonMelding('Je hebt voor deze periode al een stukje geschreven.', 'fout');
    }
    return toonMelding('Fout bij opslaan: ' + error.message, 'fout');
  }

  // Reset formulier
  document.getElementById('inp-inhoud').value = '';
  gekozenSfeer = '';
  document.querySelectorAll('.sfeer-btn').forEach(b => b.classList.remove('actief'));
  nieuwePrompt();
  toonMelding('✅ Opgeslagen!', 'ok');
  await laadTijdlijn();
}

// ─── Tijdlijn ────────────────────────────────────────────────────────────────

async function laadTijdlijn() {
  const container = document.getElementById('tijdlijn');
  container.innerHTML = '<div class="tl-laden">Laden...</div>';

  const { data: entries, error } = await sb
    .from('dagboek')
    .select('*')
    .eq('kind_id', actieveKindId)
    .order('datum', { ascending: false });

  container.innerHTML = '';

  if (error) { container.innerHTML = '<p class="tl-laden">Fout bij laden.</p>'; return; }
  if (!entries || entries.length === 0) { toonLeegscherm(); return; }

  verbergLeegscherm();

  entries.forEach((e, i) => renderEntry(e, i, container));
}

function renderEntry(e, i, container) {
  const item = document.createElement('div');
  item.className = 'tl-item';

  const periodeLabels = { dag: '☀️ Dag', week: '📅 Week', maand: '🌙 Maand', kwartaal: '🌱 Kwartaal' };
  const periodeLabel = periodeLabels[e.periode] || e.periode || '';
  const sfeerlabel = e.sfeer ? `<span class="tl-sfeer">${e.sfeer}</span>` : '';
  const leeftijdlabel = e.leeftijd ? `<span class="tl-leeftijd">${e.leeftijd}</span>` : '';

  item.innerHTML = `
    <div class="tl-dot"></div>
    <div class="tl-kaart" onclick="toggleEntry(this)">
      <div class="tl-header">
        <div class="tl-meta">
          <span class="tl-periode">${periodeLabel}</span>
          ${leeftijdlabel}
          ${sfeerlabel}
        </div>
        <div class="tl-datum">${formatDatum(e.datum)}</div>
      </div>
      <div class="tl-preview">${escHtml(e.inhoud).replace(/\n/g, ' ').substring(0, 120)}${e.inhoud.length > 120 ? '…' : ''}</div>
      <div class="tl-volledig" style="display:none">${escHtml(e.inhoud).replace(/\n/g, '<br>')}</div>
    </div>
  `;
  container.appendChild(item);
}

function toggleEntry(kaart) {
  const preview = kaart.querySelector('.tl-preview');
  const volledig = kaart.querySelector('.tl-volledig');
  const open = volledig.style.display !== 'none';
  preview.style.display = open ? 'block' : 'none';
  volledig.style.display = open ? 'none' : 'block';
  kaart.classList.toggle('open', !open);
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

function toonLeegscherm() {
  const el = document.getElementById('leeg');
  const tl = document.getElementById('tijdlijn-sectie');
  if (el) el.style.display = 'block';
  if (tl) tl.style.display = 'none';
}

function verbergLeegscherm() {
  const el = document.getElementById('leeg');
  const tl = document.getElementById('tijdlijn-sectie');
  if (el) el.style.display = 'none';
  if (tl) tl.style.display = 'block';
}

function toonMelding(tekst, type) {
  const el = document.getElementById('melding');
  if (!el) return;
  el.textContent = tekst;
  el.className = 'melding ' + type;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

function vandaag() {
  return new Date().toISOString().split('T')[0];
}

function formatDatum(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('nl-NL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

function escHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function uitloggen() {
  await sb.auth.signOut();
  window.location.href = 'inlog.html';
}
