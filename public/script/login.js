/* eslint-disable no-inner-declarations */
/* eslint-disable no-undef */

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
   * @param {string?} errorText
   */
  function setError(errorText = "", style = "") {
    if (typeof errorText !== "string" || errorText.trim().length === 0) {
      errorTextElement.innerText = "";
      errorTextElement.classList.add("hidden");
    } else {
      errorTextElement.innerText = errorText;
      errorTextElement.style = style;
      errorTextElement.classList.remove("hidden");
      errorTextElement.scrollTo({ behavior: "smooth" });
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

  /**
   * @param {string} name
   * @param {string} value
   * @param {object} options
   * @param {"none" | "lax" | "strict"} options.sameSite
   * @param {boolean} options.secure
   * @param {number} options.maxAge
   */
  function setCookie(
    name,
    value,
    { sameSite, secure, maxAge } = { sameSite: "none", secure: false, maxAge: 31536000 }
  ) {
    document.cookie = `${name}=${value}; samesite=${sameSite}; secure=${secure}; max-age=${maxAge}`;
  }

  async function promptLogin() {
    setTemplate("login");
    /** @type {HTMLInputElement} */
    const usernameField = mainElement.querySelector("#username");
    /** @type {HTMLInputElement} */
    const passwordField = mainElement.querySelector("#password");
    /** @type {HTMLButtonElement} */
    const loginButton = mainElement.querySelector("#login");

    setError("");
    usernameField.disabled = false;
    passwordField.disabled = false;
    loginButton.disabled = false;
    loginButton.classList.remove("loading");

    if (usernameField.value.trim().length === 0) {
      usernameField.focus({ preventScroll: false });
    } else {
      passwordField.focus({ preventScroll: false });
    }

    loginButton.addEventListener("click", async function onClick(e) {
      e.preventDefault();

      usernameField.disabled = true;
      passwordField.disabled = true;
      loginButton.removeEventListener("click", onClick);
      loginButton.disabled = true;
      loginButton.classList.add("loading");

      const { json, status } = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: usernameField.value.trim(),
          password: passwordField.value,
        }),
      })
        .then(async response => ({ json: await response.json(), status: response.status }))
        .catch(err => {
          console.error(err);

          setError("An error occurred: " + err.message, "width: 65vw;");

          usernameField.disabled = false;
          passwordField.disabled = false;
          loginButton.disabled = false;
          loginButton.classList.remove("loading");
          loginButton.addEventListener("click", onClick);
        });

      if (status === 200) {
        setCookie("token", json.id, {
          sameSite: "strict",
          secure: true,
          maxAge: Math.floor(json.expiry - Date.now() / 1000 - 30),
        });
        setTemplate("check-login");
        attemptLoginFromCookie();
      } else {
        setError("An error occurred: " + json.errors[0], "width: 65vw;");

        function removeError() {
          setError("");
          for (const field of [usernameField, passwordField]) {
            field.classList.remove("is-error");
            field.removeEventListener("input", removeError);
          }
        }

        usernameField.disabled = false;
        usernameField.classList.add("is-error");
        usernameField.addEventListener("input", removeError);
        passwordField.disabled = false;
        passwordField.classList.add("is-error");
        passwordField.addEventListener("input", removeError);
        loginButton.disabled = false;
        loginButton.classList.remove("loading");
        loginButton.addEventListener("click", onClick);
      }
    });
  }

  async function attemptLoginFromCookie() {
    const response = await fetch("/api/auth/token", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + getCookie("token"),
      },
    })
      .then(response => response.json())
      .catch(err => {
        console.error(err);
        promptLogin();
        setError("An error occurred while trying to authenticate you. Please try again.");
      });

    if (response.valid) {
      // Check if password requires change
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

      if (user.passwordChangeRequested) {
        setTemplate("change-password");
        /** @type {HTMLInputElement} */
        const passwordField = mainElement.querySelector("#change-password");
        /** @type {HTMLInputElement} */
        const repeatPasswordField = mainElement.querySelector("#repeat-password");
        /** @type {HTMLButtonElement} */
        const changePasswordButton = mainElement.querySelector("#change-password-submit");
        const passwordMatchHint = mainElement.querySelector("#password-match-hint");

        changePasswordButton.disabled = true;

        passwordField.addEventListener("input", () => {
          changePasswordButton.disabled = passwordField.value.length === 0;
        });

        repeatPasswordField.addEventListener("input", () => {
          changePasswordButton.disabled =
            passwordField.value.length === 0 ||
            repeatPasswordField.value.length === 0 ||
            repeatPasswordField.value !== passwordField.value;

          if (repeatPasswordField.value !== passwordField.value) {
            passwordField.classList.add("is-error");
            repeatPasswordField.classList.add("is-error");
            passwordMatchHint.classList.remove("hidden");
          } else {
            passwordField.classList.remove("is-error");
            repeatPasswordField.classList.remove("is-error");
            passwordMatchHint.classList.add("hidden");
          }
        });

        changePasswordButton.addEventListener("click", async e => {
          e.preventDefault();

          changePasswordButton.disabled = true;
          changePasswordButton.classList.add("loading");
          passwordField.disabled = true;
          repeatPasswordField.disabled = true;
          passwordMatchHint.classList.add("hidden");
          passwordField.classList.remove("is-error");
          repeatPasswordField.classList.remove("is-error");

          const { json, status } = await fetch("/api/users/self", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + getCookie("token"),
            },
            body: JSON.stringify({
              password: passwordField.value,
              passwordChangeRequested: false,
            }),
          });

          if (status === 200) {
            setTemplate("check-login");
            attemptLoginFromCookie();
          } else {
            console.error(await json());
            setError("An error occurred, check the console for more details");
            passwordField.disabled = false;
            repeatPasswordField.disabled = false;
            changePasswordButton.disabled = false;
            changePasswordButton.classList.remove("loading");
            passwordField.classList.add("is-error");
            repeatPasswordField.classList.add("is-error");
            passwordMatchHint.classList.remove("hidden");
          }
        });

        return;
      } else {
        document.location = "/admin";
        return; // This probably isn't required, but it's a fail-safe
      }
    } else {
      setCookie("token", "");
      promptLogin();
    }
  }

  setTemplate("check-login");

  if (getCookie("token") !== "") {
    attemptLoginFromCookie();
  } else {
    promptLogin();
  }
});
