// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { _createElement, _fragment } from "simple-jsx-handler";
declare const React: JSX.IntrinsicElements;

import { Objective, ObjectiveDisplay, Quest, Chapter, Renderable, Reward, RewardDisplay } from "./questlog/types";
import { OBJECTIVE_TYPES, REWARD_TYPES } from "./questlog/definitions";
import { createField } from "./questlog/field";
import { removeNode } from "./util";
import { SOUNDS } from "./questlog/data";

const jszip = import("jszip");
const hljs: Promise<{
  highlight: (lang: string, code: string) => { value: string };
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
}> = import("@highlightjs/cdn-assets/highlight.min.js");

function download(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
}

function cleanupQuestDefinition(quest: Quest): Quest {
  const questObject: Quest = JSON.parse(JSON.stringify(quest));

  questObject.requirements = (questObject.requirements || []).filter(t => t.type !== null);
  questObject.objectives = (questObject.objectives || []).filter(o => o.type !== null);
  questObject.rewards = (questObject.rewards || []).filter(r => r.type !== null);

  for (const entry of [...questObject.requirements, ...questObject.objectives, ...questObject.rewards]) {
    if ((entry as any).display && Object.keys((entry as any).display).length === 0) {
      delete (entry as any).display;
    }

    if ((entry as any).display) {
      const display = (entry as any).display;
      delete (entry as any).display;
      if (display.name !== undefined) (entry as any).name = display.name;
      if (display.icon !== undefined) (entry as any).icon = display.icon;
      if (display.translatable !== undefined) (entry as any).translatable = display.translatable;
      if (display.sound?.claimed !== undefined) (entry as any).claim_sound = display.sound.claimed;
    }
  }

  return questObject;
}

function cleanupChapterDefinition(chapter: Chapter): Chapter {
  return JSON.parse(JSON.stringify(chapter));
}

document.addEventListener("DOMContentLoaded", () => {
  const questList = document.querySelector("#quest-list") as HTMLDivElement;
  const chapterList = document.querySelector("#chapter-list") as HTMLDivElement;

  questList.addEventListener("click", e => {
    if (!(e.target instanceof HTMLElement)) return;
    const tile = e.target.closest(".quest-item");
    if (tile) {
      const questId = tile.getAttribute("data-quest-id");
      if (questId) showQuestEditScreen(questId);
    }
  });

  chapterList.addEventListener("click", e => {
    if (!(e.target instanceof HTMLElement)) return;
    const tile = e.target.closest(".chapter-item");
    if (tile) {
      const chapterId = tile.getAttribute("data-chapter-id");
      if (chapterId) showChapterEditScreen(chapterId);
    }
  });

  const editArea = document.querySelector("#edit-area")!;

  const state: { quests: Partial<Record<string, Quest>>; chapters: Partial<Record<string, Chapter>> } = {
    quests: {},
    chapters: {},
  };

  if (window.localStorage.getItem("cachedState") !== null) {
    const cachedState = JSON.parse(window.localStorage.getItem("cachedState")!);
    if (Object.keys(cachedState.quests ?? {}).length > 0 || Object.keys(cachedState.chapters ?? {}).length > 0) {
      const progressModal = document.querySelector("#progress-modal")!;
      progressModal.classList.add("active");

      const discardButton = document.querySelector("#discard-progress")!;
      const restoreButton = document.querySelector("#restore-progress")!;

      discardButton.addEventListener("click", () => {
        window.localStorage.removeItem("cachedState");
        progressModal.classList.remove("active");
      });

      restoreButton.addEventListener("click", () => {
        state.quests = cachedState.quests || {};
        state.chapters = cachedState.chapters || {};
        progressModal.classList.remove("active");
        updateQuestList();
        updateChapterList();
      });
    }
  }

  function updateCache() {
    window.localStorage.setItem("cachedState", JSON.stringify(state));
  }

  const exportModalOpenButton = document.querySelector("#export-btn")!;
  const exportModal = document.querySelector("#export-modal")!;
  const exportButton = document.querySelector("#export")!;
  const exportFilenameInput = document.querySelector("#filename")! as HTMLInputElement;
  const exportFilenameError = document.querySelector("#filename-error")!;

  exportModal.querySelectorAll("[aria-label='Close']").forEach(closeButton => {
    closeButton.addEventListener("click", () => {
      exportModal.classList.remove("active");
    });
  });

  exportModalOpenButton.addEventListener("click", () => {
    exportModal.classList.add("active");
  });

  exportFilenameInput.addEventListener("input", () => {
    exportFilenameInput.parentElement?.classList.remove("has-error");
    exportFilenameError.innerHTML = "";
  });

  exportButton.addEventListener("click", async () => {
    if (exportFilenameInput.value.trim() === "") {
      exportFilenameInput.value = "questlog_config.zip";
    }

    if (!exportFilenameInput.value.endsWith(".zip")) {
      exportFilenameInput.value += ".zip";
    }

    exportButton.classList.add("loading", "disabled");
    const filename = exportFilenameInput.value;

    try {
      const zip = new (await jszip).default();

      for (const [id, quest] of Object.entries(state.quests)) {
        zip.file(`config/questlog/quests/${id}.json`, JSON.stringify(cleanupQuestDefinition(quest!), null, 2));
      }

      for (const [id, chapter] of Object.entries(state.chapters)) {
        zip.file(`config/questlog/chapters/${id}.json`, JSON.stringify(cleanupChapterDefinition(chapter!), null, 2));
      }

      const blob = await zip.generateAsync({ type: "blob" });
      download(new File([blob], filename));
    } catch (e) {
      console.error(e);
    } finally {
      exportButton.classList.remove("loading", "disabled");
      exportModal.classList.remove("active");
    }
  });

  const importModalOpenButton = document.querySelector("#import-btn")!;
  const importModal = document.querySelector("#import-modal")!;
  const importButton = document.querySelector("#import")!;
  const importFileInput = document.querySelector("#import-file")! as HTMLInputElement;

  importModalOpenButton.addEventListener("click", () => {
    importModal.classList.add("active");
  });

  importModal.querySelectorAll("[aria-label='Close']").forEach(closeButton => {
    closeButton.addEventListener("click", () => {
      importModal.classList.remove("active");
    });
  });

  importFileInput.addEventListener("change", () => {
    if (importFileInput.files?.length && importFileInput.files.length > 0) {
      importButton.classList.remove("disabled");
    } else {
      importButton.classList.add("disabled");
    }
  });

  importButton.addEventListener("click", async () => {
    if (importFileInput.files?.length && importFileInput.files.length === 0) {
      return;
    }

    try {
      let zip = new (await jszip).default();
      zip = await zip.loadAsync(importFileInput.files![0]);

      const newQuests: Partial<Record<string, Quest>> = {};
      const newChapters: Partial<Record<string, Chapter>> = {};
      const promises: Promise<void>[] = [];

      zip.forEach((relativePath, file) => {
        if (!file.dir && relativePath.endsWith(".json")) {
          promises.push(
            (async () => {
              try {
                const content = await file.async("text");
                const parsed = JSON.parse(content);
                const id = relativePath.split("/").pop()!.replace(".json", "");

                if (relativePath.includes("config/questlog/quests/")) {
                  // Unflatten display properties
                  for (const entry of [
                    ...(parsed.requirements || []),
                    ...(parsed.objectives || []),
                    ...(parsed.rewards || []),
                  ]) {
                    const displayProps: any = {};
                    if (entry.name !== undefined) {
                      displayProps.name = entry.name;
                      delete entry.name;
                    }
                    if (entry.icon !== undefined) {
                      displayProps.icon = entry.icon;
                      delete entry.icon;
                    }
                    if (entry.translatable !== undefined) {
                      displayProps.translatable = entry.translatable;
                      delete entry.translatable;
                    }
                    if (entry.claim_sound !== undefined) {
                      displayProps.sound = { claimed: entry.claim_sound };
                      delete entry.claim_sound;
                    }
                    if (Object.keys(displayProps).length > 0) entry.display = displayProps;
                  }
                  newQuests[id] = parsed;
                } else if (relativePath.includes("config/questlog/chapters/")) {
                  newChapters[id] = parsed;
                }
              } catch (e) {
                console.error(`Failed to parse ${relativePath}`, e);
              }
            })()
          );
        }
      });

      await Promise.all(promises);

      state.quests = newQuests;
      state.chapters = newChapters;

      updateQuestList();
      updateChapterList();
      updateCache();
      importModal.classList.remove("active");
    } catch (e) {
      console.error(e);
      alert("An error occurred while importing the file. Check the console for more information.");
    } finally {
      importButton.classList.remove("loading", "disabled");
    }
  });

  function deleteModal(type: "Quest" | "Chapter", onConfirm: () => void) {
    const modal = (
      <div class="modal active delete-modal">
        <a class="modal-overlay" aria-label="Close" on:click={() => document.body.removeChild(modal)}></a>
        <div class="modal-container">
          <div class="modal-header">
            <a
              class="btn btn-clear float-right"
              aria-label="Close"
              on:click={() => document.body.removeChild(modal)}
            ></a>
            <div class="modal-title h5">Delete {type}</div>
          </div>
          <div class="modal-body">
            <p>This action is irreversible!</p>
            <p>Are you sure you want to delete this {type.toLowerCase()}?</p>

            <div class="columns">
              <button
                class="btn btn-error col-6"
                on:click={() => {
                  onConfirm();
                  document.body.removeChild(modal);
                }}
              >
                Delete
              </button>
              <button class="btn col-6" on:click={() => document.body.removeChild(modal)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );

    document.body.querySelectorAll(".delete-modal").forEach(modal => document.body.removeChild(modal));
    document.body.appendChild(modal);
  }

  function createQuestTile(id: string) {
    const quest = state.quests[id]!;
    const tile = (
      <div class="tile tile-centered pl-2 quest-item" data-quest-id={id} id={"quest-tile-" + id}>
        <div class="tile-content" style="cursor: pointer;">
          <div class="tile-title">{quest.title || "Untitled Quest"}</div>
          <small class="tile-subtitle text-gray">{id}</small>
        </div>
        <div class="tile-action">
          <div class="dropdown dropdown-right">
            <button
              class="btn btn-delete mr-1"
              on:click={(e: Event) => {
                e.stopPropagation();
                deleteModal("Quest", () => {
                  delete state.quests[id];
                  const screen = document.querySelector("#quest-edit-screen-" + id);
                  if (screen) {
                    if ((screen as HTMLElement).style.display !== "none") hideEditScreen();
                    removeNode(screen);
                  }
                  updateQuestList();
                  updateCache();
                });
              }}
            >
              <i class="icon icon-delete"></i>
            </button>
          </div>
        </div>
      </div>
    );
    return tile;
  }

  function createChapterTile(id: string) {
    const tile = (
      <div class="tile tile-centered pl-2 chapter-item" data-chapter-id={id} id={"chapter-tile-" + id}>
        <div class="tile-content" style="cursor: pointer;">
          <div class="tile-title">Chapter</div>
          <small class="tile-subtitle text-gray">{id}</small>
        </div>
        <div class="tile-action">
          <div class="dropdown dropdown-right">
            <button
              class="btn btn-delete mr-1"
              on:click={(e: Event) => {
                e.stopPropagation();
                deleteModal("Chapter", () => {
                  delete state.chapters[id];
                  const screen = document.querySelector("#chapter-edit-screen-" + id);
                  if (screen) {
                    if ((screen as HTMLElement).style.display !== "none") hideEditScreen();
                    removeNode(screen);
                  }
                  updateChapterList();
                  updateCache();
                });
              }}
            >
              <i class="icon icon-delete"></i>
            </button>
          </div>
        </div>
      </div>
    );
    return tile;
  }

  function isEditScreenEmpty() {
    return (editArea.querySelector("#empty-state") as HTMLElement).style.display !== "none";
  }

  function hideEditScreen() {
    editArea.childNodes.forEach(child => {
      if ((child as HTMLElement).style) {
        (child as HTMLElement).style.display = "none";
      }
    });
    (document.querySelector("#empty-state") as HTMLElement).style.display = "block";
  }

  function clearActiveTiles() {
    document.querySelectorAll(".tile-centered").forEach(el => el.classList.remove("active"));
  }

  function showQuestEditScreen(id: string) {
    ensureQuestEditScreen(id);
    hideEditScreen();
    (document.querySelector("#empty-state") as HTMLElement).style.display = "none";
    (document.querySelector("#quest-edit-screen-" + id) as HTMLElement).style.display = "flex";
    clearActiveTiles();
    (document.querySelector("#quest-tile-" + id) as HTMLElement).classList.add("active");
  }

  function showChapterEditScreen(id: string) {
    ensureChapterEditScreen(id);
    hideEditScreen();
    (document.querySelector("#empty-state") as HTMLElement).style.display = "none";
    (document.querySelector("#chapter-edit-screen-" + id) as HTMLElement).style.display = "flex";
    clearActiveTiles();
    (document.querySelector("#chapter-tile-" + id) as HTMLElement).classList.add("active");
  }

  function ensureChapterEditScreen(id: string) {
    const chapterObject = state.chapters[id]!;
    if (document.querySelector("#chapter-edit-screen-" + id)) return;

    const codePreview = <code id="code-preview" class="full-height text-a-lil-bit"></code>;

    const screen: HTMLDivElement = (
      <div id={"chapter-edit-screen-" + id} class="columns col-gapless">
        <div class="column col-8 p-2">
          <div class="border-bottom-panellike py-1 text-center h5">Chapter Editing</div>
          <form class="p-1 mt-2">
            {createField(
              {
                key: "id",
                type: "input",
                description: <>The unique identifier of the chapter.</>,
                name: "ID",
                optional: false,
              },
              () => id,
              (_, value) => {
                const oldId = id;
                delete state.chapters[oldId];
                id = value as string;
                state.chapters[id] = chapterObject;
                screen.id = "chapter-edit-screen-" + id;
                updateChapterList();
              }
            )}
            {createField(
              {
                key: "icon",
                type: "icon",
                description: <>The display icon of the chapter tab.</>,
                name: "Icon",
                optional: true,
              },
              () => chapterObject.icon,
              (_, value) => {
                chapterObject.icon = value as Renderable;
              }
            )}
            {createField(
              {
                key: "order",
                type: "input",
                isNumber: true,
                description: <>Specifies the display order of the chapter tabs. Lower numbers appear first.</>,
                name: "Order",
                optional: true,
              },
              () => chapterObject.order,
              (_, value) => {
                chapterObject.order = Number(value);
              }
            )}
            {createField(
              {
                key: "default_chapter",
                type: "boolean",
                description: <>Whether this chapter should be treated as the default main chapter.</>,
                name: "Default Chapter",
                optional: true,
              },
              () => chapterObject.default_chapter,
              (_, value) => {
                if (value) chapterObject.default_chapter = true;
                else delete chapterObject.default_chapter;
              }
            )}
            {createField(
              {
                key: "hidden",
                type: "boolean",
                description: <>Completely hides the chapter from the UI.</>,
                name: "Hidden",
                optional: true,
              },
              () => chapterObject.hidden,
              (_, value) => {
                if (value) chapterObject.hidden = true;
                else delete chapterObject.hidden;
              }
            )}
          </form>
        </div>
        <div class="column col-4 border-left-panellike">
          <pre class="code m-0">{codePreview}</pre>
        </div>
      </div>
    );

    function updateCodePreview() {
      updateCache();
      const code = JSON.stringify(cleanupChapterDefinition(chapterObject), null, 2);
      codePreview.textContent = code;
      hljs.then(hljs => {
        codePreview.innerHTML = hljs.highlight("json", code).value;
      });
    }

    screen.querySelectorAll("input, textarea, select").forEach(el => {
      el.addEventListener("input", updateCodePreview);
      el.addEventListener("change", updateCodePreview);
    });

    updateCodePreview();
    screen.style.display = "none";
    editArea.appendChild(screen);
  }

  function ensureQuestEditScreen(id: string) {
    const questObject = state.quests[id]!;
    if (document.querySelector("#quest-edit-screen-" + id)) return;

    const reqDetails: HTMLDivElement = <div class="column col-8"></div>;
    const objectiveDetails: HTMLDivElement = <div class="column col-8"></div>;
    const rewardDetails: HTMLDivElement = <div class="column col-8"></div>;

    const reqList: HTMLDivElement = (
      <div class="panel-body">
        <p class="text-gray text-center mt-2">No requirements added yet</p>
      </div>
    );

    const objectiveList: HTMLDivElement = (
      <div class="panel-body">
        <p class="text-gray text-center mt-2">No objectives added yet</p>
      </div>
    );

    const rewardList: HTMLDivElement = (
      <div class="panel-body">
        <p class="text-gray text-center mt-2">No rewards added yet</p>
      </div>
    );

    const reqTab = <a data-tab="requirements">Requirements (0)</a>;
    const objectiveTab = <a data-tab="objectives">Objectives (0)</a>;
    const rewardTab = <a data-tab="rewards">Rewards (0)</a>;

    const codePreview = <code id="code-preview" class="full-height text-a-lil-bit"></code>;

    const screen: HTMLDivElement = (
      <div id={"quest-edit-screen-" + id} class="columns col-gapless">
        <div class="column col-8" style="position: relative; z-index: 10;">
          <ul class="tab tab-block mb-0">
            <li class="tab-item">
              <a class="active" data-tab="general">
                General
              </a>
            </li>
            <li class="tab-item">{reqTab}</li>
            <li class="tab-item">{objectiveTab}</li>
            <li class="tab-item">{rewardTab}</li>
          </ul>

          <div data-tab="general" class="columns p-2 tab-content active">
            <div class="col-6">
              <div class="border-bottom-panellike py-1 text-center">Base Settings</div>
              <form class="p-1">
                {createField(
                  { key: "id", type: "input", description: <>Unique identifier</>, name: "ID", optional: false },
                  () => id,
                  (_, value) => {
                    const oldId = id;
                    delete state.quests[oldId];
                    id = value as string;
                    state.quests[id] = questObject;
                    screen.id = "quest-edit-screen-" + id;
                    updateQuestList();
                  }
                )}
                {createField(
                  { key: "title", type: "input", description: <>Quest title</>, name: "Title", optional: false },
                  () => questObject.title,
                  (_, value) => {
                    questObject.title = value as string;
                    updateQuestList();
                  }
                )}
                {createField(
                  {
                    key: "description",
                    type: "textarea",
                    description: <>Quest description</>,
                    name: "Description",
                    optional: true,
                  },
                  () => questObject.description,
                  (_, value) => {
                    questObject.description = value as string;
                  }
                )}
                {createField(
                  { key: "icon", type: "icon", description: <>Quest icon</>, name: "Icon", optional: true },
                  () => questObject.icon,
                  (_, value) => {
                    questObject.icon = value as Renderable;
                  }
                )}
                {createField(
                  {
                    key: "chapter",
                    type: "input",
                    description: <>Chapter this quest belongs to</>,
                    name: "Chapter",
                    optional: true,
                  },
                  () => questObject.chapter,
                  (_, value) => {
                    questObject.chapter = value as string;
                  }
                )}
              </form>
            </div>
            <div class="col-6">
              <div class="border-bottom-panellike py-1 text-center">Style & Flags</div>
              <form class="p-1">
                {createField(
                  {
                    key: "sort_order",
                    type: "input",
                    isNumber: true,
                    description: <>The sort order in the list</>,
                    name: "Sort Order",
                    optional: true,
                  },
                  () => questObject.sort_order,
                  (_, value) => {
                    questObject.sort_order = Number(value);
                  }
                )}
                {createField(
                  {
                    key: "hidden",
                    type: "boolean",
                    description: <>Hide from quest list</>,
                    name: "Hidden",
                    optional: true,
                  },
                  () => questObject.hidden,
                  (_, value) => {
                    if (value) questObject.hidden = true;
                    else delete questObject.hidden;
                    updateCodePreview();
                  }
                )}
                {createField(
                  {
                    key: "include_in_main",
                    type: "boolean",
                    description: <>Include in the main chapter</>,
                    name: "Include in main",
                    optional: true,
                  },
                  () =>
                    questObject.include_in_main ??
                    (questObject.chapter === undefined ||
                      questObject.chapter === "questlog:main" ||
                      questObject.chapter === "main"),
                  (_, value) => {
                    const isMain =
                      questObject.chapter === undefined ||
                      questObject.chapter === "questlog:main" ||
                      questObject.chapter === "main";
                    if (value === isMain) delete questObject.include_in_main;
                    else questObject.include_in_main = value as boolean;
                    updateCodePreview();
                  }
                )}
                {createField(
                  {
                    key: "translatable",
                    type: "boolean",
                    description: <>Whether title and description are translation keys</>,
                    name: "Translatable",
                    optional: true,
                  },
                  () => questObject.translatable,
                  (_, value) => {
                    if (value) questObject.translatable = true;
                    else delete questObject.translatable;
                    updateCodePreview();
                  }
                )}
                {createField(
                  {
                    key: "toast_on_unlock",
                    type: "boolean",
                    description: <>Show toast when unlocked</>,
                    name: "Unlock Toast",
                    optional: true,
                  },
                  () => questObject.toast_on_unlock !== false,
                  (_, value) => {
                    if (value === false) questObject.toast_on_unlock = false;
                    else delete questObject.toast_on_unlock;
                    updateCodePreview();
                  }
                )}
                {createField(
                  {
                    key: "toast_on_complete",
                    type: "boolean",
                    description: <>Show toast when completed</>,
                    name: "Complete Toast",
                    optional: true,
                  },
                  () => questObject.toast_on_complete !== false,
                  (_, value) => {
                    if (value === false) questObject.toast_on_complete = false;
                    else delete questObject.toast_on_complete;
                    updateCodePreview();
                  }
                )}
                {createField(
                  {
                    key: "show_popup_on_unlock",
                    type: "boolean",
                    description: <>Show popup instead of toast</>,
                    name: "Popup on unlock",
                    optional: true,
                  },
                  () => questObject.show_popup_on_unlock,
                  (_, value) => {
                    if (value) questObject.show_popup_on_unlock = true;
                    else delete questObject.show_popup_on_unlock;
                    updateCodePreview();
                  }
                )}
                {createField(
                  {
                    key: "completed_sound",
                    type: "input",
                    description: <>Sound on completion</>,
                    name: "Completion Sound",
                    optional: true,
                    autocomplete: SOUNDS,
                  },
                  () => questObject.completed_sound,
                  (_, value) => {
                    if (value) questObject.completed_sound = value as string;
                    else delete questObject.completed_sound;
                  }
                )}
                {createField(
                  {
                    key: "triggered_sound",
                    type: "input",
                    description: <>Sound on trigger/unlock</>,
                    name: "Trigger Sound",
                    optional: true,
                    autocomplete: SOUNDS,
                  },
                  () => questObject.triggered_sound,
                  (_, value) => {
                    if (value) questObject.triggered_sound = value as string;
                    else delete questObject.triggered_sound;
                  }
                )}
              </form>
            </div>
          </div>

          <div data-tab="requirements" class="tab-content columns col-gapless">
            <div class="column col-4 panel full-height-tab noborder-top">
              {reqList}
              <div class="panel-footer text-center">
                <button
                  class="btn btn-primary"
                  on:click={() => {
                    questObject.requirements.push({ type: null as unknown as string, total: 1 });
                    rerenderRequirements();
                  }}
                >
                  <i class="icon icon-plus"></i> Add Req.
                </button>
              </div>
            </div>
            {reqDetails}
          </div>

          <div data-tab="objectives" class="tab-content columns col-gapless">
            <div class="column col-4 panel full-height-tab noborder-top">
              {objectiveList}
              <div class="panel-footer text-center">
                <button
                  class="btn btn-primary"
                  on:click={() => {
                    questObject.objectives.push({ type: null as unknown as string, total: 1 });
                    rerenderObjectives();
                  }}
                >
                  <i class="icon icon-plus"></i> Add Objective
                </button>
              </div>
            </div>
            {objectiveDetails}
          </div>

          <div data-tab="rewards" class="tab-content columns col-gapless">
            <div class="column col-4 panel full-height-tab noborder-top">
              {rewardList}
              <div class="panel-footer text-center">
                <button
                  class="btn btn-primary"
                  on:click={() => {
                    questObject.rewards.push({ type: null as unknown as string });
                    rerenderRewards();
                  }}
                >
                  <i class="icon icon-plus"></i> Add Reward
                </button>
              </div>
            </div>
            {rewardDetails}
          </div>
        </div>
        <div class="column col-4 border-left-panellike">
          <pre class="code m-0">{codePreview}</pre>
        </div>
      </div>
    );

    function updateCodePreview() {
      updateCache();
      const code = JSON.stringify(cleanupQuestDefinition(questObject), null, 2);
      codePreview.textContent = code;
      hljs.then(hljs => {
        codePreview.innerHTML = hljs.highlight("json", code).value;
      });
    }

    function updateInputsForCodePreviewEvents() {
      screen.querySelectorAll("input, textarea, select").forEach(el => {
        el.removeEventListener("input", updateCodePreview);
        el.addEventListener("input", updateCodePreview);
        el.removeEventListener("change", updateCodePreview);
        el.addEventListener("change", updateCodePreview);
      });
      updateCodePreview();
    }

    let selectedReq: Objective | null = null;
    function setSelectedReq(req: Objective) {
      selectedReq = req;
      rerenderReqDetails();
    }

    function rerenderReqDetails() {
      reqDetails.innerHTML = "";
      const s = selectedReq;
      if (s) {
        const form = <form class="p-1"></form>;
        form.appendChild(
          createField(
            {
              key: "type",
              type: "select",
              description: <>Determines the type of requirement</>,
              name: "Type",
              optional: false,
              options: OBJECTIVE_TYPES.map(type => type.type),
            },
            () => s.type,
            (_, value) => {
              if (s.type !== value) {
                const additional = OBJECTIVE_TYPES.find(type => type.type === s.type)?.additional;
                if (additional) for (const { key } of additional) delete s[key as keyof Objective];
                s.type = value as string;
                rerenderRequirements();
                rerenderReqDetails();
                updateCodePreview();
              }
            }
          )
        );
        form.appendChild(
          createField(
            { key: "total", type: "input", description: <>The total number</>, name: "Amount", optional: false },
            () => s.total,
            (_, value) => {
              s.total = Number(value) || 1;
              rerenderRequirements();
              updateCodePreview();
            }
          )
        );
        const typeDef = OBJECTIVE_TYPES.find(type => type.type === s.type);
        if (typeDef?.additional) {
          for (const additional of typeDef.additional) {
            form.appendChild(
              createField(
                additional,
                key => (key in s ? s[key as keyof Objective] : undefined),
                (key, value) => {
                  if (value === null) delete s[key as keyof Objective];
                  else (s as any)[key] = value;
                  rerenderRequirements();
                  updateCodePreview();
                }
              )
            );
          }
        }
        reqDetails.appendChild(form);
      } else {
        reqDetails.appendChild(
          <div id="empty-state" class="empty full-height-tab">
            <p class="empty-title h5">No req selected</p>
          </div>
        );
      }
      updateInputsForCodePreviewEvents();
    }

    function rerenderRequirements() {
      reqTab.textContent = `Requirements (${questObject.requirements.length})`;
      reqList.innerHTML = "";
      if (questObject.requirements.length === 0) {
        reqList.appendChild(<p class="text-gray text-center mt-2">No requirements added yet</p>);
      } else {
        for (const req of questObject.requirements) {
          const tile = (
            <div class="tile tile-centered">
              <div class="tile-content">
                <div class="tile-title">{req.type || "Unknown Type"}</div>
              </div>
              <div class="tile-action">
                <button class="btn btn-edit mr-1" on:click={() => setSelectedReq(req)}>
                  <i class="icon icon-edit"></i>
                </button>
                <button
                  class="btn btn-delete"
                  on:click={() => {
                    questObject.requirements = questObject.requirements.filter(t => t !== req);
                    if (selectedReq === req) {
                      selectedReq = null;
                      rerenderReqDetails();
                    }
                    rerenderRequirements();
                  }}
                >
                  <i class="icon icon-delete"></i>
                </button>
              </div>
            </div>
          );
          reqList.appendChild(tile);
        }
      }
      updateInputsForCodePreviewEvents();
    }

    let selectedObjective: Objective | null = null;
    function setSelectedObjective(objective: Objective | null) {
      selectedObjective = objective;
      rerenderObjectiveDetails();
    }

    function rerenderObjectiveDetails() {
      objectiveDetails.innerHTML = "";
      const s = selectedObjective;
      if (s) {
        const form = <form class="p-1"></form>;
        form.appendChild(
          createField(
            { key: "name", type: "input", description: <>Display text</>, name: "Name", optional: true },
            () => s.display?.name,
            (_, value) => {
              s.display ??= {} as ObjectiveDisplay;
              s.display.name = value as string;
              rerenderObjectives();
              updateCodePreview();
            }
          )
        );
        form.appendChild(
          createField(
            { key: "icon", type: "icon", description: <>Display icon</>, name: "Icon", optional: true },
            () => s.display?.icon,
            (_, value) => {
              s.display ??= {} as ObjectiveDisplay;
              s.display.icon = value as Renderable;
              updateCodePreview();
            }
          )
        );
        form.appendChild(
          createField(
            {
              key: "type",
              type: "select",
              description: <>Type of the objective</>,
              name: "Type",
              optional: false,
              options: OBJECTIVE_TYPES.map(type => type.type),
            },
            () => s.type,
            (_, value) => {
              if (s.type !== value) {
                const additional = OBJECTIVE_TYPES.find(type => type.type === s.type)?.additional;
                if (additional) for (const { key } of additional) delete s[key as keyof Objective];
                s.type = value as string;
                rerenderObjectives();
                rerenderObjectiveDetails();
                updateCodePreview();
              }
            }
          )
        );
        form.appendChild(
          createField(
            { key: "total", type: "input", description: <>Amount needed</>, name: "Amount", optional: false },
            () => s.total,
            (_, value) => {
              s.total = Number(value) || 1;
              updateCodePreview();
            }
          )
        );
        const typeDef = OBJECTIVE_TYPES.find(type => type.type === s.type);
        if (typeDef?.additional) {
          for (const additional of typeDef.additional) {
            form.appendChild(
              createField(
                additional,
                key => (key in s ? s[key as keyof Objective] : undefined),
                (key, value) => {
                  if (value === null) delete s[key as keyof Objective];
                  else (s as any)[key] = value;
                }
              )
            );
          }
        }
        objectiveDetails.appendChild(form);
      } else {
        objectiveDetails.appendChild(
          <div id="empty-state" class="empty full-height-tab">
            <p class="empty-title h5">No objective selected</p>
          </div>
        );
      }
      updateInputsForCodePreviewEvents();
    }

    function rerenderObjectives() {
      objectiveTab.textContent = `Objectives (${questObject.objectives.length})`;
      objectiveList.innerHTML = "";
      if (questObject.objectives.length === 0) {
        objectiveList.appendChild(<p class="text-gray text-center mt-2">No objectives added yet</p>);
      } else {
        for (const obj of questObject.objectives) {
          const tile = (
            <div class="tile tile-centered">
              <div class="tile-content">
                <div class="tile-title">{obj.display?.name || obj.type || "Unknown Type"}</div>
              </div>
              <div class="tile-action">
                <button class="btn btn-edit mr-1" on:click={() => setSelectedObjective(obj)}>
                  <i class="icon icon-edit"></i>
                </button>
                <button
                  class="btn btn-delete"
                  on:click={() => {
                    questObject.objectives = questObject.objectives.filter(t => t !== obj);
                    if (selectedObjective === obj) {
                      selectedObjective = null;
                      rerenderObjectiveDetails();
                    }
                    rerenderObjectives();
                  }}
                >
                  <i class="icon icon-delete"></i>
                </button>
              </div>
            </div>
          );
          objectiveList.appendChild(tile);
        }
      }
      updateInputsForCodePreviewEvents();
    }

    let selectedReward: Reward | null = null;
    function setSelectedReward(reward: Reward | null) {
      selectedReward = reward;
      rerenderRewardDetails();
    }

    function rerenderRewardDetails() {
      rewardDetails.innerHTML = "";
      const s = selectedReward;
      if (s) {
        const form = <form class="p-1"></form>;
        form.appendChild(
          createField(
            { key: "name", type: "input", description: <>Display text</>, name: "Name", optional: false },
            () => s.display?.name,
            (_, value) => {
              s.display ??= {} as RewardDisplay;
              s.display.name = value as string;
              rerenderRewards();
            }
          )
        );
        form.appendChild(
          createField(
            { key: "icon", type: "icon", description: <>Display icon</>, name: "Icon", optional: true },
            () => s.display?.icon,
            (_, value) => {
              s.display ??= {} as RewardDisplay;
              s.display.icon = value as Renderable;
              updateCodePreview();
            }
          )
        );
        form.appendChild(
          createField(
            {
              key: "auto_claim",
              type: "boolean",
              description: <>Automatically claim upon completion</>,
              name: "Auto Claim",
              optional: true,
            },
            () => s.auto_claim,
            (_, value) => {
              if (value) s.auto_claim = true;
              else delete s.auto_claim;
              updateCodePreview();
            }
          )
        );
        form.appendChild(
          createField(
            {
              key: "sound",
              type: "input",
              description: <>Sound on collect</>,
              name: "Sound",
              optional: true,
              autocomplete: SOUNDS,
            },
            () => s.display?.sound?.claimed,
            (_, value) => {
              s.display ??= {} as RewardDisplay;
              s.display.sound ??= {};
              s.display.sound.claimed = value as string;
              updateCodePreview();
            }
          )
        );
        form.appendChild(
          createField(
            {
              key: "type",
              type: "select",
              description: <>Reward type</>,
              name: "Type",
              optional: false,
              options: REWARD_TYPES.map(type => type.type),
            },
            () => s.type,
            (_, value) => {
              if (s.type !== value) {
                const additional = REWARD_TYPES.find(type => type.type === s.type)?.additional;
                if (additional) for (const { key } of additional) delete s[key as keyof Reward];
                s.type = value as string;
                rerenderRewards();
                rerenderRewardDetails();
                updateCodePreview();
              }
            }
          )
        );
        const typeDef = REWARD_TYPES.find(type => type.type === s.type);
        if (typeDef?.additional) {
          for (const additional of typeDef.additional) {
            form.appendChild(
              createField(
                additional,
                key => (key in s ? s[key as keyof Reward] : undefined),
                (key, value) => {
                  if (value === null) delete s[key as keyof Reward];
                  else (s as any)[key] = value;
                }
              )
            );
          }
        }
        rewardDetails.appendChild(form);
      } else {
        rewardDetails.appendChild(
          <div id="empty-state" class="empty full-height-tab">
            <p class="empty-title h5">No reward selected</p>
          </div>
        );
      }
      updateInputsForCodePreviewEvents();
    }

    function rerenderRewards() {
      rewardTab.textContent = `Rewards (${questObject.rewards.length})`;
      rewardList.innerHTML = "";
      if (questObject.rewards.length === 0) {
        rewardList.appendChild(<p class="text-gray text-center mt-2">No rewards added yet</p>);
      } else {
        for (const reward of questObject.rewards) {
          const tile = (
            <div class="tile tile-centered">
              <div class="tile-content">
                <div class="tile-title">{reward.display?.name || reward.type || "Unknown Type"}</div>
              </div>
              <div class="tile-action">
                <button class="btn btn-edit mr-1" on:click={() => setSelectedReward(reward)}>
                  <i class="icon icon-edit"></i>
                </button>
                <button
                  class="btn btn-delete"
                  on:click={() => {
                    questObject.rewards = questObject.rewards.filter(t => t !== reward);
                    if (selectedReward === reward) {
                      selectedReward = null;
                      rerenderRewardDetails();
                    }
                    rerenderRewards();
                  }}
                >
                  <i class="icon icon-delete"></i>
                </button>
              </div>
            </div>
          );
          rewardList.appendChild(tile);
        }
      }
      updateInputsForCodePreviewEvents();
    }

    screen.style.display = "none";
    const defaultDisplayStyles: Record<string, string> = {};
    (screen.querySelector(".tab") as HTMLElement).addEventListener("click", e => {
      e.preventDefault();
      const target = e.target as HTMLElement;
      if (target.tagName === "A") {
        const tab = target.getAttribute("data-tab")!;
        (screen.querySelectorAll(".tab-item a") as NodeListOf<HTMLElement>).forEach(t => t.classList.remove("active"));
        target.classList.add("active");
        (screen.querySelectorAll(".tab-content") as NodeListOf<HTMLElement>).forEach(content => {
          content.style.display = content.getAttribute("data-tab") === tab ? defaultDisplayStyles[tab] : "none";
        });
      }
    });

    (screen.querySelectorAll(".tab-content[data-tab]") as NodeListOf<HTMLElement>).forEach(tab => {
      defaultDisplayStyles[tab.getAttribute("data-tab")!] = tab.style.display;
      tab.style.display = tab.getAttribute("data-tab") === "general" ? defaultDisplayStyles["general"] : "none";
    });

    rerenderRequirements();
    rerenderReqDetails();
    rerenderObjectives();
    rerenderObjectiveDetails();
    rerenderRewards();
    rerenderRewardDetails();

    updateInputsForCodePreviewEvents();
    editArea.appendChild(screen);
  }

  function updateQuestList() {
    questList.innerHTML = "";
    for (const id of Object.keys(state.quests)) {
      questList.appendChild(createQuestTile(id));
    }
  }

  function updateChapterList() {
    chapterList.innerHTML = "";
    for (const id of Object.keys(state.chapters)) {
      chapterList.appendChild(createChapterTile(id));
    }
  }

  function createEmptyQuest(id: string) {
    state.quests[id] = { requirements: [], objectives: [], rewards: [], title: "", description: "" };
    updateQuestList();
    if (isEditScreenEmpty()) showQuestEditScreen(id);
    updateCache();
  }

  function createEmptyChapter(id: string) {
    state.chapters[id] = {};
    updateChapterList();
    if (isEditScreenEmpty()) showChapterEditScreen(id);
    updateCache();
  }

  const addQuestButton = document.querySelector("#add-quest") as HTMLButtonElement;
  addQuestButton.addEventListener("click", () => {
    createEmptyQuest("new_quest_" + Math.random().toString(36).substring(7));
  });

  const addChapterButton = document.querySelector("#add-chapter") as HTMLButtonElement;
  addChapterButton.addEventListener("click", () => {
    createEmptyChapter("new_chapter_" + Math.random().toString(36).substring(7));
  });
});
