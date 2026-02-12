// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { _createElement, _fragment } from "simple-jsx-handler";
declare const React: JSX.IntrinsicElements;

import {
  BIOMES,
  BLOCKS_TAGS,
  DIMENSIONS,
  EFFECTS,
  ENCHANTMENTS,
  ENTITIES,
  ITEMS,
  ITEMS_TAGS,
  LOOT_TABLES,
  STATS,
} from "./data";
import { TypeDefinition } from "./types";

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
  {
    type: "questlog:not",
    description: <>Inverts the completion status of a child objective.</>,
    additional: [
      {
        key: "objective",
        name: "Condition",
        description: <>The objective logic to invert.</>,
        type: "objective",
        optional: false,
        default: {
          type: "questlog:block_mine",
          block: "minecraft:stone",
        },
      },
    ],
  },
  {
    type: "questlog:or",
    description: (
      <>
        Completes if <b>any</b> of the child objectives are completed.
      </>
    ),
    additional: [
      {
        key: "objectives",
        name: "Conditions",
        description: <>The list of alternative conditions.</>,
        type: "objective_list",
        optional: false,
        default: [
          { type: "questlog:block_mine", block: "minecraft:stone" },
          { type: "questlog:block_mine", block: "minecraft:dirt" },
        ],
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
