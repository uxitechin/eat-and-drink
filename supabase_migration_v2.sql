-- ====================================================================
-- EAT & DRINK POS - SUPABASE POSTGRESQL PRODUCTION HARDENING MIGRATION (V2)
-- Safe, Non-Destructive, Preserves All Existing Records
-- ====================================================================

-- 1. Ensure UUID Extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Add Idempotency Key column to bills table (if not exists)
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Create Unique Index on idempotency_key (ignoring nulls for legacy rows)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bills_idempotency_key_key'
    ) THEN
        ALTER TABLE public.bills ADD CONSTRAINT bills_idempotency_key_key UNIQUE (idempotency_key);
    END IF;
EXCEPTION
    WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

-- 3. Sequence for Authoritative PostgreSQL-owned Sequential Bill Numbering
CREATE SEQUENCE IF NOT EXISTS bill_number_seq START WITH 1 INCREMENT BY 1;

-- Synchronize sequence to be strictly greater than the highest existing bill number
DO $$
DECLARE
    v_max_num BIGINT := 0;
BEGIN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(bill_number, '\D', '', 'g'), '')::BIGINT), 0)
    INTO v_max_num
    FROM public.bills;

    IF v_max_num > 0 THEN
        PERFORM setval('bill_number_seq', v_max_num, true);
    ELSE
        PERFORM setval('bill_number_seq', 1, false);
    END IF;
END $$;

-- 4. Atomic Bill Creation Transaction RPC Function
-- Features:
-- - 100% Atomic: All-or-nothing (full rollback if any line item fails)
-- - Database-level Idempotency: Duplicate submissions return the existing bill without creating new ones
-- - Sequence-backed Bill Numbering: PostgreSQL sequence guarantees zero collision across concurrent terminals
CREATE OR REPLACE FUNCTION public.create_bill_transaction(
    p_idempotency_key TEXT,
    p_subtotal NUMERIC,
    p_discount NUMERIC,
    p_total NUMERIC,
    p_payment_method TEXT,
    p_cash_given NUMERIC DEFAULT NULL,
    p_change_given NUMERIC DEFAULT NULL,
    p_customer_name TEXT DEFAULT '',
    p_customer_phone TEXT DEFAULT '',
    p_bill_date DATE DEFAULT CURRENT_DATE,
    p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    v_existing_bill RECORD;
    v_bill_id UUID;
    v_bill_number TEXT;
    v_next_seq BIGINT;
    v_item JSONB;
    v_items_array JSONB := '[]'::jsonb;
BEGIN
    -- STEP 1: Idempotency Check
    -- If a bill with this idempotency key already exists, return the existing bill immediately
    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        SELECT * INTO v_existing_bill FROM public.bills WHERE idempotency_key = p_idempotency_key;
        IF FOUND THEN
            -- Fetch its saved items
            SELECT jsonb_agg(jsonb_build_object(
                'id', bi.id,
                'menu_item_id', bi.menu_item_id,
                'item_name', bi.item_name,
                'unit_price', bi.unit_price,
                'quantity', bi.quantity,
                'item_total', bi.item_total
            )) INTO v_items_array
            FROM public.bill_items bi
            WHERE bi.bill_id = v_existing_bill.id;

            RETURN jsonb_build_object(
                'id', v_existing_bill.id,
                'idempotency_key', v_existing_bill.idempotency_key,
                'bill_number', v_existing_bill.bill_number,
                'subtotal', v_existing_bill.subtotal,
                'discount', v_existing_bill.discount,
                'total', v_existing_bill.total,
                'payment_method', v_existing_bill.payment_method,
                'cash_given', v_existing_bill.cash_given,
                'change_given', v_existing_bill.change_given,
                'customer_name', v_existing_bill.customer_name,
                'customer_phone', v_existing_bill.customer_phone,
                'bill_date', v_existing_bill.bill_date,
                'created_at', v_existing_bill.created_at,
                'items', COALESCE(v_items_array, '[]'::jsonb),
                'is_duplicate_replay', true
            );
        END IF;
    END IF;

    -- STEP 2: Atomically Draw Next Sequence Number
    v_next_seq := nextval('bill_number_seq');
    v_bill_number := '#' || LPAD(v_next_seq::TEXT, 6, '0');

    -- Double-check if this bill_number exists (safety guard)
    WHILE EXISTS (SELECT 1 FROM public.bills WHERE bill_number = v_bill_number) LOOP
        v_next_seq := nextval('bill_number_seq');
        v_bill_number := '#' || LPAD(v_next_seq::TEXT, 6, '0');
    END LOOP;

    -- STEP 3: Insert Bill Header Record
    INSERT INTO public.bills (
        idempotency_key,
        bill_number,
        subtotal,
        discount,
        total,
        payment_method,
        cash_given,
        change_given,
        customer_name,
        customer_phone,
        bill_date
    ) VALUES (
        p_idempotency_key,
        v_bill_number,
        p_subtotal,
        p_discount,
        p_total,
        p_payment_method,
        p_cash_given,
        p_change_given,
        COALESCE(p_customer_name, ''),
        COALESCE(p_customer_phone, ''),
        COALESCE(p_bill_date, CURRENT_DATE)
    ) RETURNING id INTO v_bill_id;

    -- STEP 4: Insert Line Items
    IF jsonb_array_length(p_items) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            INSERT INTO public.bill_items (
                bill_id,
                menu_item_id,
                item_name,
                unit_price,
                quantity,
                item_total
            ) VALUES (
                v_bill_id,
                v_item->>'menu_item_id',
                v_item->>'item_name',
                (v_item->>'unit_price')::NUMERIC,
                (v_item->>'quantity')::INTEGER,
                (v_item->>'item_total')::NUMERIC
            );
        END LOOP;
    END IF;

    -- STEP 5: Return Authoritative Saved Bill
    RETURN jsonb_build_object(
        'id', v_bill_id,
        'idempotency_key', p_idempotency_key,
        'bill_number', v_bill_number,
        'subtotal', p_subtotal,
        'discount', p_discount,
        'total', p_total,
        'payment_method', p_payment_method,
        'cash_given', p_cash_given,
        'change_given', p_change_given,
        'customer_name', COALESCE(p_customer_name, ''),
        'customer_phone', COALESCE(p_customer_phone, ''),
        'bill_date', COALESCE(p_bill_date, CURRENT_DATE),
        'created_at', now(),
        'items', p_items,
        'is_duplicate_replay', false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Grant execution to API roles
GRANT EXECUTE ON FUNCTION public.create_bill_transaction TO anon, authenticated, service_role;

-- 5. Safe Realtime Publication check
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'bills'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bills;
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
