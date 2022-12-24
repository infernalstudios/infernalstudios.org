/* eslint-disable no-inner-declarations */
/* eslint-disable no-undef */
function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

window.addEventListener("DOMContentLoaded", async () => {
  const yearElements = document.getElementsByClassName("year");
  for (let i = 0; i < yearElements.length; i++) {
    yearElements[i].innerText = new Date().getFullYear();
  }

  /** @type {HTMLDivElement} */
  const errorTextElement = document.querySelector("main > div > div#error");
  /** @type {HTMLElement} */
  const mainElement = document.querySelector("main");
  /** @type {HTMLDivElement} */
  const templatesContainer = document.querySelector("#templates");
  /** @type {{ [templateName: string]: HTMLElement[]; }} */
  const templates = {};

  for (const template of templatesContainer.children) {
    templates[template.id] = [...template.children];
  }

  const loggedInTextElement = document.querySelector("#logged-in-text");
  loggedInTextElement.innerHTML = "Currently not logged in";

  const logoutButton = document.querySelector("#logout");
  logoutButton.addEventListener("click", async e => {
    e.preventDefault();
    await fetch("/api/auth/token/" + getCookie("token"), {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + getCookie("token"),
      },
    }).catch(e => console.error(e));
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.location = "/login";
    return;
  });

  /**
   * @param {string} templateName
   */
  function setTemplate(template) {
    if (template in templates) {
      mainElement.innerHTML = "";
      mainElement.appendChild(errorTextElement.parentElement);
      for (const templateElement of templates[template]) {
        mainElement.appendChild(templateElement);
      }
    } else {
      throw new Error(`Unknown template: ${template}`);
    }
  }

  /**
   * @param {string} templateName
   */
  function addTemplate(template) {
    if (template in templates) {
      for (const templateElement of templates[template]) {
        mainElement.appendChild(templateElement);
      }
    } else {
      throw new Error(`Unknown template: ${template}`);
    }
  }

  /**
   * @param {string} templateName
   * @returns {string}
   */
  function getTemplate(template) {
    if (template in templates) {
      return templates[template].map(e => e.outerHTML).join("");
    } else {
      throw new Error(`Unknown template: ${template}`);
    }
  }

  /**
   * @param {string} name
   * @returns {string}
   */
  function getCookie(name) {
    const value = "; " + document.cookie;
    const parts = value.split("; " + name + "=");
    if (parts.length === 2) {
      return parts.pop().split(";").shift();
    }
    return "";
  }

  setTemplate("check-login");

  if (getCookie("token") === "") {
    document.location = "/login";
    return; // This probably isn't required, but it's a fail-safe
  }

  const tokenCheckResponse = await fetch("/api/auth/token", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + getCookie("token"),
    },
  })
    .then(response => response.json())
    .catch(err => {
      console.error(err);
    });

  if (!tokenCheckResponse.valid) {
    document.location = "/login";
    return; // This probably isn't required, but it's a fail-safe
  }

  const user = await fetch("/api/users/self", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + getCookie("token"),
    },
  })
    .then(response => response.json())
    .catch(err => {
      console.error(err);
    });

  loggedInTextElement.innerHTML = `Logged in as <strong>${user.id}</strong>`;

  /** @type {{ [id: string]: () => void }} */
  const pageInits = {
    mods: async () => {
      const modInfo = document.querySelector("#mod-info");
      modInfo.innerHTML = getTemplate("mod-info-empty");
      const modList = document.querySelector("#mods-list");

      async function setModInfo(mod) {
        modInfo.innerHTML = getTemplate("mod-info");
        const nameField = modInfo.querySelector("#mod-name");
        const urlField = modInfo.querySelector("#mod-url");
        const saveButton = modInfo.querySelector("#mod-meta-save");
        const versionPanel = modInfo.querySelector("#version");
        const getVersionPanel = () => modInfo.querySelector("#version");

        nameField.value = mod.name;
        urlField.value = mod.url;

        saveButton.addEventListener("click", async e => {
          e.preventDefault();

          nameField.disabled = true;
          urlField.disabled = true;
          saveButton.disabled = true;
          saveButton.classList.add("loading");
          const response = await fetch("/api/mods/" + mod.id, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + getCookie("token"),
            },
            body: JSON.stringify({
              name: nameField.value,
              url: urlField.value,
            }),
          });

          const responseJSON = await response.json();

          if (response.status === 200) {
            mod.name = nameField.value;
            nameField.disabled = false;
            mod.url = urlField.value;
            urlField.disabled = false;
          } else {
            nameField.value = mod.name;
            urlField.value = mod.url;

            for (const error of responseJSON.errors) {
              function removeError() {
                for (const field of [nameField, urlField]) {
                  field.classList.remove("is-error");
                  field.removeEventListener("input", removeError);
                }
              }
              if (error.path[0] === "name") {
                nameField.disabled = false;
                nameField.classList.add("is-error");
                nameField.addEventListener("input", removeError);
                urlField.disabled = false;
                urlField.classList.add("is-error");
                urlField.addEventListener("input", removeError);
              }
            }
            console.groupCollapsed("Something went wrong when saving mod metadata");
            console.error({ response, body: responseJSON });
            console.groupEnd();
          }

          saveButton.disabled = false;
          saveButton.classList.remove("loading");
        });

        /** @argument {Version} version */
        function setVersionInfo(version) {
          const versionPanel = getVersionPanel();

          versionPanel.innerHTML = getTemplate("version-info");

          const versionIDField = versionPanel.querySelector("#version-id");
          const versionNameField = versionPanel.querySelector("#version-name");
          const versionURLField = versionPanel.querySelector("#version-url");
          const versionMinecraftField = versionPanel.querySelector("#version-minecraft");
          const versionRecommendedCheckbox = versionPanel.querySelector("#version-recommended");
          const versionLoaderSelect = versionPanel.querySelector("#version-loader");
          const versionChangelogField = versionPanel.querySelector("#version-changelog");

          versionIDField.value = version.id;
          versionNameField.value = version.name;
          versionURLField.value = version.url;
          versionMinecraftField.value = version.minecraft;
          versionRecommendedCheckbox.checked = version.recommended;
          versionLoaderSelect.value = capitalize(version.loader);
          versionChangelogField.value = version.changelog;
        }

        function versionCreatePageInit(e) {
          e.preventDefault();

          versionPanel.innerHTML = getTemplate("add-version");

          const errorToast = versionPanel.querySelector("#error-toast");
          const versionIDField = versionPanel.querySelector("#version-id");
          const versionNameField = versionPanel.querySelector("#version-name");
          const versionURLField = versionPanel.querySelector("#version-url");
          const versionMinecraftField = versionPanel.querySelector("#version-minecraft");
          const versionRecommendedCheckbox = versionPanel.querySelector("#version-recommended");
          const versionLoaderSelect = versionPanel.querySelector("#version-loader");
          const versionChangelogField = versionPanel.querySelector("#version-changelog");
          const versionCreateButton = versionPanel.querySelector("#version-create");

          versionCreateButton.addEventListener("click", async e => {
            e.preventDefault();

            errorToast.classList.add("hidden");
            versionIDField.disabled = true;
            versionNameField.disabled = true;
            versionURLField.disabled = true;
            versionMinecraftField.disabled = true;
            versionRecommendedCheckbox.disabled = true;
            versionLoaderSelect.disabled = true;
            versionChangelogField.disabled = true;

            versionCreateButton.disabled = true;
            versionCreateButton.classList.add("loading");

            const versionMinecraftValues = versionMinecraftField.value.split(",");
            /** @type {[string, Response][]} */
            const responses = [];

            for (const minecraftValue of versionMinecraftValues) {
              const response = await fetch("/api/mods/" + mod.id + "/versions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: "Bearer " + getCookie("token"),
                },
                body: JSON.stringify({
                  id: versionIDField.value,
                  name: versionNameField.value,
                  url: versionURLField.value,
                  minecraft: minecraftValue,
                  recommended: versionRecommendedCheckbox.checked,
                  loader: versionLoaderSelect.value.toLowerCase(),
                  changelog: versionChangelogField.value,
                  dependencies: [],
                }),
              });

              responses.push([minecraftValue, response]);
            }

            let completed = true;
            let failedVersions = [];
            let firstCompletedResponse;

            for (const [minecraftVersion, response] of responses) {
              const responseJSON = await response.json();
              if (response.status !== 201) {
                completed = false;
                failedVersions.push([minecraftVersion, responseJSON, response]);
              } else if (!firstCompletedResponse) {
                firstCompletedResponse = responseJSON;
              }
            }

            if (completed) {
              const version = firstCompletedResponse;
              setModInfo(mod);
              setVersionInfo(version);
            } else {
              errorToast.innerHTML =
                failedVersions.map(([, responseJSON]) => responseJSON?.errors?.join("<br>")).join("<br>") ??
                "There was an error creating the version. Check the console for more details.";
              errorToast.classList.remove("hidden");
              versionIDField.disabled = false;
              versionNameField.disabled = false;
              versionURLField.disabled = false;
              versionMinecraftField.value = failedVersions.map(([minecraftVersion]) => minecraftVersion).join(",");
              versionMinecraftField.disabled = false;
              versionRecommendedCheckbox.disabled = false;
              versionLoaderSelect.disabled = false;
              versionChangelogField.disabled = false;
              versionCreateButton.disabled = false;
              versionCreateButton.classList.remove("loading");
              console.groupCollapsed("Something went wrong when creating a version");
              for (const [minecraftVersion, responseJSON, response] of failedVersions) {
                console.error(`minecraftVersion: ${minecraftVersion}`, { response, body: responseJSON });
              }
              console.groupEnd();
            }
          });
        }

        const modVersions = modInfo.querySelector("#mod-versions");
        modVersions.innerHTML = '<div class="loading loading-lg"></div>';
        const modVersionsResponse = await fetch("/api/mods/" + mod.id + "/versions", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + getCookie("token"),
          },
        });

        const addVersionButton = modInfo.querySelector("#add-version");
        addVersionButton.addEventListener("click", e => versionCreatePageInit(e));

        /**
         * @typedef Version
         * @property {string} id
         * @property {string} name
         * @property {string} url
         * @property {string} minecraft
         * @property {boolean} recommended
         * @property {string} changelog
         * @property {"forge" | "fabric" | "rift" | "liteloader" | "quilt"} loader
         * @property {string} mod
         * @property {VersionDependency[]} dependencies
         */

        /**
         * @typedef VersionDependency
         * @property {string} id
         * @property {string} url
         * @property {boolean} required
         * @property {"CLIENT" | "SERVER" | "BOTH"} side
         * @property {string} version
         */

        /** @type {Version[]} */
        const modVersionsJSON = await modVersionsResponse.json();
        if (modVersionsResponse.status === 200) {
          modVersions.innerHTML = "";
          for (const version of modVersionsJSON) {
            modVersions.innerHTML += getTemplate("version-tile")
              .replace(/\{\{name\}\}/g, version.name)
              .replace(/\{\{id\}\}/g, version.id)
              .replace(/\{\{Loader\}\}/g, capitalize(version.loader))
              .replace(/\{\{loader\}\}/g, version.loader)
              .replace(/\{\{minecraft\}\}/g, version.minecraft);
          }

          const versionTiles = [...modVersions.querySelectorAll(".tile[data-modid]")];

          for (const versionTile of versionTiles) {
            const version = modVersionsJSON.find(
              v => `${v.id}-${v.loader}-${v.minecraft}` === versionTile.attributes["data-modid"].value
            );

            versionTile.addEventListener("click", e => {
              if (!e.target.matches(".tile-action *")) {
                e.preventDefault();
                setVersionInfo(version);
              }
            });

            const duplicateAction = versionTile.querySelector(".mod-duplicate");
            const editAction = versionTile.querySelector(".mod-edit");
            const removeAction = versionTile.querySelector(".mod-delete");
            duplicateAction.addEventListener("click", e => {
              e.preventDefault();

              console.log("Duplicating version", version.id);

              versionCreatePageInit(e);

              const versionIDField = versionPanel.querySelector("#version-id");
              const versionNameField = versionPanel.querySelector("#version-name");
              const versionURLField = versionPanel.querySelector("#version-url");
              const versionMinecraftField = versionPanel.querySelector("#version-minecraft");
              const versionRecommendedCheckbox = versionPanel.querySelector("#version-recommended");
              /** @type {HTMLSelectElement} */
              const versionLoaderSelect = versionPanel.querySelector("#version-loader");
              const versionChangelogField = versionPanel.querySelector("#version-changelog");

              versionIDField.value = version.id;
              versionNameField.value = version.name;
              versionURLField.value = version.url;
              versionMinecraftField.value = version.minecraft;
              versionRecommendedCheckbox.checked = version.recommended;
              versionLoaderSelect.selectedIndex =
                ["forge", "fabric", "rift", "liteloader", "quilt"].indexOf(version.loader) + 1;
              versionChangelogField.value = version.changelog;
            });

            editAction.addEventListener("click", e => {
              e.preventDefault();
              window.alert("Version editing is not available yet.\nYou can duplicate and remove the version instead.");
            });

            removeAction.addEventListener("click", async e => {
              e.preventDefault();
              if (
                window.confirm(
                  `Are you sure you want to remove this version? This is not reversible.\n\nVersion ID: ${
                    version.id
                  } | ${capitalize(version.loader)} ${version.minecraft}`
                )
              ) {
                const response = await fetch(
                  `/api/mods/${mod.id}/versions?${new URLSearchParams({
                    version: version.id,
                    loader: version.loader,
                    minecraft: version.minecraft,
                  }).toString()}`,
                  {
                    method: "DELETE",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: "Bearer " + getCookie("token"),
                    },
                  }
                );

                if (response.status === 204) {
                  versionTile.parentElement.removeChild(versionTile);
                } else {
                  console.groupCollapsed("Something went wrong when removing the version");
                  console.error({ response, body: await response.json() });
                  console.groupEnd();
                  window.alert("Something went wrong when removing the version.\nCheck the console for more details.");
                }
              }
            });
          }
        } else {
          console.groupCollapsed("Something went wrong when getting mod versions");
          console.error({ response: modVersionsResponse, body: modVersionsJSON });
          console.groupEnd();
          modVersionsResponse.innerHTML = "Something went wrong getting mod versions, check the console for more info.";
        }
      }

      /** @type {{id: string; name: string; url: string;}[]} */
      const mods = await fetch("/api/mods", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + getCookie("token"),
        },
      })
        .then(response => response.json())
        .catch(err => {
          console.error(err);
        });
      if (!Array.isArray(mods)) {
        console.groupCollapsed("Something went wrong while fetching mods!");
        console.error("Mods response is not an array:");
        console.error(mods);
        console.groupEnd();
      }
      modList.innerHTML = "";
      for (const mod of mods) {
        const template = getTemplate("mod-tile")
          .replace(/\{\{id\}\}/g, mod.id)
          .replace(/\{\{name\}\}/g, mod.name)
          .replace(/\{\{url\}\}/g, mod.url);
        modList.innerHTML += template;
      }

      const modTiles = [...modList.querySelectorAll(".tile-mod[data-modid]")];
      for (const modTile of modTiles) {
        const mod = mods.find(mod => mod.id === modTile.attributes["data-modid"].value);
        modTile.addEventListener("click", async e => {
          e.preventDefault();
          setModInfo(mod);
        });
      }
    },
  };

  function initMainPage(id = "overview") {
    setTemplate("header");
    const tabsList = document.querySelector("main ul.tab");
    const tab = tabsList.querySelector(`#${id}-tab-btn`);
    if (!tab) {
      return initMainPage("overview");
    }
    tab.classList.add("active");
    addTemplate(`${id}-tab`);
    /** @type {HTMLAnchorElement[]} */
    const tabs = [];
    for (const tab of tabsList.children) {
      tabs.push(tab.querySelector("a"));
    }
    function tabClick(e) {
      e.preventDefault();
      const tab = e.target;
      for (const tablooped of tabs) {
        tablooped.classList.remove("active");
        tablooped.removeEventListener("click", tabClick);
      }
      tab.classList.add("active");
      initMainPage(tab.id.split("-tab-btn")[0]);
    }
    for (const tab of tabs) {
      if (tab.classList.contains("active")) {
        continue;
      }
      tab.addEventListener("click", tabClick);
    }
    if (id in pageInits) {
      pageInits[id]();
    }
    document.location.hash = id;
  }

  initMainPage("mods");
});
