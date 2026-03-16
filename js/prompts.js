/**
 * prompts.js — Schrijfprompts per periode
 */

const PROMPTS = {
  dag: [
    "Wat deed je baby vandaag dat je wilt onthouden?",
    "Welk geluidje of gelaatsuitdrukking zag je vandaag voor het eerst?",
    "Hoe was de sfeer vandaag — voor jou én voor je kind?",
    "Wat maakte je vandaag aan het lachen?",
    "Beschrijf één moment van vandaag zo gedetailleerd mogelijk.",
    "Wat vroeg je kind vandaag van jou, zonder woorden?",
    "Wat wil je jezelf over tien jaar herinneren van vandaag?",
  ],
  week: [
    "Wat was het mooiste moment van deze week?",
    "Wat heeft je kind deze week nieuw geleerd of ontdekt?",
    "Welk routinemoment vond je deze week het fijnst?",
    "Wat heeft je verrast deze week?",
    "Hoe zag een doorsnee dag er deze week uit?",
    "Wat was moeilijk deze week, en hoe ging je ermee om?",
    "Beschrijf hoe je kind er nu uitziet — kleur ogen, haar, geurtje.",
  ],
  maand: [
    "Welk geluidje of gebaartje bleef hangen deze maand?",
    "Wat is er deze maand veranderd aan je kind?",
    "Welke nieuwe vaardigheid liet je kind zien deze maand?",
    "Wat zijn de favoriete dingetjes van je kind op dit moment?",
    "Hoe is jouw leven als ouder deze maand geweest?",
    "Wat wil je nooit vergeten van deze maand?",
    "Beschrijf een typisch moment van deze leeftijdsfase.",
  ],
  kwartaal: [
    "Wat wil je later aan je kind vertellen over deze fase?",
    "Hoe is je kind veranderd in de afgelopen drie maanden?",
    "Wat heeft deze periode jou geleerd over ouderschap?",
    "Welke mijlpaal was het meest bijzonder dit kwartaal?",
    "Als je deze tijd in één woord zou omschrijven — welk woord is dat?",
    "Wat waren jullie favoriete plekken of bezigheden dit kwartaal?",
    "Wat hoop je dat je kind mee krijgt uit deze vroege tijd?",
  ],
};

/**
 * Geeft een willekeurige prompt terug voor de gegeven periode.
 * @param {'dag'|'week'|'maand'|'kwartaal'} periode
 * @returns {string}
 */
function willekeurigePrompt(periode) {
  const lijst = PROMPTS[periode] || PROMPTS.dag;
  return lijst[Math.floor(Math.random() * lijst.length)];
}
