// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { _createElement } from "simple-jsx-handler";
declare const React: JSX.IntrinsicElements;

import { TypeDefinitionAdditional } from "./types";
import { OBJECTIVE_TYPES } from "./definitions";

function createObjectiveEditor(value: any, onChange: (newValue: any) => void): HTMLElement {
  let currentData = value || { type: "questlog:block_mine" };

  const fieldsContainer = <div class="pl-2 border-l-2 ml-1 mt-2"></div>;

  function renderFields() {
    fieldsContainer.innerHTML = "";
    const definition = OBJECTIVE_TYPES.find(d => d.type === currentData.type);

    if (definition && definition.additional) {
      definition.additional.forEach(fieldDef => {
        const field = createField(
          fieldDef,
          key => currentData[key],
          (key, val) => {
            currentData[key] = val;
            onChange(currentData);
          }
        );
        fieldsContainer.appendChild(field);
      });
    }
  }

  const typeSelect = (
    <select
      class="form-select"
      on:change={() => {
        currentData = { type: typeSelect.value, total: currentData.total || 1 };
        onChange(currentData);
        renderFields();
      }}
    >
      {...OBJECTIVE_TYPES.map(def => <option value={def.type}>{def.type.replace("questlog:", "")}</option>)}
    </select>
  );

  if (currentData.type) {
    typeSelect.value = currentData.type;
  }

  const totalInput = (
    <input
      class="form-input"
      type="text"
      value={currentData.total || 1}
      on:input={() => {
        currentData.total = Number(totalInput.value) || 1;
        onChange(currentData);
      }}
    />
  );

  renderFields();

  return (
    <div class="card p-2 bg-gray-50 mb-2">
      <div class="form-group">
        <div class="input-group">
          <span class="input-group-addon min-w-5em text-right">Type</span>
          {typeSelect}
        </div>
      </div>
      <div class="form-group">
        <div class="input-group">
          <span class="input-group-addon min-w-5em text-right">Amount</span>
          {totalInput}
        </div>
      </div>
      {fieldsContainer}
    </div>
  );
}

function createObjectiveListEditor(list: any[], onChange: (newList: any[]) => void): HTMLElement {
  const container = <div class="objective-list"></div>;
  const currentList = Array.isArray(list) ? [...list] : [];

  function render() {
    container.innerHTML = "";

    currentList.forEach((obj, index) => {
      const row = (
        <div class="d-flex mb-2 align-items-start objective-list-row">
          <div style="flex-grow: 1">
            {createObjectiveEditor(obj, newVal => {
              currentList[index] = newVal;
              onChange(currentList);
            })}
          </div>
          <button
            class="btn btn-action btn-error objective-delete-btn"
            on:click={() => {
              currentList.splice(index, 1);
              onChange(currentList);
              render();
            }}
          >
            X
          </button>
        </div>
      );
      container.appendChild(row);
    });

    const addButton = (
      <button
        class="btn btn-sm btn-primary mt-2"
        on:click={() => {
          currentList.push({ type: "questlog:block_mine", block: "minecraft:stone", total: 1 });
          onChange(currentList);
          render();
        }}
      >
        + Add Objective
      </button>
    );
    container.appendChild(addButton);
  }

  render();
  return container;
}

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
      input.value = initial as string;
    } else if (definition.default) {
      input.value = definition.default as string;
    }

    inputs.push(input);

    if (definition.autocomplete) {
      const list = createAutocomplete(input, definition.autocomplete, value => {
        input.value = value;
        setter(definition.key, value);
      });
      inputs.push(list);
    }
  } else if (definition.type === "select") {
    const input = (
      <select class="form-select" on:change={() => setter(definition.key, input.value)}>
        {...definition.options.map(option => <option value={option}>{option}</option>)}
      </select>
    );

    const initial = initialGetter(definition.key);
    if (initial !== undefined) {
      input.value = initial as string;
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
          input.value = (initial as any).item;
          select.value = "item";
        }

        if ("texture" in initial) {
          input.value = (initial as any).texture;
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
      input.value = initial as string;
    } else if (definition.default) {
      input.value = definition.default as string;
    }

    inputs.push(input);
  } else if (definition.type === "objective") {
    const initial = initialGetter(definition.key) || definition.default;
    const editor = createObjectiveEditor(initial, newValue => {
      setter(definition.key, newValue);
    });
    inputs.push(editor);
  } else if (definition.type === "objective_list") {
    const initial = (initialGetter(definition.key) as any[]) || (definition.default as any[]);
    const listEditor = createObjectiveListEditor(initial, newList => {
      setter(definition.key, newList);
    });
    inputs.push(listEditor);
  } else if (definition.type === "json") {
    const input = (
      <textarea
        class="form-input"
        style="font-family: monospace; min-height: 8rem;"
        on:input={() => {
          try {
            if (input.value) {
              const parsed = JSON.parse(input.value);
              setter(definition.key, parsed);
              input.style.borderColor = "";
            } else {
              setter(definition.key, null);
              input.style.borderColor = "";
            }
          } catch (e) {
            input.style.borderColor = "#d73a49";
          }
        }}
      ></textarea>
    );

    const initial = initialGetter(definition.key);
    if (initial !== undefined) {
      input.value = JSON.stringify(initial, null, 2);
    } else if (definition.default) {
      input.value = JSON.stringify(definition.default, null, 2);
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

export function createAutocomplete(
  input: HTMLInputElement,
  options: string[],
  setter: (value: string) => void
): HTMLElement {
  const list: HTMLUListElement = <ul class="menu autocomplete"></ul>;

  function hide() {
    list.style.display = "none";
  }

  function show() {
    list.style.display = "block";
    setStyle();
  }

  input.addEventListener("input", () => {
    if (!input.value) {
      hide();
      return;
    }

    list.innerHTML = "";

    const value = input.value.toLowerCase();
    const filtered = options
      .filter(option => option.toLowerCase().includes(value))
      .sort((a, b) => {
        // First show the ones that start with the value
        const aStartsWith = a.toLowerCase().startsWith(value);
        const bStartsWith = b.toLowerCase().startsWith(value);
        if (aStartsWith && !bStartsWith) {
          return -1;
        } else if (!aStartsWith && bStartsWith) {
          return 1;
        }

        // Then show the ones that contain the value (sorted by how soon the value appears)
        const aIndex = a.toLowerCase().indexOf(value);
        const bIndex = b.toLowerCase().indexOf(value);

        if (aIndex < bIndex) {
          return -1;
        } else if (aIndex > bIndex) {
          return 1;
        }

        // Then sort alphabetically
        return a.localeCompare(b);
      })
      .slice(0, 100);

    if (filtered.length === 0) {
      hide();
      return;
    } else {
      show();
    }

    for (const option of filtered) {
      const item: HTMLLIElement = (
        <li class="menu-item">
          <a href="#">{option}</a>
        </li>
      );
      item.addEventListener("click", e => {
        e.preventDefault();
        setter(option);
        hide();
      });
      list.appendChild(item);
    }

    console.log({ [value]: filtered, length: list.childNodes.length });

    setStyle();
  });

  function setStyle() {
    list.style.width = input.clientWidth + "px";
    list.style.left = input.offsetLeft + "px";
    list.style.top = input.offsetTop + input.clientHeight + "px";
  }

  window.addEventListener("resize", function resize() {
    if (!list.isConnected) {
      window.removeEventListener("resize", resize);
      return;
    }

    setStyle();
  });

  function handleNav(e: KeyboardEvent) {
    if (list.style.display === "none" || list.childNodes.length === 0) {
      return;
    }

    const key = e.key;
    const hasShift = e.shiftKey;
    // Focused item
    let current = document.activeElement as HTMLElement | null;
    if (!list.contains(current)) {
      console.log("current not in list");
      current = null;
    } else {
      if (current?.tagName !== "A") {
        current = current?.querySelector("a") || null;
      }
    }

    console.log("current:", current);

    if (key === "ArrowDown" || (key == "Tab" && !hasShift)) {
      e.preventDefault();
      if (!current) {
        (list.firstChild?.firstChild as HTMLElement).focus();
      } else {
        const next = current.parentElement?.nextElementSibling?.firstChild as HTMLElement;
        if (next) {
          console.log("next:", next);
          next.focus();
        }
      }
    } else if (key === "ArrowUp" || (key == "Tab" && hasShift)) {
      e.preventDefault();
      if (!current) {
        (list.lastChild?.firstChild as HTMLElement).focus();
      } else {
        const prev = current.parentElement?.previousElementSibling?.firstChild as HTMLElement;
        if (prev) {
          console.log("prev:", prev);
          prev.focus();
        }
      }
    } else if (key === "Enter") {
      e.preventDefault();
      if (current) {
        setter(current.textContent || "");
        hide();
      }
    }
  }

  input.addEventListener("keydown", handleNav);
  list.addEventListener("keydown", handleNav);

  hide();

  return list;
}
