#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
네이버 플레이스 리뷰 수(방문자 리뷰 + 블로그 리뷰) 자동 수집 및 JSON 업데이트 스크립트

사용법:
  python3 scripts/update_naver_reviews.py                 # 전체 업데이트 (기존 검증된 수집 항목 스킵 후 이어하기)
  python3 scripts/update_naver_reviews.py --limit 10       # 상위 10개만 테스트
  python3 scripts/update_naver_reviews.py --force          # 기존 수집된 리뷰도 강제 최신화
  python3 scripts/update_naver_reviews.py --delay 1.0      # 딜레이 1.0초 설정
"""

import os
import sys
import json
import time
import re
import argparse
import subprocess
from datetime import datetime
import urllib.request
import urllib.parse
from bs4 import BeautifulSoup

DEFAULT_JSON_PATH = os.path.join(os.path.dirname(__file__), "..", "camping-search-rank-all.json")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9",
}

GENERIC_WORDS = [
    "캠핑장", "오토캠핑장", "오토캠핑", "캠핑파크", "캠핑랜드", "캠핑클럽", "캠핑스테이",
    "캠핑앤바베큐", "캠핑앤", "캠핑", "글램핑장", "글램핑앤카라반", "글램핑앤", "글램핑",
    "카라반파크", "카라반랜드", "카라반캠핑장", "카라반", "야영장", "자동차야영장",
    "일반야영장", "숲속야영장", "국민여가캠핑장", "국민여가", "자연휴양림", "휴양림",
    "리조트", "펜션", "관광농원", "농원", "민박", "캠프장", "캠프", "파크",
    "빌리지", "스테이", "하우스", "타운", "랜드", "주식회사", "유한회사",
]

CAMP_CATEGORY_KEYWORDS = [
    "캠핑", "야영", "글램핑", "카라반", "펜션", "리조트", "콘도", "민박",
    "숙박", "휴양림", "야외", "관광농원", "농원", "게스트하우스", "한옥", "바베큐", "바비큐",
]

SUB_FACILITY_SUFFIXES = (
    "개수대", "관리실", "화장실", "샤워장", "매점", "주차장", "분리수거장", "안내소", "매표소", "입구",
)

REV_NUM_PATTERN = r"(\d+(?:\.\d+)?\s*만(?![가-힣])|\d{1,3}(?:,\d{3})+|\d+)"


def clean_region(region_str):
    if not region_str:
        return "", ""
    parts = region_str.split()
    sido = parts[0]
    sigungu = parts[1] if len(parts) > 1 else ""

    if "강원" in sido:
        sido_short = "강원"
    elif "경기" in sido:
        sido_short = "경기"
    elif "충청북" in sido or "충북" in sido:
        sido_short = "충북"
    elif "충청남" in sido or "충남" in sido:
        sido_short = "충남"
    elif "전라북" in sido or "전북" in sido:
        sido_short = "전북"
    elif "전라남" in sido or "전남" in sido or "전남광주" in sido:
        sido_short = "전남"
    elif "경상북" in sido or "경북" in sido:
        sido_short = "경북"
    elif "경상남" in sido or "경남" in sido:
        sido_short = "경남"
    elif "서울" in sido:
        sido_short = "서울"
    elif "인천" in sido:
        sido_short = "인천"
    elif "대전" in sido:
        sido_short = "대전"
    elif "대구" in sido:
        sido_short = "대구"
    elif "부산" in sido:
        sido_short = "부산"
    elif "울산" in sido:
        sido_short = "울산"
    elif "광주" in sido:
        sido_short = "광주"
    elif "세종" in sido:
        sido_short = "세종"
    elif "제주" in sido:
        sido_short = "제주"
    else:
        sido_short = sido[:2]

    return sido_short, sigungu


def extract_core_name(name, region_str=""):
    s = re.sub(r"\([^)]*\)", " ", name or "")
    sido_short, sigungu = clean_region(region_str)
    sigungu_short = re.sub(r"[시군구]$", "", sigungu) if len(sigungu) >= 2 else sigungu
    for loc_w in [sigungu, sigungu_short, sido_short]:
        if loc_w and len(loc_w) >= 2 and s.startswith(loc_w):
            s = s[len(loc_w):].strip()
    s_clean = re.sub(r"[^가-힣a-zA-Z0-9]", "", s).lower()
    changed = True
    while changed:
        changed = False
        for gw in sorted(GENERIC_WORDS, key=len, reverse=True):
            if s_clean.endswith(gw) and len(s_clean) > len(gw):
                s_clean = s_clean[:-len(gw)]
                changed = True
    if not s_clean:
        s_clean = re.sub(r"[^가-힣a-zA-Z0-9]", "", name or "").lower()
    return s_clean


def clean_addr_for_query(addr1):
    if not addr1:
        return ""
    addr = re.sub(r"\([^)]*\)", " ", addr1)
    addr = addr.split(",")[0].strip()
    addr = re.sub(r"\s+등\s*\d+\s*필지.*$", "", addr)
    addr = re.sub(r"\s+외\s*\d+\s*필지.*$", "", addr)
    addr = re.sub(r"\s+앞\s*공유수면.*$", "", addr)
    addr = re.sub(r"\s+일원$", "", addr)
    return re.sub(r"\s+", " ", addr).strip()


def extract_road_or_lot_tokens(addr1):
    if not addr1:
        return []
    s = re.sub(r"\([^)]*\)", " ", addr1)
    tokens = []
    for m in re.finditer(r"([가-힣0-9]+(?:로|길)\d*(?:번길)?)\s*(\d+(?:-\d+)?)", s):
        tokens.append((m.group(1), m.group(2)))
    for m in re.finditer(r"([가-힣0-9]+[리동가])\s*(산?\s*\d+(?:-\d+)?)", s):
        tokens.append((m.group(1), re.sub(r"\s+", "", m.group(2))))
    return tokens


def candidate_matches_exact_addr(addr1, cand):
    tokens = extract_road_or_lot_tokens(addr1)
    if not tokens:
        return False
    cand_addr_str = " ".join([
        cand.get("placeAddr") or "",
        cand.get("roadAddress") or "",
        cand.get("jibunAddress") or "",
    ])
    for street_or_ri, num in tokens:
        num_digits = re.sub(r"^산", "", num)
        has_san = num.startswith("산")
        if has_san:
            pattern = re.escape(street_or_ri) + r"\s*산\s*" + re.escape(num_digits) + r"(?!\d)"
        else:
            pattern = re.escape(street_or_ri) + r"\s*" + re.escape(num_digits) + r"(?!\d)"
        if re.search(pattern, cand_addr_str):
            return True
    return False


def extract_eupmyeon(addr1):
    if not addr1:
        return ""
    for part in addr1.split()[1:4]:
        if re.search(r"[읍면]$", part) and len(part) >= 2:
            return re.sub(r"[읍면]$", "", part)
    return ""


def candidate_matches_region(region_str, addr1, cand_addr_text):
    if not region_str and not addr1:
        return True
    if not cand_addr_text:
        return False
    sido_short, sigungu = clean_region(region_str)
    sigungu_short = re.sub(r"[시군구]$", "", sigungu) if len(sigungu) >= 2 else sigungu
    tokens = [t for t in [sigungu, sigungu_short] if t and len(t) >= 2]
    if addr1:
        parts = addr1.split()
        if len(parts) >= 3:
            eupmyeon = re.sub(r"[읍면동]$", "", parts[2])
            if len(eupmyeon) >= 2:
                tokens.append(eupmyeon)
    if tokens:
        if not any(t in cand_addr_text for t in tokens):
            return False
    if sido_short and sido_short not in ("전남", "광주"):
        other_sidos = [
            s for s in ["강원", "경기", "충북", "충남", "전북", "전남", "경북", "경남", "서울", "인천", "대전", "대구", "부산", "울산", "광주", "세종", "제주"]
            if s != sido_short
        ]
        if sido_short not in cand_addr_text and any(os_name in cand_addr_text for os_name in other_sidos):
            return False
    return True


def extract_road_name_only(addr1):
    if not addr1:
        return ""
    s = re.sub(r"\([^)]*\)", " ", addr1)
    m = re.search(r"([가-힣0-9]+(?:로|길)\d*(?:번길)?)", s)
    return m.group(1) if m else ""


def name_matches_title(target_name, region_str, place_title, addr1="", cand_addr=""):
    if not place_title:
        return False
    clean_pt = re.sub(r"<[^>]+>", "", place_title).strip()
    if any(clean_pt.endswith(suf) for suf in SUB_FACILITY_SUFFIXES):
        return False

    # If target has eup/myeon in addr1 and cand_addr specifies a DIFFERENT eup/myeon, reject!
    target_em = extract_eupmyeon(addr1)
    cand_em = extract_eupmyeon(cand_addr)
    if target_em and cand_em and target_em != cand_em:
        return False

    core_target = extract_core_name(target_name, region_str)
    core_place = extract_core_name(clean_pt, region_str)
    full_target = re.sub(r"[^가-힣a-zA-Z0-9]", "", target_name or "").lower()
    full_place = re.sub(r"[^가-힣a-zA-Z0-9]", "", clean_pt or "").lower()

    if not core_target or not full_place:
        return False

    # If both target and candidate have road names and they are different roads,
    # only allow if core_target == core_place AND full_target != core_target (or road is same)
    target_road = extract_road_name_only(addr1)
    cand_road = extract_road_name_only(cand_addr)
    if target_road and cand_road and target_road != cand_road:
        # When roads differ inside the same sigungu/eupmyeon, only accept if the full name matches or core_target >= 4 chars and exact match without generic word mismatch
        if full_target != full_place and len(core_target) <= 4:
            return False

    if core_target == core_place or full_target == full_place:
        return True
    if len(core_target) >= 4 and len(core_place) >= 4:
        if core_place.startswith(core_target) and len(core_place) - len(core_target) <= 1:
            return True
        if core_target.startswith(core_place) and len(core_target) - len(core_place) <= 1:
            return True
    return False


def build_search_queries(item):
    name = item.get("name", "").strip()
    region = item.get("region", "").strip()
    facility = item.get("facility") or {}
    induty = facility.get("induty") or ""
    addr1 = clean_addr_for_query(facility.get("addr1") or "")

    sido_short, sigungu = clean_region(region)
    sigungu_short = re.sub(r"[시군구]$", "", sigungu) if len(sigungu) >= 2 else sigungu
    loc = sigungu or sido_short

    has_cat = any(k in name for k in ["캠핑", "글램핑", "카라반", "야영장", "오토캠핑", "파크", "펜션", "리조트", "휴양림", "캠프"])
    suffix = "글램핑" if "글램핑" in induty else ("카라반" if "카라반" in induty else "캠핑장")
    compact_name = re.sub(r"\s+", "", name)

    queries = []
    # When facility.addr1 is available and the camp name is short/generic, address search is high precision
    if has_cat:
        if loc:
            queries.append((f"{loc} {name}", False))
            if compact_name != name:
                queries.append((f"{loc} {compact_name}", False))
        if sigungu_short and sigungu_short != loc:
            queries.append((f"{sigungu_short} {name}", False))
        if sido_short and sido_short != loc:
            queries.append((f"{sido_short} {name}", False))
    else:
        if loc:
            queries.append((f"{loc} {name} {suffix}", False))
            queries.append((f"{loc} {name}", False))
        if sigungu_short and sigungu_short != loc:
            queries.append((f"{sigungu_short} {name} {suffix}", False))
        if sido_short and sido_short != loc:
            queries.append((f"{sido_short} {name} {suffix}", False))

    if addr1:
        queries.append((addr1, True))

    seen = set()
    unique_queries = []
    for q, is_addr in queries:
        q = q.strip()
        if q and q not in seen:
            seen.add(q)
            unique_queries.append((q, is_addr))

    return unique_queries


def parse_review_num(raw_str):
    if not raw_str:
        return 0
    raw_str = raw_str.strip()
    m_man = re.match(r"^(\d+(?:\.\d+)?)\s*만$", raw_str)
    if m_man:
        val = float(m_man.group(1))
        if val < 20:
            return int(val * 10000)
        return 0
    digits = re.sub(r"[^\d]", "", raw_str.replace(",", ""))
    val = int(digits) if digits else 0
    return val if val < 200000 else 0


def extract_counts_from_text(txt):
    vis = 0
    blog = 0
    tot = 0
    m_vis = re.search(r"방문자\s*리뷰\s*" + REV_NUM_PATTERN, txt)
    if m_vis:
        vis = parse_review_num(m_vis.group(1))
    m_blog = re.search(r"블로그\s*리뷰\s*" + REV_NUM_PATTERN, txt)
    if m_blog:
        blog = parse_review_num(m_blog.group(1))
    for m in re.finditer(r"(?:전체\s*)?리뷰\s*" + REV_NUM_PATTERN, txt):
        prefix = txt[max(0, m.start() - 6):m.start()]
        if "방문자" in prefix or "블로그" in prefix:
            continue
        tot = parse_review_num(m.group(1))
        break
    if tot == 0 and (vis > 0 or blog > 0):
        tot = vis + blog
    return tot, vis, blog


def fetch_html(query):
    encoded = urllib.parse.quote(query)
    url = f"https://m.search.naver.com/search.naver?query={encoded}"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            return resp.read().decode("utf-8", errors="ignore")
    except Exception:
        return None


def fetch_place_detail_by_id(place_id):
    """Fetch visitor and blog review counts directly from m.place.naver.com/place/{place_id}/home."""
    if not place_id:
        return None
    url = f"https://m.place.naver.com/place/{place_id}/home"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
    except Exception:
        return None
    if not html:
        return None
    cands = extract_apollo_candidates(html)
    for c in cands:
        if str(c.get("placeId")) == str(place_id):
            return c
    return None


def extract_apollo_candidates(html):
    """Extract structured candidate places from Naver search __APOLLO_STATE__ JSON."""
    if not html:
        return []
    candidates = []
    seen = set()

    def to_int(x):
        if x is None:
            return 0
        if isinstance(x, int):
            return x
        s = re.sub(r"[^\d]", "", str(x))
        return int(s) if s else 0

    for m in re.finditer(r"__APOLLO_STATE__\s*=\s*\{", html):
        start = m.end() - 1
        depth = 0
        in_str = False
        esc = False
        end_idx = None
        for i in range(start, len(html)):
            ch = html[i]
            if in_str:
                if esc:
                    esc = False
                elif ch == "\\":
                    esc = True
                elif ch == '"':
                    in_str = False
            else:
                if ch == '"':
                    in_str = True
                elif ch == "{":
                    depth += 1
                elif ch == "}":
                    depth -= 1
                    if depth == 0:
                        end_idx = i + 1
                        break
        if not end_idx:
            continue
        raw_json = html[start:end_idx]
        try:
            st = json.loads(raw_json)
        except Exception:
            continue

        for k, v in st.items():
            if not isinstance(v, dict):
                continue
            tn = v.get("__typename", "")
            if tn not in ("PlaceDetailBase", "AccommodationSearchItem", "PlaceListBusinessesItem", "PlaceSummary"):
                continue
            pid = str(v.get("id") or "").strip()
            if not pid or not pid.isdigit() or pid in seen:
                continue
            seen.add(pid)

            raw_name = v.get("normalizedName") or v.get("name") or ""
            clean_name = re.sub(r"<[^>]+>", "", raw_name).strip()
            if not clean_name:
                continue

            common = (v.get("commonAddress") or "").strip()
            road = (v.get("roadAddress") or "").strip()
            jibun = (v.get("address") or "").strip()
            full_addr = (v.get("fullAddress") or "").strip()

            if full_addr:
                place_addr = full_addr
            elif common and road and not road.startswith(common):
                place_addr = f"{common} {road}".strip()
            elif common and jibun and not jibun.startswith(common):
                place_addr = f"{common} {jibun}".strip()
            else:
                place_addr = (road or jibun or common).strip()

            # Clean trailing "지도" in roadAddress if present
            place_addr = re.sub(r"\s+지도$", "", place_addr).strip()

            vis_raw = (
                v.get("visitorReviewsTotal")
                if v.get("visitorReviewsTotal") is not None
                else (
                    v.get("visitorReviewCount")
                    if v.get("visitorReviewCount") is not None
                    else v.get("placeReviewCount")
                )
            )
            blog_raw = (
                v.get("cafeBlogReviewsTotal")
                if v.get("cafeBlogReviewsTotal") is not None
                else v.get("blogCafeReviewCount")
            )
            vis = to_int(vis_raw)
            blog = to_int(blog_raw)

            candidates.append({
                "placeId": pid,
                "placeName": clean_name,
                "placeAddr": place_addr,
                "roadAddress": road,
                "jibunAddress": jibun,
                "commonAddress": common,
                "category": (v.get("category") or "").strip(),
                "visitor": vis,
                "blog": blog,
                "total": vis + blog,
                "typename": tn,
            })

    return candidates


def parse_naver_search_html(html, item, is_addr_query=False):
    if not html:
        return None
    target_name = item.get("name", "").strip()
    region_str = item.get("region", "").strip()
    addr1 = (item.get("facility") or {}).get("addr1") or ""

    # 1. Primary: Structured Apollo State candidates (exact per-place id, name, address, visitor & blog counts)
    apollo_candidates = extract_apollo_candidates(html)
    # Prefer exact address matches first, then name matches
    best_match = None
    for cand in apollo_candidates:
        pname = cand["placeName"]
        if any(pname.endswith(suf) for suf in SUB_FACILITY_SUFFIXES):
            continue
        addr_blob = " ".join([
            cand.get("placeAddr") or "",
            cand.get("commonAddress") or "",
            cand.get("roadAddress") or "",
            cand.get("jibunAddress") or "",
        ]).strip()

        if not candidate_matches_region(region_str, addr1, addr_blob):
            continue

        exact_addr_ok = bool(addr1 and candidate_matches_exact_addr(addr1, cand))
        name_ok = name_matches_title(target_name, region_str, pname, addr1=addr1, cand_addr=addr_blob)

        if is_addr_query:
            cat_txt = (cand.get("category") or "") + " " + pname
            is_camp_cat = any(k in cat_txt for k in CAMP_CATEGORY_KEYWORDS)
            if not (exact_addr_ok and (name_ok or is_camp_cat)):
                continue
        else:
            if not name_ok:
                continue
            # When the target name is very short (core <= 2 chars, e.g. '문', '솔', '포레스트') and we have a road/lot address,
            # require either exact_addr_ok or exact normalized name match if another place on the same street exists
            core_t = extract_core_name(target_name, region_str)
            if len(core_t) <= 1 and addr1 and not exact_addr_ok:
                continue

        result = {
            "total": cand["total"],
            "visitor": cand["visitor"],
            "blog": cand["blog"],
            "placeId": cand["placeId"],
            "placeName": pname,
            "placeAddr": cand["placeAddr"],
            "url": f"https://m.place.naver.com/place/{cand['placeId']}/home",
        }
        # If both name and exact address match, return immediately
        if name_ok and exact_addr_ok:
            return result
        if not best_match:
            best_match = result

    if best_match:
        return best_match

    # 2. Fallback: Single-place detail card DOM (only if Apollo state was absent)
    soup = BeautifulSoup(html, "html.parser")
    place_sections = soup.find_all("div", class_="place_section")
    by_pid = {}
    for sec in place_sections:
        for a in sec.find_all("a", href=True):
            m = re.search(r"m\.place\.naver\.com/(?:accommodation|place|attraction|restaurant|hospital)/(\d+)(?:/([a-zA-Z0-9_]+))?", a["href"])
            if m:
                pid = m.group(1)
                sub = m.group(2) or ""
                info = by_pid.setdefault(pid, {"sections": [], "title": ""})
                if sec not in info["sections"]:
                    info["sections"].append(sec)
                a_txt = a.get_text(" ", strip=True)
                if sub == "home" and not info["title"] and a_txt:
                    info["title"] = a_txt

    for pid, info in by_pid.items():
        pname = info["title"]
        if not pname or any(pname.endswith(suf) for suf in SUB_FACILITY_SUFFIXES):
            continue
        combined_txt = " ".join(s.get_text(" ", strip=True) for s in info["sections"])
        m_addr = re.search(r"주소\s+(.+?)(?:\s+지도|\s+내비게이션|\s+거리뷰|\s+전화번호|$)", combined_txt)
        place_addr = m_addr.group(1).strip() if m_addr else ""
        if not candidate_matches_region(region_str, addr1, place_addr or combined_txt):
            continue
        if not name_matches_title(target_name, region_str, pname, addr1=addr1, cand_addr=place_addr):
            continue
        tot, vis, blog = extract_counts_from_text(combined_txt)
        return {
            "total": tot,
            "visitor": vis,
            "blog": blog,
            "placeId": pid,
            "placeName": pname,
            "placeAddr": place_addr,
            "url": f"https://m.place.naver.com/place/{pid}/home",
        }

    return None


def fetch_campsite_review(item):
    queries = build_search_queries(item)
    region = item.get("region", "").strip()
    sido_short, sigungu = clean_region(region)
    loc = sigungu or sido_short

    best_place_only = None

    for q, is_addr in queries:
        html = fetch_html(q)
        res = parse_naver_search_html(html, item, is_addr_query=is_addr)
        if res:
            res["matchedQuery"] = q
            # If we found a verified place (e.g. via address search or DOM fallback) whose inline review count is 0
            # or incomplete (total != visitor + blog), fetch its exact PlaceDetailBase directly from m.place.naver.com!
            if res.get("placeId") and (
                res["total"] == 0 or res["total"] != (res.get("visitor", 0) + res.get("blog", 0))
            ):
                time.sleep(0.15)
                direct_cand = fetch_place_detail_by_id(res["placeId"])
                if direct_cand and direct_cand["total"] > 0:
                    res["total"] = direct_cand["total"]
                    res["visitor"] = direct_cand["visitor"]
                    res["blog"] = direct_cand["blog"]
                    if direct_cand.get("placeAddr") and not res.get("placeAddr"):
                        res["placeAddr"] = direct_cand["placeAddr"]
                    res["matchedQuery"] = f"{q} -> place:{res['placeId']}"

            if res["total"] == 0 and res.get("placeName"):
                pt = res["placeName"]
                addr1 = (item.get("facility") or {}).get("addr1") or ""
                addr_parts = addr1.split()
                eupmyeon = addr_parts[2] if len(addr_parts) >= 3 and re.search(r"[읍면동]$", addr_parts[2]) else ""
                sigungu_short = re.sub(r"[시군구]$", "", sigungu) if len(sigungu) >= 2 else sigungu
                followup_candidates = []
                if loc:
                    followup_candidates.append(f"{loc} {pt}")
                if eupmyeon and sigungu_short:
                    followup_candidates.append(f"{sigungu_short} {eupmyeon} {pt}")
                if len(re.sub(r"\s+", "", pt)) >= 5:
                    followup_candidates.append(pt)
                seen_fq = {q}
                for fq in followup_candidates:
                    fq = fq.strip()
                    if not fq or fq in seen_fq:
                        continue
                    seen_fq.add(fq)
                    time.sleep(0.15)
                    html2 = fetch_html(fq)
                    fake_item = dict(item)
                    fake_item["name"] = pt
                    res2 = parse_naver_search_html(html2, fake_item, is_addr_query=False)
                    if res2 and res2["placeId"] == res["placeId"] and res2["total"] > 0:
                        res["total"] = res2["total"]
                        res["visitor"] = res2["visitor"]
                        res["blog"] = res2["blog"]
                        if res2.get("placeAddr"):
                            res["placeAddr"] = res2["placeAddr"]
                        res["matchedQuery"] = f"{q} -> {fq}"
                        break
            if res["total"] > 0:
                return res
            if not best_place_only:
                best_place_only = res
        time.sleep(0.15)

    if best_place_only:
        return best_place_only

    return {
        "total": 0,
        "visitor": 0,
        "blog": 0,
        "placeId": None,
        "placeName": None,
        "placeAddr": None,
        "url": None,
        "matchedQuery": queries[0][0] if queries else "",
    }


def main():
    parser = argparse.ArgumentParser(description="네이버 리뷰 수 수집기")
    parser.add_argument("--file", default=DEFAULT_JSON_PATH, help="수정할 JSON 파일 경로")
    parser.add_argument("--limit", type=int, default=0, help="수집할 개수 제한 (0: 전체)")
    parser.add_argument("--delay", type=float, default=1.0, help="요청 간 딜레이(초)")
    parser.add_argument("--force", action="store_true", help="이미 수집된 항목도 덮어쓰기")
    parser.add_argument("--recheck-zero-place", action="store_true", help="placeId가 있으나 리뷰 수가 0이거나 불완전한 항목만 재점검")
    parser.add_argument("--save-interval", type=int, default=50, help="중간 저장 주기")
    parser.add_argument("--git-push-interval", type=int, default=0, help="자동 git commit & push 주기 (0: 비활성)")
    args = parser.parse_args()

    file_path = os.path.abspath(args.file)
    if not os.path.exists(file_path):
        print(f"오류: 파일을 찾을 수 없습니다: {file_path}")
        sys.exit(1)

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        print("오류: JSON 최상위가 리스트 형태가 아닙니다.")
        sys.exit(1)

    total_count = len(data)
    target_count = args.limit if args.limit > 0 else total_count
    today_str = datetime.now().strftime("%Y-%m-%d")

    print(f"==================================================")
    print(f"🏕️  캠핑장 네이버 리뷰 수 자동 수집 시작")
    print(f"📁 대상 파일: {file_path}")
    print(f"📊 총 캠핑장 수: {total_count}개 중 {target_count}개 처리 예정")
    print(f"⏱️  요청 딜레이: {args.delay}초")
    print(f"🔄 기존 데이터 덮어쓰기: {'예' if args.force else '아니오 (이어하기)'}")
    print(f"==================================================")

    updated_count = 0
    skipped_count = 0
    start_time = time.time()

    for idx, item in enumerate(data[:target_count]):
        name = item.get("name", "무명")
        rank = item.get("rank", idx + 1)
        region = item.get("region", "")

        # 이어하기 검사: 이미 수집된 항목(nr이 dict이고 placeName 키가 포함된 새 스키마 항목)이면 스킵
        nr = item.get("naverReview")
        if args.recheck_zero_place:
            if not (
                isinstance(nr, dict)
                and nr.get("placeId")
                and (nr.get("total", 0) == 0 or nr.get("total", 0) != (nr.get("visitor", 0) + nr.get("blog", 0)))
            ):
                skipped_count += 1
                continue
        elif not args.force and isinstance(nr, dict) and "placeName" in nr:
            skipped_count += 1
            continue

        if args.recheck_zero_place and isinstance(nr, dict) and nr.get("placeId"):
            pid = str(nr["placeId"]).strip()
            direct_cand = fetch_place_detail_by_id(pid)
            if direct_cand:
                review_info = dict(nr)
                review_info["total"] = direct_cand["total"]
                review_info["visitor"] = direct_cand["visitor"]
                review_info["blog"] = direct_cand["blog"]
                if direct_cand.get("placeName") and not review_info.get("placeName"):
                    review_info["placeName"] = direct_cand["placeName"]
                if direct_cand.get("placeAddr") and not review_info.get("placeAddr"):
                    review_info["placeAddr"] = direct_cand["placeAddr"]
                old_q = review_info.get("matchedQuery", "")
                if f"place:{pid}" not in old_q:
                    review_info["matchedQuery"] = f"{old_q} -> place:{pid}" if old_q else f"place:{pid}"
            else:
                review_info = fetch_campsite_review(item)
                if not review_info.get("placeId"):
                    review_info = dict(nr)
        else:
            review_info = fetch_campsite_review(item)

        review_info["updatedAt"] = today_str
        item["naverReview"] = review_info
        updated_count += 1

        total_rev = review_info.get("total", 0)
        vis_rev = review_info.get("visitor", 0)
        blog_rev = review_info.get("blog", 0)
        p_name = review_info.get("placeName") or "-"
        p_addr = review_info.get("placeAddr") or "-"
        q_used = review_info.get("matchedQuery", "")
        print(
            f"[{idx+1}/{target_count}] ({rank}위) {name} ({region}) -> "
            f"리뷰 {total_rev}개 (방문자 {vis_rev}, 블로그 {blog_rev}) | "
            f"매칭: {p_name} ({p_addr}) [검색어: {q_used}]"
        )

        # 중간 저장 (atomic write)
        if (updated_count % args.save_interval == 0) and updated_count > 0:
            tmp_path = file_path + ".tmp"
            with open(tmp_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            os.replace(tmp_path, file_path)
            print(f"  💾 [임시 저장] {idx+1}번째 항목까지 저장 완료")

        if args.git_push_interval > 0 and (updated_count % args.git_push_interval == 0) and updated_count > 0:
            tmp_path = file_path + ".tmp"
            with open(tmp_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            os.replace(tmp_path, file_path)
            repo_dir = os.path.dirname(file_path)
            try:
                subprocess.run(["git", "add", file_path], cwd=repo_dir, check=False)
                subprocess.run(
                    ["git", "commit", "-m", f"chore: save Apollo-verified Naver Place review checkpoint (up to item {idx+1}/{total_count})"],
                    cwd=repo_dir,
                    check=False,
                )
                subprocess.run(["git", "pull", "--rebase", "origin", "main"], cwd=repo_dir, check=False)
                subprocess.run(["git", "push", "origin", "main"], cwd=repo_dir, check=False)
                print(f"  🚀 [Git Push] {idx+1}/{total_count} 체크포인트 origin/main 푸시 완료")
            except Exception as e:
                print(f"  ⚠️ [Git Push 오류] {e}")

        time.sleep(args.delay)

    # 최종 저장 (atomic write)
    tmp_path = file_path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp_path, file_path)

    if args.git_push_interval > 0 and updated_count > 0:
        repo_dir = os.path.dirname(file_path)
        try:
            subprocess.run(["git", "add", file_path], cwd=repo_dir, check=False)
            subprocess.run(
                ["git", "commit", "-m", f"chore: complete Apollo-verified Naver Place review collection ({total_count}/{total_count})"],
                cwd=repo_dir,
                check=False,
            )
            subprocess.run(["git", "pull", "--rebase", "origin", "main"], cwd=repo_dir, check=False)
            subprocess.run(["git", "push", "origin", "main"], cwd=repo_dir, check=False)
            print(f"  🚀 [Git Push] 전체 {total_count}개 최종 수집 완료 및 origin/main 푸시 완료")
        except Exception as e:
            print(f"  ⚠️ [Git Push 오류] {e}")

    elapsed = time.time() - start_time
    print(f"==================================================")
    print(f"✅ 수집 완료!")
    print(f"⏱️  소요 시간: {elapsed:.1f}초")
    print(f"✨ 갱신된 항목: {updated_count}개 / 스킵된 항목: {skipped_count}개")
    print(f"📁 파일 저장 완료: {file_path}")
    print(f"==================================================")


if __name__ == "__main__":
    main()
