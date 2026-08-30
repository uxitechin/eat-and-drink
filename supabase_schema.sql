-- ====================================================================
-- EAT & DRINK POS - SUPABASE POSTGRESQL SCHEMA & MENU SEED
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Bill Number Sequence
CREATE SEQUENCE IF NOT EXISTS bill_number_seq START WITH 1 INCREMENT BY 1;

-- ====================================================================
-- 3. TABLES DEFINITION
-- ====================================================================

-- Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    icon TEXT NOT NULL DEFAULT 'Utensils',
    display_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Menu Items Table
CREATE TABLE IF NOT EXISTS public.menu_items (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON public.menu_items(category_id);

-- Bills Table
CREATE TABLE IF NOT EXISTS public.bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_number TEXT NOT NULL UNIQUE,
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'UPI')),
    cash_given NUMERIC(10, 2) DEFAULT NULL,
    change_given NUMERIC(10, 2) DEFAULT NULL,
    customer_name TEXT DEFAULT '',
    customer_phone TEXT DEFAULT '',
    bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bills_bill_date ON public.bills(bill_date);
CREATE INDEX IF NOT EXISTS idx_bills_created_at ON public.bills(created_at DESC);

-- Bill Items (Historical Snapshot)
CREATE TABLE IF NOT EXISTS public.bill_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
    menu_item_id TEXT REFERENCES public.menu_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    item_total NUMERIC(10, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON public.bill_items(bill_id);

-- Printer Settings Table (Singleton Configuration)
CREATE TABLE IF NOT EXISTS public.printer_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    selected_printer TEXT DEFAULT 'Default System Printer',
    paper_width TEXT DEFAULT '80mm' CHECK (paper_width IN ('58mm', '80mm')),
    shop_name TEXT DEFAULT 'EAT & DRINK',
    shop_location TEXT DEFAULT 'MANGALAGIRI',
    footer_message TEXT DEFAULT 'THANK YOU! VISIT AGAIN',
    auto_print BOOLEAN DEFAULT false,
    sound_enabled BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ====================================================================
-- 4. ATOMIC FUNCTION: GET NEXT BILL NUMBER
-- ====================================================================
CREATE OR REPLACE FUNCTION public.get_next_bill_number()
RETURNS TEXT AS $$
BEGIN
    RETURN '#' || LPAD(nextval('bill_number_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 5. FUNCTION: DAILY SALES SUMMARY
-- ====================================================================
CREATE OR REPLACE FUNCTION public.get_daily_sales_summary(target_date DATE)
RETURNS TABLE (
    total_sales NUMERIC,
    cash_sales NUMERIC,
    upi_sales NUMERIC,
    bill_count BIGINT,
    item_count BIGINT,
    avg_bill NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(b.total), 0) AS total_sales,
        COALESCE(SUM(CASE WHEN b.payment_method = 'CASH' THEN b.total ELSE 0 END), 0) AS cash_sales,
        COALESCE(SUM(CASE WHEN b.payment_method = 'UPI' THEN b.total ELSE 0 END), 0) AS upi_sales,
        COUNT(DISTINCT b.id) AS bill_count,
        COALESCE(SUM(bi.quantity), 0) AS item_count,
        CASE 
            WHEN COUNT(DISTINCT b.id) > 0 THEN ROUND(COALESCE(SUM(b.total), 0) / COUNT(DISTINCT b.id), 2)
            ELSE 0 
        END AS avg_bill
    FROM public.bills b
    LEFT JOIN public.bill_items bi ON bi.bill_id = b.id
    WHERE b.bill_date = target_date;
END;
$$ LANGUAGE plpgsql STABLE;

-- ====================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.printer_settings ENABLE ROW LEVEL SECURITY;

-- Allow read/write for anon API key (POS Terminal)
DROP POLICY IF EXISTS "Anon read categories" ON public.categories;
CREATE POLICY "Anon read categories" ON public.categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anon write categories" ON public.categories;
CREATE POLICY "Anon write categories" ON public.categories FOR ALL USING (true);

DROP POLICY IF EXISTS "Anon read menu_items" ON public.menu_items;
CREATE POLICY "Anon read menu_items" ON public.menu_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anon write menu_items" ON public.menu_items;
CREATE POLICY "Anon write menu_items" ON public.menu_items FOR ALL USING (true);

DROP POLICY IF EXISTS "Anon read bills" ON public.bills;
CREATE POLICY "Anon read bills" ON public.bills FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anon insert bills" ON public.bills;
CREATE POLICY "Anon insert bills" ON public.bills FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anon read bill_items" ON public.bill_items;
CREATE POLICY "Anon read bill_items" ON public.bill_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anon insert bill_items" ON public.bill_items;
CREATE POLICY "Anon insert bill_items" ON public.bill_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anon read printer_settings" ON public.printer_settings;
CREATE POLICY "Anon read printer_settings" ON public.printer_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anon write printer_settings" ON public.printer_settings;
CREATE POLICY "Anon write printer_settings" ON public.printer_settings FOR ALL USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bills;

-- ====================================================================
-- 7. SEED DATA: 21 OFFICIAL CATEGORIES
-- ====================================================================
INSERT INTO public.categories (id, name, icon, display_order) VALUES
('cat_lassi', 'LASSI', 'Milk', 1),
('cat_mojitos', 'Mojito''s', 'GlassWater', 2),
('cat_waffles', 'WAFFLE''S', 'Cake', 3),
('cat_double_chocolate', 'DOUBLE CHOCOLATE', 'Cookie', 4),
('cat_ice_cream_waff_wich', 'ICE CREAM WAFF-WICH', 'Sandwich', 5),
('cat_pizza', 'PIZZA', 'Pizza', 6),
('cat_burgers', 'BURGERS', 'Beef', 7),
('cat_momo', 'MOMO', 'Utensils', 8),
('cat_french_fries', 'ORIGINAL FRENCH FRY''S', 'Flame', 9),
('cat_falooda', 'FALOODA', 'CupSoda', 10),
('cat_moktails', 'MOKTAILS', 'Wine', 11),
('cat_coffee_roster', 'COFFEE ROSTER', 'Coffee', 12),
('cat_crispy_chicken', 'CRISPY CHICKEN', 'Drumstick', 13),
('cat_fruits_ice_creams', 'FRIUTS & ICE CREAMS', 'Apple', 14),
('cat_cold_coffe', 'COLD COFFE', 'Coffee', 15),
('cat_super_shakes', 'SUPER SHAKES', 'Zap', 16),
('cat_shakes', 'SHAKES', 'CupSoda', 17),
('cat_ice_cream_sundaes', 'ICE CREAM SUNDAE''S', 'Sparkles', 18),
('cat_brownies_ice_cream', 'BROWNIES WITH ICE CREAM', 'Dessert', 19),
('cat_fruit_cocktails', 'Fruit Cocktails', 'GlassWater', 20),
('cat_ice_cream_scoops', 'Ice cream Scoops', 'IceCream', 21)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, display_order = EXCLUDED.display_order;

-- ====================================================================
-- 8. SEED DATA: 96 OFFICIAL DISHES
-- ====================================================================
INSERT INTO public.menu_items (id, category_id, name, price, is_active) VALUES
-- 1. LASSI
('itm_las_1', 'cat_lassi', 'Switch Lassi', 50.00, true),
('itm_las_2', 'cat_lassi', 'Fruit Lassi', 60.00, true),
('itm_las_3', 'cat_lassi', 'Mango Lassi', 60.00, true),
('itm_las_4', 'cat_lassi', 'Dry Fruit Lassi', 70.00, true),

-- 2. Mojito's
('itm_moj_1', 'cat_mojitos', 'Blue lime', 60.00, true),
('itm_moj_2', 'cat_mojitos', 'Blue berry', 70.00, true),
('itm_moj_3', 'cat_mojitos', 'Watermelon', 60.00, true),
('itm_moj_4', 'cat_mojitos', 'Pine Apple', 60.00, true),
('itm_moj_5', 'cat_mojitos', 'Mint Lime', 60.00, true),

-- 3. WAFFLE'S
('itm_waf_1', 'cat_waffles', 'Belgian Chocolate', 110.00, true),
('itm_waf_2', 'cat_waffles', 'Kit Kat', 120.00, true),
('itm_waf_3', 'cat_waffles', 'Butter Scotch', 100.00, true),
('itm_waf_4', 'cat_waffles', 'Naked Nutella', 140.00, true),
('itm_waf_5', 'cat_waffles', 'Oreo Waffle', 120.00, true),
('itm_waf_6', 'cat_waffles', 'Brownie Waffle', 120.00, true),

-- 4. DOUBLE CHOCOLATE
('itm_dch_1', 'cat_double_chocolate', 'Triple Chocolate', 130.00, true),
('itm_dch_2', 'cat_double_chocolate', 'Drak&White Fantasy', 120.00, true),
('itm_dch_3', 'cat_double_chocolate', 'Chocolate Overload', 120.00, true),
('itm_dch_4', 'cat_double_chocolate', 'Almond Brownie', 140.00, true),

-- 5. ICE CREAM WAFF-WICH
('itm_icw_1', 'cat_ice_cream_waff_wich', 'Rocky Road', 170.00, true),
('itm_icw_2', 'cat_ice_cream_waff_wich', 'Tripple Cookie', 180.00, true),
('itm_icw_3', 'cat_ice_cream_waff_wich', 'Ice cream & Fudge', 160.00, true),

-- 6. PIZZA
('itm_piz_1', 'cat_pizza', 'Chicken Pizza', 150.00, true),
('itm_piz_2', 'cat_pizza', 'Tandoori Pizza', 160.00, true),
('itm_piz_3', 'cat_pizza', 'Sweetcorn Pizza', 130.00, true),
('itm_piz_4', 'cat_pizza', 'Peri Peri Sweetcorn', 140.00, true),
('itm_piz_5', 'cat_pizza', 'Paneer Pizza', 130.00, true),
('itm_piz_6', 'cat_pizza', 'Peri Peri paneer', 140.00, true),

-- 7. BURGERS
('itm_brg_1', 'cat_burgers', 'Mighty Zinger', 130.00, true),
('itm_brg_2', 'cat_burgers', 'Double Zinger', 150.00, true),
('itm_brg_3', 'cat_burgers', 'Veg Burger', 110.00, true),

-- 8. MOMO
('itm_mom_1', 'cat_momo', 'Paneer Momo', 100.00, true),
('itm_mom_2', 'cat_momo', 'Chicken Momo', 120.00, true),
('itm_mom_3', 'cat_momo', 'Veg rolls', 100.00, true),

-- 9. ORIGINAL FRENCH FRY'S
('itm_fry_1', 'cat_french_fries', 'Classic Fry''s', 60.00, true),
('itm_fry_2', 'cat_french_fries', 'Peri Peri Fry''s', 70.00, true),
('itm_fry_3', 'cat_french_fries', 'Chees Fry''s', 90.00, true),

-- 10. FALOODA
('itm_fal_1', 'cat_falooda', 'Ice cream Falooda', 100.00, true),
('itm_fal_2', 'cat_falooda', 'Dry Fruit Falooda', 120.00, true),

-- 11. MOKTAILS
('itm_mok_1', 'cat_moktails', 'Ferrero Rocher', 60.00, true),
('itm_mok_2', 'cat_moktails', 'Belgian Chips', 80.00, true),
('itm_mok_3', 'cat_moktails', 'Hop Scotch Butter scotch', 70.00, true),
('itm_mok_4', 'cat_moktails', 'Oreo Chips', 90.00, true),

-- 12. COFFEE ROSTER
('itm_cof_1', 'cat_coffee_roster', 'Turkish Frappe', 70.00, true),
('itm_cof_2', 'cat_coffee_roster', 'Coffee On The Rocks', 70.00, true),
('itm_cof_3', 'cat_coffee_roster', 'Swedish House Mafia', 70.00, true),
('itm_cof_4', 'cat_coffee_roster', 'Portuguesse', 90.00, true),

-- 13. CRISPY CHICKEN
('itm_chk_1', 'cat_crispy_chicken', 'Boneless Chicken Strips', 130.00, true),
('itm_chk_2', 'cat_crispy_chicken', 'Wings', 120.00, true),
('itm_chk_3', 'cat_crispy_chicken', 'Loaded Fries', 140.00, true),
('itm_chk_4', 'cat_crispy_chicken', 'Chicken Popcorn', 100.00, true),

-- 14. FRIUTS & ICE CREAMS
('itm_fic_1', 'cat_fruits_ice_creams', 'Fruits Salad Ice cream', 80.00, true),
('itm_fic_2', 'cat_fruits_ice_creams', 'Fiftyfifty/ gad bud', 100.00, true),

-- 15. COLD COFFE
('itm_ccf_1', 'cat_cold_coffe', 'Hard Rock Coffee', 60.00, true),
('itm_ccf_2', 'cat_cold_coffe', 'Mud Coffee', 90.00, true),

-- 16. SUPER SHAKES
('itm_ssh_1', 'cat_super_shakes', 'Belgian Chocolate', 60.00, true),
('itm_ssh_2', 'cat_super_shakes', 'Oreo Shake', 60.00, true),
('itm_ssh_3', 'cat_super_shakes', 'Missippi Mud', 90.00, true),
('itm_ssh_4', 'cat_super_shakes', 'Whey Protin', 90.00, true),

-- 17. SHAKES
('itm_shk_1', 'cat_shakes', 'Banana', 50.00, true),
('itm_shk_2', 'cat_shakes', 'Muskmelon', 50.00, true),
('itm_shk_3', 'cat_shakes', 'Banana Bonkers', 60.00, true),
('itm_shk_4', 'cat_shakes', 'Mango Banana', 50.00, true),
('itm_shk_5', 'cat_shakes', 'Pista Banana', 50.00, true),
('itm_shk_6', 'cat_shakes', 'Mango Strawberry', 70.00, true),
('itm_shk_7', 'cat_shakes', 'Nutella Shake', 90.00, true),
('itm_shk_8', 'cat_shakes', 'Dry Fruit', 90.00, true),
('itm_shk_9', 'cat_shakes', 'Watermelon', 60.00, true),
('itm_shk_10', 'cat_shakes', 'Vanilla', 60.00, true),
('itm_shk_11', 'cat_shakes', 'Strawberry', 60.00, true),
('itm_shk_12', 'cat_shakes', 'Butterscotch', 60.00, true),
('itm_shk_13', 'cat_shakes', 'Mango', 60.00, true),
('itm_shk_14', 'cat_shakes', 'Brownie', 70.00, true),

-- 18. ICE CREAM SUNDAE'S
('itm_sun_1', 'cat_ice_cream_sundaes', 'Chocolate Fudge', 70.00, true),
('itm_sun_2', 'cat_ice_cream_sundaes', 'Butter scotch Fudge', 90.00, true),
('itm_sun_3', 'cat_ice_cream_sundaes', 'Nutella Fudge', 110.00, true),
('itm_sun_4', 'cat_ice_cream_sundaes', 'Safari Dessert', 110.00, true),
('itm_sun_5', 'cat_ice_cream_sundaes', 'Cookies N Cream', 110.00, true),
('itm_sun_6', 'cat_ice_cream_sundaes', 'Dry Fruit Sundae', 110.00, true),
('itm_sun_7', 'cat_ice_cream_sundaes', 'Choconut Sundae', 110.00, true),
('itm_sun_8', 'cat_ice_cream_sundaes', 'Carmel Moch Fudge', 100.00, true),
('itm_sun_9', 'cat_ice_cream_sundaes', 'Mango Fudge', 100.00, true),

-- 19. BROWNIES WITH ICE CREAM
('itm_bwn_1', 'cat_brownies_ice_cream', 'Mexican Brownie', 70.00, true),
('itm_bwn_2', 'cat_brownies_ice_cream', 'Chocolate Brownie', 80.00, true),
('itm_bwn_3', 'cat_brownies_ice_cream', 'Nutella Brownie', 130.00, true),

-- 20. Fruit Cocktails
('itm_fck_1', 'cat_fruit_cocktails', 'Watermelon', 50.00, true),
('itm_fck_2', 'cat_fruit_cocktails', 'Tropical Mixfruit', 70.00, true),

-- 21. Ice cream Scoops
('itm_scp_1', 'cat_ice_cream_scoops', 'Vennella', 50.00, true),
('itm_scp_2', 'cat_ice_cream_scoops', 'Chocolate', 50.00, true),
('itm_scp_3', 'cat_ice_cream_scoops', 'Butter scotch', 50.00, true),
('itm_scp_4', 'cat_ice_cream_scoops', 'Strawberry', 50.00, true),
('itm_scp_5', 'cat_ice_cream_scoops', 'Caramel', 70.00, true),
('itm_scp_6', 'cat_ice_cream_scoops', 'Pista', 60.00, true),
('itm_scp_7', 'cat_ice_cream_scoops', 'Dry Fruit', 70.00, true),
('itm_scp_8', 'cat_ice_cream_scoops', 'Mango', 60.00, true),
('itm_scp_9', 'cat_ice_cream_scoops', 'Black Current', 60.00, true)
ON CONFLICT (id) DO UPDATE SET 
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    is_active = EXCLUDED.is_active;

-- 9. Initial Printer Settings
INSERT INTO public.printer_settings (id, selected_printer, paper_width, shop_name, shop_location, footer_message, auto_print, sound_enabled)
VALUES ('default', 'Default System Printer', '80mm', 'EAT & DRINK', 'MANGALAGIRI', 'THANK YOU! VISIT AGAIN', false, true)
ON CONFLICT (id) DO NOTHING;
