-- Admin kan slette brugere (testbrugere, bots): helt, hvis brugeren ikke har penge-historik, ellers anonymiseret.
-- Kaskader (sessioner, adgangskoder, passkeys, favoritter osv.) udføres af databasen og kræver ingen ekstra rettigheder.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'respin_admin') THEN
    GRANT DELETE ON users, seller_profiles, listing_images, listing_promotions, conversations, offers, support_cases TO respin_admin;
    GRANT UPDATE (email, email_normalized, display_name, username, bio, profile_banner, avatar_key, banner_key, deleted_at) ON users TO respin_admin;
  END IF;
END $$;
