const DEFAULT_SHOP_URL = "https://uppercase.co.in";
const TEAMS = [
  {
    id: "germany",
    name: "Germany",
    tagline: "Die Mannschaft",
    colorway: { c1: "#141414", c2: "#DD0000", c3: "#FFCE00" },
    bag: { name: "Kicks Black", image: "/assets/bags/germany-2.webp", accent: "#FFCE00" }
  },
  {
    id: "brazil",
    name: "Brazil",
    tagline: "Seleção · Samba flair",
    colorway: { c1: "#009C3B", c2: "#FFDF00", c3: "#002776" },
    bag: { name: "Kicks Yellow", image: "/assets/bags/brazil-2.webp", accent: "#FFDF00" }
  },
  {
    id: "argentina",
    name: "Argentina",
    tagline: "La Albiceleste",
    colorway: { c1: "#74ACDF", c2: "#FFFFFF", c3: "#F6B40E" },
    bag: { name: "Kicks Blue", image: "/assets/bags/argentina-2.webp", accent: "#74ACDF" }
  },
  {
    id: "portugal",
    name: "Portugal",
    tagline: "Seleção das Quinas",
    colorway: { c1: "#006600", c2: "#FF0000", c3: "#FFD700" },
    bag: { name: "Kicks Red", image: "/assets/bags/portugal-2.webp", accent: "#E4080A" }
  }
];
const REWARDS = {
  0: { goals: 0, discount: 5, code: "KICKS10", message: "Better luck next match.", shopUrl: DEFAULT_SHOP_URL },
  1: { goals: 1, discount: 10, code: "KICKS10", message: "Nice finish.", shopUrl: DEFAULT_SHOP_URL },
  2: { goals: 2, discount: 15, code: "KICKS15", message: "Strong performance.", shopUrl: DEFAULT_SHOP_URL },
  3: { goals: 3, discount: 20, code: "KICKS20", message: "Perfect hat trick.", shopUrl: DEFAULT_SHOP_URL }
};
function rewardForGoals(goals) {
  return REWARDS[Math.max(0, Math.min(3, goals))];
}
function teamById(id) {
  return TEAMS.find((t) => t.id === id);
}
const TOTAL_PENALTIES = 3;
const LEVELS = [
  { name: "Level 1: Easy", keeper: "Reads a tell" },
  { name: "Level 2: Tricky", keeper: "Reads your side, not height" },
  { name: "Level 3: Elite", keeper: "Owns his side — go high" }
];
export {
  LEVELS as L,
  TEAMS as T,
  TOTAL_PENALTIES as a,
  rewardForGoals as r,
  teamById as t
};
