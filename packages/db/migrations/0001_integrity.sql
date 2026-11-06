-- Integritetsregler der holder uanset hvad applikationskoden gør.

-- 1) Append-only: audit-log, ledger og ordre-hændelser kan aldrig ændres eller slettes (rettelser = modposteringer).
CREATE FUNCTION forbid_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% on % is not allowed (append-only table)', TG_OP, TG_TABLE_NAME USING ERRCODE = 'restrict_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_log_append_only BEFORE UPDATE OR DELETE ON audit_log FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER audit_log_no_truncate BEFORE TRUNCATE ON audit_log FOR EACH STATEMENT EXECUTE FUNCTION forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER ledger_entries_append_only BEFORE UPDATE OR DELETE ON ledger_entries FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER ledger_entries_no_truncate BEFORE TRUNCATE ON ledger_entries FOR EACH STATEMENT EXECUTE FUNCTION forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER ledger_transactions_append_only BEFORE UPDATE OR DELETE ON ledger_transactions FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER ledger_transactions_no_truncate BEFORE TRUNCATE ON ledger_transactions FOR EACH STATEMENT EXECUTE FUNCTION forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER order_events_append_only BEFORE UPDATE OR DELETE ON order_events FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER order_events_no_truncate BEFORE TRUNCATE ON order_events FOR EACH STATEMENT EXECUTE FUNCTION forbid_mutation();
--> statement-breakpoint

-- 2) Hver ledger-transaktion skal balancere (sum debet = sum kredit). Tjekkes ved COMMIT, så alle linjer kan indsættes i én transaktion.
CREATE FUNCTION assert_ledger_balanced() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d bigint; c bigint;
BEGIN
  SELECT COALESCE(SUM(amount_ore) FILTER (WHERE direction = 'debit'), 0), COALESCE(SUM(amount_ore) FILTER (WHERE direction = 'credit'), 0)
    INTO d, c FROM ledger_entries WHERE transaction_id = NEW.transaction_id;
  IF d <> c THEN
    RAISE EXCEPTION 'ledger transaction % is unbalanced (debit %, credit %)', NEW.transaction_id, d, c USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER ledger_balanced AFTER INSERT ON ledger_entries DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION assert_ledger_balanced();
--> statement-breakpoint

-- 3) Ordrer: beløb og parter er frosne efter oprettelse, og afsluttede ordrer kan ikke genåbnes.
CREATE FUNCTION orders_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.price_ore <> OLD.price_ore OR NEW.buyer_fee_ore <> OLD.buyer_fee_ore OR NEW.seller_fee_ore <> OLD.seller_fee_ore
     OR NEW.shipping_ore <> OLD.shipping_ore OR NEW.buyer_total_ore <> OLD.buyer_total_ore OR NEW.seller_payout_ore <> OLD.seller_payout_ore
     OR NEW.buyer_id <> OLD.buyer_id OR NEW.seller_id <> OLD.seller_id OR NEW.listing_id <> OLD.listing_id THEN
    RAISE EXCEPTION 'order amounts and parties are immutable' USING ERRCODE = 'restrict_violation';
  END IF;
  IF OLD.status IN ('completed', 'refunded', 'cancelled', 'expired') AND NEW.status <> OLD.status THEN
    RAISE EXCEPTION 'order % is final (%) and cannot change status', OLD.id, OLD.status USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER orders_guard_trg BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION orders_guard();
