export type DeliveryZone = 'S' | 'A' | 'B' | 'C' | 'D' | 'E';

export interface DeliveryZoneInfo {
  zone: DeliveryZone;
  name: string;
  description: string;
  fee: number;
}

export const DELIVERY_ZONES: Record<DeliveryZone, DeliveryZoneInfo> = {
  S: { zone: 'S', name: 'Super Local', description: 'Mesmo bairro da adega (até ~1 km)', fee: 4.00 },
  A: { zone: 'A', name: 'Muito Próximos', description: 'Bairros imediatamente ao redor', fee: 6.90 },
  B: { zone: 'B', name: 'Próximos', description: 'Raio aproximado 2-4 km', fee: 8.90 },
  C: { zone: 'C', name: 'Médios', description: 'Raio aproximado 4-6 km', fee: 11.90 },
  D: { zone: 'D', name: 'Mais Distantes', description: 'Regiões de médio-longo alcance 6-8 km', fee: 14.90 },
  E: { zone: 'E', name: 'Limite / Padrão', description: 'Regiões distantes, fora do raio padrão', fee: 19.90 },
};

export interface Neighborhood {
  name: string;
  zone: DeliveryZone;
}

export const NEIGHBORHOODS: Neighborhood[] = [
  // GRUPO S – SUPER LOCAL (R$ 4,00)
  { name: 'Vila da Saúde', zone: 'S' },

  // GRUPO A – MUITO PRÓXIMOS (R$ 6,90)
  { name: 'Saúde', zone: 'A' },
  { name: 'Bosque da Saúde', zone: 'A' },
  { name: 'Mirandópolis', zone: 'A' },
  { name: 'Vila Clementino', zone: 'A' },
  { name: 'Chácara Inglesa', zone: 'A' },
  { name: 'Planalto Paulista', zone: 'A' },
  { name: 'Vila Monte Alegre', zone: 'A' },
  { name: 'Vila Guarani (ZS)', zone: 'A' },
  { name: 'Vila Caraguatá', zone: 'A' },
  { name: 'Vila das Mercês (parte alta)', zone: 'A' },
  { name: 'Jardim Oriental', zone: 'A' },
  { name: 'Jardim Aeroporto (parte norte)', zone: 'A' },
  { name: 'Vila Fachini', zone: 'A' },
  { name: 'Vila Santa Catarina (parte alta)', zone: 'A' },

  // GRUPO B – PRÓXIMOS (R$ 8,90)
  { name: 'Vila Mariana', zone: 'B' },
  { name: 'Chácara Klabin', zone: 'B' },
  { name: 'Vila Gumercindo', zone: 'B' },
  { name: 'Vila Caravelas', zone: 'B' },
  { name: 'Vila Brasilina', zone: 'B' },
  { name: 'Cursino', zone: 'B' },
  { name: 'Sacomã', zone: 'B' },
  { name: 'Vila Liviero', zone: 'B' },
  { name: 'São João Clímaco', zone: 'B' },
  { name: 'Jardim Celeste', zone: 'B' },
  { name: 'Jardim da Glória', zone: 'B' },
  { name: 'Jardim Previdência', zone: 'B' },
  { name: 'Jardim Clímax', zone: 'B' },
  { name: 'Jardim Patente', zone: 'B' },
  { name: 'Vila Moraes', zone: 'B' },
  { name: 'Vila Firmiano Pinto', zone: 'B' },
  { name: 'Vila Monumento', zone: 'B' },
  { name: 'Ipiranga (parte oeste)', zone: 'B' },
  { name: 'Jardim Sandra', zone: 'B' },
  { name: 'Jardim Santa Cruz (ZS)', zone: 'B' },
  { name: 'Alto do Ipiranga', zone: 'B' },

  // GRUPO C – MÉDIOS (R$ 11,90)
  { name: 'Jabaquara', zone: 'C' },
  { name: 'Cidade Vargas', zone: 'C' },
  { name: 'Americanópolis', zone: 'C' },
  { name: 'Vila Mascote', zone: 'C' },
  { name: 'Brooklin Novo (lado norte)', zone: 'C' },
  { name: 'Campo Belo (parte inicial)', zone: 'C' },
  { name: 'Moema', zone: 'C' },
  { name: 'Cambuci', zone: 'C' },
  { name: 'Aclimação', zone: 'C' },
  { name: 'Liberdade', zone: 'C' },
  { name: 'Ipiranga (parte leste)', zone: 'C' },
  { name: 'Vila Prudente', zone: 'C' },
  { name: 'Vila Alpina (parte alta)', zone: 'C' },
  { name: 'Vila Zelina', zone: 'C' },
  { name: 'Vila Bela', zone: 'C' },
  { name: 'Vila Ema', zone: 'C' },
  { name: 'Parque da Mooca', zone: 'C' },
  { name: 'Jardim Avelino', zone: 'C' },

  // GRUPO D – MAIS DISTANTES (R$ 14,90)
  { name: 'Heliópolis', zone: 'D' },
  { name: 'Parque Bristol', zone: 'D' },
  { name: 'Parque Fongaro', zone: 'D' },
  { name: 'Jardim Patente (leste)', zone: 'D' },
  { name: 'Vila Arapuá', zone: 'D' },
  { name: 'São João Clímaco profundo', zone: 'D' },
  { name: 'Vila São José (IP)', zone: 'D' },
  { name: 'Vila Carioca', zone: 'D' },
  { name: 'Vila Independência', zone: 'D' },
  { name: 'Mooca (parte leste)', zone: 'D' },
  { name: 'Tatuapé (parte oeste)', zone: 'D' },
  { name: 'Água Rasa', zone: 'D' },
  { name: 'Parque São Lucas', zone: 'D' },
  { name: 'Jardim Independência', zone: 'D' },
  { name: 'Sapopemba (regiões próximas)', zone: 'D' },

  // GRUPO E – LIMITE / PADRÃO (R$ 19,90)
  { name: 'Brás', zone: 'E' },
  { name: 'Bela Vista', zone: 'E' },
  { name: 'Centro', zone: 'E' },
  { name: 'Sé', zone: 'E' },
  { name: 'Consolação', zone: 'E' },
  { name: 'Santa Cecília', zone: 'E' },
  { name: 'República', zone: 'E' },
  { name: 'Bom Retiro', zone: 'E' },
  { name: 'Barra Funda', zone: 'E' },
  { name: 'Brooklin Inteiro', zone: 'E' },
  { name: 'Santo Amaro', zone: 'E' },
  { name: 'Campo Grande', zone: 'E' },
  { name: 'Socorro', zone: 'E' },
  { name: 'Moema (parte profunda)', zone: 'E' },
  { name: 'Itaim Bibi', zone: 'E' },
  { name: 'Vila Olímpia', zone: 'E' },
  { name: 'Pinheiros', zone: 'E' },
  { name: 'Vila Madalena', zone: 'E' },
  { name: 'Perdizes', zone: 'E' },
  { name: 'Lapa', zone: 'E' },
  { name: 'Santana', zone: 'E' },
  { name: 'Tatuapé (profundo)', zone: 'E' },
  { name: 'São Caetano do Sul (borda)', zone: 'E' },
  { name: 'Diadema (borda da divisa)', zone: 'E' },
];

export function getDeliveryFeeByNeighborhood(neighborhood: string): number | null {
  const found = NEIGHBORHOODS.find(n => 
    n.name.toLowerCase() === neighborhood.toLowerCase()
  );
  if (!found) return null;
  return DELIVERY_ZONES[found.zone].fee;
}

export function getZoneByNeighborhood(neighborhood: string): DeliveryZoneInfo | null {
  const found = NEIGHBORHOODS.find(n => 
    n.name.toLowerCase() === neighborhood.toLowerCase()
  );
  if (!found) return null;
  return DELIVERY_ZONES[found.zone];
}

export function getNeighborhoodsByZone(zone: DeliveryZone): Neighborhood[] {
  return NEIGHBORHOODS.filter(n => n.zone === zone);
}

export function getGroupedNeighborhoods(): Record<DeliveryZone, Neighborhood[]> {
  return {
    S: getNeighborhoodsByZone('S'),
    A: getNeighborhoodsByZone('A'),
    B: getNeighborhoodsByZone('B'),
    C: getNeighborhoodsByZone('C'),
    D: getNeighborhoodsByZone('D'),
    E: getNeighborhoodsByZone('E'),
  };
}

export const DELIVERY_FEE_WARNING = "Atenção: Se o bairro informado estiver incorreto, a taxa de entrega será recalculada pela nossa equipe antes do envio.";
