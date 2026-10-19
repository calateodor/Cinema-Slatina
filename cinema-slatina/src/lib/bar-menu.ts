/**
 * Meniul barului pentru televizorul de la bar (/afisaj/bar), după afișele din
 * Canva (D:\Teo\Site Cinema\Meniu\1). Prețurile în lei. Imaginile produselor
 * sunt decupate din afișe, în public/bar.
 */

export const POPCORN = {
  sizes: [
    { label: "MIC", grams: "65 g" },
    { label: "MARE", grams: "135 g" },
  ],
  rows: [
    { name: "Clasic", prices: [12, 24] },
    { name: "Cu cașcaval", prices: [17, 34] },
  ],
  brand: "Popcornico Butterfly Gold",
  gourmet: [
    { name: "Caramel", detail: "70 g · Mogyi Caramoon", price: "18", image: "/bar/caramoon.webp" },
    { name: "Ciocolată, căpșuni sau caramel", detail: "80 g · Savour", price: "25", image: "/bar/savour.webp" },
    { name: "Caramel și sare de Himalaya", detail: "125 g · 4700 BC", price: "25", image: "/bar/himalaya.webp" },
  ],
};

export const NACHOS = {
  portions: [
    { name: "Cu un sos", grams: "165–175 g cu tot cu sos", price: "20" },
    { name: "Cu două sosuri", grams: "225–235 g cu tot cu sos", price: "25" },
  ],
  sauces: ["Dip salsa", "Dip cheese", "Ketchup dulce"],
  extraSauce: { grams: "40–50 g", price: "3" },
  brands: "Metro Chef Tortilla Chips Cheese · Hombre Nachos Cheese",
};

export const DRINKS = {
  soft: {
    title: "Răcoritoare",
    size: "sticlă 500 ml",
    price: "12",
    items: ["Coca-Cola", "Fanta", "Sprite", "Fuzetea", "Schweppes", "Cappy Pulpy", "Nestea", "Tymbark Cool", "Tymbark Limonadă", "Bucovina Limonadă"],
  },
  water: {
    title: "Apă",
    size: "500 ml",
    price: "10",
    items: ["Bucovina plată", "Bucovina minerală", "Dorna plată", "Dorna minerală"],
  },
};

export const SNACKS = [
  { name: "Chipsuri Viva", detail: "Crunchy, Cita, Cones, Bitz", price: "10", image: "/bar/chipsuri.webp" },
  { name: "Viva Nuts", detail: "nuci în glazură", price: "10", image: "/bar/viva-nuts.webp" },
  { name: "Olly Crispy", detail: "biscuiți cu umplutură", price: "10", image: "/bar/olly.webp" },
  { name: "Wafer Rolls", detail: "rulouri cu cocos", price: "10", image: "/bar/wafer-rolls.webp" },
  { name: "7 Days", detail: "croissant cacao / spumant", price: "7", image: "/bar/croissant.webp" },
  { name: "Pufu King", detail: "pufuleți", price: "5", image: "/bar/pufu-king.webp" },
  { name: "Viva Pernuțe", detail: "cremă de cacao", price: "5 / 10", image: "/bar/pernute.webp" },
  { name: "Ochelari 3D", detail: "pentru filmele 3D", price: "10", image: "/bar/ochelari.webp" },
];
