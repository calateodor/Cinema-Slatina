/**
 * Meniul barului pentru televizorul de la bar (/afisaj/bar și /afisaj/bar-foto),
 * după afișele din Canva (D:\Teo\Site Cinema\Meniu\1). Prețurile în lei.
 * Gramajul apare doar la popcorn și la nachos (cerința lui Teo).
 */

/** Imaginile produselor: varianta ilustrată (decupate din afișe) și cea fotorealistă. */
export type BarVariant = "ilustrat" | "foto";

export const POPCORN = {
  sizes: [
    { label: "MIC", grams: "65 g" },
    { label: "MARE", grams: "135 g" },
  ],
  rows: [
    { name: "Clasic", prices: [12, 24] },
    { name: "Cu cașcaval", prices: [17, 34] },
  ],
  gourmet: [
    { name: "Caramel", grams: "70 g", price: "18", image: "caramoon" },
    { name: "Ciocolată, căpșuni, caramel", grams: "80 g", price: "25", image: "savour" },
    { name: "Caramel cu sare de Himalaya", grams: "125 g", price: "25", image: "himalaya" },
  ],
};

export const NACHOS = {
  portions: [
    { name: "Cu un sos", grams: "165–175 g", price: "20" },
    { name: "Cu două sosuri", grams: "225–235 g", price: "25" },
  ],
  sauces: ["Salsa", "Cheese", "Ketchup dulce"],
  extraSauce: { grams: "40–50 g", price: "3" },
};

export const DRINKS = {
  soft: {
    title: "Răcoritoare",
    price: "12",
    items: ["Coca-Cola", "Fanta", "Sprite", "Fuzetea", "Schweppes", "Cappy Pulpy", "Nestea", "Tymbark Cool", "Tymbark Limonadă", "Bucovina Limonadă"],
  },
  water: {
    title: "Apă plată sau minerală",
    price: "10",
    items: ["Bucovina", "Dorna"],
  },
};

export const SNACKS = [
  { name: "Chipsuri Viva", price: "10", image: "chipsuri" },
  { name: "Viva Nuts", price: "10", image: "viva-nuts" },
  { name: "Olly Crispy", price: "10", image: "olly" },
  { name: "Wafer Rolls", price: "10", image: "wafer-rolls" },
  { name: "7 Days", price: "7", image: "croissant" },
  { name: "Pufu King", price: "5", image: "pufu-king" },
  { name: "Viva Pernuțe", price: "5 / 10", image: "pernute" },
  { name: "Ochelari 3D", price: "10", image: "ochelari" },
];

/**
 * Unde e imaginea unui produs în fiecare variantă. În varianta foto sunt
 * fotografiile de la producători și magazine (Auchan, eMAG, European Food,
 * Trendyol), decupate; ce nu are fotografie cade pe decupajul din afiș.
 */
const FOTO = new Set(["ochelari", "caramoon", "savour", "himalaya", "chipsuri", "viva-nuts", "olly", "wafer-rolls", "croissant", "pufu-king", "pernute"]);
export function productImage(name: string, variant: BarVariant): string {
  return variant === "foto" && FOTO.has(name) ? `/bar/foto/${name}.webp` : `/bar/${name}.webp`;
}
