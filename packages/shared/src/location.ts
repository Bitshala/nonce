// The single rule for whether a profile location is usable, shared so the
// forms, the join gate and the API reject exactly the same values (#45).
//
// Locations exist to find city leads for meetups and to invite people to
// meetups in their city, so a value has to name a city. Most students are in
// India, and a bare "India" says nothing about which city they are in.

/** Words that name only the country, compared lowercased. */
const COUNTRY_ONLY_LOCATIONS = new Set(['india', 'in', 'ind', 'bharat']);

export type LocationProblem = 'blank' | 'countryOnly';

export const LOCATION_PROBLEM_MESSAGES: Record<LocationProblem, string> = {
  blank: 'Please enter your city.',
  countryOnly:
    'Please enter your city, not just the country (e.g. "Pune, India").',
};

/**
 * Why a location cannot be saved, or null when it names a city.
 * "Pune, India" passes; "", "  ", "India", "india.", "IN" and "India, IN" do not.
 */
export function locationProblem(
  location: string | null | undefined
): LocationProblem | null {
  // Split into words, dropping punctuation anywhere, so "India, IN",
  // ", India" and "India (IN)" are judged by their words alone. \p{M} keeps
  // combining marks (e.g. Devanagari vowel signs) inside their word.
  const words = (location ?? '')
    .toLowerCase()
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .filter(Boolean);
  if (words.length === 0) return 'blank';
  // Every word names the country: no city in there.
  if (words.every(w => COUNTRY_ONLY_LOCATIONS.has(w))) return 'countryOnly';
  return null;
}
