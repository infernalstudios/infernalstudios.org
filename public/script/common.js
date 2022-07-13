/* eslint-disable no-undef */
window.addEventListener("DOMContentLoaded", () => {
  const yearElements = document.getElementsByClassName("year");
  for (let i = 0; i < yearElements.length; i++) {
    yearElements[i].innerText = new Date().getFullYear();
  }
});
