/*
# Restore handle_updated_at function
The schema reset dropped this helper function that several triggers depend on.
*/
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
