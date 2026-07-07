/**
 * BrewMaster AI — Database Seed
 * Run with: pnpm --filter @workspace/db run seed
 *
 * Populates a realistic 500L craft brewery layout:
 *   9 equipment pieces → 27 sensors → 21 actuators → 3 recipes
 */
import { db, pool } from "./index";
import {
  equipmentTable,
  sensorsTable,
  actuatorsTable,
  usersTable,
  recipesTable,
} from "./schema";

// ─── helpers ──────────────────────────────────────────────────────────────────
const rnd = (min: number, max: number, decimals = 1) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

// ─── equipment ────────────────────────────────────────────────────────────────
const EQUIPMENT = [
  { name: "HLT — Tanque de Água Quente",       type: "hot_liquor_tank", location: "Sala Brassagem",  firmwareVersion: "v2.1.0" },
  { name: "Mosturador (Mash Tun)",              type: "mash_tun",        location: "Sala Brassagem",  firmwareVersion: "v2.1.0" },
  { name: "Panela de Fervura (Brew Kettle)",    type: "kettle",          location: "Sala Brassagem",  firmwareVersion: "v2.1.0" },
  { name: "Whirlpool",                          type: "whirlpool",       location: "Sala Brassagem",  firmwareVersion: "v2.0.3" },
  { name: "Chiller — Trocador de Calor",        type: "heat_exchanger",  location: "Sala Brassagem",  firmwareVersion: "v1.9.2" },
  { name: "Fermentador 01 (500 L)",             type: "fermenter",       location: "Sala Fermentação", firmwareVersion: "v2.2.1" },
  { name: "Fermentador 02 (500 L)",             type: "fermenter",       location: "Sala Fermentação", firmwareVersion: "v2.2.1" },
  { name: "Tanque de Maturação",                type: "conditioning_tank", location: "Sala Fermentação", firmwareVersion: "v2.0.0" },
  { name: "Linha de Envase / Packaging",        type: "packaging",       location: "Sala Envase",     firmwareVersion: "v1.8.5" },
] as const;

// ─── sensors per equipment (index → sensors[]) ───────────────────────────────
type SensorDef = { name: string; type: string; unit: string; min: number; max: number; lo: number; hi: number };
const SENSORS: SensorDef[][] = [
  // 0 HLT
  [
    { name: "Temperatura HLT",     type: "temperature", unit: "°C",  min: 55,  max: 80,  lo: 60,  hi: 78  },
    { name: "Nível HLT",           type: "level",       unit: "L",   min: 100, max: 500, lo: 100, hi: 490 },
    { name: "Vazão HLT → Mash",    type: "flow",        unit: "L/min", min: 0, max: 20,  lo: 0,   hi: 18  },
  ],
  // 1 Mash Tun
  [
    { name: "Temperatura Mostura", type: "temperature", unit: "°C",  min: 60,  max: 78,  lo: 62,  hi: 76  },
    { name: "pH Mostura",          type: "ph",          unit: "pH",  min: 4.8, max: 5.8, lo: 5.0, hi: 5.6 },
    { name: "Nível Mosturador",    type: "level",       unit: "L",   min: 50,  max: 450, lo: 50,  hi: 440 },
  ],
  // 2 Kettle
  [
    { name: "Temperatura Fervura", type: "temperature", unit: "°C",  min: 95,  max: 103, lo: 97,  hi: 102 },
    { name: "Pressão Panela",      type: "pressure",    unit: "bar", min: 0,   max: 1.5, lo: 0,   hi: 1.2 },
    { name: "Nível Panela",        type: "level",       unit: "L",   min: 50,  max: 500, lo: 50,  hi: 480 },
  ],
  // 3 Whirlpool
  [
    { name: "Temperatura Whirlpool", type: "temperature", unit: "°C",  min: 80, max: 100, lo: 82,  hi: 98  },
    { name: "Nível Whirlpool",       type: "level",       unit: "L",   min: 50, max: 480, lo: 50,  hi: 470 },
  ],
  // 4 Chiller
  [
    { name: "Temp Entrada Chiller",  type: "temperature", unit: "°C", min: 10,  max: 95,  lo: 10,  hi: 90  },
    { name: "Temp Saída Chiller",    type: "temperature", unit: "°C", min: 5,   max: 25,  lo: 5,   hi: 22  },
    { name: "Vazão Chiller",         type: "flow",        unit: "L/min", min: 0, max: 20, lo: 2,   hi: 18  },
  ],
  // 5 Fermentador 01
  [
    { name: "Temperatura Ferm01",   type: "temperature", unit: "°C",  min: 8,   max: 25,  lo: 10,  hi: 22  },
    { name: "Pressão CO₂ Ferm01",   type: "pressure",    unit: "bar", min: 0,   max: 2.5, lo: 0,   hi: 2.0 },
    { name: "Densidade Ferm01",     type: "density",     unit: "°P",  min: 2,   max: 22,  lo: 2,   hi: 20  },
  ],
  // 6 Fermentador 02
  [
    { name: "Temperatura Ferm02",   type: "temperature", unit: "°C",  min: 8,   max: 25,  lo: 10,  hi: 22  },
    { name: "Pressão CO₂ Ferm02",   type: "pressure",    unit: "bar", min: 0,   max: 2.5, lo: 0,   hi: 2.0 },
    { name: "Densidade Ferm02",     type: "density",     unit: "°P",  min: 2,   max: 22,  lo: 2,   hi: 20  },
  ],
  // 7 Maturação
  [
    { name: "Temperatura Maturação", type: "temperature", unit: "°C",  min: -2, max: 4,   lo: -1,  hi: 3   },
    { name: "Pressão Maturação",     type: "pressure",    unit: "bar", min: 0,  max: 3.0, lo: 0,   hi: 2.5 },
  ],
  // 8 Envase
  [
    { name: "Temperatura Envase",   type: "temperature", unit: "°C",  min: 0,  max: 10,  lo: 1,   hi: 8   },
    { name: "Pressão Contra-Pressão", type: "pressure",  unit: "bar", min: 0,  max: 3.0, lo: 0.5, hi: 2.8 },
    { name: "Vazão Linha Envase",   type: "flow",        unit: "L/h", min: 0,  max: 500, lo: 0,   hi: 480 },
  ],
];

// ─── actuators per equipment ──────────────────────────────────────────────────
type ActuatorDef = { name: string; type: string; isOn?: boolean };
const ACTUATORS: ActuatorDef[][] = [
  // 0 HLT
  [
    { name: "Resistência HLT",       type: "heater",  isOn: true  },
    { name: "Bomba HLT → Mash",      type: "pump",    isOn: false },
  ],
  // 1 Mash Tun
  [
    { name: "Agitador Mosturador",   type: "mixer",   isOn: false },
    { name: "Bomba Recirculação",    type: "pump",    isOn: false },
    { name: "Válvula Saída Mostura", type: "valve",   isOn: false },
  ],
  // 2 Kettle
  [
    { name: "Queimador Fervura",     type: "heater",  isOn: false },
    { name: "Bomba Whirlpool",       type: "pump",    isOn: false },
  ],
  // 3 Whirlpool
  [
    { name: "Agitador Whirlpool",    type: "mixer",   isOn: false },
    { name: "Válvula Saída WP",      type: "valve",   isOn: false },
  ],
  // 4 Chiller
  [
    { name: "Bomba Água Gelada",     type: "pump",    isOn: false },
    { name: "Bomba Mosto Chiller",   type: "pump",    isOn: false },
  ],
  // 5 Fermentador 01
  [
    { name: "Compressor Ferm01",     type: "cooler",  isOn: true  },
    { name: "Válvula Purga CO₂ F01", type: "valve",   isOn: false },
  ],
  // 6 Fermentador 02
  [
    { name: "Compressor Ferm02",     type: "cooler",  isOn: false },
    { name: "Válvula Purga CO₂ F02", type: "valve",   isOn: false },
  ],
  // 7 Maturação
  [
    { name: "Compressor Maturação",  type: "cooler",  isOn: true  },
    { name: "Válvula CO₂ Maturação", type: "valve",   isOn: false },
  ],
  // 8 Envase
  [
    { name: "Bomba Transferência",   type: "pump",    isOn: false },
    { name: "Cabeça Contra-Pressão", type: "valve",   isOn: false },
    { name: "Injetor CO₂ Envase",    type: "valve",   isOn: false },
  ],
];

// ─── seed ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🌱 BrewMaster AI — seeding database...\n");

  // 0. Clear existing data in dependency order
  console.log("  Clearing existing data...");
  await db.delete(actuatorsTable);
  await db.delete(sensorsTable);
  await db.delete(equipmentTable);
  await db.delete(usersTable);
  await db.delete(recipesTable);

  // 1. Admin user
  console.log("  Creating admin user...");
  await db.insert(usersTable).values({
    name: "Administrador",
    email: "admin@brewmaster.local",
    role: "admin",
  });

  // 2. Equipment + sensors + actuators
  console.log("  Seeding brewery equipment...");
  for (let i = 0; i < EQUIPMENT.length; i++) {
    const eq = EQUIPMENT[i];
    const [inserted] = await db.insert(equipmentTable).values({
      name: eq.name,
      type: eq.type,
      status: "operational",
      connected: true,
      firmwareVersion: eq.firmwareVersion,
      location: eq.location,
    }).returning();

    const sensorDefs = SENSORS[i];
    if (sensorDefs?.length) {
      await db.insert(sensorsTable).values(
        sensorDefs.map(s => ({
          name: s.name,
          type: s.type,
          unit: s.unit,
          currentValue: rnd(s.lo, s.hi, 2),
          minThreshold: s.min,
          maxThreshold: s.max,
          status: "normal" as const,
          equipmentId: inserted.id,
        }))
      );
    }

    const actuatorDefs = ACTUATORS[i];
    if (actuatorDefs?.length) {
      await db.insert(actuatorsTable).values(
        actuatorDefs.map(a => ({
          name: a.name,
          type: a.type,
          isOn: a.isOn ?? false,
          equipmentId: inserted.id,
        }))
      );
    }

    console.log(`    ✔ ${eq.name} — ${sensorDefs.length} sensors, ${actuatorDefs.length} actuators`);
  }

  // 3. Sample recipes
  console.log("\n  Seeding recipes...");
  await db.insert(recipesTable).values([
    {
      name: "Pale Ale Clássica",
      style: "American Pale Ale",
      description: "Cerveja equilibrada com amargor moderado e notas florais de lúpulo. Ideal para o dia-a-dia.",
      boilTimeMins: 60,
      ibu: 35,
      og: 1.052,
      fg: 1.010,
      abv: 5.5,
      srm: 5,
      batchSizeL: 500,
      estimatedCost: 420.0,
      suggestedPrice: 1200.0,
      profitMargin: 65.0,
      malts: "Pale Ale Malt 85kg, Crystal 15L 8kg, Munich 5kg",
      hops: "Cascade 150g 60min, Centennial 100g 10min, Cascade 150g 0min (FO)",
      yeasts: "US-05 American Ale — 2 pacotes hidratados",
      waterProfile: "Ca 75, Mg 5, Na 20, Cl 75, SO4 120 — perfil balanceado",
      mashProfile: "Sacarificação única 67°C/60min, MashOut 78°C/10min",
      fermentationProfile: "18°C por 7 dias, diacetyl rest 20°C 48h",
      maturationProfile: "Crash cooling 2°C/48h",
      carbonation: "2.4 vol CO2 — 3,2 bar a 2°C",
      notes: "Receita base da cervejaria. Replicável com alta consistência.",
    },
    {
      name: "IPA Cítrica Dupla",
      style: "American Double IPA",
      description: "DIPA com explosão de frutas tropicais e amargor assertivo. Alta demanda no verão.",
      boilTimeMins: 75,
      ibu: 70,
      og: 1.075,
      fg: 1.014,
      abv: 8.0,
      srm: 7,
      batchSizeL: 500,
      estimatedCost: 680.0,
      suggestedPrice: 1800.0,
      profitMargin: 62.2,
      malts: "Pale Ale Malt 110kg, Vienna 10kg, Carapils 5kg, Dextrose 5kg (FO)",
      hops: "Magnum 100g 75min, Citra 200g 15min, Mosaic 200g 5min, Citra 300g FO, Mosaic 300g dry-hop",
      yeasts: "WY1056 American Ale — starter 2L",
      waterProfile: "Ca 100, Mg 5, Na 20, Cl 50, SO4 200 — perfil lupulado",
      salts: "CaSO4 8g, CaCl2 3g, NaHCO3 2g",
      mashProfile: "Sacarificação 65°C/90min para maior atenuação, MashOut 78°C/10min",
      fermentationProfile: "19°C por 5 dias, subir para 21°C no 4° dia, diacetyl rest 22°C",
      maturationProfile: "Dry-hop Mosaic 600g por 3 dias a 19°C, crash 2°C/48h",
      carbonation: "2.5 vol CO2 — 3,6 bar a 2°C",
      notes: "Adicionar dry-hop somente após atenuação > 80%. Sensível à oxidação — usar CO2 em todo transfer.",
    },
    {
      name: "Weizen Bávara",
      style: "German Hefeweizen",
      description: "Trigo alemão com banana e cravo. Receita tradicional bavária com perfil de levedura de alta expressividade.",
      boilTimeMins: 60,
      ibu: 14,
      og: 1.050,
      fg: 1.011,
      abv: 5.1,
      srm: 3,
      batchSizeL: 500,
      estimatedCost: 360.0,
      suggestedPrice: 1100.0,
      profitMargin: 67.3,
      malts: "Trigo Pilsner 65kg, Pilsner Malt 28kg, Acidulated Malt 2kg",
      hops: "Hallertau Tradition 80g 60min — apenas caráter suave",
      yeasts: "WY3068 Weihenstephan — fermenta a 17°C para banana dominante, 22°C para cravo",
      waterProfile: "Ca 50, Mg 5, Na 15, Cl 100, SO4 30 — perfil suave para trigo",
      mashProfile: "Proteolítica 52°C/15min, Ferulic acid rest 45°C/20min, Sacarificação 67°C/45min, MashOut 78°C/10min",
      fermentationProfile: "17°C por 4 dias sem perturbação (banana perfil), subir 1°C/dia até 20°C",
      maturationProfile: "4°C por 7 dias — carbonatação natural em tanque",
      carbonation: "3.8 vol CO2 — estilo exige alta carbonatação",
      notes: "NÃO filtrar — levedura em suspensão é característica do estilo. Servir com turvação.",
    },
  ]);
  console.log("    ✔ 3 receitas inseridas");

  // 4. Summary
  console.log(`
✅  Seed concluído!
    Equipment : ${EQUIPMENT.length}
    Sensors   : ${SENSORS.flat().length}
    Actuators : ${ACTUATORS.flat().length}
    Recipes   : 3
    Users     : 1 (Administrador / admin@brewmaster.local)
  `);
}

main()
  .catch(e => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(() => pool.end());
