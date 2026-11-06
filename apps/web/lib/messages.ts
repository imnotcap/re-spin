/** Brugervendte fejltekster. Afslører aldrig, om en e-mail findes. */
export const AUTH_MESSAGES: Record<string, string> = {
  invalid_input: 'Tjek at felterne er udfyldt korrekt.',
  rate_limited: 'For mange forsøg. Vent lidt, og prøv igen.',
  breached_password: 'Den adgangskode er set i et datalæk. Vælg en anden.',
  too_short: 'Adgangskoden skal være mindst 12 tegn. Brug gerne en sætning.',
  too_long: 'Adgangskoden må højst være 128 tegn.',
  too_common: 'Adgangskoden er for almindelig. Vælg noget længere og mere personligt.',
  contains_email: 'Adgangskoden må ikke indeholde din e-mail.',
  repetitive: 'Adgangskoden er for forudsigelig.',
  invalid_credentials: 'Forkert e-mail eller adgangskode.',
  email_not_verified: 'Du skal bekræfte din e-mail først. Vi har sendt dig et nyt link.',
  account_disabled: 'Kontoen er spærret. Kontakt support.',
  invalid_or_expired: 'Linket er ugyldigt eller udløbet. Bed om et nyt.',
  no_session: 'Du er blevet logget ud. Log ind igen.'
};
export const messageFor = (code: string) => AUTH_MESSAGES[code] ?? 'Noget gik galt. Prøv igen.';
