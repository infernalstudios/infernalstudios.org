// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { _createElement, _fragment } from "simple-jsx-handler";

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
  | TypeDefinitionAdditionalTextArea
  | TypeDefinitionAdditionalJson
  | TypeDefinitionAdditionalObjective
  | TypeDefinitionAdditionalObjectiveList;

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

export interface TypeDefinitionAdditionalJson extends TypeDefinitionAdditionalBase {
  type: "json";
  default?: unknown;
}

export interface TypeDefinitionAdditionalObjective extends TypeDefinitionAdditionalBase {
  type: "objective";
  default?: object;
}

export interface TypeDefinitionAdditionalObjectiveList extends TypeDefinitionAdditionalBase {
  type: "objective_list";
  default?: object[];
}

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
