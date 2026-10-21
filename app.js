"use strict";

const PAGE_SIZE = 50;

const SIDO_ORDER = [
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "경기도",
  "강원특별자치도",
  "충청북도",
  "충청남도",
  "전북특별자치도",
  "전라북도",
  "전남광주통합특별시",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
];

const form = document.querySelector("#filters");
const sidoEl = document.querySelector("#sido");
const sigunguEl = document.querySelector("#sigungu");
const sigunguHelp = document.querySelector("#sigungu-help");
const queryEl = document.querySelector("#q");
const clearBtn = document.querySelector("#clear");
const countEl = document.querySelector("#count");
const liveEl = document.querySelector("#live");
const topSection = document.querySelector("#top");
const topHeading = document.querySelector("#top-heading");
const topList = document.querySelector("#top-list");
const rowsEl = document.querySelector("#rows");
const pager = document.querySelector("#pager");
const prevBtn = document.querySelector("#prev");
const nextBtn = document.querySelector("#next");
const pageInput = document.querySelector("#page");
const pageTotal = document.querySelector("#page-total");
const rangeEl = document.querySelector("#range");
const table = document.querySelector("#result-table");

const numberFormat = new Intl.NumberFormat("ko-KR");

let groups = [];
let page = 1;
let liveTimer = 0;

function resourceUrl(fileName) {
  const base = new URL(window.location.href);
  if (base.pathname.endsWith("/index.html")) {
    base.pathname = base.pathname.slice(0, -"index.html".length);
  } else if (!base.pathname.endsWith("/")) {
    base.pathname += "/";
  }
  return new URL(fileName, base);
}

function normalize(text) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function splitRegion(region) {
  const space = region.indexOf(" ");
  if (space === -1) {
    return { sido: region, sigungu: "" };
  }
  return {
    sido: region.slice(0, space),
    sigungu: region.slice(space + 1),
  };
}

function groupRows(rows) {
  const map = new Map();
  for (const row of rows) {
    let item = map.get(row.name);
    if (!item) {
      item = {
        rank: row.rank,
        name: row.name,
        interestText: Number(row.interest).toFixed(4),
        interest: Number(row.interest),
        sameNameRows: row.same_name_rows,
        regions: [],
        seen: new Set(),
      };
      map.set(row.name, item);
    }
    if (!item.seen.has(row.region)) {
      item.seen.add(row.region);
      item.regions.push(row.region);
    }
  }

  const list = [];
  for (const item of map.values()) {
    item.places = item.regions.map(splitRegion);
    item.haystack = normalize(`${item.name} ${item.regions.join(" ")}`);
    list.push(item);
  }
  list.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, "ko"));
  return list;
}

function fillSido() {
  const present = new Set();
  for (const item of groups) {
    for (const place of item.places) {
      present.add(place.sido);
    }
  }
  const ordered = [];
  const used = new Set();
  for (const name of SIDO_ORDER) {
    if (present.has(name) && !used.has(name)) {
      ordered.push(name);
      used.add(name);
    }
  }
  const rest = [...present].filter((name) => !used.has(name));
  rest.sort((a, b) => a.localeCompare(b, "ko"));
  ordered.push(...rest);

  const current = sidoEl.value;
  sidoEl.replaceChildren();
  const all = document.createElement("option");
  all.value = "";
  all.textContent = "전체";
  sidoEl.append(all);
  for (const name of ordered) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    sidoEl.append(option);
  }
  if ([...sidoEl.options].some((option) => option.value === current)) {
    sidoEl.value = current;
  }
}

function fillSigungu() {
  const sido = sidoEl.value;
  sigunguEl.replaceChildren();
  const all = document.createElement("option");
  all.value = "";
  all.textContent = "전체";
  sigunguEl.append(all);
  if (!sido) {
    sigunguEl.disabled = true;
    sigunguEl.value = "";
    sigunguHelp.hidden = false;
    return;
  }
  const names = new Set();
  for (const item of groups) {
    for (const place of item.places) {
      if (place.sido === sido && place.sigungu) {
        names.add(place.sigungu);
      }
    }
  }
  const sorted = [...names].sort((a, b) => a.localeCompare(b, "ko"));
  for (const name of sorted) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    sigunguEl.append(option);
  }
  sigunguEl.disabled = false;
  sigunguHelp.hidden = true;
}

function currentList() {
  const sido = sidoEl.value;
  const sigungu = sigunguEl.disabled ? "" : sigunguEl.value;
  const query = normalize(queryEl.value);
  if (!sido && !sigungu && !query) {
    return groups;
  }
  return groups.filter((item) => {
    if (sido) {
      const hit = item.places.some((place) => {
        if (place.sido !== sido) {
          return false;
        }
        if (sigungu && place.sigungu !== sigungu) {
          return false;
        }
        return true;
      });
      if (!hit) {
        return false;
      }
    }
    if (query && !item.haystack.includes(query)) {
      return false;
    }
    return true;
  });
}

function announce(text, immediate) {
  countEl.textContent = text;
  window.clearTimeout(liveTimer);
  if (immediate) {
    liveEl.textContent = text;
    return;
  }
  liveTimer = window.setTimeout(() => {
    liveEl.textContent = text;
  }, 350);
}

function summaryText(list, start, end) {
  const count = `일치하는 이름 ${numberFormat.format(list.length)}개`;
  if (list.length === 0) {
    return count;
  }
  return `${count}. ${numberFormat.format(start)}–${numberFormat.format(end)}번째를 보는 중입니다.`;
}

function labeledCell(label, valueNode, className) {
  const td = document.createElement("td");
  td.setAttribute("role", "cell");
  const labelEl = document.createElement("span");
  labelEl.className = "cell-label";
  labelEl.textContent = label;
  td.append(labelEl, valueNode);
  if (className) {
    td.className = className;
  }
  return td;
}

function cell(text, label, className) {
  const value = document.createElement("span");
  value.className = "cell-value";
  value.textContent = text;
  return labeledCell(label, value, className);
}

function regionCell(item) {
  const list = document.createElement("ul");
  list.className = "regions";
  for (const region of item.regions) {
    const li = document.createElement("li");
    li.textContent = region;
    list.append(li);
  }
  return labeledCell("지역", list);
}

function renderTop(list) {
  if (list.length === 0) {
    topSection.hidden = true;
    topList.replaceChildren();
    return;
  }
  const shown = list.slice(0, 10);
  topSection.hidden = false;
  topHeading.textContent = shown.length === 10 ? "이 조건의 상위 10" : `이 조건의 상위 ${shown.length}`;
  const maxInterest = shown[0].interest > 0 ? shown[0].interest : 1;
  topList.replaceChildren();
  for (const item of shown) {
    const li = document.createElement("li");
    li.className = "top-item";

    const badge = document.createElement("span");
    badge.className = "rank-badge";
    badge.append(document.createTextNode(String(item.rank)));
    const unit = document.createElement("span");
    unit.className = "sr-only";
    unit.textContent = "위";
    badge.append(unit);

    const name = document.createElement("span");
    name.className = "top-name";
    name.textContent = item.name;

    const interest = document.createElement("span");
    interest.className = "top-interest";
    const interestLabel = document.createElement("span");
    interestLabel.className = "sr-only";
    interestLabel.textContent = "상대 관심도 ";
    interest.append(interestLabel, document.createTextNode(item.interestText));

    const regions = document.createElement("span");
    regions.className = "top-regions";
    regions.textContent = item.regions.join(", ");

    const bar = document.createElement("span");
    bar.className = "bar";
    bar.setAttribute("aria-hidden", "true");
    const fill = document.createElement("span");
    const width = Math.max(0, (item.interest / maxInterest) * 100);
    fill.style.setProperty("--w", `${width}%`);
    bar.append(fill);

    li.append(badge, name, interest, regions, bar);
    topList.append(li);
  }
}

function renderTable(list, immediate) {
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE) || 1);
  if (!Number.isFinite(page)) {
    page = 1;
  }
  page = Math.floor(page);
  if (page < 1) {
    page = 1;
  }
  if (page > pages) {
    page = pages;
  }

  rowsEl.replaceChildren();
  if (list.length === 0) {
    const tr = document.createElement("tr");
    tr.setAttribute("role", "row");
    const td = document.createElement("td");
    td.setAttribute("role", "cell");
    td.colSpan = 5;
    td.className = "empty";
    td.textContent = "조건에 맞는 등록 이름이 없습니다. 시도나 검색어를 바꿔 보세요.";
    tr.append(td);
    rowsEl.append(tr);
    pager.hidden = true;
    announce(summaryText(list, 0, 0), immediate);
    return;
  }

  const start = (page - 1) * PAGE_SIZE;
  const slice = list.slice(start, start + PAGE_SIZE);
  for (const item of slice) {
    const tr = document.createElement("tr");
    tr.setAttribute("role", "row");
    tr.append(
      cell(String(item.rank), "순위", "num"),
      cell(item.name, "등록 이름", "name"),
      regionCell(item),
      cell(item.interestText, "상대 관심도", "num"),
      cell(String(item.sameNameRows), "같은 이름", "num"),
    );
    rowsEl.append(tr);
  }

  const end = start + slice.length;
  pager.hidden = false;
  rangeEl.textContent = `${numberFormat.format(start + 1)}–${numberFormat.format(end)}번째 이름`;
  pageInput.value = String(page);
  pageInput.max = String(pages);
  pageTotal.textContent = `/ ${numberFormat.format(pages)}`;
  prevBtn.disabled = page <= 1;
  nextBtn.disabled = page >= pages;
  announce(summaryText(list, start + 1, end), immediate);
}

function render(options) {
  const immediate = Boolean(options && options.immediate);
  const list = currentList();
  renderTop(list);
  renderTable(list, immediate);
}

function scrollToTable() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  table.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  page = 1;
  render({ immediate: true });
});

sidoEl.addEventListener("change", () => {
  fillSigungu();
  page = 1;
  render({ immediate: true });
});

sigunguEl.addEventListener("change", () => {
  page = 1;
  render({ immediate: true });
});

queryEl.addEventListener("input", () => {
  page = 1;
  render({ immediate: false });
});

clearBtn.addEventListener("click", () => {
  sidoEl.value = "";
  queryEl.value = "";
  fillSigungu();
  page = 1;
  render({ immediate: true });
  sidoEl.focus();
});

prevBtn.addEventListener("click", () => {
  page -= 1;
  render({ immediate: true });
  scrollToTable();
});

nextBtn.addEventListener("click", () => {
  page += 1;
  render({ immediate: true });
  scrollToTable();
});

pageInput.addEventListener("change", () => {
  page = Number(pageInput.value);
  render({ immediate: true });
  scrollToTable();
});

const narrowQuery = window.matchMedia("(max-width: 800px)");
const tableHead = document.querySelector("thead");

function syncTableHead() {
  tableHead.toggleAttribute("aria-hidden", narrowQuery.matches);
}

narrowQuery.addEventListener("change", syncTableHead);
window.addEventListener("resize", syncTableHead);
syncTableHead();

async function init() {
  try {
    const response = await fetch(resourceUrl("camping-search-rank-all.json"));
    if (!response.ok) {
      throw new Error("load");
    }
    const rows = await response.json();
    if (!Array.isArray(rows)) {
      throw new Error("shape");
    }
    groups = groupRows(rows);
    fillSido();
    fillSigungu();
    render({ immediate: true });
  } catch {
    countEl.textContent = "목록을 불러오지 못했습니다. 페이지를 다시 열어 주세요.";
    liveEl.textContent = countEl.textContent;
  }
}

init();
