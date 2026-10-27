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

const SIDO_SHORT = {
  서울특별시: "서울",
  부산광역시: "부산",
  대구광역시: "대구",
  인천광역시: "인천",
  광주광역시: "광주",
  대전광역시: "대전",
  울산광역시: "울산",
  세종특별자치시: "세종",
  경기도: "경기",
  강원특별자치도: "강원",
  충청북도: "충북",
  충청남도: "충남",
  전북특별자치도: "전북",
  전라북도: "전북",
  전남광주통합특별시: "전남·광주",
  전라남도: "전남",
  경상북도: "경북",
  경상남도: "경남",
  제주특별자치도: "제주",
};

const INDUTY_SHORT = {
  자동차야영장: "오토캠핑",
  일반야영장: "일반야영",
  글램핑: "글램핑",
  카라반: "카라반",
  캠프닉: "캠프닉",
};

const SORT_LABELS = {
  interest: "정렬: 관심도순",
  review: "정렬: 리뷰순",
  time: "정렬: 시간순",
};

const form = document.querySelector("#filters");
const sidoChoices = document.querySelector("#sido-choices");
const themeChoices = document.querySelector("#theme-choices");
const moodChoices = document.querySelector("#mood-choices");
const amenityChoices = document.querySelector("#amenity-choices");
const queryEl = document.querySelector("#q");
const clearQueryBtn = document.querySelector("#clear-query");
const indutyChoices = document.querySelector("#induty-choices");
const estimateChoices = document.querySelector("#estimate-choices");
const clearBtn = document.querySelector("#clear");
const clearDesktopBtn = document.querySelector("#clear-desktop");
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
const mapGuidePill = document.querySelector("#map-guide-pill");
const originPill = document.querySelector("#origin-pill");
const originLabel = document.querySelector("#origin-label");
const originNavLink = document.querySelector("#origin-nav-link");
const clearOriginBtn = document.querySelector("#clear-origin");
const pager = document.querySelector("#pager");
const prevBtn = document.querySelector("#prev");
const nextBtn = document.querySelector("#next");
const pageInput = document.querySelector("#page");
const pageTotal = document.querySelector("#page-total");
const rangeEl = document.querySelector("#range");
const sortSelect = document.querySelector("#sort-select");
const sortPills = [...document.querySelectorAll("[data-sort-pill]")];
const mobileSortCycleBtn = document.querySelector("#mobile-sort-cycle");
const mobileSortLabel = document.querySelector("#mobile-sort-label");
const quickRailChips = [...document.querySelectorAll("[data-quick-name]")];
const quickOpenFiltersBtn = document.querySelector("#quick-open-filters");
const openUpdateModalBtn = document.querySelector("#open-update-modal");
const mobileOpenUpdateBtn = document.querySelector("#mobile-open-update");
const closeUpdateModalBtn = document.querySelector("#close-update-modal");
const updateModal = document.querySelector("#update-modal");
const reviewUpdatedText = document.querySelector("#review-updated-text");
const openFiltersBtn = document.querySelector("#open-filters");
const filterCountEl = document.querySelector("#filter-count");
const filterSheet = document.querySelector("#filter-sheet");
const applyFiltersBtn = document.querySelector("#apply-filters");
const closeFiltersBtn = document.querySelector("#close-filters");
const activeFilters = document.querySelector("#active-filters");
const sheetGrabber = document.querySelector("#sheet-grabber");
const sheetHandle = document.querySelector("#sheet-handle");
const listSheetScroll = document.querySelector("#list-sheet-scroll");
const snapButtons = [...document.querySelectorAll("[data-snap-target]")];
const markerDock = document.querySelector("#marker-dock");
const sheetPanel = document.querySelector("#sheet-panel");
const sheetBackdrop = document.querySelector("#sheet-backdrop");
const notesEl = document.querySelector("#notes");
const phoneQuery = window.matchMedia("(max-width: 959px)");
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

function shortRegion(region) {
  const { sido, sigungu } = splitRegion(region);
  const shortSido = SIDO_SHORT[sido] || sido;
  return sigungu ? `${shortSido} ${sigungu}` : shortSido;
}

function isMobileEnv() {
  if (phoneQuery && phoneQuery.matches) {
    return true;
  }
  const ua = typeof navigator !== "undefined" && navigator.userAgent ? navigator.userAgent : "";
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
}

function naverPlaceUrl(naverReview) {
  if (!naverReview) {
    return "";
  }
  const placeId = naverReview.placeId ? String(naverReview.placeId).trim() : "";
  if (!placeId) {
    return naverReview.url ? String(naverReview.url).trim() : "";
  }
  return isMobileEnv()
    ? `https://m.place.naver.com/place/${encodeURIComponent(placeId)}/home`
    : `https://map.naver.com/p/entry/place/${encodeURIComponent(placeId)}`;
}

function syncNaverPlaceLinks(root = document) {
  const links = root.querySelectorAll("a.action-naver[data-place-id]");
  for (const link of links) {
    const placeId = link.getAttribute("data-place-id");
    if (placeId) {
      link.href = naverPlaceUrl({ placeId });
    }
  }
}

function sanitizeNaverReview(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const placeId = raw.placeId ? String(raw.placeId).trim() : "";
  if (!placeId) {
    return null;
  }
  const visitor = Math.max(0, Number(raw.visitor) || 0);
  const blog = Math.max(0, Number(raw.blog) || 0);
  const vbSum = visitor + blog;
  let total = Math.max(0, Number(raw.total) || 0);
  if (total >= 10000 && vbSum < total) {
    total = vbSum;
  } else if (vbSum > total) {
    total = vbSum;
  }
  const url = raw.url ? String(raw.url).trim() : `https://m.place.naver.com/place/${placeId}/home`;
  return {
    placeId,
    total,
    visitor,
    blog,
    url,
    updatedAt: raw.updatedAt || "",
  };
}

function groupRows(rows) {
  const list = [];
  rows.forEach((row, idx) => {
    const contentId = row.facility && row.facility.contentId ? String(row.facility.contentId).trim() : "";
    const rowKey = `${row.name}__${row.region}__${contentId || idx}`;
    const naverReview = sanitizeNaverReview(row.naverReview);
    const facility = row.facility || null;
    const coord = placeCoord(row);
    const item = {
      rowKey,
      rank: row.rank,
      name: row.name,
      region: row.region,
      interestText: Number(row.interest).toFixed(4),
      interest: Number(row.interest),
      sameNameRows: row.same_name_rows,
      naverReview,
      regions: [row.region],
      regionFacilities: [facility],
      coords: [coord],
      places: [splitRegion(row.region)],
      facilities: facility ? [facility] : [],
      hasFacility: Boolean(facility),
      estimated: Boolean(facility && facility.estimated),
      types: facility && Array.isArray(facility.types) ? [...facility.types] : [],
      reviewTotal: naverReview && naverReview.total > 0 ? naverReview.total : 0,
      haystack: normalize(`${row.name} ${row.region} ${facility && facility.locationNote ? facility.locationNote : ""}`),
    };
    list.push(item);
  });
  list.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, "ko") || a.region.localeCompare(b.region, "ko"));
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
    const display = SIDO_SHORT[name] ? `${SIDO_SHORT[name]} (${name.replace(/특별시|광역시|특별자치시|특별자치도/g, "")})` : name;
    const box = choiceBox("sido", name, SIDO_SHORT[name] || name, current.has(name));
    box.title = display;
    sidoChoices.append(box);
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
  const filtered = groups.filter((item) => {
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

  if (sortMode === "review") {
    filtered.sort((a, b) => b.reviewTotal - a.reviewTotal || a.rank - b.rank || a.name.localeCompare(b.name, "ko"));
  } else {
    filtered.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, "ko"));
  }
  return filtered;
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
  const count = `검색 결과 ${numberFormat.format(list.length)}곳`;
  if (list.length === 0) {
    return count;
  }
  return `${count} (${numberFormat.format(start)}–${numberFormat.format(end)})`;
}

function interiorText(facility) {
  if (!facility) {
    return "";
  }
  const parts = [];
  if (facility.glampInnerFclty) {
    parts.push(`글램핑: ${facility.glampInnerFclty}`);
  }
  if (facility.caravInnerFclty) {
    parts.push(`카라반: ${facility.caravInnerFclty}`);
  }
  if (!parts.length && facility.lineIntro) {
    parts.push(String(facility.lineIntro).trim());
  }
  return parts.join(" · ");
}

function nameValue(item, index) {
  const name = item.name;
  const hasCoord = Boolean(item.coords && item.coords[index]);
  if (!hasCoord) {
    const span = document.createElement("span");
    span.className = "result-name";
    span.textContent = name;
    return span;
  }
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "result-name result-name-btn";
  btn.append(document.createTextNode(name));
  const hint = document.createElement("span");
  hint.className = "sr-only";
  hint.textContent = " 지도에서 위치 보기";
  btn.append(hint);
  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    focusPlaceOnMap(item, index);
  });
  return btn;
}

function clearFocusedMarker() {
  if (focusedTempMarker) {
    focusedTempMarker.setMap(null);
    focusedTempMarker = null;
  }
}

function focusPlaceOnMap(item, index) {
  const point = item.coords[index];
  if (!point) {
    return;
  }
  const facility = item.regionFacilities[index];
  const rawId = facility && facility.contentId ? String(facility.contentId).trim() : "";
  const place = {
    rowKey: item.rowKey,
    rank: item.rank,
    name: item.name,
    region: item.regions[index],
    lat: point.lat,
    lng: point.lng,
    contentId: /^\d+$/.test(rawId) ? rawId : "",
    naverReview: item.naverReview || null,
  };
  dockPlace = place;
  if (phoneQuery.matches && browse && browse.dataset.snap === "max") {
    setSnap("mid");
  }
  if (origin) {
    clearFocusedMarker();
    selectedRoutePlace = place;
    activeRoutePlace = place;
    if (campInfo) {
      campInfo.close();
    }
    renderResults(orderedList(currentList()), true);
    drawDrivingRoute(place, { fitBounds: true });
    return;
  }
  const current = ensureMap();
  if (!current) {
    return;
  }
  const position = new window.naver.maps.LatLng(place.lat, place.lng);
  current.setCenter(position);
  if (typeof current.getZoom === "function" && current.getZoom() < 12) {
    current.setZoom(12);
  }
  let matched = campMarkers.find(
    (entry) => entry.__placeKey === (place.rowKey || `${place.name}\t${place.region}`),
  );
  if (!matched) {
    clearFocusedMarker();
    focusedTempMarker = new window.naver.maps.Marker({
      position,
      map: current,
      title: `${place.name}, ${place.region}`,
      zIndex: 18000,
    });
    focusedTempMarker.__placeKey = place.rowKey || `${place.name}\t${place.region}`;
    const focusedMarkerRef = focusedTempMarker;
    window.naver.maps.Event.addListener(focusedMarkerRef, "click", () => {
      holdOriginClick();
      dockPlace = place;
      if (origin) {
        clearFocusedMarker();
        selectedRoutePlace = place;
        activeRoutePlace = place;
        renderResults(orderedList(currentList()), true);
        drawDrivingRoute(place, { fitBounds: true });
        return;
      }
      if (phoneQuery.matches && browse && browse.dataset.snap === "min") {
        if (campInfo) {
          campInfo.close();
        }
        showMarkerDock(place);
        return;
      }
      hideMarkerDock();
      if (campInfo) {
        campInfo.setContent(infoHtml(place));
        campInfo.open(current, focusedMarkerRef);
      }
    });
    matched = focusedTempMarker;
  } else {
    clearFocusedMarker();
  }
  if (phoneQuery.matches && browse && browse.dataset.snap === "min") {
    if (campInfo) {
      campInfo.close();
    }
    showMarkerDock(place);
    return;
  }
  hideMarkerDock();
  if (campInfo) {
    campInfo.setContent(infoHtml(place));
    campInfo.open(current, matched);
  }
}

function placeBlock(item, index, chipGroups, matchIndex, displayOrder) {
  const facility = item.regionFacilities[index];
  const contentId = facility && facility.contentId ? String(facility.contentId).trim() : "";
  const placeRef = {
    rowKey: item.rowKey,
    rank: item.rank,
    name: item.name,
    region: item.regions[index],
    lat: item.coords[index] ? item.coords[index].lat : NaN,
    lng: item.coords[index] ? item.coords[index].lng : NaN,
  };
  const isRouteTarget = Boolean(
    origin &&
    activeRoutePlace &&
    activeRoutePlace.name === item.name &&
    activeRoutePlace.region === item.regions[index],
  );
  const block = document.createElement("div");
  block.className = isRouteTarget ? "place is-active-route" : "place";
  if (item.coords[index]) {
    block.dataset.hasCoord = "true";
    block.addEventListener("click", (event) => {
      const target = event.target;
      if (target && typeof target.closest === "function" && target.closest("a, button")) {
        return;
      }
      focusPlaceOnMap(item, index);
    });
  }

  // Row 1: Rank badge + Campsite Name + Induty Tags + Estimated Tag
  const line1 = document.createElement("div");
  line1.className = "row-head";

  const titleGroup = document.createElement("div");
  titleGroup.className = "row-title-group";
  if (index === 0) {
    const primaryRank = displayOrder;
    const badge = document.createElement("span");
    badge.className = primaryRank <= 10 ? "rank-badge row-rank is-top-rank" : "rank-badge row-rank";
    badge.textContent = String(primaryRank);
    titleGroup.append(badge);
  }
  titleGroup.append(nameValue(item, index));
  if (index === 0 && (sortMode !== "interest" || item.rank !== displayOrder)) {
    const interestTag = document.createElement("span");
    interestTag.className = "tag-interest-rank";
    interestTag.textContent = `관심도 #${item.rank}`;
    titleGroup.append(interestTag);
  }

  const tagsGroup = document.createElement("div");
  tagsGroup.className = "row-tags";
  const isEstimated = Boolean((facility && facility.estimated) || (index === 0 && item.estimated));
  if (isEstimated) {
    const ribbonTag = document.createElement("span");
    ribbonTag.className = "tag-ribbon";
    ribbonTag.textContent = "개별화장실 추정";
    tagsGroup.append(ribbonTag);
  }
  const typeList = (facility && facility.types && facility.types.length ? facility.types : item.types).slice(0, 2);
  for (const type of typeList) {
    const typeTag = document.createElement("span");
    typeTag.className = "tag-induty";
    typeTag.textContent = INDUTY_SHORT[type] || type;
    tagsGroup.append(typeTag);
  }

  line1.append(titleGroup, tagsGroup);
  block.append(line1);

  // Row 2: Region + Travel Badge + Naver Review Badge + Action Links (고캠핑 / 네이버 플레이스 / 길찾기)
  const line2 = document.createElement("div");
  line2.className = "row-meta-bar";

  const metaLeft = document.createElement("div");
  metaLeft.className = "row-meta-left";

  const regionEl = document.createElement("span");
  regionEl.className = "row-region";
  const regFull = document.createElement("span");
  regFull.className = "region-full";
  regFull.textContent = item.regions[index];
  const regShort = document.createElement("span");
  regShort.className = "region-short";
  regShort.textContent = shortRegion(item.regions[index]);
  regionEl.append(regFull, regShort);
  metaLeft.append(regionEl);

  const travel = travelText({ name: item.name, region: item.regions[index] });
  if (travel) {
    const travelBadge = document.createElement("span");
    travelBadge.className = "travel-badge";
    travelBadge.textContent = `🚗 ${travel}`;
    metaLeft.append(travelBadge);
  }

  if (item.naverReview && item.naverReview.placeId && item.naverReview.total > 0) {
    const countBadge = document.createElement("span");
    countBadge.className = "review-count-badge";
    const total = Number(item.naverReview.total).toLocaleString("ko-KR");
    const visitor = item.naverReview.visitor > 0 ? Number(item.naverReview.visitor).toLocaleString("ko-KR") : null;
    const mainSpan = document.createElement("span");
    mainSpan.className = "review-main";
    mainSpan.textContent = `★ 네이버 리뷰 ${total}개`;
    countBadge.append(mainSpan);
    if (visitor) {
      const visSpan = document.createElement("span");
      visSpan.className = "visitor-sub";
      visSpan.textContent = ` (방문자 ${visitor})`;
      countBadge.append(visSpan);
    }
    metaLeft.append(countBadge);
  }

  const actionsRight = document.createElement("div");
  actionsRight.className = "row-actions";

  if (contentId) {
    const goLink = document.createElement("a");
    goLink.className = "action-link action-gocamping";
    goLink.href = `${CAMP_PAGE}${encodeURIComponent(contentId)}`;
    goLink.target = "_blank";
    goLink.rel = "noopener noreferrer";
    goLink.textContent = "고캠핑 ↗";
    goLink.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    actionsRight.append(goLink);
  }

  if (item.naverReview && item.naverReview.placeId) {
    const naverLink = document.createElement("a");
    naverLink.className = "action-link action-naver";
    naverLink.dataset.placeId = item.naverReview.placeId;
    naverLink.href = naverPlaceUrl(item.naverReview);
    naverLink.target = "_blank";
    naverLink.rel = "noopener noreferrer";
    naverLink.textContent = "N플레이스 ↗";
    const syncHref = () => {
      naverLink.href = naverPlaceUrl(item.naverReview);
    };
    naverLink.addEventListener("pointerdown", syncHref);
    naverLink.addEventListener("auxclick", syncHref);
    naverLink.addEventListener("click", (event) => {
      syncHref();
      event.stopPropagation();
    });
    actionsRight.append(naverLink);
  }

  if (isRouteTarget) {
    const navHref = naverDirectionsUrl(placeRef);
    if (navHref) {
      const routeLink = document.createElement("a");
      routeLink.className = "action-link action-directions";
      routeLink.href = navHref;
      routeLink.target = "_blank";
      routeLink.rel = "noopener noreferrer";
      routeLink.textContent = "길찾기 ↗";
      routeLink.addEventListener("click", (event) => {
        event.stopPropagation();
      });
      actionsRight.append(routeLink);
    }
  }

  line2.append(metaLeft, actionsRight);
  block.append(line2);

  if (isRouteTarget) {
    const routeBar = document.createElement("div");
    routeBar.className = "route-active-bar";
    const summaryPill = document.createElement("span");
    summaryPill.className = "route-summary-pill";
    summaryPill.textContent = routeSummaryForPlace(placeRef, true);
    routeBar.append(summaryPill);
    const navHref = naverDirectionsUrl(placeRef);
    if (navHref) {
      const navLink = document.createElement("a");
      navLink.className = "route-nav-btn";
      navLink.href = navHref;
      navLink.target = "_blank";
      navLink.rel = "noopener noreferrer";
      navLink.textContent = "네이버 지도 길찾기 ↗";
      navLink.addEventListener("click", (event) => {
        event.stopPropagation();
      });
      routeBar.append(navLink);
    }
    block.append(routeBar);
  }

  // Row 3: Facility / Chip Excerpt
  const subParts = [];
  if (chipGroups.length > 0 && index === matchIndex) {
    const excerpt = cardExcerpt(facility, chipGroups);
    if (excerpt) {
      subParts.push(excerpt);
    }
  }
  const interior = interiorText(facility);
  if (interior) {
    subParts.push(interior);
  }
  if (subParts.length > 0) {
    const line3 = document.createElement("p");
    line3.className = "row-sub";
    line3.textContent = subParts.join(" · ");
    block.append(line3);
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
  shown.forEach((item, idx) => {
    const li = document.createElement("li");
    li.className = "top-item";

    const badge = document.createElement("span");
    badge.className = "rank-badge";
    badge.append(document.createTextNode(String(idx + 1)));
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
  });
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
  slice.forEach((item, offset) => {
    const displayOrder = start + offset + 1;
    const li = document.createElement("li");
    const hasActiveRoute = Boolean(
      origin &&
      activeRoutePlace &&
      activeRoutePlace.name === item.name &&
      item.regions.includes(activeRoutePlace.region),
    );
    li.className = hasActiveRoute ? "result is-active-route" : "result";
    const matchIndex = matchingPlaceIndex(item, chipGroups);
    for (let index = 0; index < item.regions.length; index += 1) {
      li.append(placeBlock(item, index, chipGroups, matchIndex, displayOrder));
    }
    resultList.append(li);
  });

  const end = start + slice.length;
  pager.hidden = false;
  rangeEl.textContent = `${numberFormat.format(start + 1)}–${numberFormat.format(end)}번째`;
  pageInput.value = String(page);
  pageInput.max = String(pages);
  pageTotal.textContent = `/ ${numberFormat.format(pages)}`;
  prevBtn.disabled = page <= 1;
  nextBtn.disabled = page >= pages;
  announce(summaryText(list, start + 1, end), immediate);
}

const PIN_LIMIT = 100;
const TABLE_COORD_LIMIT = 300;
const DRIVING_TABLE = "https://router.project-osrm.org/table/v1/driving/";
const DRIVING_ROUTE = "https://router.project-osrm.org/route/v1/driving/";
let campMap = null;
let campMarkers = [];
let focusedTempMarker = null;
let campInfo = null;
let mapBroken = false;
let pinKey = "\0";
let origin = null;
let originMarker = null;
let originToken = 0;
let sortMode = "interest";
let travelTimes = new Map();
let travelState = "idle";
let travelSignature = "";
let travelToken = 0;
let travelTimer = 0;
let travelAbort = null;
let selectedRoutePlace = null;
let activeRoutePlace = null;
let activeRouteMetrics = null;
let routeCasingLine = null;
let routeMainLine = null;
let routeDestMarker = null;
let routeToken = 0;
let routeAbort = null;
let routeSignature = "";
let routeBoundsLast = null;
let blockOriginClick = false;
let geocoderReady = null;
let dockPlace = null;
let sheetReturnFocus = null;
let mapResizeObserver = null;

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
      maxWidth: 300,
      backgroundColor: "#ffffff",
      borderColor: "#cbd5e1",
      borderWidth: 1,
    });
    window.naver.maps.Event.addListener(campMap, "click", (event) => {
      campInfo.close();
      if (blockOriginClick || clickHitsMarker(event)) {
        blockOriginClick = false;
        return;
      }
      hideMarkerDock();
      const coord = event && event.coord;
      if (!coord || typeof coord.lat !== "function" || typeof coord.lng !== "function") {
        return;
      }
      setOrigin(coord.lat(), coord.lng());
    });
    watchMapSize(host);
    loadGeocoder();
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

function watchMapSize(host) {
  if (mapResizeObserver || typeof ResizeObserver !== "function") {
    return;
  }
  mapResizeObserver = new ResizeObserver(() => {
    if (!campMap || mapBroken || typeof campMap.autoResize !== "function") {
      return;
    }
    try {
      campMap.autoResize();
    } catch {
      mapBroken = true;
    }
  });
  mapResizeObserver.observe(host);
}

function mapWidth() {
  if (!campMap || typeof campMap.getSize !== "function") {
    return 0;
  }
  const size = campMap.getSize();
  return size && typeof size.width === "number" ? size.width : 0;
}

function relayoutMap(refit) {
  const current = ensureMap();
  if (!current) {
    return;
  }
  const before = mapWidth();
  window.requestAnimationFrame(() => {
    if (mapBroken) {
      return;
    }
    try {
      if (typeof current.autoResize === "function") {
        current.autoResize();
      }
    } catch {
      mapBroken = true;
      return;
    }
    if (refit || before < 20) {
      pinKey = "\0";
      renderMap(currentList());
    }
  });
}

function hideMarkerDock() {
  dockPlace = null;
  if (!markerDock) {
    return;
  }
  markerDock.hidden = true;
  markerDock.replaceChildren();
}

function showMarkerDock(place) {
  dockPlace = place;
  if (!markerDock || !phoneQuery.matches) {
    return;
  }
  markerDock.innerHTML = infoHtml(place);
  const close = document.createElement("button");
  close.type = "button";
  close.className = "secondary dock-close";
  close.textContent = "닫기";
  close.addEventListener("click", () => {
    hideMarkerDock();
  });
  markerDock.append(close);
  markerDock.hidden = false;
}

function refreshOpenCampCard() {
  if (!dockPlace) {
    return;
  }
  if (phoneQuery.matches && browse && browse.dataset.snap === "min") {
    showMarkerDock(dockPlace);
  }
  if (campInfo && typeof campInfo.getMap === "function" && campInfo.getMap()) {
    campInfo.setContent(infoHtml(dockPlace));
  }
}

function reviewHtml(naverReview) {
  if (!naverReview || !naverReview.placeId) {
    return "";
  }
  const hasCount = naverReview.total > 0;
  let badge = "";
  if (hasCount) {
    const total = Number(naverReview.total).toLocaleString("ko-KR");
    const visitor = naverReview.visitor > 0 ? Number(naverReview.visitor).toLocaleString("ko-KR") : null;
    const label = visitor ? `★ 네이버 리뷰 ${total}개 (방문자 ${visitor})` : `★ 네이버 리뷰 ${total}개`;
    badge = `<span class="review-count-badge">${escapeHtml(label)}</span>`;
  }
  const placeHref = naverPlaceUrl(naverReview);
  const mapLink = placeHref
    ? `<a class="action-link action-naver" data-place-id="${escapeHtml(naverReview.placeId)}" href="${escapeHtml(placeHref)}" target="_blank" rel="noopener noreferrer">N플레이스 ↗</a>`
    : "";
  if (!badge && !mapLink) {
    return "";
  }
  return `<div class="map-place-review review-value-wrap">${badge}${mapLink}</div>`;
}

function infoHtml(place) {
  const name = `<p class="map-place-name">${escapeHtml(place.name)}</p>`;
  const region = `<p class="map-place-region">${escapeHtml(place.region)}</p>`;
  const review = reviewHtml(place.naverReview);
  const summary = origin ? routeSummaryForPlace(place, true) : "";
  const travel = summary || travelText(place);
  const time = travel ? `<p class="map-place-time">${escapeHtml(travel)}</p>` : "";
  const navUrl = origin ? naverDirectionsUrl(place) : "";
  const navBtn = navUrl
    ? `<a class="route-nav-btn map-nav-link" href="${escapeHtml(navUrl)}" target="_blank" rel="noopener noreferrer">네이버 지도 길찾기 ↗</a>`
    : "";
  if (!place.contentId) {
    return `<div class="map-card">${name}${region}${review}${time}${navBtn}</div>`;
  }
  const href = `${CAMP_PAGE}${place.contentId}`;
  const link = `<a class="map-link" href="${href}" target="_blank" rel="noopener noreferrer">고캠핑 상세 ↗<span class="sr-only">, ${escapeHtml(place.name)}</span></a>`;
  return `<div class="map-card">${name}${region}${review}${time}<div class="map-card-links">${navBtn}${link}</div></div>`;
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
        rowKey: item.rowKey,
        rank: item.rank,
        name: item.name,
        region: item.regions[index],
        lat: point.lat,
        lng: point.lng,
        contentId: /^\d+$/.test(rawId) ? rawId : "",
        naverReview: item.naverReview || null,
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
  clearFocusedMarker();
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
    marker.__placeKey = place.rowKey || `${place.name}\t${place.region}`;
    window.naver.maps.Event.addListener(marker, "click", () => {
      holdOriginClick();
      dockPlace = place;
      if (origin) {
        selectedRoutePlace = place;
        activeRoutePlace = place;
        renderResults(orderedList(currentList()), true);
        drawDrivingRoute(place, { fitBounds: true });
        if (phoneQuery.matches && browse && browse.dataset.snap === "min") {
          if (campInfo) {
            campInfo.close();
          }
          showMarkerDock(place);
        }
        return;
      }
      if (phoneQuery.matches && browse && browse.dataset.snap === "min") {
        if (campInfo) {
          campInfo.close();
        }
        showMarkerDock(place);
        return;
      }
      hideMarkerDock();
      campInfo.setContent(infoHtml(place));
      campInfo.open(current, marker);
    });
    campMarkers.push(marker);
  }
  if (origin) {
    bounds.extend(new window.naver.maps.LatLng(origin.lat, origin.lng));
  }
  if (origin && routeBoundsLast && routeMainLine) {
    current.fitBounds(routeBoundsLast, { top: 52, right: 32, bottom: 32, left: 32 });
    return;
  }
  if (shown.length === 1 && !origin) {
    current.setCenter(bounds.getCenter());
    current.setZoom(13);
  } else {
    current.fitBounds(bounds, 36);
  }
}

function render(options) {
  const immediate = Boolean(options && options.immediate);
  const list = currentList();
  if (clearQueryBtn) {
    clearQueryBtn.hidden = queryEl.value.trim().length === 0;
  }
  syncSort();
  renderActiveFilters();
  renderTop(list);
  renderResults(orderedList(list), immediate);
  renderMap(list);
  scheduleTravel(list);
}

function scrollToTable() {
  if (phoneQuery.matches && listSheetScroll) {
    listSheetScroll.scrollTop = 0;
    return;
  }
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

if (clearQueryBtn) {
  clearQueryBtn.addEventListener("click", () => {
    queryEl.value = "";
    page = 1;
    render({ immediate: true });
    queryEl.focus();
  });
}

function setSortMode(value) {
  sortMode = value === "review" || value === "time" ? value : "interest";
  syncSort();
  page = 1;
  render({ immediate: true });
}

if (sortSelect) {
  sortSelect.addEventListener("change", () => {
    setSortMode(sortSelect.value);
  });
}

for (const pill of sortPills) {
  pill.addEventListener("click", () => {
    setSortMode(pill.dataset.sortPill);
  });
}

if (mobileSortCycleBtn) {
  mobileSortCycleBtn.addEventListener("click", () => {
    const next = sortMode === "interest" ? "review" : sortMode === "review" ? "time" : "interest";
    setSortMode(next);
  });
}

for (const chip of quickRailChips) {
  chip.addEventListener("click", () => {
    const name = chip.dataset.quickName;
    const val = chip.dataset.quickValue;
    const input = form.querySelector(`input[name="${name}"][value="${val}"]`);
    if (!input) {
      return;
    }
    input.checked = !input.checked;
    page = 1;
    render({ immediate: true });
  });
}

if (quickOpenFiltersBtn) {
  quickOpenFiltersBtn.addEventListener("click", () => {
    openFilterSheet();
  });
}

function openReviewModal() {
  if (updateModal && typeof updateModal.showModal === "function") {
    updateModal.showModal();
  }
}

if (openUpdateModalBtn) {
  openUpdateModalBtn.addEventListener("click", openReviewModal);
}

if (mobileOpenUpdateBtn) {
  mobileOpenUpdateBtn.addEventListener("click", openReviewModal);
}

if (closeUpdateModalBtn && updateModal) {
  closeUpdateModalBtn.addEventListener("click", () => {
    updateModal.close();
  });
}

if (updateModal) {
  updateModal.addEventListener("click", (event) => {
    if (event.target === updateModal) {
      updateModal.close();
    }
  });
}

clearOriginBtn.addEventListener("click", () => {
  clearOrigin();
});

function resetAllFilters() {
  for (const input of form.querySelectorAll('input[type="checkbox"]')) {
    input.checked = false;
  }
  queryEl.value = "";
  page = 1;
  render({ immediate: true });
}

clearBtn.addEventListener("click", () => {
  resetAllFilters();
  const firstSido = sidoChoices.querySelector("input");
  if (firstSido) {
    firstSido.focus();
  } else {
    queryEl.focus();
  }
});

if (clearDesktopBtn) {
  clearDesktopBtn.addEventListener("click", () => {
    resetAllFilters();
  });
}

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

function choiceLabel(input) {
  const choice = input.closest("label");
  const text = choice && choice.querySelector("span");
  return text ? text.textContent : input.value;
}

function syncQuickRail() {
  for (const chip of quickRailChips) {
    const name = chip.dataset.quickName;
    const val = chip.dataset.quickValue;
    const input = form.querySelector(`input[name="${name}"][value="${val}"]`);
    const active = Boolean(input && input.checked);
    chip.setAttribute("aria-pressed", active ? "true" : "false");
    chip.classList.toggle("is-active", active);
  }
}

function renderActiveFilters() {
  const checked = [...form.querySelectorAll('input[type="checkbox"]:checked')];
  filterCountEl.textContent = String(checked.length);
  openFiltersBtn.setAttribute("aria-label", checked.length > 0 ? `필터, ${checked.length}개 선택` : "필터");
  syncQuickRail();
  activeFilters.replaceChildren();
  if (checked.length === 0) {
    activeFilters.hidden = true;
    return;
  }
  activeFilters.hidden = false;
  for (const input of checked) {
    const label = choiceLabel(input);
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-chip";
    button.textContent = `${label} ×`;
    button.setAttribute("aria-label", `${label} 해제`);
    button.addEventListener("click", () => {
      input.checked = false;
      page = 1;
      render({ immediate: true });
    });
    item.append(button);
    activeFilters.append(item);
  }
}

function openFilterSheet() {
  if (!phoneQuery.matches) {
    return;
  }
  sheetReturnFocus = document.activeElement;
  filterSheet.classList.add("is-open");
  document.body.classList.add("sheet-open");
  openFiltersBtn.setAttribute("aria-expanded", "true");
  sheetPanel.setAttribute("role", "dialog");
  sheetPanel.setAttribute("aria-modal", "true");
  closeFiltersBtn.focus();
}

function closeFilterSheet() {
  const wasOpen = filterSheet.classList.contains("is-open");
  filterSheet.classList.remove("is-open");
  document.body.classList.remove("sheet-open");
  openFiltersBtn.setAttribute("aria-expanded", "false");
  sheetPanel.removeAttribute("role");
  sheetPanel.removeAttribute("aria-modal");
  if (wasOpen && sheetReturnFocus && typeof sheetReturnFocus.focus === "function") {
    sheetReturnFocus.focus();
  }
  sheetReturnFocus = null;
}

function setSnap(snap) {
  if (snap !== "min" && snap !== "mid" && snap !== "max") {
    return;
  }
  browse.dataset.snap = snap;
  for (const button of snapButtons) {
    button.setAttribute("aria-pressed", button.dataset.snapTarget === snap ? "true" : "false");
  }
  if (snap !== "min") {
    hideMarkerDock();
  }
  relayoutMap(false);
}

openFiltersBtn.addEventListener("click", () => {
  if (filterSheet.classList.contains("is-open")) {
    closeFilterSheet();
    return;
  }
  openFilterSheet();
});

closeFiltersBtn.addEventListener("click", () => {
  closeFilterSheet();
});

applyFiltersBtn.addEventListener("click", () => {
  closeFilterSheet();
});

sheetBackdrop.addEventListener("click", () => {
  closeFilterSheet();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && filterSheet.classList.contains("is-open")) {
    closeFilterSheet();
  }
});

for (const button of snapButtons) {
  button.addEventListener("click", () => {
    setSnap(button.dataset.snapTarget);
  });
}

if (sheetHandle) {
  sheetHandle.addEventListener("click", () => {
    const current = browse.dataset.snap || "mid";
    const next = current === "mid" ? "max" : current === "max" ? "min" : "mid";
    setSnap(next);
  });
}

if (sheetGrabber) {
  let dragStartY = null;
  sheetGrabber.addEventListener("touchstart", (event) => {
    if (!phoneQuery.matches || !event.touches || event.touches.length !== 1) {
      return;
    }
    dragStartY = event.touches[0].clientY;
  }, { passive: true });
  sheetGrabber.addEventListener("touchend", (event) => {
    if (dragStartY === null || !event.changedTouches || event.changedTouches.length === 0) {
      dragStartY = null;
      return;
    }
    const deltaY = event.changedTouches[0].clientY - dragStartY;
    dragStartY = null;
    if (Math.abs(deltaY) < 28) {
      return;
    }
    const current = browse.dataset.snap || "mid";
    if (deltaY < 0) {
      setSnap(current === "min" ? "mid" : "max");
    } else {
      setSnap(current === "max" ? "mid" : "min");
    }
  }, { passive: true });
}

const desktopSearchSlot = document.querySelector("#desktop-search-slot");
const finderEl = document.querySelector("#finder");
const finderBarEl = document.querySelector(".finder-bar");

function syncSearchSlot() {
  if (!desktopSearchSlot || !finderEl || !finderBarEl) {
    return;
  }
  if (phoneQuery.matches) {
    if (finderBarEl.parentElement !== finderEl) {
      finderEl.prepend(finderBarEl);
    }
  } else if (finderBarEl.parentElement !== desktopSearchSlot) {
    desktopSearchSlot.append(finderBarEl);
  }
}

phoneQuery.addEventListener("change", () => {
  syncSearchSlot();
  syncNaverPlaceLinks();
  refreshOpenCampCard();
  if (phoneQuery.matches) {
    notesEl.open = false;
    closeFilterSheet();
    hideMarkerDock();
  } else {
    notesEl.open = true;
    closeFilterSheet();
    hideMarkerDock();
  }
  relayoutMap(true);
});

syncSearchSlot();
if (!phoneQuery.matches) {
  notesEl.open = true;
}

function travelKey(place) {
  return `${place.name}\t${place.region}`;
}

function travelText(place) {
  const travel = travelTimes.get(travelKey(place));
  if (!travel) {
    return "";
  }
  return formatTravel(travel);
}

function formatTravel(travel) {
  const rounded = Math.round(travel.seconds / 60);
  const minutes = travel.seconds > 0 ? Math.max(1, rounded) : 0;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  let timeText = `${minutes}분`;
  if (hours > 0) {
    timeText = rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`;
  }
  const km = travel.meters / 1000;
  const kmText = km >= 100 ? `${Math.round(km)}km` : `${(Math.round(km * 10) / 10).toFixed(1)}km`;
  return `${timeText} · ${kmText}`;
}

function bestSeconds(item) {
  let best = null;
  for (let index = 0; index < item.regions.length; index += 1) {
    const travel = travelTimes.get(travelKey({ name: item.name, region: item.regions[index] }));
    if (!travel) {
      continue;
    }
    if (best === null || travel.seconds < best) {
      best = travel.seconds;
    }
  }
  return best;
}

function orderedList(list) {
  if (sortMode !== "time") {
    return list;
  }
  return list.slice().sort((a, b) => {
    const left = bestSeconds(a);
    const right = bestSeconds(b);
    if (left === null && right === null) {
      return a.rank - b.rank;
    }
    if (left === null) {
      return 1;
    }
    if (right === null) {
      return -1;
    }
    if (left !== right) {
      return left - right;
    }
    return a.rank - b.rank;
  });
}

function drivingPins(list) {
  return pinPlaces(list).slice(0, Math.min(PIN_LIMIT, TABLE_COORD_LIMIT - 1));
}

function pinSignature(list) {
  return drivingPins(list)
    .map((place) => `${place.name}\t${place.region}\t${place.lat}\t${place.lng}`)
    .join("\n");
}

function formatCoord(lng, lat) {
  return `${Number(lng).toFixed(6)},${Number(lat).toFixed(6)}`;
}

function syncSort() {
  if (sortSelect) {
    sortSelect.value = sortMode;
  }
  for (const pill of sortPills) {
    pill.setAttribute("aria-pressed", pill.dataset.sortPill === sortMode ? "true" : "false");
  }
  if (mobileSortLabel) {
    mobileSortLabel.textContent = SORT_LABELS[sortMode] || SORT_LABELS.interest;
  }
}

function toWebMercator(lng, lat) {
  const x = (Number(lng) * 20037508.34) / 180;
  const rad = ((90 + Number(lat)) * Math.PI) / 360;
  const y = (Math.log(Math.tan(rad)) / (Math.PI / 180)) * (20037508.34 / 180);
  return { x: x.toFixed(2), y: y.toFixed(2) };
}

function naverDirectionsUrl(place) {
  if (!origin || !place || !Number.isFinite(place.lat) || !Number.isFinite(place.lng)) {
    return "";
  }
  const start = toWebMercator(origin.lng, origin.lat);
  const end = toWebMercator(place.lng, place.lat);
  const startName = encodeURIComponent(origin.label && origin.label !== "선택한 지점" ? origin.label : "출발지");
  const endName = encodeURIComponent(place.name);
  return `https://map.naver.com/p/directions/${start.x},${start.y},${startName},,/${end.x},${end.y},${endName},,/-/car`;
}

function formatRouteMetrics(seconds, meters) {
  const rounded = Math.round(seconds / 60);
  const minutes = seconds > 0 ? Math.max(1, rounded) : 0;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  let timeText = `${minutes}분`;
  if (hours > 0) {
    timeText = rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`;
  }
  const km = meters / 1000;
  const kmText = km >= 100 ? `${Math.round(km)}km` : `${(Math.round(km * 10) / 10).toFixed(1)}km`;
  return `${timeText} (${kmText})`;
}

function routeSummaryForPlace(place, useShortOrigin) {
  if (!origin || !place) {
    return "";
  }
  const key = travelKey(place);
  const metrics = activeRouteMetrics && activeRouteMetrics.key === key
    ? activeRouteMetrics
    : travelTimes.get(key);
  const hasCustomLabel = Boolean(origin.label && origin.label !== "선택한 지점");
  const startLabel = useShortOrigin
    ? (hasCustomLabel ? `출발지(${origin.label})` : "출발지")
    : (hasCustomLabel ? origin.label : "출발지");
  if (!metrics) {
    return `${startLabel} → ${place.name}`;
  }
  return `${startLabel} → ${place.name} · ${formatRouteMetrics(metrics.seconds, metrics.meters)}`;
}

function placeInList(place, list) {
  if (!place) {
    return false;
  }
  return list.some((item) => item.name === place.name && item.regions.includes(place.region));
}

function clearRoutePolyline() {
  routeToken += 1;
  routeSignature = "";
  routeBoundsLast = null;
  if (routeAbort) {
    routeAbort.abort();
    routeAbort = null;
  }
  if (routeCasingLine) {
    routeCasingLine.setMap(null);
    routeCasingLine = null;
  }
  if (routeMainLine) {
    routeMainLine.setMap(null);
    routeMainLine = null;
  }
  if (routeDestMarker) {
    routeDestMarker.setMap(null);
    routeDestMarker = null;
  }
}

async function drawDrivingRoute(place, options) {
  if (!origin || !place || !Number.isFinite(place.lat) || !Number.isFinite(place.lng)) {
    return;
  }
  const fitBounds = !options || options.fitBounds !== false;
  activeRoutePlace = place;
  updateOriginUi();
  const sig = `${formatCoord(origin.lng, origin.lat)};${formatCoord(place.lng, place.lat)}`;
  const current = ensureMap();
  if (sig === routeSignature && routeMainLine && current) {
    if (fitBounds && routeBoundsLast) {
      current.fitBounds(routeBoundsLast, { top: 52, right: 32, bottom: 32, left: 32 });
    }
    return;
  }
  routeSignature = sig;
  const token = ++routeToken;
  if (routeAbort) {
    routeAbort.abort();
  }
  const controller = new AbortController();
  routeAbort = controller;
  try {
    const response = await fetch(`${DRIVING_ROUTE}${sig}?overview=full&geometries=geojson`, {
      signal: controller.signal,
    });
    if (token !== routeToken) {
      return;
    }
    if (!response.ok) {
      throw new Error("http");
    }
    const data = await response.json();
    if (token !== routeToken) {
      return;
    }
    const route = data && Array.isArray(data.routes) ? data.routes[0] : null;
    const coords = route && route.geometry && Array.isArray(route.geometry.coordinates)
      ? route.geometry.coordinates
      : null;
    if (!coords || coords.length < 2) {
      throw new Error("geometry");
    }
    const key = travelKey(place);
    if (typeof route.duration === "number" && typeof route.distance === "number") {
      activeRouteMetrics = { key, seconds: route.duration, meters: route.distance };
      if (!travelTimes.has(key)) {
        travelTimes.set(key, { seconds: route.duration, meters: route.distance });
      }
    }
    const mapInstance = ensureMap();
    if (mapInstance) {
      if (routeCasingLine) {
        routeCasingLine.setMap(null);
      }
      if (routeMainLine) {
        routeMainLine.setMap(null);
      }
      if (routeDestMarker) {
        routeDestMarker.setMap(null);
      }
      const path = coords.map(([lng, lat]) => new window.naver.maps.LatLng(lat, lng));
      routeCasingLine = new window.naver.maps.Polyline({
        map: mapInstance,
        path,
        strokeColor: "#ffffff",
        strokeOpacity: 0.96,
        strokeWeight: 9,
        strokeLineCap: "round",
        strokeLineJoin: "round",
        zIndex: 120,
      });
      routeMainLine = new window.naver.maps.Polyline({
        map: mapInstance,
        path,
        strokeColor: "#1d4ed8",
        strokeOpacity: 0.96,
        strokeWeight: 5,
        strokeLineCap: "round",
        strokeLineJoin: "round",
        zIndex: 121,
      });
      const destPos = new window.naver.maps.LatLng(place.lat, place.lng);
      routeDestMarker = new window.naver.maps.Marker({
        position: destPos,
        map: mapInstance,
        zIndex: 21000,
        title: place.name,
        icon: {
          content: `<div class="dest-pin"><span class="dest-pin-dot"></span><span class="dest-pin-label">${escapeHtml(place.name)}</span></div>`,
          anchor: new window.naver.maps.Point(11, 11),
        },
      });
      window.naver.maps.Event.addListener(routeDestMarker, "click", () => {
        holdOriginClick();
      });
      const bounds = new window.naver.maps.LatLngBounds();
      bounds.extend(new window.naver.maps.LatLng(origin.lat, origin.lng));
      bounds.extend(destPos);
      for (const pt of path) {
        bounds.extend(pt);
      }
      routeBoundsLast = bounds;
      if (fitBounds) {
        mapInstance.fitBounds(bounds, { top: 52, right: 32, bottom: 32, left: 32 });
      }
    }
  } catch (error) {
    if (error && error.name === "AbortError") {
      return;
    }
    if (token !== routeToken) {
      return;
    }
  }
  updateOriginUi();
  renderResults(orderedList(currentList()), true);
  refreshOpenCampCard();
}

function ensureAutoRoute(list) {
  if (!origin) {
    return;
  }
  const sorted = orderedList(list);
  if (selectedRoutePlace && !placeInList(selectedRoutePlace, sorted)) {
    selectedRoutePlace = null;
  }
  const target = selectedRoutePlace;
  if (!target) {
    activeRoutePlace = null;
    activeRouteMetrics = null;
    clearRoutePolyline();
    updateOriginUi();
    renderResults(sorted, true);
    return;
  }
  activeRoutePlace = target;
  renderResults(sorted, true);
  drawDrivingRoute(target, { fitBounds: true });
}

function updateOriginUi() {
  if (!origin) {
    if (originPill) {
      originPill.hidden = true;
    }
    if (mapGuidePill) {
      mapGuidePill.hidden = false;
    }
    if (originNavLink) {
      originNavLink.hidden = true;
      originNavLink.removeAttribute("href");
    }
    originLabel.textContent = "출발지 없음";
    clearOriginBtn.hidden = true;
    return;
  }
  if (mapGuidePill) {
    mapGuidePill.hidden = true;
  }
  if (originPill) {
    originPill.hidden = false;
  }
  clearOriginBtn.hidden = false;
  if (activeRoutePlace) {
    originLabel.textContent = routeSummaryForPlace(activeRoutePlace, false);
    const navHref = naverDirectionsUrl(activeRoutePlace);
    if (originNavLink && navHref) {
      originNavLink.href = navHref;
      originNavLink.hidden = false;
    }
    return;
  }
  if (originNavLink) {
    originNavLink.hidden = true;
  }
  if (travelState === "loading") {
    originLabel.textContent = `출발지: ${origin.label} · 계산 중`;
    return;
  }
  if (travelState === "error") {
    originLabel.textContent = `출발지: ${origin.label} · 시간 오류`;
    return;
  }
  originLabel.textContent = `출발지: ${origin.label} (${numberFormat.format(travelTimes.size)}곳)`;
}

function holdOriginClick() {
  blockOriginClick = true;
  window.setTimeout(() => {
    blockOriginClick = false;
  }, 0);
}

function clickHitsMarker(event) {
  const domEvent = event && (event.domEvent || event.originalEvent);
  const target = domEvent && domEvent.target;
  if (!target || typeof target.closest !== "function") {
    return false;
  }
  return Boolean(target.closest(".origin-pin, .dest-pin, #camp-map [title]"));
}

function placeOriginMarker() {
  const current = ensureMap();
  if (!current || !origin) {
    return;
  }
  const position = new window.naver.maps.LatLng(origin.lat, origin.lng);
  if (!originMarker) {
    originMarker = new window.naver.maps.Marker({
      position,
      map: current,
      zIndex: 20000,
      title: origin.label,
      icon: {
        content: '<div class="origin-pin"></div>',
        size: new window.naver.maps.Size(22, 22),
        anchor: new window.naver.maps.Point(11, 11),
      },
    });
    window.naver.maps.Event.addListener(originMarker, "click", () => {
      holdOriginClick();
    });
    return;
  }
  originMarker.setPosition(position);
  originMarker.setMap(current);
  originMarker.setTitle(origin.label);
}

function loadGeocoder() {
  if (geocoderReady) {
    return geocoderReady;
  }
  geocoderReady = new Promise((resolve) => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      const service = window.naver && window.naver.maps && window.naver.maps.Service;
      if (service && typeof service.reverseGeocode === "function") {
        window.clearInterval(timer);
        resolve(true);
        return;
      }
      if (!mapsReady() || Date.now() - started > 4000) {
        window.clearInterval(timer);
        resolve(false);
      }
    }, 50);
  });
  return geocoderReady;
}

function labelFromGeocode(response) {
  const results = response && response.v2 && Array.isArray(response.v2.results) ? response.v2.results : [];
  const addr = results.find((item) => item.name === "addr") || results[0];
  if (!addr || !addr.region) {
    return "";
  }
  const parts = ["area2", "area3", "area4"]
    .map((key) => addr.region[key] && addr.region[key].name)
    .filter(Boolean);
  const land = addr.land || {};
  if (land.number1) {
    parts.push(land.number2 ? `${land.number1}-${land.number2}` : String(land.number1));
  }
  return parts.join(" ");
}

function resolveOriginLabel() {
  const token = originToken;
  const here = origin;
  if (!here) {
    return;
  }
  loadGeocoder().then((ready) => {
    if (!ready || token !== originToken || origin !== here) {
      return;
    }
    const service = window.naver.maps.Service;
    const orders = service.OrderType
      ? [service.OrderType.ADDR, service.OrderType.ROAD_ADDR].filter(Boolean).join(",")
      : "addr,roadaddr";
    try {
      service.reverseGeocode({
        coords: new window.naver.maps.LatLng(here.lat, here.lng),
        orders,
      }, (status, response) => {
        if (token !== originToken || origin !== here) {
          return;
        }
        const label = labelFromGeocode(response);
        if (!label || status === 500) {
          return;
        }
        origin.label = label;
        if (originMarker) {
          originMarker.setTitle(label);
        }
        updateOriginUi();
        renderResults(orderedList(currentList()), true);
        refreshOpenCampCard();
      });
    } catch {
      return;
    }
  });
}

function setOrigin(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return;
  }
  originToken += 1;
  origin = { lat, lng, label: "선택한 지점" };
  selectedRoutePlace = null;
  activeRoutePlace = null;
  activeRouteMetrics = null;
  clearRoutePolyline();
  sortMode = "time";
  travelTimes = new Map();
  travelState = "loading";
  travelSignature = "";
  syncSort();
  updateOriginUi();
  placeOriginMarker();
  page = 1;
  render({ immediate: true });
  resolveOriginLabel();
}

function clearOrigin() {
  originToken += 1;
  travelToken += 1;
  window.clearTimeout(travelTimer);
  if (travelAbort) {
    travelAbort.abort();
    travelAbort = null;
  }
  selectedRoutePlace = null;
  activeRoutePlace = null;
  activeRouteMetrics = null;
  clearRoutePolyline();
  origin = null;
  travelTimes = new Map();
  travelState = "idle";
  travelSignature = "";
  sortMode = "interest";
  if (originMarker) {
    originMarker.setMap(null);
    originMarker = null;
  }
  pinKey = "\0";
  syncSort();
  updateOriginUi();
  page = 1;
  render({ immediate: true });
}

function scheduleTravel(list) {
  if (!origin) {
    return;
  }
  const signature = pinSignature(list);
  if (signature === travelSignature) {
    if (travelState === "ready") {
      ensureAutoRoute(list);
    }
    return;
  }
  travelSignature = signature;
  window.clearTimeout(travelTimer);
  travelState = "loading";
  updateOriginUi();
  travelTimer = window.setTimeout(() => {
    requestTravel();
  }, 80);
}

async function requestTravel() {
  if (!origin) {
    return;
  }
  const pins = drivingPins(currentList());
  const token = ++travelToken;
  if (travelAbort) {
    travelAbort.abort();
  }
  if (pins.length === 0) {
    travelTimes = new Map();
    travelState = "ready";
    ensureAutoRoute(currentList());
    refreshOpenCampCard();
    return;
  }
  const controller = new AbortController();
  travelAbort = controller;
  const coords = [formatCoord(origin.lng, origin.lat)];
  for (const place of pins) {
    coords.push(formatCoord(place.lng, place.lat));
  }
  try {
    const response = await fetch(`${DRIVING_TABLE}${coords.join(";")}?sources=0&annotations=duration,distance`, {
      signal: controller.signal,
    });
    if (token !== travelToken) {
      return;
    }
    if (!response.ok) {
      throw new Error("http");
    }
    const data = await response.json();
    if (token !== travelToken) {
      return;
    }
    if (!data || data.code !== "Ok" || !Array.isArray(data.durations) || !Array.isArray(data.durations[0])) {
      throw new Error("route");
    }
    const durations = data.durations[0];
    const distances = data.distances && Array.isArray(data.distances[0]) ? data.distances[0] : [];
    const next = new Map();
    pins.forEach((place, index) => {
      const seconds = durations[index + 1];
      const meters = distances[index + 1];
      if (typeof seconds !== "number" || !Number.isFinite(seconds)) {
        return;
      }
      if (typeof meters !== "number" || !Number.isFinite(meters)) {
        return;
      }
      next.set(travelKey(place), { seconds, meters });
    });
    travelTimes = next;
    travelState = "ready";
  } catch (error) {
    if (error && error.name === "AbortError") {
      return;
    }
    if (token !== travelToken) {
      return;
    }
    travelTimes = new Map();
    travelState = "error";
  }
  ensureAutoRoute(currentList());
  refreshOpenCampCard();
}

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

    let latestDate = "";
    for (const row of rows) {
      if (row.naverReview && row.naverReview.updatedAt) {
        if (!latestDate || row.naverReview.updatedAt > latestDate) {
          latestDate = row.naverReview.updatedAt;
        }
      }
    }
    if (latestDate && reviewUpdatedText) {
      reviewUpdatedText.textContent = `리뷰 데이터 ${latestDate.replace(/-/g, ".")}`;
    }

    fillSido();
    render({ immediate: true });
  } catch {
    countEl.textContent = "목록을 불러오지 못했습니다. 페이지를 다시 열어 주세요.";
    liveEl.textContent = countEl.textContent;
  }
}

init();
