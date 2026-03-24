/**
 * jaarboek.js — PDF Jaarboek genereren met jsPDF
 * Verwacht: sb, actieveKind, isPremium(), showUpgradeModal() in globale scope
 * jsPDF UMD: window.jspdf.jsPDF
 */

// ─── Constanten ───────────────────────────────────────────────────────────────

const GROEN       = [135, 74, 97];   /* dusty rose */
const GROEN_LICHT = [250, 236, 242]; /* blush licht */
const GROEN_MID   = [221, 180, 197]; /* blush mid */
const TEKST       = [51, 51, 51];
const GRIJS       = [120, 120, 120];
const WIT         = [255, 255, 255];

const MAANDEN_NL = ['Januari','Februari','Maart','April','Mei','Juni',
                    'Juli','Augustus','September','Oktober','November','December'];

// ─── Hoofd functie ───────────────────────────────────────────────────────────

async function jaarboekGenereren() {
  // 1. Paywall check
  const premium = await isPremium();
  if (!premium) { showUpgradeModal(); return; }

  if (!actieveKind) { alert('Selecteer eerst een kind.'); return; }

  const jaar = parseInt(document.getElementById('jaarboek-jaar')?.value || new Date().getFullYear());
  const btn  = document.getElementById('btn-jaarboek');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ PDF wordt gemaakt...'; }

  try {
    // 2. Data ophalen
    const [dagboek, mijlpalen, woordjes, metingen, zwData] = await Promise.all([
      sb.from('dagboek').select('*').eq('kind_id', actieveKind.id)
        .gte('datum', `${jaar}-01-01`).lte('datum', `${jaar}-12-31`).order('datum'),
      sb.from('mijlpalen').select('*').eq('kind_id', actieveKind.id).order('datum'),
      sb.from('woordjes').select('*').eq('kind_id', actieveKind.id).order('datum'),
      sb.from('metingen').select('*').eq('kind_id', actieveKind.id).order('datum'),
      // Zwangerschap (optioneel — geen fout als tabel leeg is)
      Promise.all([
        sb.from('zwangerschap_info').select('*').eq('kind_id', actieveKind.id).maybeSingle(),
        sb.from('zwangerschap_herinneringen').select('*').eq('kind_id', actieveKind.id).order('datum'),
        sb.from('zwangerschap_mijlpalen').select('*').eq('kind_id', actieveKind.id).order('created_at'),
      ]).catch(() => [{ data: null }, { data: [] }, { data: [] }]),
    ]);

    const zwInfo    = zwData[0]?.data ?? null;
    const zwHerinn  = zwData[1]?.data ?? [];
    const zwMijl    = zwData[2]?.data ?? [];
    const heeftZw   = zwInfo || zwHerinn.length > 0 || zwMijl.length > 0;

    // 3. PDF opbouwen
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    pdfCover(doc, actieveKind, jaar);
    // Zwangerschap als eerste hoofdstuk — alleen als er data is
    if (heeftZw) pdfZwangerschapPagina(doc, zwInfo, zwHerinn, zwMijl);
    pdfDagboekPaginas(doc, dagboek.data || [], jaar);
    pdfMijlpalenPagina(doc, mijlpalen.data || []);
    pdfWoordjesPagina(doc, woordjes.data || []);
    pdfMetingenPagina(doc, metingen.data || []);

    // 4. Downloaden
    const bestandsnaam = `Groeiboek_${actieveKind.naam.replace(/\s+/g,'_')}_${jaar}.pdf`;
    doc.save(bestandsnaam);

  } catch (err) {
    alert('Fout bij genereren: ' + err.message);
    console.error(err);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '📄 Jaarboek downloaden'; }
  }
}

// ─── Cover pagina ─────────────────────────────────────────────────────────────

function pdfCover(doc, kind, jaar) {
  const W = 210, H = 297;

  // Groene achtergrond boven
  doc.setFillColor(...GROEN);
  doc.rect(0, 0, W, 140, 'F');

  // Decoratieve cirkel
  doc.setFillColor(255, 255, 255, 0.08);
  doc.setDrawColor(...GROEN_MID);
  doc.setLineWidth(0.5);
  doc.circle(170, 30, 60, 'D');
  doc.circle(170, 30, 45, 'D');

  // Logo / emoji boven
  doc.setTextColor(...WIT);
  doc.setFontSize(40);
  doc.text('🌱', 105, 60, { align: 'center' });

  // Naam kind
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.text(kind.naam, 105, 90, { align: 'center' });

  // Jaar
  doc.setFontSize(20);
  doc.setFont('helvetica', 'normal');
  doc.text(`Jaarboek ${jaar}`, 105, 105, { align: 'center' });

  // Leeftijd
  if (kind.geboortedatum) {
    const geb = new Date(kind.geboortedatum + 'T00:00:00');
    const startJaar = new Date(`${jaar}-01-01`);
    const eindJaar  = new Date(`${jaar}-12-31`);
    const mndStart  = maandVerschil(geb, startJaar);
    const mndEind   = maandVerschil(geb, eindJaar);
    const leeftijdTekst = `${formatLeeftijdMnd(mndStart)} – ${formatLeeftijdMnd(mndEind)}`;
    doc.setFontSize(13);
    doc.text(leeftijdTekst, 105, 118, { align: 'center' });
  }

  // Witte onderpagina
  doc.setFillColor(...WIT);
  doc.roundedRect(15, 155, 180, 100, 8, 8, 'F');

  // Subtitel
  doc.setTextColor(...GROEN);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Een jaar vol mooie momenten', 105, 175, { align: 'center' });

  // Samenvatting
  doc.setTextColor(...GRIJS);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Bewaard met liefde via Groeiboek', 105, 185, { align: 'center' });

  // Geboortedatum
  if (kind.geboortedatum) {
    doc.text(`Geboren: ${formatDatumLang(kind.geboortedatum)}`, 105, 198, { align: 'center' });
  }

  // Footer
  doc.setFillColor(...GROEN_LICHT);
  doc.rect(0, 275, W, 22, 'F');
  doc.setTextColor(...GROEN);
  doc.setFontSize(9);
  doc.text('groeiboek.vercel.app', 105, 288, { align: 'center' });
}

// ─── Dagboek pagina's (per maand) ────────────────────────────────────────────

function pdfDagboekPaginas(doc, entries, jaar) {
  // Groepeer per maand
  const perMaand = {};
  entries.forEach(e => {
    const m = new Date(e.datum + 'T00:00:00').getMonth();
    if (!perMaand[m]) perMaand[m] = [];
    perMaand[m].push(e);
  });

  if (Object.keys(perMaand).length === 0) {
    doc.addPage();
    pdfPaginaHeader(doc, `Dagboek ${jaar}`, 'Geen dagboekstukjes dit jaar.');
    return;
  }

  for (let m = 0; m <= 11; m++) {
    const maandEntries = perMaand[m];
    if (!maandEntries) continue;

    doc.addPage();
    const maandNaam = `${MAANDEN_NL[m]} ${jaar}`;
    let y = pdfPaginaHeader(doc, `📖 Dagboek — ${maandNaam}`);

    maandEntries.forEach(e => {
      // Check pagina-ruimte
      if (y > 250) { doc.addPage(); y = pdfPaginaHeader(doc, `📖 Dagboek — ${maandNaam} (vervolg)`); }

      // Datum + sfeer
      doc.setFillColor(...GROEN_LICHT);
      doc.roundedRect(15, y, 180, 8, 2, 2, 'F');
      doc.setTextColor(...GROEN);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(formatDatumLang(e.datum), 20, y + 5.5);
      if (e.sfeer) doc.text(e.sfeer, 185, y + 5.5, { align: 'right' });
      y += 11;

      // Inhoud
      doc.setTextColor(...TEKST);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const regels = doc.splitTextToSize(e.inhoud || '', 170);
      regels.forEach(regel => {
        if (y > 270) { doc.addPage(); y = pdfPaginaHeader(doc, `📖 Dagboek — ${maandNaam} (vervolg)`); }
        doc.text(regel, 20, y);
        y += 5.5;
      });
      y += 6;
    });
  }
}

// ─── Mijlpalen pagina ────────────────────────────────────────────────────────

function pdfMijlpalenPagina(doc, mijlpalen) {
  doc.addPage();
  let y = pdfPaginaHeader(doc, '⭐ Mijlpalen');

  if (mijlpalen.length === 0) {
    doc.setTextColor(...GRIJS);
    doc.setFontSize(10);
    doc.text('Nog geen mijlpalen bereikt.', 20, y);
    return;
  }

  const gesorteerd = [...mijlpalen].sort((a, b) => (a.datum || '').localeCompare(b.datum || ''));

  gesorteerd.forEach((m, i) => {
    if (y > 265) { doc.addPage(); y = pdfPaginaHeader(doc, '⭐ Mijlpalen (vervolg)'); }

    // Lijn
    if (i > 0) {
      doc.setDrawColor(...GROEN_MID);
      doc.setLineWidth(0.3);
      doc.line(25, y - 2, 190, y - 2);
    }

    // Icoon cirkel
    doc.setFillColor(...GROEN_LICHT);
    doc.circle(22, y + 3, 4, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...GROEN);
    doc.text(m.icoon || '★', 22, y + 5.5, { align: 'center' });

    // Naam
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEKST);
    doc.text(m.naam || '', 30, y + 4);

    // Datum
    if (m.datum) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRIJS);
      doc.text(formatDatumLang(m.datum), 30, y + 9);
    }

    y += 17;
  });
}

// ─── Woordjes pagina ─────────────────────────────────────────────────────────

function pdfWoordjesPagina(doc, woordjes) {
  doc.addPage();
  let y = pdfPaginaHeader(doc, '🗣️ Eerste woordjes');

  if (woordjes.length === 0) {
    doc.setTextColor(...GRIJS);
    doc.setFontSize(10);
    doc.text('Nog geen woordjes bewaard.', 20, y);
    return;
  }

  // Grid: 3 kolommen
  const kolBreedte = 55;
  const kolStart   = [20, 80, 140];
  let kolom = 0;
  let rijY  = y;

  woordjes.forEach(w => {
    if (kolom === 0 && rijY > 270) {
      doc.addPage();
      rijY = pdfPaginaHeader(doc, '🗣️ Eerste woordjes (vervolg)');
    }

    const x = kolStart[kolom];

    // Chip achtergrond
    doc.setFillColor(...GROEN_LICHT);
    doc.setDrawColor(...GROEN_MID);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, rijY, 50, 16, 3, 3, 'FD');

    // Woord
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GROEN);
    doc.text(w.woord || '', x + 25, rijY + 7, { align: 'center', maxWidth: 46 });

    // Datum
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRIJS);
    doc.text(w.datum ? formatDatumKort(w.datum) : '', x + 25, rijY + 13, { align: 'center' });

    kolom++;
    if (kolom >= 3) { kolom = 0; rijY += 22; }
  });
}

// ─── Metingen pagina ─────────────────────────────────────────────────────────

function pdfMetingenPagina(doc, metingen) {
  doc.addPage();
  let y = pdfPaginaHeader(doc, '📏 Groeicurve — Metingen');

  if (metingen.length === 0) {
    doc.setTextColor(...GRIJS);
    doc.setFontSize(10);
    doc.text('Nog geen metingen bewaard.', 20, y);
    return;
  }

  // Tabel header
  doc.setFillColor(...GROEN);
  doc.rect(15, y, 180, 9, 'F');
  doc.setTextColor(...WIT);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Datum',        22,  y + 6);
  doc.text('Lengte (cm)',  90,  y + 6);
  doc.text('Gewicht (kg)', 150, y + 6);
  y += 12;

  // Rijen
  metingen.forEach((m, i) => {
    if (y > 270) { doc.addPage(); y = pdfPaginaHeader(doc, '📏 Groeicurve (vervolg)'); }

    if (i % 2 === 0) {
      doc.setFillColor(...GROEN_LICHT);
      doc.rect(15, y - 4, 180, 8, 'F');
    }
    doc.setTextColor(...TEKST);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(formatDatumLang(m.datum),          22,  y + 1);
    doc.text(m.lengte  != null ? String(m.lengte)  : '—', 90,  y + 1);
    doc.text(m.gewicht != null ? String(m.gewicht) : '—', 150, y + 1);
    y += 9;
  });

  // Laatste meting samenvatting
  const laatste = metingen[metingen.length - 1];
  if (laatste) {
    y += 8;
    doc.setFillColor(...GROEN_LICHT);
    doc.roundedRect(15, y, 180, 20, 4, 4, 'F');
    doc.setTextColor(...GROEN);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Laatste meting:', 22, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEKST);
    const samenvatting = [
      laatste.lengte  != null ? `${laatste.lengte} cm` : null,
      laatste.gewicht != null ? `${laatste.gewicht} kg` : null,
    ].filter(Boolean).join('  ·  ');
    doc.text(samenvatting || '—', 22, y + 15);
    doc.text(`(${formatDatumLang(laatste.datum)})`, 185, y + 15, { align: 'right' });
  }
}

// ─── PDF helper: pagina-header ───────────────────────────────────────────────

function pdfPaginaHeader(doc, titel, ondertitel) {
  const W = 210;

  // Groene balk
  doc.setFillColor(...GROEN);
  doc.rect(0, 0, W, 28, 'F');

  // Logo klein
  doc.setTextColor(...WIT);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Groeiboek', 15, 10);

  // Kindnaam rechts
  if (actieveKind?.naam) {
    doc.text(actieveKind.naam, W - 15, 10, { align: 'right' });
  }

  // Titel
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(titel, 15, 22);

  // Paginanummer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${doc.internal.getCurrentPageInfo().pageNumber}`, W - 15, 22, { align: 'right' });

  let y = 38;

  if (ondertitel) {
    doc.setTextColor(...GRIJS);
    doc.setFontSize(10);
    doc.text(ondertitel, 15, y);
    y += 10;
  }

  return y;
}

// ─── Zwangerschap pagina ──────────────────────────────────────────────────────

function pdfZwangerschapPagina(doc, info, herinneringen, mijlpalen) {
  const W = 210;
  doc.addPage();
  let y = pdfPaginaHeader(doc, 'Zwangerschap');

  // Info balk
  if (info) {
    doc.setFillColor(...GROEN_LICHT);
    doc.roundedRect(15, y, 180, 20, 4, 4, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GROEN);
    if (info.ontdekt_datum) {
      doc.text('Positieve test:', 22, y + 8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEKST);
      doc.text(formatDatumLang(info.ontdekt_datum), 60, y + 8);
    }
    if (info.uitgerekende_datum) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...GROEN);
      doc.text('Uitgerekend:', 22, y + 15);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEKST);
      doc.text(formatDatumLang(info.uitgerekende_datum), 60, y + 15);
    }
    y += 28;
  }

  // Mijlpalen
  if (mijlpalen.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GROEN);
    doc.text('Mijlpalen', 15, y);
    y += 8;

    mijlpalen.forEach((m, i) => {
      if (y > 265) { doc.addPage(); y = pdfPaginaHeader(doc, 'Zwangerschap (vervolg)'); }
      if (i > 0) {
        doc.setDrawColor(...GROEN_MID);
        doc.setLineWidth(0.3);
        doc.line(25, y - 2, 190, y - 2);
      }
      doc.setFillColor(...GROEN_LICHT);
      doc.circle(22, y + 3, 3.5, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...TEKST);
      doc.text(m.naam || '', 30, y + 4);
      if (m.datum) {
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GRIJS);
        doc.text(formatDatumLang(m.datum), 30, y + 10);
      }
      y += 17;
    });
    y += 6;
  }

  // Herinneringen per trimester
  [1, 2, 3].forEach(nr => {
    const entries = herinneringen.filter(h => h.trimester === nr);
    if (entries.length === 0) return;

    if (y > 240) { doc.addPage(); y = pdfPaginaHeader(doc, 'Zwangerschap (vervolg)'); }

    const trimLabels = { 1: 'Trimester 1 — Week 1–12', 2: 'Trimester 2 — Week 13–27', 3: 'Trimester 3 — Week 28+' };
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GROEN);
    doc.text(trimLabels[nr], 15, y);
    y += 10;

    entries.forEach(e => {
      if (y > 250) { doc.addPage(); y = pdfPaginaHeader(doc, 'Zwangerschap (vervolg)'); }

      doc.setFillColor(...GROEN_LICHT);
      doc.roundedRect(15, y, 180, 8, 2, 2, 'F');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...GROEN);
      doc.text(formatDatumLang(e.datum), 20, y + 5.5);
      y += 11;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEKST);
      const regels = doc.splitTextToSize(e.inhoud || '', 170);
      regels.forEach(regel => {
        if (y > 270) { doc.addPage(); y = pdfPaginaHeader(doc, 'Zwangerschap (vervolg)'); }
        doc.text(regel, 20, y);
        y += 5.5;
      });
      y += 6;
    });
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maandVerschil(geb, peil) {
  return (peil.getFullYear() - geb.getFullYear()) * 12 + (peil.getMonth() - geb.getMonth());
}

function formatLeeftijdMnd(mnd) {
  if (mnd < 0) return '0 mnd';
  if (mnd < 24) return `${mnd} mnd`;
  const jr = Math.floor(mnd / 12), rest = mnd % 12;
  return rest === 0 ? `${jr} jr` : `${jr} jr ${rest} mnd`;
}

function formatDatumLang(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('nl-NL',
    { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDatumKort(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('nl-NL',
    { day: 'numeric', month: 'short', year: 'numeric' });
}
