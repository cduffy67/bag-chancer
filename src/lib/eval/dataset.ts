// Ground-truth dataset for the vision eval.
//
// Each item is a retailer/manufacturer product photo with the manufacturer's
// published external dimensions. Images are hotlinked at eval time and are
// not redistributed in this repo; they belong to their respective owners.
//
// Dimensions are compared orientation-free (both sides sorted), so the
// W/H/D labelling used by each retailer doesn't matter.

export type EvalCategory =
  | "underseat backpack"
  | "underseat case"
  | "holdall"
  | "duffel"
  | "tote"
  | "cabin case"
  | "checked case";

export type EvalItem = {
  id: string;
  name: string;
  category: EvalCategory;
  shell: "soft" | "hard";
  dimsCm: [number, number, number];
  // Anything in the shot that gives away real-world scale.
  scaleCue: "none" | "person";
  imageUrl: string;
  sourceUrl: string;
};

export const EVAL_DATASET: EvalItem[] = [
  // ── Under-seat (≈ Ryanair free small bag 40×20×25) ────────────────────
  {
    id: "cabinmax-paxos-20l",
    name: "Cabin Max Paxos 20L",
    category: "underseat backpack",
    shell: "hard",
    dimsCm: [40, 25, 20],
    scaleCue: "none",
    imageUrl: "https://cabinmax.com/cdn/shop/files/Paxos20LbackpackStill.jpg?v=1754570049",
    sourceUrl: "https://cabinmax.com/products/paxos-20l-backpack-with-shapesafe-design-40x20x25-cm",
  },
  {
    id: "cabinmax-equator-x-20l",
    name: "Cabin Max Equator X 20L",
    category: "underseat backpack",
    shell: "soft",
    dimsCm: [40, 25, 20],
    scaleCue: "none",
    imageUrl:
      "https://cabinmax.com/cdn/shop/files/Equator_X_Inca_Green_black_zips_still.jpg?v=1753711369",
    sourceUrl: "https://cabinmax.com/products/equator-x-20l-40x20x25cm-ryanair-underseat-backpack",
  },
  {
    id: "cabinmax-travel-hack-20l",
    name: "Cabin Max Travel Hack 20L",
    category: "underseat backpack",
    shell: "soft",
    dimsCm: [40, 25, 20],
    scaleCue: "none",
    imageUrl:
      "https://cabinmax.com/cdn/shop/files/Travel_Hack_20L_Still_42827559-e953-444d-b8d7-95b77bf1469c.jpg?v=1783599047&width=1024",
    sourceUrl:
      "https://cabinmax.com/collections/backpacks-2/products/travel-hack-stowaway-cabin-backpack-flies-free-on-ryanair",
  },
  {
    id: "aerolite-backpack-40x25x20",
    name: "Aerolite 3-in-1 Flight Backpack",
    category: "underseat backpack",
    shell: "soft",
    dimsCm: [40, 25, 20],
    scaleCue: "none",
    imageUrl: "https://cdn.shopify.com/s/files/1/0286/0292/5149/products/bpmax03.jpg?v=1656487204",
    sourceUrl:
      "https://aeroliteluggage.co.uk/products/aerolite-40x25x20cm-3-in-1-cabin-luggage-approved-flight-backpack",
  },
  {
    id: "cabinmax-kobe",
    name: "Cabin Max Kobe Underseat",
    category: "underseat backpack",
    shell: "soft",
    dimsCm: [40, 30, 20],
    scaleCue: "person",
    imageUrl:
      "https://cabinmax.com/cdn/shop/files/Kobe_DSCF2830-Edit_-_Go_Outdoors_CabinMax_Amazon_2000_x_2000.jpg?v=1774940650&width=1024",
    sourceUrl: "https://cabinmax.com/products/kobe-underseat-cabin-bag-40x30x20-cm",
  },

  // ── Under-seat (≈ easyJet free bag 45×36×20) ──────────────────────────
  {
    id: "cabinmax-vela-30l",
    name: "Cabin Max Vela 30L Holdall",
    category: "holdall",
    shell: "soft",
    dimsCm: [45, 36, 20],
    scaleCue: "person",
    imageUrl:
      "https://cabinmax.com/cdn/shop/files/Vela_30l_cream_model_-_mod_-_cm.jpg?v=1788247304&width=1024",
    sourceUrl:
      "https://cabinmax.com/collections/45x36x20-suitcases-and-bags/products/30l-tote-bag-flies-for-free-on-easyjet",
  },
  {
    id: "aerolite-holdall-45x36x20",
    name: "Aerolite easyJet Max Holdall",
    category: "holdall",
    shell: "soft",
    dimsCm: [45, 36, 20],
    scaleCue: "none",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0286/0292/5149/products/71sWDwxw5jL._AC_SL1500.jpg?v=1632746070",
    sourceUrl:
      "https://aeroliteluggage.co.uk/products/aerolite-45x36x20-new-and-improved-easyjet-maximum-size-holdall-cabin-luggage-under-seat-flight-bag-black",
  },
  {
    id: "aerolite-underseat-case-45x36x20",
    name: "Aerolite easyJet Max Hard Shell Case",
    category: "underseat case",
    shell: "hard",
    dimsCm: [45, 36, 20],
    scaleCue: "none",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0286/0292/5149/files/ABS642-618-CHARCOAL-1.jpg?v=1781765685",
    sourceUrl:
      "https://aeroliteluggage.co.uk/products/aerolite-45x36x20-easyjet-maximum-size-hard-shellcarry-on-hand-cabin-luggage-underseat-flight-bag-suitcase-45x36x20-with-4-wheels",
  },

  // ── Duffels & totes ───────────────────────────────────────────────────
  {
    id: "herschel-strand-duffle",
    name: "Herschel Strand Duffle 28.5L",
    category: "duffel",
    shell: "soft",
    dimsCm: [43, 30.5, 14],
    scaleCue: "none",
    imageUrl:
      "https://img.thelasthunt.com/https%3A%2F%2Fs3.amazonaws.com%2Fsyncpigeon%2Falti_prod%2Fimages%2Fher-11410_black.jpg?w=3840&q=75",
    sourceUrl: "https://www.altitude-sports.com/p/herschel-supply-co-strand-duffle-bag-285l-her-11410",
  },
  {
    id: "herschel-novel-duffle",
    name: "Herschel Novel Duffle",
    category: "duffel",
    shell: "soft",
    dimsCm: [52.1, 29.8, 27.9],
    scaleCue: "none",
    imageUrl:
      "https://herschel.com/cdn/shop/files/11505-00001-os-01-4wyzTPsO.jpg?v=1781474740&width=1200",
    sourceUrl: "https://herschel.com/products/herschel-novel-duffle-premium-classics",
  },
  {
    id: "grams28-weekender-tote",
    name: "Grams28 184 Weekender Tote",
    category: "tote",
    shell: "soft",
    dimsCm: [50, 33, 22],
    scaleCue: "none",
    imageUrl: "https://www.grams28.com/cdn/shop/files/184_Canvas_3_600x.jpg?v=1789010514",
    sourceUrl: "https://grams28.com/products/184-weekender-tote-canvas-version",
  },
  {
    id: "beechfield-canvas-tote",
    name: "Beechfield Heavyweight Canvas Tote",
    category: "tote",
    shell: "soft",
    dimsCm: [48, 41, 16],
    scaleCue: "none",
    imageUrl:
      "https://mediahub.beechfieldbrands.com/m/1c4459cf996975f7/webimage-W697-Heavyweight-Canvas-Tote-Bag-Black-Product-Shot-01.png",
    sourceUrl: "https://beechfieldbrands.com/products/w697-heavyweight-canvas-tote-bag",
  },

  // ── Cabin cases (≈ 55×40×20) ──────────────────────────────────────────
  {
    id: "cabinmax-santa-cruz-40l",
    name: "Cabin Max Santa Cruz 40L",
    category: "cabin case",
    shell: "hard",
    dimsCm: [55, 40, 20],
    scaleCue: "none",
    imageUrl:
      "https://cabinmax.com/cdn/shop/files/Santa_Cruz_40L_Still.jpg?v=1758808257&width=1024",
    sourceUrl:
      "https://cabinmax.com/collections/55x40x20cm-bags-and-suitcases/products/santa-cruz-40l-cabin-suitcase-55x40x20-cm",
  },
  {
    id: "aerolite-cabin-55x40x20",
    name: "Aerolite 55×40×20 Hard Shell",
    category: "cabin case",
    shell: "hard",
    dimsCm: [55, 40, 20],
    scaleCue: "none",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0286/0292/5149/files/ABS634-Charcoal-Alt1-1.jpg?v=1783327130",
    sourceUrl:
      "https://aeroliteluggage.co.uk/products/aerolite-55x40x20cm-lightweight-hard-shell-cabin-hand-luggage-4-wheels",
  },
  {
    id: "monos-expandable-carry-on",
    name: "Monos Expandable Carry-On",
    category: "cabin case",
    shell: "hard",
    dimsCm: [55.9, 35.6, 24.9],
    scaleCue: "none",
    imageUrl:
      "https://monos.com/cdn/shop/files/PLP_Luggage_Expandable_CarryOn_OceanBlue_Angle_grande.png?v=1753393820",
    sourceUrl: "https://monos.com/products/expandable-carry-on",
  },
  {
    id: "aerolite-cabin-56x45x25",
    name: "Aerolite 56×45×25 Hard Shell",
    category: "cabin case",
    shell: "hard",
    dimsCm: [56, 45, 25],
    scaleCue: "none",
    imageUrl: "https://cdn.shopify.com/s/files/1/0286/0292/5149/files/ABS324-MAIN.jpg?v=1736562886",
    sourceUrl:
      "https://aeroliteluggage.co.uk/products/aerolite-56x45x25cm-lightweight-hard-shell-cabin-hand-luggage",
  },

  // ── Checked cases ─────────────────────────────────────────────────────
  {
    id: "aerolite-medium-66",
    name: "Aerolite 24in Medium 67L",
    category: "checked case",
    shell: "hard",
    dimsCm: [66, 44, 26],
    scaleCue: "none",
    imageUrl: "https://aeroliteluggage.co.uk/cdn/shop/files/PP154DARKGREEN24Alta.jpg?v=1766057108",
    sourceUrl:
      "https://aeroliteluggage.co.uk/products/aerolite-medium-24in-67l-premium-lightweight-polypropylene-hard-shell-4-wheel-spinner-travel-hold-checked-check-in-luggage-suitcase-green",
  },
  {
    id: "aerolite-medium-69",
    name: "Aerolite 25in Medium 82L",
    category: "checked case",
    shell: "hard",
    dimsCm: [69, 50, 27],
    scaleCue: "none",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0286/0292/5149/files/LN-ABS325-618-ROYAL-BLUE-1.jpg?v=1722513580",
    sourceUrl:
      "https://aeroliteluggage.co.uk/products/aerolite-69x50x27cm-medium-lightweight-hard-shell-luggage-suitcase",
  },
  {
    id: "aerolite-trunk-76",
    name: "Aerolite Aluminium Frame Trunk 97.6L",
    category: "checked case",
    shell: "hard",
    dimsCm: [76, 44.5, 36.5],
    scaleCue: "none",
    imageUrl:
      "https://aeroliteluggage.co.uk/cdn/shop/files/ALPC105-TRUNK-CHARCOAL---Alt-10-1.jpg?v=1766999904",
    sourceUrl:
      "https://aeroliteluggage.co.uk/products/aerolite-zipperless-aluminium-frame-trunk-premium-trunk-suitcase-tsa-latch-lock-aluminium-frame-silent-hinomoto-wheels-97-6l-large-luggage-charcoal",
  },
  {
    id: "antler-icon-stripe-large",
    name: "Antler Icon Stripe Large",
    category: "checked case",
    shell: "hard",
    dimsCm: [78, 51.7, 33.6],
    scaleCue: "none",
    imageUrl:
      "https://www.luggagedirect.com.au/cdn/shop/files/antler_icon_stripe_large_taupe_front_right-1.jpg?v=1779420223",
    sourceUrl:
      "https://www.luggagedirect.com.au/products/antler-icon-stripe-expandable-hardside-large-spinner-suitcase-78cm-taupe",
  },
  {
    id: "aerolite-xl-87",
    name: "Aerolite XL 32in 144L",
    category: "checked case",
    shell: "hard",
    dimsCm: [87, 55, 34],
    scaleCue: "none",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0286/0292/5149/files/PCAL655Charcoal32MainImage2-1.jpg?v=1783329206",
    sourceUrl:
      "https://aeroliteluggage.co.uk/products/aerolite-extra-large-xl-32in-144l-lightweight-abs-hard-shell-4-wheel-spinner-travel-hold-checked-check-in-luggage-suitcase-charcoal",
  },
];

// Airline rules the verdict-band metric is scored against: the three
// allowances that matter most for Ireland ↔ UK flyers.
export const EVAL_RULES = [
  { airlineId: "ryanair", fareId: "basic", label: "Ryanair free bag" },
  { airlineId: "easyjet", fareId: "standard", label: "easyJet free bag" },
  { airlineId: "ryanair", fareId: "priority", label: "Ryanair Priority cabin bag" },
] as const;
