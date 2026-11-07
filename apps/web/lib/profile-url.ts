/** Profiladresse: /@/<profilnavn>. Navne med punktum er "fil-agtige", så Next ville fjerne skråstregen – derfor uden. */
export const profilePath = (name: string) => `/@/${name}${name.includes('.') ? '' : '/'}`;
/** Gyldige profilnavne (små bogstaver, tal, punktum, bindestreg og understreg; 3–30 tegn, ikke punktum først/sidst) */
export const PROFILE_NAME = /^(?![._-])[a-z0-9._-]{3,30}(?<![._-])$/;
