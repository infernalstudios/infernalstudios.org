// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { _createElement } from "simple-jsx-handler";
declare const React: JSX.IntrinsicElements;

import { TypeDefinitionAdditional } from "./types";

export function createField(
  definition: TypeDefinitionAdditional,
  initialGetter: (key: string) => unknown | undefined,
  setter: (key: string, value: unknown | null) => void
): HTMLElement {
  const inputs: HTMLElement[] = [];
  if (definition.type === "input") {
    const input = (
      <input
        class="form-input"
        type="text"
        on:input={() => {
          if (input.value && input.value !== definition.default) {
            setter(definition.key, definition.isNumber ? Number(input.value) || null : input.value);
          } else {
            setter(definition.key, null);
          }
        }}
      ></input>
    );

    const initial = initialGetter(definition.key);
    if (initial !== undefined) {
      input.value = initial;
    } else if (definition.default) {
      input.value = definition.default;
    }

    inputs.push(input);
  } else if (definition.type === "select") {
    const input = (
      <select class="form-select" on:change={() => setter(definition.key, input.value)}>
        {...definition.options.map(option => <option value={option}>{option}</option>)}
      </select>
    );

    const initial = initialGetter(definition.key);
    if (initial !== undefined) {
      input.value = initial;
      setter(definition.key, initial);
    }

    inputs.push(input);
  } else if (definition.type === "icon") {
    const input = (
      <input
        class="form-input"
        type="text"
        on:input={() => {
          if (select.value === "item" || select.value === "texture") {
            setter(definition.key, { [select.value]: input.value });
          }
        }}
      ></input>
    );

    const select = (
      <select
        class="form-select"
        style="flex-grow: unset"
        on:change={() => {
          if (input.value) {
            setter(definition.key, { [select.value]: input.value });
          }
        }}
      >
        <option value="item">Item</option>
        <option value="texture">Texture</option>
      </select>
    );

    const initial = initialGetter(definition.key);
    if (initial !== undefined) {
      if (typeof initial === "object" && initial !== null) {
        if ("item" in initial) {
          input.value = initial.item;
          select.value = "item";
        }

        if ("texture" in initial) {
          input.value = initial.texture;
          select.value = "texture";
        }
      }
    }

    inputs.push(input, select);
  } else if (definition.type === "boolean") {
    const input = (
      <select class="form-select" on:change={() => setter(definition.key, input.value === "true")}>
        <option value="true">True</option>
        <option value="false">False</option>
      </select>
    );

    const initial = initialGetter(definition.key);
    if (initial !== undefined) {
      input.value = String(initial);
      setter(definition.key, initial === "true" || initial === true);
    }

    inputs.push(input);
  } else if (definition.type === "textarea") {
    const input = (
      <textarea
        class="form-input"
        on:input={() => {
          if (input.value && input.value !== definition.default) {
            setter(definition.key, input.value);
          } else {
            setter(definition.key, null);
          }
        }}
      ></textarea>
    );

    const initial = initialGetter(definition.key);
    if (initial !== undefined) {
      input.value = initial;
    } else if (definition.default) {
      input.value = definition.default;
    }

    inputs.push(input);
  } else {
    const input = <input class="form-input disabled" type="text" disabled></input>;
    input.value = "Error in definition! Report this to the developer.";

    inputs.push(input);
  }

  return (
    <div class="form-group">
      <div class="input-group">
        <span class="input-group-addon min-w-5em text-right">{definition.name}</span>
        {...inputs}
        <div class="input-group-addon popover popover-right">
          <div class="noselect">?</div>
          <div class="popover-container card p-0">
            <div class="card-body ws-collapse" id="tooltip">
              {definition.description}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
