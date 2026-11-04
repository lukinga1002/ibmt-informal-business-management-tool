/**
 * Government screens: the shared wording and the one CSV download.
 *
 * The file written here is exactly what the server sent. No row is added,
 * removed or recomputed in the browser, so a logged export and the screen can
 * never disagree.
 */
export function downloadCsv(filename, text) {
  const blob = new Blob([`\uFEFF${text}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function stamp(iso) {
  return iso ? String(iso).slice(0, 16).replace('T', ' ') : '';
}

export const ENFORCEMENT_LABEL = {
  voluntary: { en: 'Voluntary registration', sw: 'Usajili wa hiari' },
  registration_window: { en: 'Registration window open', sw: 'Kipindi cha usajili kimefunguliwa' },
  compulsory: { en: 'Compulsory registration', sw: 'Usajili wa lazima' },
};

export const BASIS_LABEL = {
  by_law: { en: 'By-law in force', sw: 'Sheria ndogo inatumika' },
  consent: { en: 'Owner consent', sw: 'Idhini ya mmiliki' },
};

export const SUPERSESSION = {
  en: 'Cells describing fewer than five units are suppressed. A district with no registered units is shown as not started.',
  sw: 'Seli zinazohusu vitengo chini ya tano hufichwa. Wilaya isiyo na vitengo vilivyosajiliwa huonyeshwa kama bado haijaanza.',
};