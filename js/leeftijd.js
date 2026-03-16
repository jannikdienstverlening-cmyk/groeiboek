/**
 * leeftijd.js — Leeftijdsberekening in mensvriendelijke tekst
 */

/**
 * Berekent de leeftijd van een kind op een gegeven datum.
 * @param {string} geboortedatum  ISO-datum string, bijv. "2024-03-01"
 * @param {string} datum          ISO-datum string van de peildatum, bijv. "2025-06-15"
 * @returns {string} Bijv. "3 dagen oud", "2 weken oud", "4 maanden oud", "1 jaar en 3 maanden oud"
 */
function berekenLeeftijd(geboortedatum, datum) {
  const geb = new Date(geboortedatum + 'T00:00:00');
  const peil = new Date(datum + 'T00:00:00');

  const diffMs = peil - geb;
  if (diffMs < 0) return 'nog niet geboren';

  const diffDagen = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Minder dan 2 weken: in dagen
  if (diffDagen < 14) {
    return diffDagen === 1 ? '1 dag oud' : `${diffDagen} dagen oud`;
  }

  // Minder dan 8 weken: in weken
  const weken = Math.floor(diffDagen / 7);
  if (weken < 8) {
    return weken === 1 ? '1 week oud' : `${weken} weken oud`;
  }

  // Minder dan 24 maanden: in maanden
  const jaren = peil.getFullYear() - geb.getFullYear();
  const maandVerschil = peil.getMonth() - geb.getMonth();
  let totaalMaanden = jaren * 12 + maandVerschil;
  if (peil.getDate() < geb.getDate()) totaalMaanden--;

  if (totaalMaanden < 24) {
    return totaalMaanden === 1 ? '1 maand oud' : `${totaalMaanden} maanden oud`;
  }

  // 2 jaar en ouder: jaren + resterende maanden
  const jaarDeel = Math.floor(totaalMaanden / 12);
  const maandDeel = totaalMaanden % 12;
  const jaarTekst = jaarDeel === 1 ? '1 jaar' : `${jaarDeel} jaar`;
  if (maandDeel === 0) return `${jaarTekst} oud`;
  const maandTekst = maandDeel === 1 ? '1 maand' : `${maandDeel} maanden`;
  return `${jaarTekst} en ${maandTekst} oud`;
}
