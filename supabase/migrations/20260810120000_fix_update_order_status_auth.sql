/*
  Fix: update_order_status always failed with "You are not authorized to
  update this order" (400) when called from the merchant-api edge function.

  Root cause: the edge function calls Postgres using the Supabase
  SERVICE_ROLE client (needed to bypass RLS for reading other tables), so
  there is no end-user JWT in the request to Postgres — auth.uid() inside
  the SECURITY DEFINER function resolves to NULL. Both the admin check and
  the "is this merchant's order" check compared against NULL and always
  came back false, so every call was rejected.

  Fix: accept the calling user's id as an explicit parameter
  (p_caller_id), passed in by the edge function after it has already
  verified the user's identity via supabase.auth.getUser(token). Falls
  back to auth.uid() for any other caller that still relies on it (e.g.
  a call made from the client with the user's own session).
*/

DROP FUNCTION IF EXISTS update_order_status(uuid, text, text);

CREATE OR REPLACE FUNCTION update_order_status(
  p_order_id uuid,
  p_new_status text,
  p_note text DEFAULT NULL,
  p_caller_id uuid DEFAULT NULL
)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_current_status text;
  v_is_admin boolean := false;
  v_is_merchant_of_order boolean := false;
  v_caller uuid;
BEGIN
  v_caller := COALESCE(p_caller_id, auth.uid());
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_new_status NOT IN ('pending','confirmed','processing','shipped','out_for_delivery','delivered','completed','cancelled','returned','refunded') THEN
    RAISE EXCEPTION 'Invalid status: %', p_new_status;
  END IF;

  SELECT status INTO v_current_status FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = v_caller AND role = 'admin') INTO v_is_admin;
  SELECT EXISTS (SELECT 1 FROM order_items WHERE order_id = p_order_id AND merchant_id = v_caller) INTO v_is_merchant_of_order;

  IF NOT v_is_admin AND NOT v_is_merchant_of_order THEN
    RAISE EXCEPTION 'You are not authorized to update this order';
  END IF;

  UPDATE orders SET status = p_new_status WHERE id = p_order_id;
  INSERT INTO order_status_history (order_id, changed_by, from_status, to_status, note)
  VALUES (p_order_id, v_caller, v_current_status, p_new_status, p_note);

  RETURN p_new_status;
END;
$$;
