// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { _createElement, _fragment } from "simple-jsx-handler";
declare const React: JSX.IntrinsicElements;

import {
  Objective,
  OBJECTIVE_TYPES,
  ObjectiveDisplay,
  Quest,
  Renderable,
  Reward,
  REWARD_TYPES,
  RewardDisplay,
} from "./questlog/types";
import { createField } from "./questlog/field";
import { removeNode } from "./util";

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
  // Clean up the quest object
  const questObject: Quest = JSON.parse(JSON.stringify(quest));

  questObject.triggers = questObject.triggers.filter(t => t.type !== null);
  questObject.objectives = questObject.objectives.filter(o => o.type !== null);
  questObject.rewards = questObject.rewards.filter(r => r.type !== null);

  for (const entry of [...questObject.triggers, ...questObject.objectives, ...questObject.rewards]) {
    if (entry.display && Object.keys(entry.display).length === 0) {
      delete entry.display;
    }

    // Display at the end of the object (hacky)
    if (entry.display) {
      const display = entry.display;
      delete entry.display;
      entry.display = display;
    }
  }

  return questObject;
}

document.addEventListener("DOMContentLoaded", () => {
  const questList = document.querySelector("#quest-list") as HTMLDivElement;
  questList.addEventListener("click", e => {
    if (!(e.target instanceof HTMLElement)) return;
    if (e.target.classList.contains("quest-item")) {
      const questId = e.target.getAttribute("data-quest-id");
      window.location.href = `/quest/${questId}`;
    }
  });

  const editArea = document.querySelector("#edit-area")!;

  const state: { quests: Partial<Record<string, Quest>> } = {
    quests: {},
  };

  if (window.localStorage.getItem("cachedState") !== null) {
    const progressModal = document.querySelector("#progress-modal")!;
    progressModal.classList.add("active");

    const discardButton = document.querySelector("#discard-progress")!;
    const restoreButton = document.querySelector("#restore-progress")!;

    const cachedState = JSON.parse(window.localStorage.getItem("cachedState")!);

    discardButton.addEventListener("click", () => {
      window.localStorage.removeItem("cachedState");
      progressModal.classList.remove("active");
    });

    restoreButton.addEventListener("click", () => {
      state.quests = cachedState.quests;
      window.localStorage.removeItem("cachedState");
      progressModal.classList.remove("active");
      updateQuestList();
    });
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
      exportFilenameInput.parentElement?.classList.add("has-error");
      exportFilenameError.textContent = "Filename cannot be empty";
      return;
    }

    if (!exportFilenameInput.value.endsWith(".zip")) {
      exportFilenameInput.parentElement?.classList.add("has-error");
      exportFilenameError.innerHTML = "Filename must end with <code>.zip</code>";
      return;
    }

    exportButton.classList.add("loading", "disabled");
    const filename = exportFilenameInput.value;

    try {
      const zip = new (await jszip).default();
      zip.file(
        "pack.mcmeta",
        JSON.stringify({
          pack: {
            description: "Quests",
            pack_format: 10,
          },
        })
      );

      zip.file(
        "data/questlog/quests.json",
        JSON.stringify(
          {
            quests: Object.keys(state.quests).map(id => `questlog:quests/${id}`),
          },
          null,
          2
        )
      );

      for (const [id, quest] of Object.entries(state.quests)) {
        zip.file(`data/questlog/quests/${id}.json`, JSON.stringify(cleanupQuestDefinition(quest!), null, 2));
      }

      const blob = await zip.generateAsync({ type: "blob" });
      download(new File([blob], filename));
    } catch (e) {
      console.error(e);
    } finally {
      exportButton.classList.remove("loading", "disabled");
    }
  });

  function createQuestTile(id: string) {
    /** @type {Quest} */
    const quest = state.quests[id]!;

    const tile = (
      <div class="tile tile-centered pl-2" id={"quest-tile-" + id}>
        <div class="tile-content">
          <div class="tile-title">{quest.display.title || "Untitled Quest"}</div>
          <small class="tile-subtitle text-gray">{id}</small>
        </div>
        <div class="tile-action">
          <div class="dropdown dropdown-right">
            <a class="btn btn-link dropdown-toggle btn-lg pt-1 no-box-shadow" tabindex="0">
              <i class="icon icon-more-vert"></i>
            </a>
            <ul class="menu">
              <li class="menu-item">
                <a class="btn-edit" on:click={() => showQuestEditScreen(id)}>
                  <i class="icon icon-edit mr-2"></i> Edit
                </a>
              </li>
              <li class="menu-item">
                <a
                  class="btn-delete"
                  on:click={() => {
                    if (confirm("Are you sure you want to delete this quest?")) {
                      delete state.quests[id];

                      const questEditScreen = document.querySelector("#quest-edit-screen-" + id) as HTMLDivElement;
                      if (questEditScreen) {
                        if (questEditScreen.style.display !== "none") {
                          hideQuestEditScreen();
                        }

                        removeNode(questEditScreen);
                      }

                      updateQuestList();
                    }
                  }}
                >
                  <i class="icon icon-delete mr-2"></i> Delete
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );

    return tile;
  }

  function isEditScreenEmpty() {
    return (editArea.querySelector("#empty-state") as HTMLElement).style.display !== "none";
  }

  function getShownDetailScreenId(): string {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore - We know it's a HTMLElement
    for (const child of editArea.childNodes) {
      if (child instanceof HTMLElement && child.style.display !== "none") {
        return child.id.split("-").slice(-1)[0];
      }
    }

    return "";
  }

  function showQuestEditScreen(id: string) {
    ensureQuestEditScreen(id);
    (document.querySelector("#empty-state") as HTMLElement).style.display = "none";
    (document.querySelector("#quest-edit-screen-" + id) as HTMLElement).style.display = "flex";
    (document.querySelector("#quest-tile-" + id) as HTMLElement).classList.add("active");
    for (const otherId of Object.keys(state.quests)) {
      if (otherId !== id) {
        const questEditScreen = document.querySelector("#quest-edit-screen-" + otherId) as HTMLElement;

        if (questEditScreen) {
          questEditScreen.style.display = "none";
        }

        (document.querySelector("#quest-tile-" + otherId) as HTMLElement).classList.remove("active");
      }
    }
  }

  function hideQuestEditScreen() {
    editArea.childNodes.forEach(child => {
      if ((child as HTMLElement).style) {
        (child as HTMLElement).style.display = "none";
      }
    });

    (document.querySelector("#empty-state") as HTMLElement).style.display = "block";
  }

  function ensureQuestEditScreen(id: string) {
    const questObject = state.quests[id]!;

    if (document.querySelector("#quest-edit-screen-" + id)) {
      return;
    }

    const triggerDetails: HTMLDivElement = <div class="column col-8"></div>;
    const objectiveDetails: HTMLDivElement = <div class="column col-8"></div>;
    const rewardDetails: HTMLDivElement = <div class="column col-8"></div>;

    const triggerList: HTMLDivElement = (
      <div class="panel-body">
        <p class="text-gray text-center mt-2">No triggers added yet</p>
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

    const triggerTab = <a data-tab="triggers">Triggers (0)</a>;
    const objectiveTab = <a data-tab="objectives">Objectives (0)</a>;
    const rewardTab = <a data-tab="rewards">Rewards (0)</a>;

    const codePreview = <code id="code-preview" class="full-height text-a-lil-bit"></code>;

    const screen: HTMLDivElement = (
      <div id={"quest-edit-screen-" + id} class="columns col-gapless">
        <div class="column col-8">
          <ul class="tab tab-block mb-0">
            <li class="tab-item">
              <a class="active" data-tab="general">
                General
              </a>
            </li>
            <li class="tab-item">{triggerTab}</li>
            <li class="tab-item">{objectiveTab}</li>
            <li class="tab-item">{rewardTab}</li>
          </ul>

          <div data-tab="general" class="columns p-2 tab-content active">
            <div class="col-6">
              <div class="border-bottom-panellike py-1 text-center">Base Settings</div>
              <form class="p-1">
                {createField(
                  {
                    key: "id",
                    type: "input",
                    description: (
                      <>
                        The unique identifier of the quest.
                        <br />
                        This is used to reference the quest in other quests.
                      </>
                    ),
                    name: "ID",
                    optional: false,
                  },
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
                  {
                    key: "title",
                    type: "input",
                    description: (
                      <>
                        The title of the quest.
                        <br />
                        This will be displayed in the quest list and quest details.
                      </>
                    ),
                    name: "Title",
                    optional: false,
                  },
                  () => questObject.display.title,
                  (_, value) => {
                    questObject.display.title = value as string;
                    updateQuestList();
                  }
                )}
                {createField(
                  {
                    key: "description",
                    type: "textarea",
                    description: (
                      <>
                        The description of the quest.
                        <br />
                        This will be displayed in the quest details.
                      </>
                    ),
                    name: "Description",
                    optional: true,
                  },
                  () => questObject.display.description,
                  (_, value) => {
                    questObject.display.description = value as string;
                  }
                )}
                {createField(
                  {
                    key: "icon",
                    type: "icon",
                    description: (
                      <>
                        The display icon of the quest.
                        <br />
                        This will be displayed in the quest list and quest details.
                      </>
                    ),
                    name: "Icon",
                    optional: true,
                  },
                  () => questObject.display.icon,
                  (_, value) => {
                    questObject.display.icon = value as Renderable;
                  }
                )}
              </form>
            </div>
            <div class="col-6">
              <div class="border-bottom-panellike py-1 text-center">Style Settings</div>
              <form class="p-1">
                {createField(
                  {
                    key: "hidden",
                    type: "boolean",
                    description: (
                      <>
                        Determines if the quest is hidden from the quest list.
                        <br />
                        Hidden quests can still be completed.
                      </>
                    ),
                    name: "Hidden",
                    optional: true,
                  },
                  () => questObject.display.hidden || false,
                  (_, value) => {
                    if (value) {
                      questObject.display.hidden = true;
                    } else {
                      delete questObject.display.hidden;
                    }
                  }
                )}
              </form>
            </div>
          </div>

          <div data-tab="triggers" class="tab-content columns col-gapless">
            <div class="column col-4 panel full-height-tab noborder-top">
              {triggerList}
              <div class="panel-footer text-center">
                <button
                  class="btn btn-primary"
                  on:click={() => {
                    questObject.triggers.push({
                      type: null as unknown as string, // Trust. We have a check for null
                      total: 1,
                    });
                    rerenderTriggers();
                  }}
                >
                  <i class="icon icon-plus"></i> Add Trigger
                </button>
              </div>
            </div>
            {triggerDetails}
          </div>

          <div data-tab="objectives" class="tab-content columns col-gapless">
            <div class="column col-4 panel full-height-tab noborder-top">
              {objectiveList}
              <div class="panel-footer text-center">
                <button
                  class="btn btn-primary"
                  on:click={() => {
                    questObject.objectives.push({
                      type: null as unknown as string, // Trust. We have a check for null
                      total: 1,
                    });
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
      window.localStorage.setItem("cachedState", JSON.stringify(state));
      const code = JSON.stringify(cleanupQuestDefinition(questObject), null, 2);
      codePreview.textContent = code;
      hljs.then(hljs => {
        codePreview.innerHTML = hljs.highlight("json", code).value;
      });
    }

    function updateInputsForCodePreviewEvents() {
      screen.querySelectorAll("input, textarea").forEach(input => {
        input.removeEventListener("input", updateCodePreview);
        input.addEventListener("input", updateCodePreview);
      });

      screen.querySelectorAll("select").forEach(select => {
        select.removeEventListener("change", updateCodePreview);
        select.addEventListener("change", updateCodePreview);
      });

      updateCodePreview();
    }
    //#endregion

    //#region Triggers
    let selectedTrigger: Objective | null = null;
    function setSelectedTrigger(trigger: Objective) {
      selectedTrigger = trigger;
      rerenderTriggerDetails();
    }

    function rerenderTriggerDetails() {
      triggerDetails.innerHTML = "";

      const s = selectedTrigger; // Ensure selectedTrigger will not change for event handlers
      if (s) {
        const selectedTrigger = s;

        const form = (
          <form class="p-1">
            {createField(
              {
                key: "type",
                type: "select",
                description: (
                  <>
                    Determines the type of the trigger.
                    <br />
                    Upon selecting a type, there may be additional fields to fill out.
                  </>
                ),
                name: "Type",
                optional: false,
                options: OBJECTIVE_TYPES.map(type => type.type),
              },
              () => selectedTrigger.type,
              (_, value) => {
                if (selectedTrigger.type !== value) {
                  // Clear additional fields
                  const additional = OBJECTIVE_TYPES.find(type => type.type === selectedTrigger.type)?.additional;

                  if (additional) {
                    for (const { key } of additional) {
                      delete selectedTrigger[key as keyof Objective];
                    }
                  }

                  selectedTrigger.type = value as string;

                  rerenderTriggers();
                  rerenderTriggerDetails(); // Rerender to update additional fields
                  updateCodePreview();
                }
              }
            )}

            {createField(
              {
                key: "total",
                type: "input",
                description: (
                  <>
                    The total number of times the player must complete the set task to finish the trigger.
                    <br />
                    For example, if the trigger is to mine 100 stone blocks, the total would be <code>100</code>.
                  </>
                ),
                name: "Amount",
                optional: false,
              },
              () => selectedTrigger.total,
              (_, value) => {
                selectedTrigger.total = Number(value) || 1;
                updateCodePreview();
              }
            )}
          </form>
        );

        const typeDefinition = OBJECTIVE_TYPES.find(type => type.type === selectedTrigger.type);

        if (typeDefinition && typeDefinition.additional) {
          for (const additional of typeDefinition.additional) {
            const div = createField(
              additional,
              key => (key in selectedTrigger ? selectedTrigger[key as keyof Objective] : undefined),
              (key, value) => {
                if (value === null) {
                  delete selectedTrigger[key as keyof Objective];
                } else {
                  //@ts-expect-error - SHUT UP
                  selectedTrigger[key as keyof Objective] = value;
                }

                updateCodePreview();
              }
            );

            form.appendChild(div);
          }
        }

        triggerDetails.appendChild(form);
      } else {
        triggerDetails.appendChild(
          <div id="empty-state" class="empty full-height-tab">
            <p class="empty-title h5">No trigger selected</p>
            <p class="empty-subtitle">Edit a trigger by clicking on the sidebar or create a new one!</p>
          </div>
        );
      }
    }

    function rerenderTriggers() {
      triggerTab.textContent = `Triggers (${questObject.triggers.length})`;
      triggerList.innerHTML = "";

      if (questObject.triggers.length === 0) {
        triggerList.appendChild(<p class="text-gray text-center mt-2">No triggers added yet</p>);
      } else {
        for (const trigger of questObject.triggers) {
          const tile = (
            <div class="tile tile-centered">
              <div class="tile-content">
                <div class="tile-title">{trigger.display?.name || "Untitled Trigger"}</div>
                <small class="tile-subtitle text-gray">{trigger.type || "Unknown type"}</small>
              </div>
              <div class="tile-action">
                <div class="dropdown dropdown-right">
                  <button class="btn btn-edit" on:click={() => setSelectedTrigger(trigger)}>
                    <i class="icon icon-edit"></i>
                  </button>
                  <button
                    class="btn btn-delete"
                    on:click={() => {
                      questObject.triggers = questObject.triggers.filter(t => t !== trigger);
                      if (selectedTrigger === trigger) {
                        selectedTrigger = null;
                        rerenderTriggerDetails();
                      }
                      rerenderTriggers();
                    }}
                  >
                    <i class="icon icon-delete"></i>
                  </button>
                </div>
              </div>
            </div>
          );

          triggerList.appendChild(tile);
        }
      }

      updateInputsForCodePreviewEvents();
    }
    //#endregion

    //#region Objectives
    let selectedObjective: Objective | null = null;
    function setSelectedObjective(objective: Objective | null) {
      selectedObjective = objective;
      rerenderObjectiveDetails();
    }

    function rerenderObjectiveDetails() {
      objectiveDetails.innerHTML = "";

      const s = selectedObjective; // Ensure selectedObjective will not change for event handlers
      if (s) {
        const selectedObjective = s;

        const form = (
          <form class="p-1">
            {createField(
              {
                key: "name",
                type: "input",
                description: (
                  <>
                    The display text of the objective.
                    <br />
                    This will be displayed in the quest details.
                  </>
                ),
                name: "Name",
                optional: true,
              },
              () => selectedObjective.display?.name,
              (_, value) => {
                selectedObjective.display ??= {} as ObjectiveDisplay;
                selectedObjective.display.name = value as string;
                rerenderObjectives();
                updateCodePreview();
              }
            )}
            {createField(
              {
                key: "icon",
                type: "icon",
                description: (
                  <>
                    The display icon of the objective.
                    <br />
                    This will be displayed in the quest details.
                  </>
                ),
                name: "Icon",
                optional: true,
              },
              () => selectedObjective.display?.icon,
              (_, value) => {
                selectedObjective.display ??= {} as ObjectiveDisplay;
                selectedObjective.display.icon = value as Renderable;
                updateCodePreview();
              }
            )}
            {createField(
              {
                key: "type",
                type: "select",
                description: (
                  <>
                    Determines the type of the objective.
                    <br />
                    Upon selecting a type, there may be additional fields to fill out.
                  </>
                ),
                name: "Type",
                optional: false,
                options: OBJECTIVE_TYPES.map(type => type.type),
              },
              () => selectedObjective.type,
              (_, value) => {
                if (selectedObjective.type !== value) {
                  // Clear additional fields
                  const additional = OBJECTIVE_TYPES.find(type => type.type === selectedObjective.type)?.additional;

                  if (additional) {
                    for (const { key } of additional) {
                      delete selectedObjective[key as keyof Objective];
                    }
                  }

                  selectedObjective.type = value as string;

                  rerenderObjectives();
                  rerenderObjectiveDetails(); // Rerender to update additional fields
                  updateCodePreview();
                }
              }
            )}
            {createField(
              {
                key: "total",
                type: "input",
                description: (
                  <>
                    The total number of times the player must complete the set task to finish the objective.
                    <br />
                    For example, if the objective is to mine 100 stone blocks, the total would be <code>100</code>.
                  </>
                ),
                name: "Amount",
                optional: false,
              },
              () => selectedObjective.total,
              (_, value) => {
                selectedObjective.total = Number(value) || 1;
                updateCodePreview();
              }
            )}
          </form>
        );

        const typeDefinition = OBJECTIVE_TYPES.find(type => type.type === selectedObjective.type);

        if (typeDefinition && typeDefinition.additional) {
          for (const additional of typeDefinition.additional) {
            const div = createField(
              additional,
              key => (key in selectedObjective ? selectedObjective[key as keyof Objective] : undefined),
              (key, value) => {
                console.log({ key, value });
                if (value === null) {
                  delete selectedObjective[key as keyof Objective];
                } else {
                  //@ts-expect-error - SHUT UP
                  selectedObjective[key as keyof Objective] = value;
                }
              }
            );

            form.appendChild(div);
          }
        }

        objectiveDetails.appendChild(form);
      } else {
        objectiveDetails.appendChild(
          <div id="empty-state" class="empty full-height-tab">
            <p class="empty-title h5">No objective selected</p>
            <p class="empty-subtitle">Edit a objective by clicking on the sidebar or create a new one!</p>
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
        for (const objective of questObject.objectives) {
          const tile = (
            <div class="tile tile-centered">
              <div class="tile-content">
                <div class="tile-title">{objective.display?.name || "Untitled Objective"}</div>
                <small class="tile-subtitle text-gray">{objective.type || "Unknown type"}</small>
              </div>
              <div class="tile-action">
                <div class="dropdown dropdown-right">
                  <button class="btn btn-edit" on:click={() => setSelectedObjective(objective)}>
                    <i class="icon icon-edit"></i>
                  </button>
                  <button
                    class="btn btn-delete"
                    on:click={() => {
                      questObject.objectives = questObject.objectives.filter(t => t !== objective);
                      if (selectedObjective === objective) {
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
            </div>
          );

          objectiveList.appendChild(tile);
        }
      }

      updateInputsForCodePreviewEvents();
    }
    //#endregion

    //#region Rewards
    let selectedReward: Reward | null = null;
    function setSelectedReward(reward: Reward | null) {
      selectedReward = reward;
      rerenderRewardDetails();
    }

    function rerenderRewardDetails() {
      rewardDetails.innerHTML = "";

      const s = selectedReward; // Ensure selectedReward will not change for event handlers
      if (s) {
        const selectedReward = s;

        const form = (
          <form class="p-1">
            {createField(
              {
                type: "input",
                key: "name",
                name: "Name",
                description: (
                  <>
                    The display text of the reward.
                    <br />
                    This will be displayed in the quest details when the quest is completed.
                  </>
                ),
                optional: false,
              },
              () => selectedReward.display?.name,
              (_, value) => {
                selectedReward.display ??= {} as RewardDisplay;
                selectedReward.display.name = value as string;
                rerenderRewards();
              }
            )}
            {createField(
              {
                key: "icon",
                type: "icon",
                description: (
                  <>
                    The display icon of the reward.
                    <br />
                    This will be displayed in the quest details when the quest is completed.
                  </>
                ),
                name: "Icon",
                optional: true,
              },
              () => selectedReward.display?.icon,
              (_, value) => {
                selectedReward.display ??= {} as RewardDisplay;
                selectedReward.display.icon = value as Renderable;
                updateCodePreview();
              }
            )}
            {createField(
              {
                key: "type",
                type: "select",
                description: (
                  <>
                    Determines the type of the reward.
                    <br />
                    Upon selecting a type, there may be additional fields to fill out.
                  </>
                ),
                name: "Type",
                optional: false,
                options: REWARD_TYPES.map(type => type.type),
              },
              () => selectedReward.type,
              (_, value) => {
                if (selectedReward.type !== value) {
                  // Clear additional fields
                  const additional = REWARD_TYPES.find(type => type.type === selectedReward.type)?.additional;

                  if (additional) {
                    for (const { key } of additional) {
                      delete selectedReward[key as keyof Reward];
                    }
                  }

                  selectedReward.type = value as string;

                  rerenderRewards();
                  rerenderRewardDetails(); // Rerender to update additional fields
                  updateCodePreview();
                }
              }
            )}
          </form>
        );

        const typeDefinition = REWARD_TYPES.find(type => type.type === selectedReward.type);

        if (typeDefinition && typeDefinition.additional) {
          for (const additional of typeDefinition.additional) {
            const div = createField(
              additional,
              key => (key in selectedReward ? selectedReward[key as keyof Reward] : undefined),
              (key, value) => {
                console.log({ key, value });
                if (value === null) {
                  delete selectedReward[key as keyof Reward];
                } else {
                  //@ts-expect-error - SHUT UP
                  selectedReward[key as keyof Reward] = value;
                }
              }
            );

            form.appendChild(div);
          }
        }

        rewardDetails.appendChild(form);
      } else {
        rewardDetails.appendChild(
          <div id="empty-state" class="empty full-height-tab">
            <p class="empty-title h5">No reward selected</p>
            <p class="empty-subtitle">Edit a reward by clicking on the sidebar or create a new one!</p>
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
                <div class="tile-title">{reward.display?.name || "Untitled Reward"}</div>
                <small class="tile-subtitle text-gray">{reward.type || "Unknown type"}</small>
              </div>
              <div class="tile-action">
                <div class="dropdown dropdown-right">
                  <button class="btn btn-edit" on:click={() => setSelectedReward(reward)}>
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
            </div>
          );

          rewardList.appendChild(tile);
        }
      }

      updateInputsForCodePreviewEvents();
    }
    //#endregion

    screen.style.display = "none";

    // Default to general open
    const defaultDisplayStyles: Record<string, string> = {};
    (screen.querySelector(".tab") as HTMLElement).addEventListener("click", e => {
      e.preventDefault();

      const target = e.target as HTMLElement;

      if (target.tagName === "A") {
        const tab = target.getAttribute("data-tab")!;

        (screen.querySelectorAll(".tab-item a") as NodeListOf<HTMLElement>).forEach(tab => {
          tab.classList.remove("active");
        });

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

    // Initial render
    rerenderTriggers();
    rerenderTriggerDetails();
    rerenderObjectives();
    rerenderObjectiveDetails();
    rerenderRewards();
    rerenderRewardDetails();

    updateInputsForCodePreviewEvents();

    editArea.appendChild(screen);
  }

  function updateQuestList() {
    questList.innerHTML = "";
    const activeId = getShownDetailScreenId();

    for (const id of Object.keys(state.quests)) {
      const tile = createQuestTile(id);
      if (id === activeId) {
        tile.classList.add("active");
      }
      questList.appendChild(tile);
    }
  }

  function createEmptyQuest(id: string) {
    console.log("Creating empty quest with id", id);

    state.quests[id] = {
      triggers: [],
      objectives: [],
      rewards: [],
      display: {
        title: "",
        description: "",
      },
    };

    updateQuestList();

    if (isEditScreenEmpty()) {
      showQuestEditScreen(id);
    }
  }

  const addQuestButton = document.querySelector("#add-quest") as HTMLButtonElement;
  addQuestButton.addEventListener("click", () => {
    const id = Math.random().toString(36).substring(7);
    createEmptyQuest(id);
  });
});
