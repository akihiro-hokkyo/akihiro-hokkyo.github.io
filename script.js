(function () {
  "use strict";

  const content = window.SITE_CONTENT;
  if (!content) {
    throw new Error("content.js could not be loaded.");
  }

  const supportedLanguages = ["en", "ja"];

  function readStorage(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
    }
  }

  const storedLanguage = readStorage("ah-language");
  let language = supportedLanguages.includes(storedLanguage)
    ? storedLanguage
    : "en";

  const storedTheme = readStorage("ah-theme");
  let theme =
    storedTheme === "light" || storedTheme === "dark"
      ? storedTheme
      : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";

  const byId = (id) => document.getElementById(id);

  function make(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function translated(value) {
    if (!value) return "";

    if (typeof value === "string") {
      return value;
    }

    return value[language] ?? value.en ?? value.ja ?? "";
  }

  function copyAt(path) {
    return path
      .split(".")
      .reduce((value, key) => value?.[key], content.copy[language]);
  }

  function renderCopy() {
    document.querySelectorAll("[data-copy]").forEach((element) => {
      const value = copyAt(element.dataset.copy);
      if (typeof value === "string") element.textContent = value;
    });

    byId("primary-navigation").setAttribute(
      "aria-label",
      content.copy[language].primaryNavigation,
    );
    byId("profile-links").setAttribute(
      "aria-label",
      content.copy[language].profileLinks,
    );
  }

  function renderProfile() {
    byId("profile-role").textContent = translated(content.profile.role);
    byId("profile-affiliation").textContent = translated(
      content.profile.affiliation,
    );
    byId("profile-intro").textContent = translated(content.profile.intro);

    byId("email-link").href = `mailto:${content.profile.email}`;
    byId("email-text").textContent = content.profile.email;
    byId("scholar-link").href = content.profile.scholar;
    byId("orcid-link").href = content.profile.orcid;
  }

  function appendHighlightedAuthors(parent, authors) {
    const ownName = content.profile.name.en;
    const parts = authors.split(ownName);

    parts.forEach((part, index) => {
      if (index > 0) parent.append(make("strong", "", ownName));
      parent.append(document.createTextNode(part));
    });
  }

  function renderPublications() {
    const list = byId("publication-list");
    list.replaceChildren();

    const language = document.documentElement.lang.startsWith("ja")
      ? "ja"
      : "en";

    const labels = content.copy[language];

    // 番号は古い順に付け、表示だけ新しい順
    const numberedPublications = content.publications
      .map((publication, index) => ({
        publication,
        number: index + 1,
      }))
      .reverse();

    list.reversed = true;
    list.start = content.publications.length;

    numberedPublications.forEach(({ publication, number }) => {
      const item = document.createElement("li");
      item.value = number;

      const heading = make("div", "publication-heading");

      // タイトル
      const title = make("p", "publication-title", publication.title);

      heading.append(title);

      const badges = make("div", "publication-badges");

      if (publication.editorsSuggestion) {
        badges.append(
          make("span", "publication-badge", labels.editorsSuggestion),
        );
      }

      if (badges.childElementCount > 0) {
        heading.append(badges);
      }

      item.append(heading);

      // 著者と掲載誌
      const meta = make("p", "publication-meta");
      appendHighlightedAuthors(meta, publication.authors);
      meta.append(document.createTextNode(" · "));
      meta.append(make("em", "", publication.venue));
      item.append(meta);
      if (publication.equalContribution) {
        item.append(make("p", "publication-note", labels.equalContribution));
      }

      // 短い説明
      const summary =
        publication.summary?.[language] ?? publication.summary?.en;

      if (summary) {
        item.append(make("p", "publication-summary", summary));
      }

      // 論文リンク
      const links = make("p", "publication-links");

      publication.links.forEach((link) => {
        const anchor = make("a", "", link.label);
        anchor.href = link.href;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";

        const arrow = make("span", "", " ↗");
        arrow.setAttribute("aria-hidden", "true");

        anchor.append(arrow);
        links.append(anchor);
      });

      item.append(links);
      list.append(item);
    });
  }

  function renderTalks() {
    document.querySelectorAll("[data-talk-category]").forEach((group) => {
      const category = group.dataset.talkCategory;
      const list = group.querySelector(".talk-list");
      list.replaceChildren();

      content.talks
        .filter((talk) => talk.category === category)
        .forEach((talk) => {
          const item = document.createElement("li");

          const time = make("time", "", talk.date);
          time.dateTime = talk.date.replaceAll(".", "-");
          item.append(time);

          const talkCopy = make("div", "talk-copy");
          talkCopy.append(make("p", "talk-title", translated(talk.title)));
          talkCopy.append(make("p", "talk-venue", translated(talk.venue)));
          item.append(talkCopy);

          const tags = make("div", "talk-tags");
          if (talk.category !== "seminar" && talk.format) {
            tags.append(make("span", "", content.copy[language][talk.format]));
          }

          if (talk.award) {
            tags.append(
              make("span", "award-tag", content.copy[language].awardMark),
            );
          }

          if (tags.childElementCount > 0) {
            item.append(tags);
          }
          list.append(item);
        });
    });
  }

  function renderAwards() {
    const list = byId("award-list");
    list.replaceChildren();

    content.career.awards.forEach((award) => {
      const item = document.createElement("li");
      const time = make("time", "", award.date);
      time.dateTime = award.date.replaceAll(".", "-");
      item.append(time);

      const copy = document.createElement("div");
      copy.append(make("p", "award-title", translated(award.title)));
      copy.append(make("p", "", translated(award.organization)));
      const detail = translated(award.detail);

      if (detail) {
        copy.append(make("p", "career-detail multiline", detail));
      }
      item.append(copy);
      list.append(item);
    });
  }

  function renderCareerRecords(listId, records) {
    const list = byId(listId);
    list.replaceChildren();

    records.forEach((record) => {
      const item = document.createElement("li");

      item.append(make("span", "", record.period));

      const copy = document.createElement("div");

      copy.append(make("p", "", translated(record.title)));

      const detail = translated(record.detail);

      if (detail) {
        copy.append(make("p", "career-detail multiline", detail));
      }

      item.append(copy);
      list.append(item);
    });
  }

  function renderCareer() {
    renderCareerRecords("education-list", content.career.education);

    renderAwards();

    renderCareerRecords("fellowship-list", content.career.fellowships);

    renderCareerRecords("teaching-list", content.career.teaching);

    const refereeList = byId("referee-list");
    refereeList.replaceChildren();

    content.career.referee.forEach((journal) => {
      refereeList.append(make("li", "", journal));
    });
  }

  function renderControls() {
    const languageButton = byId("language-toggle");
    languageButton.setAttribute(
      "aria-label",
      content.copy[language].switchLanguage,
    );
    languageButton.querySelectorAll("[data-language]").forEach((option) => {
      option.classList.toggle("active", option.dataset.language === language);
    });

    const themeButton = byId("theme-toggle");
    const themeLabel =
      theme === "light"
        ? content.copy[language].darkMode
        : content.copy[language].lightMode;
    themeButton.setAttribute("aria-label", themeLabel);
    themeButton.title = themeLabel;
    themeButton.querySelector("span").textContent =
      theme === "light" ? "☾" : "☀";
  }

  function render() {
    document.documentElement.lang = language;
    document.documentElement.dataset.theme = theme;
    renderCopy();
    renderProfile();
    renderPublications();
    renderTalks();
    renderCareer();
    renderControls();
    byId("current-year").textContent = new Date().getFullYear();
  }

  byId("language-toggle").addEventListener("click", () => {
    language = language === "en" ? "ja" : "en";
    writeStorage("ah-language", language);
    render();
  });

  byId("theme-toggle").addEventListener("click", () => {
    theme = theme === "light" ? "dark" : "light";
    writeStorage("ah-theme", theme);
    render();
  });

  render();
})();
