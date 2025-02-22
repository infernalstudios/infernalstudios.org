// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { _createElement, _fragment } from "simple-jsx-handler";
import {
  BIOMES,
  BLOCKS_TAGS,
  DIMENSIONS,
  EFFECTS,
  ENCHANTMENTS,
  ENTITIES,
  ITEMS,
  ITEMS_TAGS,
  STATS,
  LOOT_TABLES,
} from "./data";
declare const React: JSX.IntrinsicElements;

export interface TypeDefinition {
  type: string;
  description: string | HTMLElement;
  additional?: Exclude<TypeDefinitionAdditional, TypeDefinitionAdditionalIconInput>[];
}

export type TypeDefinitionAdditional =
  | TypeDefinitionAdditionalInput
  | TypeDefinitionAdditionalSelect
  | TypeDefinitionAdditionalSwitch
  | TypeDefinitionAdditionalIconInput
  | TypeDefinitionAdditionalTextArea;

interface TypeDefinitionAdditionalBase {
  key: string;
  name: string;
  description: string | HTMLElement;
  optional: boolean;
}

export interface TypeDefinitionAdditionalInput extends TypeDefinitionAdditionalBase {
  type: "input";
  isNumber?: boolean;
  autocomplete?: string[];
  default?: string;
}

export interface TypeDefinitionAdditionalTextArea extends TypeDefinitionAdditionalBase {
  type: "textarea";
  default?: string;
}

export interface TypeDefinitionAdditionalIconInput extends TypeDefinitionAdditionalBase {
  type: "icon";
  default?: string;
}

export interface TypeDefinitionAdditionalSelect extends TypeDefinitionAdditionalBase {
  type: "select";
  options: string[];
  default?: string;
}

export interface TypeDefinitionAdditionalSwitch extends TypeDefinitionAdditionalBase {
  type: "boolean";
  default?: boolean;
}

export const OBJECTIVE_TYPES: TypeDefinition[] = [
  {
    type: "questlog:stat",
    description: <>Uses the player's statistics to track progress</>,
    additional: [
      {
        key: "stat",
        name: "Statistic",
        optional: false,
        type: "input",
        description: <>The statistic to track</>,
        autocomplete: STATS,
      },
      {
        key: "trackSinceStart",
        name: "Should track since start?",
        optional: true,
        type: "boolean",
        description: (
          <>
            If <code>true</code>, the stat's value will be tracked since the creation of the quest.
            <br />
            If <code>false</code>, the stat's value will be the player's total stat value.
          </>
        ),
      },
    ],
  },
  {
    type: "questlog:quest_complete",
    description: <>Tracks this quest to be completed, useful for adding dependency quests.</>,
    additional: [
      {
        key: "quest",
        name: "Quest",
        description: <>The quest to track</>,
        type: "input",
        optional: false,
      },
    ],
  },
  {
    type: "questlog:block_mine",
    description: <>Tracks the number of blocks mined by the player</>,
    additional: [
      {
        key: "block",
        name: "Block",
        description: (
          <>
            The block to track.
            <br />
            May be the block itself or a tag prefixed with <code>#</code>.
          </>
        ),
        type: "input",
        optional: false,
        autocomplete: BLOCKS_TAGS,
      },
    ],
  },
  {
    type: "questlog:block_place",
    description: <>Tracks the number of blocks placed by the player</>,
    additional: [
      {
        key: "block",
        name: "Block",
        description: (
          <>
            The block to track.
            <br />
            May be the block itself or a tag prefixed with <code>#</code>.
          </>
        ),
        type: "input",
        optional: false,
        autocomplete: BLOCKS_TAGS,
      },
    ],
  },
  {
    type: "questlog:entity_approach",
    description: <>Tracks the number of times the player approaches a specific entity</>,
    additional: [
      {
        key: "entity",
        name: "Entity",
        description: <>The entity to track.</>,
        type: "input",
        optional: false,
        autocomplete: ENTITIES,
      },
      {
        key: "range",
        name: "Range",
        description: <>The range to track the entity in</>,
        type: "input",
        isNumber: true,
        optional: false,
      },
    ],
  },
  {
    type: "questlog:entity_breed",
    description: <>Tracks the number of times the player breeds entities</>,
    additional: [
      {
        key: "entity",
        name: "Entity",
        description: <>The entity to track.</>,
        type: "input",
        optional: false,
        autocomplete: ENTITIES,
      },
    ],
  },
  {
    type: "questlog:entity_death",
    description: <>Tracks the number of times the player dies to a specific entity</>,
    additional: [
      {
        key: "entity",
        name: "Entity",
        description: <>The entity to track.</>,
        type: "input",
        optional: false,
        autocomplete: ENTITIES,
      },
    ],
  },
  {
    type: "questlog:entity_kill",
    description: <>Tracks the number of a specific export type of entity the player kills</>,
    additional: [
      {
        key: "entity",
        name: "Entity",
        description: <>The entity to track.</>,
        type: "input",
        optional: false,
        autocomplete: ENTITIES,
      },
    ],
  },
  {
    type: "questlog:item_craft",
    description: <>Tracks the number of a specific item the player crafts</>,
    additional: [
      {
        key: "item",
        name: "Item",
        description: (
          <>
            The item to track.
            <br />
            May be the item itself or a tag prefixed with <code>#</code>.
          </>
        ),
        type: "input",
        optional: false,
        autocomplete: ITEMS_TAGS,
      },
    ],
  },
  {
    type: "questlog:item_drop",
    description: <>Tracks the number of a specific item the player drops</>,
    additional: [
      {
        key: "item",
        name: "Item",
        description: (
          <>
            The item to track.
            <br />
            May be the item itself or a tag prefixed with <code>#</code>.
          </>
        ),
        type: "input",
        optional: false,
        autocomplete: ITEMS_TAGS,
      },
    ],
  },
  {
    type: "questlog:item_equip",
    description: <>Tracks the number of times the player equips a specific item</>,
    additional: [
      {
        key: "item",
        name: "Item",
        description: (
          <>
            The item to track.
            <br />
            May be the item itself or a tag prefixed with <code>#</code>.
          </>
        ),
        type: "input",
        optional: false,
        autocomplete: ITEMS_TAGS,
      },
      {
        key: "slot",
        name: "Slot",
        description: <>The slot to track.</>,
        type: "select",
        optional: false,
        options: ["mainhand", "offhand", "feet", "legs", "chest", "head"],
      },
    ],
  },
  {
    type: "questlog:item_obtain",
    description: <>Tracks the number of a specific item the player has in their inventory</>,
    additional: [
      {
        key: "item",
        name: "Item",
        description: (
          <>
            The item to track.
            <br />
            May be the item itself or a tag prefixed with <code>#</code>.
          </>
        ),
        type: "input",
        optional: false,
        autocomplete: ITEMS_TAGS,
      },
    ],
  },
  {
    type: "questlog:item_pickup",
    description: <>Tracks the number of a specific item the player picks up</>,
    additional: [
      {
        key: "item",
        name: "Item",
        description: (
          <>
            The item to track.
            <br />
            May be the item itself or a tag prefixed with <code>#</code>.
          </>
        ),
        type: "input",
        optional: false,
        autocomplete: ITEMS_TAGS,
      },
    ],
  },
  {
    type: "questlog:item_use",
    description: <>Tracks the number of times the player uses a specific item</>,
    additional: [
      {
        key: "item",
        name: "Item",
        description: (
          <>
            The item to track.
            <br />
            May be the item itself or a tag prefixed with <code>#</code>.
          </>
        ),
        type: "input",
        optional: false,
        autocomplete: ITEMS_TAGS,
      },
    ],
  },
  {
    type: "questlog:visit_biome",
    description: <>Tracks the number of times the player visits a specific biome</>,
    additional: [
      {
        key: "biome",
        name: "Biome",
        description: <>The biome to track.</>,
        type: "input",
        optional: false,
        autocomplete: BIOMES,
      },
    ],
  },
  {
    type: "questlog:visit_dimension",
    description: <>Tracks the number of times the player visits a specific dimension</>,
    additional: [
      {
        key: "dimension",
        name: "Dimension",
        description: <>The dimension to track.</>,
        type: "input",
        optional: false,
        autocomplete: DIMENSIONS,
      },
    ],
  },
  {
    type: "questlog:trample",
    description: <>Tracks the number of times the player tramples farmland</>,
  },
  {
    type: "questlog:effect_added",
    description: <>Tracks the number of times the player gains a specific effect</>,
    additional: [
      {
        key: "effect",
        name: "Effect",
        description: <>The effect to track.</>,
        type: "input",
        optional: false,
        autocomplete: EFFECTS,
      },
    ],
  },
  {
    type: "questlog:enchant",
    description: <>Tracks the number of times the player enchants an item with a specific enchantment</>,
    additional: [
      {
        key: "enchantment",
        name: "Enchantment",
        description: (
          <>
            The enchantment to track.
            <br />
            If not specified, the stat will track any enchantment.
          </>
        ),
        type: "input",
        optional: true,
        autocomplete: ENCHANTMENTS,
      },
      {
        key: "level",
        name: "Level",
        description: <>The minimum level of the enchantment to track</>,
        type: "input",
        isNumber: true,
        optional: true,
        default: "1",
      },
      {
        key: "item",
        name: "Item",
        description: (
          <>
            The item to track.
            <br />
            If not specified, the stat will track any item.
          </>
        ),
        type: "input",
        optional: true,
        autocomplete: ITEMS,
      },
    ],
  },
];

export const REWARD_TYPES: TypeDefinition[] = [
  {
    type: "questlog:item",
    description: <>Gives the player an item</>,
    additional: [
      {
        key: "item",
        name: "Item",
        description: <>The item to give the player</>,
        type: "input",
        optional: false,
        autocomplete: ITEMS,
      },
      {
        key: "count",
        name: "Amount",
        description: <>The amount of the item to give the player</>,
        default: "1",
        type: "input",
        isNumber: true,
        optional: true,
      },
    ],
  },
  {
    type: "questlog:command",
    description: <>Runs a command as the player</>,
    additional: [
      {
        key: "command",
        name: "Command",
        description: <>The command to run</>,
        type: "input",
        optional: false,
      },
      {
        key: "permission_level",
        name: "Permission Level",
        description: (
          <>
            The command's permission level, when ran as the player.
            <br />
            The player doesn't need to have this permission level, be careful!
          </>
        ),
        default: "2",
        type: "input",
        isNumber: true,
        optional: true,
      },
    ],
  },
  {
    type: "questlog:experience",
    description: <>Gives the player experience</>,
    additional: [
      {
        key: "experience",
        name: "XP",
        description: <>The amount of experience to give the player</>,
        type: "input",
        isNumber: true,
        optional: false,
      },
      {
        key: "level",
        name: "Should give levels?",
        description: <>Whether to give the player levels instead of points</>,
        type: "boolean",
        optional: true,
      },
    ],
  },
  {
    type: "questlog:loot_table",
    description: <>Gives the player loot from a loot table</>,
    additional: [
      {
        key: "loot_table",
        name: "Loot Table",
        description: <>The loot table to give the player</>,
        type: "input",
        optional: false,
        autocomplete: LOOT_TABLES,
      },
    ],
  },
];

export interface Quest {
  triggers: Objective[];
  objectives: Objective[];
  rewards: Reward[];
  display: QuestDisplay;
}

export interface Objective {
  type: ResourceLocation;
  total: number;
  display?: ObjectiveDisplay;
}

export interface Reward {
  type: ResourceLocation;
  instant?: boolean;
  display?: RewardDisplay;
}

export interface QuestDisplay {
  title: string;
  description: string;
  icon?: Renderable;
  translatable?: boolean;
  sound?: QuestSoundOptions;
  style?: StyleOptions;
  notification?: NotificationOptions;
  hidden?: boolean;
}

export interface ObjectiveDisplay {
  name: string;
  icon?: Renderable;
  translatable?: boolean;
}

export interface RewardDisplay {
  name: string;
  icon?: Renderable;
  translatable?: boolean;
  sound?: RewardSoundOptions;
}

export interface StyleOptions {
  peripheral?: Texture;
  background?: Texture;
  buttonText?: string;
  textColor: string;
  completedTextColor: string;
  hoveredTextColor: string;
  titleColor: string;
  progressTextColor: string;
}

export interface QuestSoundOptions {
  completed?: ResourceLocation;
  triggered?: ResourceLocation;
}

export interface RewardSoundOptions {
  claimed?: ResourceLocation;
}

export interface NotificationOptions {
  toastOnTrigger?: boolean;
  toastOnComplete?: boolean;
  popup?: boolean;
}

export type ResourceLocation = string;

export type Renderable = Texture | Item;

export interface Texture {
  texture: ResourceLocation;
}

export interface Item {
  item: ResourceLocation;
}
