/* eslint-disable no-undef */

const mods = [
  {
    name: "Infernal Expansion",
    urlIdentifier: "infernalexpansion",
    logo: "/img/infernal-expansion-logo.webp",
  },
  {
    name: "Mining Master",
    urlIdentifier: "miningmaster",
    logo: "/img/mining-master-logo.webp",
  },
  {
    name: "Food Effects",
    urlIdentifier: "foodeffects",
    logo: "/img/food-effects-logo.webp",
    customImgStyle: "width: 22vw;",
  },
  {
    name: "Second Chance",
    urlIdentifier: "secondchanceforge",
    logo: "/img/second-chance-logo.webp",
  },
  {
    name: "Neko's Enchanted Books",
    urlIdentifier: "nebs",
    logo: "/img/nekos-enchanted-books-logo.webp",
  },
  {
    name: "Celestial Config",
    urlIdentifier: "celestialconfig",
    logo: "/img/celestial-config-logo.webp",
  },
];

for (let i = 0; i < mods.length; i++) {
  new Image().src = mods[i].logo;
}

window.addEventListener("DOMContentLoaded", () => {
  const modContainer = document.getElementById("mod-container");
  modContainer.innerHTML = "<!-- The following code inside this element is generated by a script -->";

  /** @type {HTMLDivElement} */
  const modContainerDiv = document.createElement("div");
  modContainerDiv.classList.add("columns", "col-9", "col-mx-auto");
  modContainer.appendChild(modContainerDiv);

  for (let i = 0; i < mods.length; i++) {
    const modElement = document.createElement("div");
    modElement.classList.add("column", "col-4", "px-2", "col-lg-auto", "col-mx-auto", "align-middle");
    const mod = mods[i];
    const imgStyle = "customImgStyle" in mod ? `style="${mod.customImgStyle}"` : "";
    modElement.innerHTML = `
      <h4>
        <img alt="${mod.name} Logo" class="mod-logo" src="${mod.logo}" ${imgStyle} />
      </h4>
      <h4 class="text-center">
        <ul class="breadcrumb breadcrumb-equal">
          <li class="breadcrumb-item">
            <a href="/${mod.urlIdentifier}/curseforge">CurseForge</a>
          </li>
          <li class="breadcrumb-item">
            <a href="/${mod.urlIdentifier}/modrinth">Modrinth</a>
          </li>
          <li class="breadcrumb-item">
            <a href="/${mod.urlIdentifier}/github">GitHub</a>
          </li>
        </ul>
      </h4>
    `;
    modContainerDiv.appendChild(modElement);
  }
});