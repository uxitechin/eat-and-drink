// Source of truth menu extracted directly from the uploaded menu images for EAT & DRINK MANGALAGIRI

export const INITIAL_CATEGORIES = [
  { id: 'cat_lassi', name: 'LASSI', icon: 'Milk', order: 1 },
  { id: 'cat_mojitos', name: "Mojito's", icon: 'GlassWater', order: 2 },
  { id: 'cat_waffles', name: "WAFFLE'S", icon: 'Cake', order: 3 },
  { id: 'cat_double_chocolate', name: 'DOUBLE CHOCOLATE', icon: 'Cookie', order: 4 },
  { id: 'cat_ice_cream_waff_wich', name: 'ICE CREAM WAFF-WICH', icon: 'Sandwich', order: 5 },
  { id: 'cat_pizza', name: 'PIZZA', icon: 'Pizza', order: 6 },
  { id: 'cat_burgers', name: 'BURGERS', icon: 'Beef', order: 7 },
  { id: 'cat_momo', name: 'MOMO', icon: 'Utensils', order: 8 },
  { id: 'cat_french_fries', name: "ORIGINAL FRENCH FRY'S", icon: 'Flame', order: 9 },
  { id: 'cat_falooda', name: 'FALOODA', icon: 'CupSoda', order: 10 },
  { id: 'cat_moktails', name: 'MOKTAILS', icon: 'Wine', order: 11 },
  { id: 'cat_coffee_roster', name: 'COFFEE ROSTER', icon: 'Coffee', order: 12 },
  { id: 'cat_crispy_chicken', name: 'CRISPY CHICKEN', icon: 'Drumstick', order: 13 },
  { id: 'cat_fruits_ice_creams', name: 'FRIUTS & ICE CREAMS', icon: 'Apple', order: 14 },
  { id: 'cat_cold_coffe', name: 'COLD COFFE', icon: 'Coffee', order: 15 },
  { id: 'cat_super_shakes', name: 'SUPER SHAKES', icon: 'Zap', order: 16 },
  { id: 'cat_shakes', name: 'SHAKES', icon: 'CupSoda', order: 17 },
  { id: 'cat_ice_cream_sundaes', name: "ICE CREAM SUNDAE'S", icon: 'Sparkles', order: 18 },
  { id: 'cat_brownies_ice_cream', name: 'BROWNIES WITH ICE CREAM', icon: 'Dessert', order: 19 },
  { id: 'cat_fruit_cocktails', name: 'Fruit Cocktails', icon: 'GlassWater', order: 20 },
  { id: 'cat_ice_cream_scoops', name: 'Ice cream Scoops', icon: 'IceCream', order: 21 }
];

export const INITIAL_ITEMS = [
  // 1. LASSI
  { id: 'itm_las_1', categoryId: 'cat_lassi', name: 'Switch Lassi', price: 50, active: true },
  { id: 'itm_las_2', categoryId: 'cat_lassi', name: 'Fruit Lassi', price: 60, active: true },
  { id: 'itm_las_3', categoryId: 'cat_lassi', name: 'Mango Lassi', price: 60, active: true },
  { id: 'itm_las_4', categoryId: 'cat_lassi', name: 'Dry Fruit Lassi', price: 70, active: true },

  // 2. Mojito's
  { id: 'itm_moj_1', categoryId: 'cat_mojitos', name: 'Blue lime', price: 60, active: true },
  { id: 'itm_moj_2', categoryId: 'cat_mojitos', name: 'Blue berry', price: 70, active: true },
  { id: 'itm_moj_3', categoryId: 'cat_mojitos', name: 'Watermelon', price: 60, active: true },
  { id: 'itm_moj_4', categoryId: 'cat_mojitos', name: 'Pine Apple', price: 60, active: true },
  { id: 'itm_moj_5', categoryId: 'cat_mojitos', name: 'Mint Lime', price: 60, active: true },

  // 3. WAFFLE'S
  { id: 'itm_waf_1', categoryId: 'cat_waffles', name: 'Belgian Chocolate', price: 110, active: true },
  { id: 'itm_waf_2', categoryId: 'cat_waffles', name: 'Kit Kat', price: 120, active: true },
  { id: 'itm_waf_3', categoryId: 'cat_waffles', name: 'Butter Scotch', price: 100, active: true },
  { id: 'itm_waf_4', categoryId: 'cat_waffles', name: 'Naked Nutella', price: 140, active: true },
  { id: 'itm_waf_5', categoryId: 'cat_waffles', name: 'Oreo Waffle', price: 120, active: true },
  { id: 'itm_waf_6', categoryId: 'cat_waffles', name: 'Brownie Waffle', price: 120, active: true },

  // 4. DOUBLE CHOCOLATE
  { id: 'itm_dch_1', categoryId: 'cat_double_chocolate', name: 'Triple Chocolate', price: 130, active: true },
  { id: 'itm_dch_2', categoryId: 'cat_double_chocolate', name: 'Drak&White Fantasy', price: 120, active: true },
  { id: 'itm_dch_3', categoryId: 'cat_double_chocolate', name: 'Chocolate Overload', price: 120, active: true },
  { id: 'itm_dch_4', categoryId: 'cat_double_chocolate', name: 'Almond Brownie', price: 140, active: true },

  // 5. ICE CREAM WAFF-WICH
  { id: 'itm_icw_1', categoryId: 'cat_ice_cream_waff_wich', name: 'Rocky Road', price: 170, active: true },
  { id: 'itm_icw_2', categoryId: 'cat_ice_cream_waff_wich', name: 'Tripple Cookie', price: 180, active: true },
  { id: 'itm_icw_3', categoryId: 'cat_ice_cream_waff_wich', name: 'Ice cream & Fudge', price: 160, active: true },

  // 6. PIZZA
  { id: 'itm_piz_1', categoryId: 'cat_pizza', name: 'Chicken Pizza', price: 150, active: true },
  { id: 'itm_piz_2', categoryId: 'cat_pizza', name: 'Tandoori Pizza', price: 160, active: true },
  { id: 'itm_piz_3', categoryId: 'cat_pizza', name: 'Sweetcorn Pizza', price: 130, active: true },
  { id: 'itm_piz_4', categoryId: 'cat_pizza', name: 'Peri Peri Sweetcorn', price: 140, active: true },
  { id: 'itm_piz_5', categoryId: 'cat_pizza', name: 'Paneer Pizza', price: 130, active: true },
  { id: 'itm_piz_6', categoryId: 'cat_pizza', name: 'Peri Peri paneer', price: 140, active: true },

  // 7. BURGERS
  { id: 'itm_brg_1', categoryId: 'cat_burgers', name: 'Mighty Zinger', price: 130, active: true },
  { id: 'itm_brg_2', categoryId: 'cat_burgers', name: 'Double Zinger', price: 150, active: true },
  { id: 'itm_brg_3', categoryId: 'cat_burgers', name: 'Veg Burger', price: 110, active: true },

  // 8. MOMO
  { id: 'itm_mom_1', categoryId: 'cat_momo', name: 'Paneer Momo', price: 100, active: true },
  { id: 'itm_mom_2', categoryId: 'cat_momo', name: 'Chicken Momo', price: 120, active: true },
  { id: 'itm_mom_3', categoryId: 'cat_momo', name: 'Veg rolls', price: 100, active: true },

  // 9. ORIGINAL FRENCH FRY'S
  { id: 'itm_fry_1', categoryId: 'cat_french_fries', name: "Classic Fry's", price: 60, active: true },
  { id: 'itm_fry_2', categoryId: 'cat_french_fries', name: "Peri Peri Fry's", price: 70, active: true },
  { id: 'itm_fry_3', categoryId: 'cat_french_fries', name: "Chees Fry's", price: 90, active: true },

  // 10. FALOODA
  { id: 'itm_fal_1', categoryId: 'cat_falooda', name: 'Ice cream Falooda', price: 100, active: true },
  { id: 'itm_fal_2', categoryId: 'cat_falooda', name: 'Dry Fruit Falooda', price: 120, active: true },

  // 11. MOKTAILS
  { id: 'itm_mok_1', categoryId: 'cat_moktails', name: 'Ferrero Rocher', price: 60, active: true },
  { id: 'itm_mok_2', categoryId: 'cat_moktails', name: 'Belgian Chips', price: 80, active: true },
  { id: 'itm_mok_3', categoryId: 'cat_moktails', name: 'Hop Scotch Butter scotch', price: 70, active: true },
  { id: 'itm_mok_4', categoryId: 'cat_moktails', name: 'Oreo Chips', price: 90, active: true },

  // 12. COFFEE ROSTER
  { id: 'itm_cof_1', categoryId: 'cat_coffee_roster', name: 'Turkish Frappe', price: 70, active: true },
  { id: 'itm_cof_2', categoryId: 'cat_coffee_roster', name: 'Coffee On The Rocks', price: 70, active: true },
  { id: 'itm_cof_3', categoryId: 'cat_coffee_roster', name: 'Swedish House Mafia', price: 70, active: true },
  { id: 'itm_cof_4', categoryId: 'cat_coffee_roster', name: 'Portuguesse', price: 90, active: true },

  // 13. CRISPY CHICKEN
  { id: 'itm_chk_1', categoryId: 'cat_crispy_chicken', name: 'Boneless Chicken Strips', price: 130, active: true },
  { id: 'itm_chk_2', categoryId: 'cat_crispy_chicken', name: 'Wings', price: 120, active: true },
  { id: 'itm_chk_3', categoryId: 'cat_crispy_chicken', name: 'Loaded Fries', price: 140, active: true },
  { id: 'itm_chk_4', categoryId: 'cat_crispy_chicken', name: 'Chicken Popcorn', price: 100, active: true },

  // 14. FRIUTS & ICE CREAMS
  { id: 'itm_fic_1', categoryId: 'cat_fruits_ice_creams', name: 'Fruits Salad Ice cream', price: 80, active: true },
  { id: 'itm_fic_2', categoryId: 'cat_fruits_ice_creams', name: 'Fiftyfifty/ gad bud', price: 100, active: true },

  // 15. COLD COFFE
  { id: 'itm_ccf_1', categoryId: 'cat_cold_coffe', name: 'Hard Rock Coffee', price: 60, active: true },
  { id: 'itm_ccf_2', categoryId: 'cat_cold_coffe', name: 'Mud Coffee', price: 90, active: true },

  // 16. SUPER SHAKES
  { id: 'itm_ssh_1', categoryId: 'cat_super_shakes', name: 'Belgian Chocolate', price: 60, active: true },
  { id: 'itm_ssh_2', categoryId: 'cat_super_shakes', name: 'Oreo Shake', price: 60, active: true },
  { id: 'itm_ssh_3', categoryId: 'cat_super_shakes', name: 'Missippi Mud', price: 90, active: true },
  { id: 'itm_ssh_4', categoryId: 'cat_super_shakes', name: 'Whey Protin', price: 90, active: true },

  // 17. SHAKES
  { id: 'itm_shk_1', categoryId: 'cat_shakes', name: 'Banana', price: 50, active: true },
  { id: 'itm_shk_2', categoryId: 'cat_shakes', name: 'Muskmelon', price: 50, active: true },
  { id: 'itm_shk_3', categoryId: 'cat_shakes', name: 'Banana Bonkers', price: 60, active: true },
  { id: 'itm_shk_4', categoryId: 'cat_shakes', name: 'Mango Banana', price: 50, active: true },
  { id: 'itm_shk_5', categoryId: 'cat_shakes', name: 'Pista Banana', price: 50, active: true },
  { id: 'itm_shk_6', categoryId: 'cat_shakes', name: 'Mango Strawberry', price: 70, active: true },
  { id: 'itm_shk_7', categoryId: 'cat_shakes', name: 'Nutella Shake', price: 90, active: true },
  { id: 'itm_shk_8', categoryId: 'cat_shakes', name: 'Dry Fruit', price: 90, active: true },
  { id: 'itm_shk_9', categoryId: 'cat_shakes', name: 'Watermelon', price: 60, active: true },
  { id: 'itm_shk_10', categoryId: 'cat_shakes', name: 'Vanilla', price: 60, active: true },
  { id: 'itm_shk_11', categoryId: 'cat_shakes', name: 'Strawberry', price: 60, active: true },
  { id: 'itm_shk_12', categoryId: 'cat_shakes', name: 'Butterscotch', price: 60, active: true },
  { id: 'itm_shk_13', categoryId: 'cat_shakes', name: 'Mango', price: 60, active: true },
  { id: 'itm_shk_14', categoryId: 'cat_shakes', name: 'Brownie', price: 70, active: true },

  // 18. ICE CREAM SUNDAE'S
  { id: 'itm_sun_1', categoryId: 'cat_ice_cream_sundaes', name: 'Chocolate Fudge', price: 70, active: true },
  { id: 'itm_sun_2', categoryId: 'cat_ice_cream_sundaes', name: 'Butter scotch Fudge', price: 90, active: true },
  { id: 'itm_sun_3', categoryId: 'cat_ice_cream_sundaes', name: 'Nutella Fudge', price: 110, active: true },
  { id: 'itm_sun_4', categoryId: 'cat_ice_cream_sundaes', name: 'Safari Dessert', price: 110, active: true },
  { id: 'itm_sun_5', categoryId: 'cat_ice_cream_sundaes', name: 'Cookies N Cream', price: 110, active: true },
  { id: 'itm_sun_6', categoryId: 'cat_ice_cream_sundaes', name: 'Dry Fruit Sundae', price: 110, active: true },
  { id: 'itm_sun_7', categoryId: 'cat_ice_cream_sundaes', name: 'Choconut Sundae', price: 110, active: true },
  { id: 'itm_sun_8', categoryId: 'cat_ice_cream_sundaes', name: 'Carmel Moch Fudge', price: 100, active: true },
  { id: 'itm_sun_9', categoryId: 'cat_ice_cream_sundaes', name: 'Mango Fudge', price: 100, active: true },

  // 19. BROWNIES WITH ICE CREAM
  { id: 'itm_bwn_1', categoryId: 'cat_brownies_ice_cream', name: 'Mexican Brownie', price: 70, active: true },
  { id: 'itm_bwn_2', categoryId: 'cat_brownies_ice_cream', name: 'Chocolate Brownie', price: 80, active: true },
  { id: 'itm_bwn_3', categoryId: 'cat_brownies_ice_cream', name: 'Nutella Brownie', price: 130, active: true },

  // 20. Fruit Cocktails
  { id: 'itm_fck_1', categoryId: 'cat_fruit_cocktails', name: 'Watermelon', price: 50, active: true },
  { id: 'itm_fck_2', categoryId: 'cat_fruit_cocktails', name: 'Tropical Mixfruit', price: 70, active: true },

  // 21. Ice cream Scoops
  { id: 'itm_scp_1', categoryId: 'cat_ice_cream_scoops', name: 'Vennella', price: 50, active: true },
  { id: 'itm_scp_2', categoryId: 'cat_ice_cream_scoops', name: 'Chocolate', price: 50, active: true },
  { id: 'itm_scp_3', categoryId: 'cat_ice_cream_scoops', name: 'Butter scotch', price: 50, active: true },
  { id: 'itm_scp_4', categoryId: 'cat_ice_cream_scoops', name: 'Strawberry', price: 50, active: true },
  { id: 'itm_scp_5', categoryId: 'cat_ice_cream_scoops', name: 'Caramel', price: 70, active: true },
  { id: 'itm_scp_6', categoryId: 'cat_ice_cream_scoops', name: 'Pista', price: 60, active: true },
  { id: 'itm_scp_7', categoryId: 'cat_ice_cream_scoops', name: 'Dry Fruit', price: 70, active: true },
  { id: 'itm_scp_8', categoryId: 'cat_ice_cream_scoops', name: 'Mango', price: 60, active: true },
  { id: 'itm_scp_9', categoryId: 'cat_ice_cream_scoops', name: 'Black Current', price: 60, active: true }
];