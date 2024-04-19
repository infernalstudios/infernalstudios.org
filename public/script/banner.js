/* eslint-disable no-undef */

function preloadImage(url) {
  const img = new Image();
  img.src = url;
}

const patreonBannerImgs = [
  "/img/patreon-banner-textless-1.webp",
  "/img/patreon-banner-textless-2.webp",
  "/img/patreon-banner-textless-3.webp",
];

for (let i = 0; i < patreonBannerImgs.length; i++) {
  preloadImage(patreonBannerImgs[i]);
}
preloadImage("/img/patreon-logo.webp");

// Patreon banner
window.addEventListener("DOMContentLoaded", () => {
  /** @type {HTMLDivElement} */
  const bannerContainer = document.getElementById("patreon-banner");

  bannerContainer.style.backgroundImage = `url(${JSON.stringify(
    patreonBannerImgs[Math.floor(Math.random() * patreonBannerImgs.length)]
  )})`;

  bannerContainer.addEventListener("click", () => {
    window.location.href = "/patreon";
  });
});
