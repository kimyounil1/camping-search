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
const sidoChoices = document.querySelector("#sido-choices");
const themeChoices = document.querySelector("#theme-choices");
const moodChoices = document.querySelector("#mood-choices");
const amenityChoices = document.querySelector("#amenity-choices");
const queryEl = document.querySelector("#q");
const indutyChoices = document.querySelector("#induty-choices");
const estimateChoices = document.querySelector("#estimate-choices");
const clearBtn = document.querySelector("#clear");
const countEl = document.querySelector("#count");
const liveEl = document.querySelector("#live");
const topSection = document.querySelector("#top");
const topHeading = document.querySelector("#top-heading");
const topList = document.querySelector("#top-list");
const resultList = document.querySelector("#result-list");
const resultEmpty = document.querySelector("#result-empty");
const resultsSection = document.querySelector("#results");
const browse = document.querySelector("#browse");
const mapCount = document.querySelector("#map-count");
const mapEmpty = document.querySelector("#map-empty");
const pager = document.querySelector("#pager");
const prevBtn = document.querySelector("#prev");
const nextBtn = document.querySelector("#next");
const pageInput = document.querySelector("#page");
const pageTotal = document.querySelector("#page-total");
const rangeEl = document.querySelector("#range");
const numberFormat = new Intl.NumberFormat("ko-KR");
const CAMP_PAGE = "https://www.gocamping.or.kr/bsite/camp/info/read.do?c_no=";
const TEXT_KEYS = ["intro", "lineIntro", "featureNm", "glampInnerFclty", "caravInnerFclty", "sbrsCl"];
const ESTIMATE_KEYS = ["intro", "lineIntro", "featureNm"];
const ESTIMATE_PHRASES = ["개별화장실", "개별욕실", "개별샤워", "프라이빗"];
const PET_BLOCKS = ["애견불가", "반려동물불가", "반려견불가"];
const CHIPS = {
  감성: { phrases: ["감성"] },
  프라이빗: { phrases: ["프라이빗"], estimated: true },
  넓은간격: { phrases: ["넓은간격", "사이트간격", "사이트간거리", "간격이넓", "거리가멀", "거리가넓", "사이트사이"] },
  오션뷰: { phrases: ["오션뷰", "바다전망", "바다뷰"] },
  숲속: { phrases: ["숲속"] },
  해돋이: { phrases: ["해돋이", "일출"] },
  차박: { phrases: ["차박"] },
  장박: { phrases: ["장박"] },
  그늘: { phrases: ["그늘"] },
  매너타임: { phrases: ["매너타임"] },
  깨끗한: { phrases: ["깨끗", "청결", "깔끔"] },
  힐링: { phrases: ["힐링"] },
  조용한: { phrases: ["조용"] },
  럭셔리: { phrases: ["럭셔리"] },
  모던: { phrases: ["모던"] },
  이색: { phrases: ["이색"] },
  수영장: { phrases: ["수영장", "물놀이장"] },
  스파: { phrases: ["스파", "찜질", "사우나"] },
  바비큐: { phrases: ["바비큐", "바베큐", "그릴"] },
  애견동반: { phrases: ["애견", "반려동물", "반려견"], pet: true },
};

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
        regionFacilities: [],
        coords: [],
        seen: new Set(),
      };
      map.set(row.name, item);
    }
    if (!item.seen.has(row.region)) {
      item.seen.add(row.region);
      item.regions.push(row.region);
      item.regionFacilities.push(row.facility || null);
      item.coords.push(placeCoord(row));
    }
  }

  const list = [];
  for (const item of map.values()) {
    item.places = item.regions.map(splitRegion);
    item.facilities = collapseFacilities(item);
    item.hasFacility = item.facilities.length > 0;
    item.estimated = item.facilities.some((facility) => facility.estimated);
    item.types = [];
    const notes = [];
    for (const facility of item.facilities) {
      for (const type of facility.types || []) {
        if (!item.types.includes(type)) {
          item.types.push(type);
        }
      }
      if (facility.locationNote) {
        notes.push(facility.locationNote);
      }
    }
    item.haystack = normalize(`${item.name} ${item.regions.join(" ")} ${notes.join(" ")}`);
    list.push(item);
  }
  list.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, "ko"));
  return list;
}

function placeCoord(row) {
  const lat = Number(row.lat);
  const lng = Number(row.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return { lat, lng };
}

function collapseFacilities(item) {
  const present = [];
  for (let index = 0; index < item.regions.length; index += 1) {
    const facility = item.regionFacilities[index];
    if (!facility) {
      continue;
    }
    present.push({ region: item.regions[index], facility });
  }
  if (present.length === 0) {
    return [];
  }
  const ids = new Set(present.map((entry) => entry.facility.contentId));
  if (ids.size === 1) {
    return [present[0].facility];
  }
  return present.map((entry) => ({ ...entry.facility, regionLabel: entry.region }));
}

function checkedValues(container) {
  return [...container.querySelectorAll("input:checked")].map((input) => input.value);
}

function choiceBox(name, value, label, checked) {
  const choice = document.createElement("label");
  choice.className = "choice";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.name = name;
  input.value = value;
  input.checked = checked;
  const text = document.createElement("span");
  text.textContent = label;
  choice.append(input, text);
  return choice;
}

function orderedSidos() {
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
  return ordered;
}

function fillSido() {
  const current = new Set(checkedValues(sidoChoices));
  sidoChoices.replaceChildren();
  for (const name of orderedSidos()) {
    sidoChoices.append(choiceBox("sido", name, name, current.has(name)));
  }
}

function compactWithMap(text) {
  const source = String(text || "");
  let compact = "";
  const map = [];
  for (let index = 0; index < source.length; index += 1) {
    if (/\s/u.test(source[index])) {
      continue;
    }
    map.push(index);
    compact += source[index];
  }
  return { source, compact, map };
}

function blockedRanges(compact) {
  const ranges = [];
  for (const block of PET_BLOCKS) {
    let from = 0;
    while (from < compact.length) {
      const at = compact.indexOf(block, from);
      if (at === -1) {
        break;
      }
      ranges.push([at, at + block.length]);
      from = at + block.length;
    }
  }
  return ranges;
}

function rangeBlocked(start, end, ranges) {
  return ranges.some(([from, to]) => start < to && end > from);
}

function excerptAround(packed, start, length) {
  const originStart = packed.map[start];
  const originEnd = packed.map[start + length - 1] + 1;
  const from = Math.max(0, originStart - 16);
  const to = Math.min(packed.source.length, originEnd + 20);
  let snippet = packed.source.slice(from, to).replace(/\s+/g, " ").trim();
  if (from > 0) {
    snippet = `…${snippet}`;
  }
  if (to < packed.source.length) {
    snippet = `${snippet}…`;
  }
  return snippet;
}

function findPhrase(packed, phrase, ranges) {
  const needle = String(phrase || "").replace(/\s+/g, "");
  if (!needle) {
    return "";
  }
  let from = 0;
  while (from < packed.compact.length) {
    const at = packed.compact.indexOf(needle, from);
    if (at === -1) {
      return "";
    }
    if (!ranges || !rangeBlocked(at, at + needle.length, ranges)) {
      return excerptAround(packed, at, needle.length);
    }
    from = at + 1;
  }
  return "";
}

function phraseExcerpt(facility, phrases, pet, keys) {
  if (!facility) {
    return "";
  }
  for (const key of keys) {
    const packed = compactWithMap(facility[key]);
    if (!packed.compact) {
      continue;
    }
    const ranges = pet ? blockedRanges(packed.compact) : null;
    for (const phrase of phrases) {
      const excerpt = findPhrase(packed, phrase, ranges);
      if (excerpt) {
        return excerpt;
      }
    }
  }
  return "";
}

function animalAllowed(facility) {
  const compact = String(facility.animalCmgCl || "").replace(/\s+/g, "");
  if (!compact || compact.includes("불가능")) {
    return false;
  }
  return compact === "가능" || compact.includes("소형견");
}

function animalExcerpt(facility) {
  const text = String(facility.animalCmgCl || "").replace(/\s+/g, " ").trim();
  if (!text) {
    return "애견동반";
  }
  if (text.length > 36) {
    return `${text.slice(0, 36)}…`;
  }
  return text;
}

function chipExcerpt(facility, chipId) {
  const chip = CHIPS[chipId];
  if (!chip || !facility) {
    return "";
  }
  const excerpt = phraseExcerpt(facility, chip.phrases, Boolean(chip.pet), TEXT_KEYS);
  if (excerpt) {
    return excerpt;
  }
  if (chip.pet && animalAllowed(facility)) {
    return animalExcerpt(facility);
  }
  if (chip.estimated && facility.estimated) {
    const keyword = phraseExcerpt(facility, ESTIMATE_PHRASES, false, ESTIMATE_KEYS);
    return keyword || "개별 화장실 추정";
  }
  return "";
}

function activeChipGroups() {
  return [themeChoices, moodChoices, amenityChoices]
    .map((container) => checkedValues(container))
    .filter((values) => values.length > 0);
}

function placeMatchesChips(facility, chipGroups) {
  return chipGroups.every((values) => values.some((chipId) => chipExcerpt(facility, chipId) !== ""));
}

function matchingPlaceIndex(item, chipGroups) {
  if (chipGroups.length === 0) {
    return -1;
  }
  for (let index = 0; index < item.regionFacilities.length; index += 1) {
    if (placeMatchesChips(item.regionFacilities[index], chipGroups)) {
      return index;
    }
  }
  return -1;
}

function cardExcerpt(facility, chipGroups) {
  for (const values of chipGroups) {
    for (const chipId of values) {
      const excerpt = chipExcerpt(facility, chipId);
      if (excerpt) {
        return excerpt;
      }
    }
  }
  return "";
}

function currentList() {
  const sidos = checkedValues(sidoChoices);
  const query = normalize(queryEl.value);
  const types = checkedValues(indutyChoices);
  const estimates = checkedValues(estimateChoices);
  const chipGroups = activeChipGroups();
  return groups.filter((item) => {
    if (sidos.length > 0) {
      const hit = item.places.some((place) => sidos.includes(place.sido));
      if (!hit) {
        return false;
      }
    }
    if (query && !item.haystack.includes(query)) {
      return false;
    }
    if (types.length > 0 && !types.some((type) => item.types.includes(type))) {
      return false;
    }
    if (estimates.length === 1 && estimates[0] === "yes" && !item.estimated) {
      return false;
    }
    if (estimates.length === 1 && estimates[0] === "no" && item.estimated) {
      return false;
    }
    if (chipGroups.length > 0 && !item.regionFacilities.some((facility) => placeMatchesChips(facility, chipGroups))) {
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

function interiorText(facility) {
  if (!facility) {
    return "";
  }
  const parts = [];
  if (facility.glampInnerFclty) {
    parts.push(`글램핑 ${facility.glampInnerFclty}`);
  }
  if (facility.caravInnerFclty) {
    parts.push(`카라반 ${facility.caravInnerFclty}`);
  }
  return parts.join(" · ");
}

function fact(label, valueNode) {
  const row = document.createElement("p");
  row.className = "fact";
  const labelEl = document.createElement("span");
  labelEl.className = "fact-label";
  labelEl.textContent = label;
  row.append(labelEl, valueNode);
  return row;
}

function textValue(text) {
  const span = document.createElement("span");
  span.className = "fact-value";
  span.textContent = text;
  return span;
}

function nameValue(name, contentId) {
  if (!contentId) {
    const span = document.createElement("span");
    span.className = "fact-value result-name";
    span.textContent = name;
    return span;
  }
  const link = document.createElement("a");
  link.className = "fact-value result-name";
  link.href = `${CAMP_PAGE}${encodeURIComponent(contentId)}`;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.append(document.createTextNode(name));
  const hint = document.createElement("span");
  hint.className = "sr-only";
  hint.textContent = " 고캠핑에서 새 탭으로 열기";
  link.append(hint);
  return link;
}

function placeBlock(item, index, chipGroups, matchIndex) {
  const facility = item.regionFacilities[index];
  const contentId = facility && facility.contentId ? String(facility.contentId).trim() : "";
  const block = document.createElement("div");
  block.className = "place";
  block.append(
    fact("등록 이름", nameValue(item.name, contentId)),
    fact("위치", textValue(item.regions[index])),
  );
  const interior = interiorText(facility);
  if (interior) {
    block.append(fact("내부시설", textValue(interior)));
  }
  if (chipGroups.length > 0 && index === matchIndex) {
    const excerpt = cardExcerpt(facility, chipGroups);
    if (excerpt) {
      block.append(fact("문구", textValue(excerpt)));
    }
  }
  return block;
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

function renderResults(list, immediate) {
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

  resultList.replaceChildren();
  if (list.length === 0) {
    resultEmpty.hidden = false;
    resultList.hidden = true;
    pager.hidden = true;
    announce(summaryText(list, 0, 0), immediate);
    return;
  }

  resultEmpty.hidden = true;
  resultList.hidden = false;
  const chipGroups = activeChipGroups();
  const start = (page - 1) * PAGE_SIZE;
  const slice = list.slice(start, start + PAGE_SIZE);
  for (const item of slice) {
    const li = document.createElement("li");
    li.className = "result";
    const rank = document.createElement("p");
    rank.className = "result-rank";
    const rankLabel = document.createElement("span");
    rankLabel.className = "fact-label";
    rankLabel.textContent = "순위";
    const badge = document.createElement("span");
    badge.className = "rank-badge";
    badge.append(document.createTextNode(String(item.rank)));
    const unit = document.createElement("span");
    unit.className = "sr-only";
    unit.textContent = "위";
    badge.append(unit);
    rank.append(rankLabel, badge);
    li.append(rank);
    const matchIndex = matchingPlaceIndex(item, chipGroups);
    for (let index = 0; index < item.regions.length; index += 1) {
      li.append(placeBlock(item, index, chipGroups, matchIndex));
    }
    resultList.append(li);
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

const PIN_LIMIT = 100;
let campMap = null;
let campMarkers = [];
let campInfo = null;
let mapBroken = false;
let pinKey = "\0";

function mapsReady() {
  return Boolean(window.naver && window.naver.maps && typeof window.naver.maps.Map === "function");
}

function ensureMap() {
  if (campMap) {
    return campMap;
  }
  if (mapBroken || !mapsReady()) {
    return null;
  }
  const host = document.querySelector("#camp-map");
  if (!host) {
    return null;
  }
  try {
    campMap = new window.naver.maps.Map(host, {
      center: new window.naver.maps.LatLng(36.4, 127.8),
      zoom: 7,
      zoomControl: true,
      zoomControlOptions: { position: window.naver.maps.Position.TOP_RIGHT },
    });
    campInfo = new window.naver.maps.InfoWindow({
      content: "",
      maxWidth: 280,
      backgroundColor: "#ffffff",
      borderColor: "#b7c9bf",
      borderWidth: 1,
    });
    window.naver.maps.Event.addListener(campMap, "click", () => {
      campInfo.close();
    });
  } catch (error) {
    mapBroken = true;
    return null;
  }
  return campMap;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    if (char === "&") {
      return "&amp;";
    }
    if (char === "<") {
      return "&lt;";
    }
    if (char === ">") {
      return "&gt;";
    }
    if (char === "\"") {
      return "&quot;";
    }
    return "&#39;";
  });
}

function infoHtml(place) {
  const name = `<p class="map-place-name">${escapeHtml(place.name)}</p>`;
  const region = `<p class="map-place-region">${escapeHtml(place.region)}</p>`;
  if (!place.contentId) {
    return `<div class="map-card">${name}${region}</div>`;
  }
  const href = `${CAMP_PAGE}${place.contentId}`;
  const link = `<a class="map-link" href="${href}" target="_blank" rel="noopener noreferrer">고캠핑에서 보기<span class="sr-only">, ${escapeHtml(place.name)}</span></a>`;
  return `<div class="map-card">${name}${region}${link}</div>`;
}

function pinPlaces(list) {
  const places = [];
  for (const item of list) {
    for (let index = 0; index < item.regions.length; index += 1) {
      const point = item.coords[index];
      if (!point) {
        continue;
      }
      const facility = item.regionFacilities[index];
      const rawId = facility && facility.contentId ? String(facility.contentId).trim() : "";
      places.push({
        rank: item.rank,
        name: item.name,
        region: item.regions[index],
        lat: point.lat,
        lng: point.lng,
        contentId: /^\d+$/.test(rawId) ? rawId : "",
      });
    }
  }
  return places;
}

function renderMap(list) {
  const places = pinPlaces(list);
  const shown = places.slice(0, PIN_LIMIT);
  if (shown.length === 0) {
    mapCount.textContent = "표시할 핀이 없습니다.";
  } else if (places.length > shown.length) {
    mapCount.textContent = `핀 ${numberFormat.format(shown.length)}곳. 순위가 앞선 장소만 지도에 있습니다.`;
  } else {
    mapCount.textContent = `핀 ${numberFormat.format(shown.length)}곳`;
  }
  const current = ensureMap();
  if (!current) {
    mapCount.textContent = "지도를 불러오지 못했습니다.";
    return;
  }
  const key = shown.map((place) => `${place.name}\t${place.region}\t${place.lat}\t${place.lng}`).join("\n");
  if (key === pinKey) {
    return;
  }
  pinKey = key;
  for (const marker of campMarkers) {
    marker.setMap(null);
  }
  campMarkers = [];
  if (campInfo) {
    campInfo.close();
  }
  if (shown.length === 0) {
    mapEmpty.hidden = false;
    current.setCenter(new window.naver.maps.LatLng(36.4, 127.8));
    current.setZoom(7);
    return;
  }
  mapEmpty.hidden = true;
  const bounds = new window.naver.maps.LatLngBounds();
  for (const place of shown) {
    const position = new window.naver.maps.LatLng(place.lat, place.lng);
    bounds.extend(position);
    const marker = new window.naver.maps.Marker({
      position,
      map: current,
      title: `${place.name}, ${place.region}`,
      zIndex: Math.max(1, 10000 - place.rank),
    });
    window.naver.maps.Event.addListener(marker, "click", () => {
      campInfo.setContent(infoHtml(place));
      campInfo.open(current, marker);
    });
    campMarkers.push(marker);
  }
  if (shown.length === 1) {
    current.setCenter(bounds.getCenter());
    current.setZoom(13);
  } else {
    current.fitBounds(bounds, 48);
  }
}

function render(options) {
  const immediate = Boolean(options && options.immediate);
  const list = currentList();
  renderTop(list);
  renderResults(list, immediate);
  renderMap(list);
}

function scrollToTable() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  (browse || resultsSection).scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  page = 1;
  render({ immediate: true });
});

form.addEventListener("change", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || input.type !== "checkbox") {
    return;
  }
  page = 1;
  render({ immediate: true });
});

queryEl.addEventListener("input", () => {
  page = 1;
  render({ immediate: false });
});

clearBtn.addEventListener("click", () => {
  for (const input of form.querySelectorAll('input[type="checkbox"]')) {
    input.checked = false;
  }
  queryEl.value = "";
  page = 1;
  render({ immediate: true });
  const firstSido = sidoChoices.querySelector("input");
  if (firstSido) {
    firstSido.focus();
  } else {
    queryEl.focus();
  }
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
    render({ immediate: true });
  } catch {
    countEl.textContent = "목록을 불러오지 못했습니다. 페이지를 다시 열어 주세요.";
    liveEl.textContent = countEl.textContent;
  }
}

init();
