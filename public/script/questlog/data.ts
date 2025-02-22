export const BIOMES: string[] = [];
export const BLOCKS_TAGS: string[] = [];
export const BLOCKS: string[] = [];
export const DIMENSIONS: string[] = [];
export const EFFECTS: string[] = [];
export const ENCHANTMENTS: string[] = [];
// export const ENTITIES_TAGS: string[] = [];
export const ENTITIES: string[] = [];
export const ITEMS_TAGS: string[] = [];
export const ITEMS: string[] = [];
export const SOUNDS: string[] = [];
export const STATS: string[] = [];
export const LOOT_TABLES: string[] = [];
function fetchAndAppend(url: string, array: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then(response => response.json())
      .then((data: string[]) => {
        array.push(...data);
        resolve();
      })
      .catch(reject);
  });
}

fetchAndAppend("./assets/data/blocks.json", BLOCKS).then(() => BLOCKS_TAGS.push(...BLOCKS));
fetchAndAppend("./assets/data/entities.json", ENTITIES) /*.then(() => ENTITIES_TAGS.push(...ENTITIES))*/;
fetchAndAppend("./assets/data/items.json", ITEMS).then(() => ITEMS_TAGS.push(...ITEMS));
fetchAndAppend("./assets/data/biomes.json", BIOMES);
fetchAndAppend("./assets/data/dimensions.json", DIMENSIONS);
fetchAndAppend("./assets/data/effects.json", EFFECTS);
fetchAndAppend("./assets/data/enchantments.json", ENCHANTMENTS);
fetchAndAppend("./assets/data/loot_tables.json", LOOT_TABLES);
fetchAndAppend("./assets/data/sounds.json", SOUNDS);
fetchAndAppend("./assets/data/stats.json", STATS);
