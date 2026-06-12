-- RydeTime Auto — seed data: 6 realistic mock vehicles for the Suffolk VA market.
-- Run after schema.sql. Photos use Unsplash automotive imagery as stand-ins
-- until the DealerCenter feed syncs real photos.

insert into vehicles (
  vin, stock_number, year, make, model, trim, body_style, exterior_color, interior_color,
  mileage, price, status, transmission, drivetrain, fuel_type, engine, doors, seats,
  description_dc, slug, carfax_url, carfax_badge_one_owner, carfax_badge_accident_free,
  carfax_badge_service_records, featured, ryans_pick, ryans_take, best_fit_for, what_to_know,
  days_in_inventory, price_reduced, original_price
) values
(
  '1HGCV1F34LA042817', 'RT1001', 2020, 'Honda', 'Accord', 'LX', 'Sedan', 'Modern Steel Metallic', 'Black Cloth',
  68420, 17995, 'active', 'CVT Automatic', 'FWD', 'Gasoline', '1.5L Turbo I4', 4, 5,
  'Well-maintained Honda Accord LX with strong service history. Clean interior, cold A/C, highway miles.',
  '2020-honda-accord-lx-rt1001', 'https://www.carfax.com/vehicle/1HGCV1F34LA042817', true, true, true,
  true, true,
  'This is the kind of car I''d put my own family in. Boring in the best way — it just works.',
  'Daily commuters who want low running costs and a comfortable highway ride.',
  'Tires have about 50% tread left. Factor a set into your budget over the next year.',
  12, false, null
),
(
  '5TDZA23C16S512384', 'RT1002', 2019, 'Toyota', 'RAV4', 'LE', 'SUV', 'Magnetic Gray', 'Black Fabric',
  74210, 19450, 'active', '8-Speed Automatic', 'AWD', 'Gasoline', '2.5L I4', 4, 5,
  'AWD RAV4 LE with Toyota Safety Sense. One owner, no reported accidents, dealer-serviced.',
  '2019-toyota-rav4-le-rt1002', 'https://www.carfax.com/vehicle/5TDZA23C16S512384', true, true, true,
  true, false,
  null,
  'Families who need AWD confidence and Toyota reliability without a new-car payment.',
  'Small door ding on rear passenger side — priced accordingly. Come see it in person.',
  8, false, null
),
(
  '1FTEW1EP5JFB28401', 'RT1003', 2018, 'Ford', 'F-150', 'XLT SuperCrew', 'Truck', 'Oxford White', 'Gray Cloth',
  98750, 23900, 'active', '10-Speed Automatic', '4WD', 'Gasoline', '2.7L EcoBoost V6', 4, 6,
  'F-150 XLT SuperCrew 4x4 with tow package. Work-ready, runs strong, recent state inspection.',
  '2018-ford-f-150-xlt-supercrew-rt1003', 'https://www.carfax.com/vehicle/1FTEW1EP5JFB28401', false, true, false,
  true, true,
  'Trucks at this price usually look rough. This one doesn''t. Bed liner''s already in it.',
  'Anyone who needs a real work truck — towing, hauling, job sites.',
  'Higher mileage, but the EcoBoost has been serviced regularly. Carfax shows the records.',
  21, true, 24900
),
(
  '2T1BURHE5KC198342', 'RT1004', 2019, 'Toyota', 'Corolla', 'LE', 'Sedan', 'Classic Silver', 'Ash Fabric',
  61300, 14495, 'active', 'CVT Automatic', 'FWD', 'Gasoline', '1.8L I4', 4, 5,
  'Economical Corolla LE — excellent first car or commuter. Great fuel economy, easy to insure.',
  '2019-toyota-corolla-le-rt1004', 'https://www.carfax.com/vehicle/2T1BURHE5KC198342', false, true, true,
  false, false,
  null,
  'First-time buyers and students who need cheap, dependable transportation.',
  'Previous owner was a smoker — we''ve detailed it twice and it''s nearly gone, but be aware.',
  35, false, null
),
(
  '5XYPGDA38LG612907', 'RT1005', 2020, 'Kia', 'Telluride', 'S', 'SUV', 'Ebony Black', 'Gray SynTex',
  82150, 24800, 'active', '8-Speed Automatic', 'FWD', 'Gasoline', '3.8L V6', 4, 8,
  'Three-row Telluride S with room for eight. Apple CarPlay, blind spot monitoring, rear cross traffic alert.',
  '2020-kia-telluride-s-rt1005', null, false, false, false,
  false, false,
  null,
  'Bigger families who need three usable rows without stepping up to a full-size SUV price.',
  'Carfax report pending — ask us and we''ll pull it for you before you visit.',
  5, false, null
),
(
  '1G1ZD5ST1JF134756', 'RT1006', 2018, 'Chevrolet', 'Malibu', 'LT', 'Sedan', 'Summit White', 'Jet Black Cloth',
  89900, 9995, 'active', '6-Speed Automatic', 'FWD', 'Gasoline', '1.5L Turbo I4', 4, 5,
  'Budget-friendly Malibu LT. Drives straight, cold A/C, new front brake pads at inspection.',
  '2018-chevrolet-malibu-lt-rt1006', 'https://www.carfax.com/vehicle/1G1ZD5ST1JF134756', false, false, true,
  false, false,
  null,
  'Budget shoppers who want a comfortable mid-size sedan under $10k.',
  'Has one prior reported accident (minor, front bumper) — fully disclosed on the Carfax. Priced to reflect it.',
  18, true, 10995
);

-- Photos (3 per vehicle; first is primary)
insert into vehicle_photos (vehicle_id, url, sort_order, is_primary)
select v.id, p.url, p.sort_order, p.sort_order = 0
from vehicles v
join lateral (
  values
    (0, 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=1200&q=80'),
    (1, 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=1200&q=80'),
    (2, 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1200&q=80')
) as p(sort_order, url) on true
where v.stock_number in ('RT1001','RT1002','RT1003','RT1004','RT1005','RT1006');

-- Features
insert into vehicle_features (vehicle_id, feature_name, category)
select v.id, f.feature_name, f.category
from vehicles v
join lateral (
  values
    ('Backup Camera', 'Safety'),
    ('Bluetooth', 'Technology'),
    ('Cruise Control', 'Convenience'),
    ('Power Windows', 'Convenience'),
    ('Keyless Entry', 'Convenience'),
    ('Lane Departure Warning', 'Safety')
) as f(feature_name, category) on true
where v.stock_number in ('RT1001','RT1002','RT1003','RT1004','RT1005','RT1006');

insert into vehicle_features (vehicle_id, feature_name, category)
select id, 'Apple CarPlay / Android Auto', 'Technology' from vehicles where stock_number in ('RT1002','RT1005');

insert into vehicle_features (vehicle_id, feature_name, category)
select id, 'Tow Package', 'Performance' from vehicles where stock_number = 'RT1003';

insert into vehicle_features (vehicle_id, feature_name, category)
select id, 'Third Row Seating', 'Comfort' from vehicles where stock_number = 'RT1005';

-- Prep badges
insert into vehicle_prep_badges (vehicle_id, badge_type)
select id, 'state_inspection' from vehicles where stock_number in ('RT1001','RT1002','RT1003','RT1004','RT1006');

insert into vehicle_prep_badges (vehicle_id, badge_type)
select id, 'oil_change' from vehicles where stock_number in ('RT1001','RT1002','RT1004');

insert into vehicle_prep_badges (vehicle_id, badge_type)
select id, 'detailed' from vehicles where stock_number in ('RT1001','RT1002','RT1003','RT1004','RT1005','RT1006');

insert into vehicle_prep_badges (vehicle_id, badge_type)
select id, 'new_brakes' from vehicles where stock_number = 'RT1006';

insert into vehicle_prep_badges (vehicle_id, badge_type)
select id, 'multi_point_review' from vehicles where stock_number in ('RT1001','RT1002','RT1003','RT1005');

-- Site settings defaults
insert into site_settings (key, value) values
  ('business_hours', '{"mon_fri":"10AM-6PM","sat":"10AM-5PM","sun":"Closed"}'),
  ('contact_phone', '"(757) 937-8664"'),
  ('contact_email', '"info@rydetimeauto.com"'),
  ('ai_chat_enabled', 'true'),
  ('payment_estimator_apr', '8.9'),
  ('payment_estimator_term', '72')
on conflict (key) do nothing;
