export type Language = 'en' | 'fr';

const copy = {
  en: {
    title: 'Truck Safety Tracker — coming soon', description: 'Fleet paperwork, inspection dates, and reminders. A hosted workspace for Canadian owner-operators and small fleets. Coming soon.',
    skip: 'Skip to content', status: 'Hosted service · Coming soon', nav: 'The plan', contact: 'Get in touch', switch: 'Français', other: '/fr/',
    eyebrow: 'LESS PAPERWORK. A CLEARER ROAD AHEAD.', heading: 'Your fleet’s records.\nFinally in one place.',
    intro: 'A practical workspace for Canadian owner-operators and small fleets. Keep inspection dates and unit documents organized—without building your own IT department.',
    primary: 'Keep me in the loop', secondary: 'See what’s coming', note: 'In development. No payment, account, or fleet upload required.',
    panelLabel: 'THE WORKSPACE WE’RE BUILDING', panelTitle: 'From the shop floor\nto the office.', panelBody: 'One place for the records behind every truck and trailer.',
    panelItems: ['Inspection dates & history', 'Certificates & unit documents', 'Team access across branches'], panelFoot: 'Built around the way small fleets work.',
    strip: ['For trucks & trailers', 'English & French planned', 'Hosted, not DIY', 'Open-source foundations'],
    featuresLabel: 'PRACTICAL BY DESIGN', featuresTitle: 'A little less chasing.\nA lot more organized.', featuresIntro: 'The hosted service is being developed around three everyday jobs. These are planned capabilities—not a live product offer.',
    features: [
      ['01', 'Know what’s coming due', 'Keep inspection history and upcoming dates together. Planned email digests and browser reminders help you decide what needs attention.'],
      ['02', 'Find the right document', 'Organize certificates, registration, insurance, permits, and maintenance files by unit, with optional document expiry dates.'],
      ['03', 'Keep the team on the same page', 'Individual logins, clear roles, and branch access are planned, so the right people can work with the right fleet records.'],
    ],
    workflowLabel: 'THE PLANNED EXPERIENCE', workflowTitle: 'Buy it. Set it up.\nGet back to your fleet.', workflowIntro: 'Our goal is straightforward self-service—from purchase to your own private workspace, without waiting for someone to set it up.',
    steps: [ ['Choose your subscription', 'Review the offer and pay through a secure hosted checkout. Pricing will be confirmed before launch.'], ['Make it your workspace', 'Set up your company and branches, add your real units, and invite your team.'], ['Keep records moving', 'Manage documents, upcoming dates, and reminder preferences from your browser.'] ],
    signupLabel: 'FOLLOW THE BUILD', signupTitle: 'Want to know when\nit’s ready?', signupIntro: 'Leave your email and preferred language. We’ll store your launch-interest request. No confirmation email is sent, and announcement sending is not enabled yet.',
    email: 'Email address', language: 'Preferred language', consent: 'Save my email and language for a launch-interest request. I have read the privacy details below. No ongoing newsletter.', submit: 'Save my interest',
    formNote: 'No payment. No fleet details. Please use your own email address.', honey: 'Leave this field empty',
    success: 'Request received. No confirmation email has been sent. If this is a new request, save the private removal link below. For an existing request, use its original removal link or contact us.',
    removal: 'Remove this request', saveLink: 'Keep this link private. It is the only self-service removal credential for a newly created request.',
    error: 'We couldn’t save your request. Please try again later or contact us.', rate: 'Too many attempts. Please wait a minute and try again.', saving: 'Saving…',
    faqTitle: 'A few things worth knowing.', faqs: [
      ['Can I use the hosted service today?', 'Not yet. This page is an introduction to the service in development. There is no paid signup, live demo, or promised launch date yet.'],
      ['Is this an inspection or compliance service?', 'No. This is record-tracking software, not an inspection, certification, or legal-advice service. Operators remain responsible for inspections, records, and applicable requirements.'],
      ['Will I need to set up hosting?', 'The planned subscription is hosted for you. You would use it in your browser without configuring a server or Cloudflare account.'],
      ['What will it cost?', 'We are working on a flat company subscription with optional capacity add-ons. Final prices, limits, and terms will be published before purchases are enabled.'],
      ['Will there be a demo?', 'An empty, temporary try-it workspace is planned. It is not available on this page, and it will not expose real customer fleet records.'],
      ['Where will the data be stored?', 'The website and interest list use Cloudflare. We do not promise Canadian-only storage or processing. Hosting and privacy details for the paid service will be provided before launch.'],
    ],
    privacyTitle: 'Your launch-interest request', privacy: [
      'We store the email address and language you provide, the request time, a version of your consent text, an expiry time, and a hashed removal credential in a separate Cloudflare D1 database. We do not ask for fleet records, payment information, or an account.',
      'This list records interest only. Addresses are not verified by email. No confirmation email or launch announcement is sent by this website. Sending will remain disabled until appropriate sender identification, mailing details, and email/unsubscribe arrangements are in place.',
      'Requests expire after 12 months and are then removed by a daily cleanup. Use your saved private removal link to delete a new request sooner, or contact us for help. Existing requests are not overwritten when an address is submitted again. Backup copies can persist under Cloudflare’s recovery retention.',
      'There are no advertising trackers or external font services. A browser-local language preference may be stored. Cloudflare processes connection information to deliver and protect the site; the application does not store your IP address with your signup or log submitted emails/removal tokens.',
    ], privacyContact: 'Privacy or removal questions? Contact', footer: 'For Canadian owner-operators and small fleets.', footerNote: 'Coming soon · No sales or payments on this site',
    removeTitle: 'Remove your interest request', removeIntro: 'Use the private link you saved after signing up. Removal does not send an email.', removeButton: 'Delete my request', removed: 'Removal processed. If the link matched a saved request, its signup record has been deleted.', invalid: 'This removal link is incomplete. Please use your saved link or contact the site owner.', home: 'Back to the website',
  },
  fr: {
    title: 'Truck Safety Tracker — bientôt disponible', description: 'Documents de flotte, dates d’inspection et rappels. Un espace hébergé pour les propriétaires-exploitants et les petites flottes au Canada. Bientôt disponible.',
    skip: 'Aller au contenu', status: 'Service hébergé · Bientôt disponible', nav: 'Le projet', contact: 'Nous joindre', switch: 'English', other: '/en/',
    eyebrow: 'MOINS DE PAPERASSE. UNE VUE PLUS CLAIRE.', heading: 'Les dossiers de votre flotte.\nEnfin au même endroit.',
    intro: 'Un espace pratique pour les propriétaires-exploitants et les petites flottes au Canada. Organisez les dates d’inspection et les documents de vos véhicules, sans gérer votre propre infrastructure informatique.',
    primary: 'Rester au courant', secondary: 'Découvrir le projet', note: 'En développement. Aucun paiement, compte ou document de flotte requis.',
    panelLabel: 'L’ESPACE QUE NOUS PRÉPARONS', panelTitle: 'De l’atelier\nau bureau.', panelBody: 'Un seul endroit pour les dossiers de chaque camion et remorque.',
    panelItems: ['Dates et historique d’inspection', 'Certificats et documents des véhicules', 'Accès des équipes et des succursales'], panelFoot: 'Pensé pour le quotidien des petites flottes.',
    strip: ['Camions et remorques', 'Français et anglais prévus', 'Hébergement inclus', 'Fondations à code source ouvert'],
    featuresLabel: 'PRATIQUE, TOUT SIMPLEMENT', featuresTitle: 'Moins de recherches.\nPlus d’organisation.', featuresIntro: 'Le service hébergé est conçu autour de trois besoins quotidiens. Il s’agit de fonctionnalités prévues, et non d’une offre déjà disponible.',
    features: [
      ['01', 'Repérer les prochaines échéances', 'Regroupez l’historique des inspections et les dates à venir. Des résumés par courriel et des rappels de navigateur sont prévus pour vous aider à prioriser.'],
      ['02', 'Trouver le bon document', 'Organisez les certificats, immatriculations, assurances, permis et documents d’entretien par véhicule, avec une date d’expiration facultative.'],
      ['03', 'Garder l’équipe au même diapason', 'Des comptes individuels, des rôles clairs et un accès par succursale sont prévus pour donner aux bonnes personnes accès aux bons dossiers.'],
    ],
    workflowLabel: 'L’EXPÉRIENCE PRÉVUE', workflowTitle: 'Abonnez-vous. Configurez.\nRetournez à votre flotte.', workflowIntro: 'Notre objectif : un service autonome, de l’achat à votre espace privé, sans attendre une configuration manuelle.',
    steps: [ ['Choisir votre abonnement', 'Consultez l’offre et payez au moyen d’une page de paiement hébergée et sécurisée. Les prix seront confirmés avant le lancement.'], ['Créer votre espace', 'Configurez votre entreprise et vos succursales, ajoutez vos véhicules réels et invitez votre équipe.'], ['Gérer vos dossiers', 'Gérez les documents, les échéances et les préférences de rappel depuis votre navigateur.'] ],
    signupLabel: 'SUIVRE LE PROJET', signupTitle: 'Savoir quand\nce sera prêt ?', signupIntro: 'Laissez votre adresse courriel et votre langue préférée. Nous enregistrerons votre demande d’intérêt. Aucun courriel de confirmation n’est envoyé et l’envoi d’annonces n’est pas encore activé.',
    email: 'Adresse courriel', language: 'Langue préférée', consent: 'Enregistrer mon courriel et ma langue pour une demande d’intérêt au lancement. J’ai lu les renseignements de confidentialité ci-dessous. Aucun bulletin régulier.', submit: 'Enregistrer mon intérêt',
    formNote: 'Aucun paiement ni dossier de flotte. Utilisez votre propre adresse courriel.', honey: 'Laisser ce champ vide',
    success: 'Demande reçue. Aucun courriel de confirmation n’a été envoyé. Pour une nouvelle demande, conservez le lien de suppression privé ci-dessous. Pour une demande existante, utilisez le lien initial ou contactez-nous.',
    removal: 'Supprimer cette demande', saveLink: 'Gardez ce lien privé. Il est le seul moyen de suppression autonome d’une demande nouvellement créée.',
    error: 'Impossible d’enregistrer votre demande. Réessayez plus tard ou contactez-nous.', rate: 'Trop de tentatives. Attendez une minute avant de réessayer.', saving: 'Enregistrement…',
    faqTitle: 'Quelques précisions utiles.', faqs: [
      ['Puis-je utiliser le service hébergé maintenant ?', 'Pas encore. Cette page présente un service en développement. Il n’y a pas encore d’abonnement payant, de démonstration en ligne ou de date de lancement promise.'],
      ['Est-ce un service d’inspection ou de conformité ?', 'Non. Il s’agit d’un logiciel de suivi de dossiers, et non d’un service d’inspection, de certification ou de conseils juridiques. Les exploitants demeurent responsables de leurs inspections, dossiers et obligations applicables.'],
      ['Devrai-je configurer un hébergement ?', 'L’abonnement prévu sera hébergé pour vous. Vous l’utiliserez dans votre navigateur sans configurer de serveur ni de compte Cloudflare.'],
      ['Quel sera le prix ?', 'Nous préparons un abonnement fixe par entreprise avec des ajouts de capacité facultatifs. Les prix, limites et conditions définitifs seront publiés avant l’ouverture des achats.'],
      ['Y aura-t-il une démonstration ?', 'Un espace d’essai vide et temporaire est prévu. Il n’est pas disponible sur cette page et ne donnera pas accès aux dossiers réels des clients.'],
      ['Où seront conservées les données ?', 'Le site et la liste d’intérêt utilisent Cloudflare. Nous ne promettons pas un stockage ou un traitement exclusivement au Canada. Les détails d’hébergement et de confidentialité du service payant seront fournis avant son lancement.'],
    ],
    privacyTitle: 'Votre demande d’intérêt au lancement', privacy: [
      'Nous conservons le courriel et la langue fournis, la date de la demande, la version du texte de consentement, une date d’expiration et une empreinte du jeton de suppression dans une base Cloudflare D1 distincte. Aucun dossier de flotte, renseignement de paiement ou compte n’est demandé.',
      'Cette liste enregistre uniquement votre intérêt. Les adresses ne sont pas vérifiées par courriel. Ce site n’envoie aucun courriel de confirmation ni annonce de lancement. L’envoi restera désactivé jusqu’à la mise en place de l’identification de l’expéditeur, des coordonnées postales et des mécanismes de courriel et de désabonnement appropriés.',
      'Les demandes expirent après 12 mois et sont supprimées lors d’un nettoyage quotidien. Utilisez votre lien de suppression privé pour supprimer une nouvelle demande plus tôt, ou contactez-nous. Une nouvelle soumission ne remplace pas une demande existante. Des copies de sauvegarde peuvent subsister selon la conservation de récupération de Cloudflare.',
      'Aucun traceur publicitaire ni service externe de polices n’est utilisé. Une préférence de langue peut être enregistrée dans votre navigateur. Cloudflare traite les renseignements de connexion pour fournir et protéger le site ; l’application ne conserve pas votre adresse IP avec la demande et ne journalise ni les courriels soumis ni les jetons de suppression.',
    ], privacyContact: 'Questions de confidentialité ou de suppression ? Contactez', footer: 'Pour les propriétaires-exploitants et les petites flottes au Canada.', footerNote: 'Bientôt disponible · Aucune vente ni aucun paiement sur ce site',
    removeTitle: 'Supprimer votre demande d’intérêt', removeIntro: 'Utilisez le lien privé conservé après votre inscription. La suppression n’envoie aucun courriel.', removeButton: 'Supprimer ma demande', removed: 'Suppression traitée. Si le lien correspondait à une demande, son enregistrement a été supprimé.', invalid: 'Ce lien de suppression est incomplet. Utilisez le lien conservé ou contactez le responsable du site.', home: 'Retour au site',
  },
} as const;

function escape(value: string): string { return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!); }
function lines(value: string): string { return escape(value).replace(/\n/g, '<br>'); }
function shell(language: Language, title: string, description: string, body: string): string {
  return `<!doctype html><html lang="${language}-CA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="description" content="${escape(description)}"><title>${escape(title)}</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/site.css"><script src="/site.js" defer></script></head><body>${body}</body></html>`;
}

export const REPO_URL = 'https://github.com/CanadianCowboy/truck-safety-tracker';

export function renderPage(language: Language, contactEmail: string): string {
  const c = copy[language];
  const safeEmail = /^[^\s@<>"'&]+@[^\s@<>"'&]+\.[^\s@<>"'&]+$/.test(contactEmail) ? contactEmail : '';
  const contact = safeEmail ? `<a href="mailto:${escape(safeEmail)}">${escape(safeEmail)}</a>` : '';
  return shell(language, c.title, c.description, `
<a class="skip" href="#main">${c.skip}</a>
<header class="container header"><a class="brand" href="/${language}/" aria-label="Truck Safety Tracker"><span class="brand-mark" aria-hidden="true">T<span> / </span>S</span><span>Truck Safety<br><strong>Tracker</strong></span></a><nav aria-label="${language === 'fr' ? 'Navigation principale' : 'Main navigation'}"><a class="nav-detail" href="#plan">${c.nav}</a><a class="nav-detail" href="${REPO_URL}" rel="noopener">GitHub</a><a class="language" href="${c.other}" data-language="${language === 'en' ? 'fr' : 'en'}" lang="${language === 'en' ? 'fr' : 'en'}">${c.switch}<span aria-hidden="true"> ↗</span></a></nav></header>
<main id="main"><section class="container hero"><div class="hero-copy"><p class="status"><span aria-hidden="true"></span>${c.status}</p><p class="eyebrow">${c.eyebrow}</p><h1>${lines(c.heading)}</h1><p class="intro">${c.intro}</p><div class="actions"><a class="button" href="#interest">${c.primary}<span aria-hidden="true"> ↗</span></a><a class="text-link" href="#plan">${c.secondary}<span aria-hidden="true"> ↓</span></a></div><p class="small muted">${c.note}</p></div><aside class="hero-panel" aria-label="${c.panelLabel}"><div class="panel-top"><span class="eyebrow">${c.panelLabel}</span><span class="panel-cross" aria-hidden="true">+</span></div><div class="road" aria-hidden="true"><div class="road-line"></div><svg viewBox="0 0 280 110"><path d="M23 67V24h136v43m0-29h44l28 29v19h-15m-24 0h-63m-24 0H56m-24 0H23V67h208M159 39v47M170 48h27l17 19h-44z"/><circle cx="44" cy="86" r="12"/><circle cx="117" cy="86" r="12"/><circle cx="204" cy="86" r="12"/></svg></div><h2>${lines(c.panelTitle)}</h2><p>${c.panelBody}</p><ul>${c.panelItems.map(item => `<li><span aria-hidden="true">↗</span>${item}</li>`).join('')}</ul><p class="panel-footer">${c.panelFoot}</p></aside></section>
<div class="strip"><div class="container strip-inner">${c.strip.map(item => `<span><b aria-hidden="true">+</b> ${item}</span>`).join('')}</div></div>
<section id="plan" class="container section"><p class="eyebrow">${c.featuresLabel}</p><div class="section-heading"><h2>${lines(c.featuresTitle)}</h2><p>${c.featuresIntro}</p></div><div class="features">${c.features.map(([number, title, body]) => `<article class="feature"><span class="number">${number} /</span><h3>${title}</h3><p>${body}</p></article>`).join('')}</div></section>
<section class="workflow"><div class="container section workflow-grid"><div><p class="eyebrow">${c.workflowLabel}</p><h2>${lines(c.workflowTitle)}</h2><p class="section-intro">${c.workflowIntro}</p></div><ol>${c.steps.map(([title, body], index) => `<li><span class="step-number" aria-hidden="true">0${index + 1}</span><div><h3>${title}</h3><p>${body}</p></div></li>`).join('')}</ol></div></section>
<section id="interest" class="container section signup-grid"><div><p class="eyebrow">${c.signupLabel}</p><h2>${lines(c.signupTitle)}</h2><p class="section-intro">${c.signupIntro}</p>${contact ? `<p class="contact">${c.contact} ↗<br>${contact}</p>` : ''}</div><div class="signup-card"><form id="interest-form" action="/api/signup" method="post"><label for="email">${c.email}</label><input id="email" name="email" type="email" autocomplete="email" maxlength="254" required><label for="language">${c.language}</label><select id="language" name="language"><option value="en" ${language === 'en' ? 'selected' : ''}>English</option><option value="fr" ${language === 'fr' ? 'selected' : ''}>Français</option></select><div class="honeypot" aria-hidden="true"><label for="company-url">${c.honey}</label><input id="company-url" name="company_url" type="text" tabindex="-1" autocomplete="off"></div><label class="check"><input type="checkbox" name="consent" value="yes" required><span>${c.consent} <a href="#privacy">${language === 'fr' ? 'Confidentialité' : 'Privacy details'} ↗</a></span></label><button class="button" type="submit">${c.submit}<span aria-hidden="true"> ↗</span></button><p class="small muted">${c.formNote}</p><noscript><p>${language === 'fr' ? 'Activez JavaScript pour enregistrer une demande et recevoir votre lien de suppression. Aucun courriel n’est envoyé.' : 'Enable JavaScript to save a request and receive your removal link. No email is sent.'}</p></noscript></form><div id="form-status" role="status" aria-live="polite" tabindex="-1"></div><div id="removal-result" hidden><a id="removal-link" class="text-link">${c.removal} ↗</a><p class="small muted">${c.saveLink}</p></div></div></section>
<section class="container section faq"><p class="eyebrow">FAQ</p><h2>${c.faqTitle}</h2>${c.faqs.map(([title, body]) => `<details><summary>${title}</summary><p>${body}</p></details>`).join('')}</section>
<section id="privacy" class="privacy"><div class="container section"><p class="eyebrow">${language === 'fr' ? 'CONFIDENTIALITÉ' : 'PRIVACY'}</p><h2>${c.privacyTitle}</h2><div class="privacy-copy">${c.privacy.map(text => `<p>${text}</p>`).join('')}${contact ? `<p>${c.privacyContact} ${contact}.</p>` : ''}</div></div></section></main>
<footer class="container footer"><div><strong>Truck Safety Tracker</strong><p>${c.footer}</p></div><p>${c.footerNote}</p><p><a href="${REPO_URL}" rel="noopener">GitHub</a></p></footer>`);
}

export function renderRemoval(language: Language): string {
  const c = copy[language];
  return shell(language, c.removeTitle, c.removeIntro, `<main class="container section removal-page"><p class="eyebrow">Truck Safety Tracker</p><h1>${c.removeTitle}</h1><p>${c.removeIntro}</p><form id="removal-form" action="/api/remove" method="post"><input type="hidden" name="token" id="removal-token"><button class="button" type="submit">${c.removeButton}</button></form><p id="form-status" role="status" aria-live="polite"></p><a class="text-link" href="/${language}/">${c.home} ↗</a></main>`);
}

export const SITE_CSS = `
:root{color-scheme:dark;--bg:#0b1425;--panel:#111f34;--line:#2a3b52;--text:#f4f5f7;--muted:#b2c0d2;--accent:#ffc45b;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-synthesis:none}*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:30px}body{margin:0;background:var(--bg);color:var(--text);line-height:1.6}a{color:inherit;text-decoration-thickness:1px;text-underline-offset:5px}a,button,input,select,summary{-webkit-tap-highlight-color:transparent}a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid var(--accent);outline-offset:5px}button,input,select{font:inherit}button,a,summary{touch-action:manipulation}.container{width:min(1180px,calc(100% - 64px));margin-inline:auto}.header{display:flex;justify-content:space-between;align-items:center;padding-block:30px;border-bottom:1px solid var(--line);gap:20px}.brand{display:flex;gap:13px;align-items:center;text-decoration:none;line-height:1.25;font-size:14px;font-weight:500}.brand strong{font-weight:800}.brand-mark{display:flex;align-items:center;justify-content:center;min-width:52px;height:48px;border:1px solid var(--accent);color:var(--accent);font-size:18px;font-weight:800}.brand-mark span{font-size:12px;color:#8490a1;padding-inline:4px}nav{display:flex;gap:30px;align-items:center}nav a{display:inline-flex;align-items:center;min-height:44px;text-decoration:none;font-size:14px}.language{color:var(--accent)}.skip{position:absolute;left:20px;top:-100px;background:var(--accent);color:var(--bg);padding:12px;z-index:10}.skip:focus{top:10px}.hero{padding-block:76px 88px;display:grid;grid-template-columns:1.25fr 1fr;gap:70px;align-items:center}.status{display:inline-flex;align-items:center;gap:10px;padding:6px 12px;border:1px solid #6d542c;color:#ffda96;background:#3c2e1b66;border-radius:3px;font-size:12px;margin:0 0 40px}.status span{width:6px;height:6px;background:var(--accent);border-radius:50%}.eyebrow{font-size:11px;font-weight:750;letter-spacing:.13em;color:var(--accent);line-height:1.6;margin:0 0 20px}h1,h2,h3,p{overflow-wrap:anywhere}h1{font-size:clamp(36px,4.6vw,62px);line-height:1.08;letter-spacing:-.045em;margin:0 0 26px;font-weight:780}h2{font-size:clamp(30px,3.25vw,43px);line-height:1.15;letter-spacing:-.035em;margin:0 0 25px;font-weight:720}h3{font-size:20px;line-height:1.3;letter-spacing:-.02em;margin:0 0 15px}.intro,.section-intro{font-size:17px;color:var(--muted);max-width:550px;line-height:1.8;margin:0 0 30px}.actions{display:flex;gap:24px;align-items:center;flex-wrap:wrap;margin:32px 0 18px}.button{display:inline-flex;justify-content:space-between;gap:26px;align-items:center;background:var(--accent);color:#111c2b;border:1px solid var(--accent);border-radius:3px;min-height:50px;padding:12px 19px;font-size:14px;font-weight:750;text-decoration:none;cursor:pointer}.button:hover{background:#ffda96}.button:disabled{opacity:.65;cursor:wait}.text-link{display:inline-flex;align-items:center;min-height:44px;font-size:14px;font-weight:650}.small{font-size:12px;line-height:1.65}.muted{color:var(--muted)}.hero-panel{background:linear-gradient(140deg,#162740,#101c2e);border:1px solid #394b62;border-radius:5px;padding:28px 30px 0;position:relative;box-shadow:16px 16px 0 #0d1a2e}.panel-top{display:flex;align-items:center;justify-content:space-between;gap:12px}.panel-top .eyebrow{font-size:10px;color:var(--muted);margin:0}.panel-cross{color:var(--accent);font-size:26px;font-weight:300}.road{height:120px;position:relative;margin:18px 0 20px;overflow:hidden}.road svg{width:100%;height:110px;stroke:var(--accent);fill:none;stroke-width:1.7;position:relative}.road-line{height:1px;position:absolute;inset:101px 0 auto;background:repeating-linear-gradient(to right,#738399 0,#738399 16px,transparent 16px,transparent 29px)}.hero-panel h2{font-size:34px;margin-bottom:12px}.hero-panel p{color:var(--muted);font-size:14px}.hero-panel ul{list-style:none;padding:0;margin:26px 0}.hero-panel li{border-top:1px solid var(--line);padding:13px 0;font-size:13px;display:flex;gap:16px}.hero-panel li span{color:var(--accent)}.hero-panel .panel-footer{border-top:1px solid var(--line);font-size:11px;margin:0 -30px;padding:16px 30px;color:#c3cedc;background:#09152566}.strip{border-block:1px solid var(--line);background:#0e1b2e}.strip-inner{display:flex;justify-content:space-between;gap:20px;padding-block:21px;flex-wrap:wrap;font-size:12px;color:var(--muted)}.strip b{color:var(--accent);margin-right:7px}.section{padding-block:85px}.section-heading{display:grid;grid-template-columns:1fr 1fr;gap:65px;align-items:start;margin-bottom:40px}.section-heading>p{color:var(--muted);margin:0;max-width:450px;font-size:15px}.features{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}.feature{border-top:1px solid #516077;padding:25px 18px 0 0}.number{display:block;color:var(--accent);font-size:12px;margin-bottom:30px}.feature p{font-size:14px;color:var(--muted);line-height:1.85;margin:0}.workflow{background:#0f1c30;border-block:1px solid var(--line)}.workflow-grid{display:grid;grid-template-columns:1fr 1fr;gap:80px}.workflow ol{margin:0;padding:0;list-style:none}.workflow li{display:flex;gap:22px;border-bottom:1px solid var(--line);padding:22px 0}.workflow li:first-child{padding-top:0}.step-number{color:var(--accent);font-size:12px;padding-top:4px}.workflow li h3{font-size:17px;margin-bottom:10px}.workflow li p{color:var(--muted);font-size:14px;line-height:1.8;margin:0}.signup-grid{display:grid;grid-template-columns:1fr 1fr;gap:80px}.signup-card{background:var(--panel);border:1px solid var(--line);border-radius:5px;padding:30px}.signup-card label:not(.check){display:block;font-size:13px;font-weight:600;margin-bottom:8px}.signup-card input[type=email],.signup-card select{display:block;width:100%;min-width:0;min-height:48px;background:#0a1526;color:var(--text);border:1px solid #52627a;border-radius:3px;padding:10px 12px;margin-bottom:22px}.signup-card .check{display:flex;gap:12px;align-items:flex-start;color:var(--muted);font-size:12px;line-height:1.8;margin:8px 0 24px}.check input{width:20px;height:20px;flex:0 0 20px;margin-top:2px;accent-color:var(--accent)}.signup-card button{width:100%}.contact{margin-top:35px;color:var(--muted);font-size:13px;line-height:2.2}.contact a{color:var(--text)}#form-status{font-size:14px;overflow-wrap:anywhere}#form-status:not(:empty){margin-top:20px;border-left:2px solid var(--accent);padding-left:14px}#removal-result{margin-top:16px}#removal-link{color:var(--accent);overflow-wrap:anywhere}.honeypot{position:absolute;width:1px;height:1px;clip-path:inset(50%);overflow:hidden}.faq{border-top:1px solid var(--line)}.faq h2{margin-bottom:36px}.faq details{border-bottom:1px solid var(--line);padding-block:8px}.faq summary{cursor:pointer;min-height:50px;padding-block:14px;font-size:16px;font-weight:600}.faq details p{color:var(--muted);max-width:850px;font-size:14px;line-height:1.9;margin:6px 0 22px}.privacy{background:#0e1a2d;border-block:1px solid var(--line)}.privacy h2{font-size:28px}.privacy-copy{display:grid;grid-template-columns:1fr 1fr;gap:0 40px;color:var(--muted);font-size:12px;line-height:1.9}.footer{display:flex;justify-content:space-between;gap:30px;padding-block:35px;color:var(--muted);font-size:11px}.footer strong{font-size:13px;color:var(--text)}.footer p{margin:7px 0}.removal-page{max-width:760px}.removal-page h1{font-size:38px}.removal-page .text-link{margin-top:30px}[hidden]{display:none!important}
@media(max-width:959px){.hero{gap:35px}.hero-panel{padding-inline:22px}.hero-panel .panel-footer{margin-inline:-22px;padding-inline:22px}.hero-panel h2{font-size:29px}.signup-grid,.workflow-grid{gap:40px}.section-heading{gap:35px}.features{gap:20px}nav{gap:20px}.hero{padding-block:55px 65px}}
@media(max-width:700px){.container{width:calc(100% - 36px)}.header{padding-block:20px}.brand{font-size:12px}.brand-mark{min-width:44px;height:44px;font-size:15px}.nav-detail{display:none}nav{gap:0}.hero{grid-template-columns:1fr;gap:45px;padding-block:38px 55px}.status{margin-bottom:28px}.hero-copy h1{font-size:clamp(35px,8.2vw,52px)}.intro,.section-intro{font-size:15px}.hero-panel{box-shadow:7px 7px 0 #0d1a2e}.hero-panel h2{font-size:32px}.road{height:100px}.road svg{height:95px}.road-line{top:88px}.strip-inner{display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:10px}.section{padding-block:55px}.section-heading,.features,.workflow-grid,.signup-grid,.privacy-copy{grid-template-columns:1fr;gap:26px}.section-heading{margin-bottom:25px}.section-heading h2{margin-bottom:0}.feature{padding-top:22px}.number{margin-bottom:18px}.feature h3{font-size:19px}.signup-card{padding:23px 20px}.faq summary{font-size:14px}.footer{display:block}.footer>p{margin-top:20px}.privacy-copy{gap:0}.actions{gap:18px}.button,.text-link{font-size:13px}.eyebrow{font-size:10px}h2{font-size:32px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
`;

export const SITE_JS = `
(() => {
  const fr = document.documentElement.lang.startsWith('fr');
  const messages = ${JSON.stringify({ en: { success: copy.en.success, error: copy.en.error, rate: copy.en.rate, saving: copy.en.saving, removed: copy.en.removed, invalid: copy.en.invalid }, fr: { success: copy.fr.success, error: copy.fr.error, rate: copy.fr.rate, saving: copy.fr.saving, removed: copy.fr.removed, invalid: copy.fr.invalid } })};
  const c = messages[fr ? 'fr' : 'en'];
  const status = document.getElementById('form-status');
  if (location.pathname === '/') {
    try { if (localStorage.getItem('fleet_site_language') === 'fr') { location.replace('/fr/'); return; } } catch {}
  }
  document.querySelectorAll('[data-language]').forEach(link => link.addEventListener('click', () => {
    try { localStorage.setItem('fleet_site_language', link.dataset.language); } catch {}
  }));
  const form = document.getElementById('interest-form');
  if (form) form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const button = form.querySelector('button');
    const label = button.textContent;
    button.disabled = true;
    button.textContent = c.saving;
    status.textContent = '';
    document.getElementById('removal-result').hidden = true;
    try {
      const data = new URLSearchParams();
      new FormData(form).forEach((value, key) => data.set(key, String(value)));
      const result = await fetch('/api/signup', { method: 'POST', body: data, signal: AbortSignal.timeout(15000) });
      if (!result.ok) throw new Error(result.status === 429 ? 'rate' : 'failed');
      const body = await result.json();
      if (!body.ok || !/^[a-f0-9]{64}$/.test(body.removalToken)) throw new Error('failed');
      status.textContent = c.success;
      const link = document.getElementById('removal-link');
      link.href = '/remove?lang=' + (fr ? 'fr' : 'en') + '#token=' + body.removalToken;
      document.getElementById('removal-result').hidden = false;
      form.reset();
    } catch (error) { status.textContent = error.message === 'rate' ? c.rate : c.error; }
    finally { button.disabled = false; button.textContent = label; status.focus(); }
  });
  const remove = document.getElementById('removal-form');
  if (remove) {
    const token = new URLSearchParams(location.hash.slice(1)).get('token') || '';
    history.replaceState(null, '', location.pathname + location.search);
    const button = remove.querySelector('button');
    if (!/^[a-f0-9]{64}$/.test(token)) { button.disabled = true; status.textContent = c.invalid; return; }
    document.getElementById('removal-token').value = token;
    remove.addEventListener('submit', async event => {
      event.preventDefault(); button.disabled = true;
      try {
        const response = await fetch('/api/remove', { method: 'POST', body: new URLSearchParams({ token }), signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error('failed');
        status.textContent = c.removed; remove.hidden = true;
      } catch { status.textContent = c.error; button.disabled = false; }
    });
  }
})();
`;
