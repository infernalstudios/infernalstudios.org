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
  requirements: Objective[];
  objectives: Objective[];
  rewards: Reward[];
  title: string;
  description: string | object | any[];
  sort_order?: number;
  icon?: Renderable;
  translatable?: boolean;
  chapter?: string;
  include_in_main?: boolean;
  hidden?: boolean;
  completed_sound?: ResourceLocation;
  triggered_sound?: ResourceLocation;
  toast_on_unlock?: boolean;
  toast_on_complete?: boolean;
  show_popup_on_unlock?: boolean;
  background_texture?: ResourceLocation;
  right_panel_texture?: ResourceLocation;
  overlay?: ResourceLocation;
  left_panel_width?: number;
  right_panel_width?: number;
  panel_height?: number;
  left_panel_x_offset?: number;
  left_panel_y_offset?: number;
  right_panel_x_offset?: number;
  right_panel_y_offset?: number;
  back_button_text?: string;
  collect_button_text?: string;
  uncollected_text?: string;
  collected_text?: string;
  text_color?: string;
  completed_text_color?: string;
  hovered_text_color?: string;
  title_color?: string;
  progress_text_color?: string;
}

export interface Chapter {
  icon?: Renderable;
  order?: number;
  default_chapter?: boolean;
  hidden?: boolean;
}

export interface Objective {
  type: ResourceLocation;
  total?: number;
  display?: ObjectiveDisplay;
}

export interface Reward {
  type: ResourceLocation;
  auto_claim?: boolean;
  display?: RewardDisplay;
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

export interface RewardSoundOptions {
  claimed?: ResourceLocation;
}

export type ResourceLocation = string;

export type Renderable = Texture | Item;

export interface Texture {
  texture: ResourceLocation;
}

export interface Item {
  item: ResourceLocation;
}
