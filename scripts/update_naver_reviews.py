#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
네이버 플레이스 리뷰 수(방문자 리뷰 + 블로그 리뷰) 자동 수집 및 JSON 업데이트 스크립트

사용법:
  python3 scripts/update_naver_reviews.py                 # 전체 업데이트 (기존 수집 항목 스킵 후 이어하기)
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
    "숙박", "휴양림", "야외", "관광농원", "농원", "게스트하우스", "한옥",
]

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
    addr = re.sub(r"\s+앞\s*공유수면.*$", "", addr)
    addr = re.sub(r"\s+일원$", "", addr)
    return re.sub(r"\s+", " ", addr).strip()


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


def region_matches_text(region_str, addr1, text):
    if not region_str and not addr1:
        return True
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
        return any(t in text for t in tokens)
    if sido_short:
        return sido_short in text
    return True


def name_matches_title(target_name, region_str, place_title):
    if not place_title:
        return False
    core_target = extract_core_name(target_name, region_str)
    core_place = extract_core_name(place_title, region_str)
    full_target = re.sub(r"[^가-힣a-zA-Z0-9]", "", target_name or "").lower()
    full_place = re.sub(r"[^가-힣a-zA-Z0-9]", "", place_title or "").lower()

    if not core_target or not full_place:
        return False
    if core_target == core_place or full_target == full_place:
        return True
    if len(core_target) >= 3 and len(core_place) >= 3:
        if core_place.startswith(core_target) and len(core_place) - len(core_target) <= 2:
            return True
        if core_target.startswith(core_place) and len(core_target) - len(core_place) <= 2:
            return True
    return False


def fetch_html(query):
    encoded = urllib.parse.quote(query)
    url = f"https://m.search.naver.com/search.naver?query={encoded}"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            return resp.read().decode("utf-8", errors="ignore")
    except Exception:
        return None


def parse_naver_search_html(html, item, is_addr_query=False):
    if not html:
        return None
    soup = BeautifulSoup(html, "html.parser")
    target_name = item.get("name", "").strip()
    region_str = item.get("region", "").strip()
    addr1 = (item.get("facility") or {}).get("addr1") or ""

    # 1. Single-place detail card (div.place_section with /home link)
    place_sections = soup.find_all("div", class_="place_section")
    by_pid = {}
    for sec in place_sections:
        for a in sec.find_all("a", href=True):
            m = re.search(r"m\.place\.naver\.com/(?:accommodation|place|attraction|restaurant|hospital)/(\d+)(?:/([a-zA-Z0-9_]+))?", a["href"])
            if m:
                pid = m.group(1)
                sub = m.group(2) or ""
                info = by_pid.setdefault(pid, {"sections": [], "title": "", "links": []})
                if sec not in info["sections"]:
                    info["sections"].append(sec)
                a_txt = a.get_text(" ", strip=True)
                info["links"].append((sub, a_txt, a["href"]))
                if sub == "home" and not info["title"] and a_txt:
                    info["title"] = a_txt

    for pid, info in by_pid.items():
        if not info["title"]:
            continue
        combined_txt = " ".join(s.get_text(" ", strip=True) for s in info["sections"])
        if not region_matches_text(region_str, addr1, combined_txt):
            continue
        if not is_addr_query and not name_matches_title(target_name, region_str, info["title"]):
            continue
        tot, vis, blog = extract_counts_from_text(combined_txt)
        return {
            "total": tot,
            "visitor": vis,
            "blog": blog,
            "placeId": pid,
            "placeTitle": info["title"],
            "url": f"https://m.place.naver.com/place/{pid}/home",
        }

    # 2. Multi-place list items (li.VLTHu, li.Fh8nG, li.tTqjI, or leaf li with place link)
    candidates = []
    seen_li_pids = set()
    for li in soup.find_all("li"):
        if li.find("li"):
            continue
        li_classes = li.get("class") or []
        # Skip photo/keyword/review sub-items of a single place card
        if any(c in li_classes for c in ("WGRis", "avHEe", "dMBJX", "r5ckD", "Fvms5")):
            continue
        pid = None
        title = ""
        title_el = li.find(class_=re.compile(r"YwYLL|place_bluelink|CHC5F|title"))
        if title_el:
            title = title_el.get_text(" ", strip=True)
        for a in li.find_all("a", href=True):
            m = re.search(r"m\.place\.naver\.com/(?:accommodation|place|attraction|restaurant)/(\d+)(?:/([a-zA-Z0-9_]+))?", a["href"])
            if m:
                sub = m.group(2) or ""
                if sub in ("photo", "review", "location", "room", "booking"):
                    if not pid:
                        pid = m.group(1)
                    continue
                pid = m.group(1)
                a_txt = a.get_text(" ", strip=True)
                if not title and a_txt:
                    # strip trailing badges like 네이버페이 예약 톡톡
                    cleaned_t = re.sub(r"\s*(?:네이버페이|예약|톡톡|N예약).*$", "", a_txt).strip()
                    title = cleaned_t or a_txt
                break
        if not pid or pid in seen_li_pids:
            continue
        seen_li_pids.add(pid)
        li_txt = li.get_text(" ", strip=True)
        tot, vis, blog = extract_counts_from_text(li_txt)
        candidates.append({
            "pid": pid,
            "title": title,
            "text": li_txt,
            "total": tot,
            "visitor": vis,
            "blog": blog,
            "is_addr_card": "VLTHu" in li_classes or bool(li.attrs.get("data-loc_adr-doc-id")),
        })

    for cand in candidates:
        title = cand["title"]
        li_txt = cand["text"]
        # Check region if region info appears in the card text
        has_any_sido = any(s in li_txt for s in ["강원", "경기", "충북", "충남", "전북", "전남", "경북", "경남", "서울", "인천", "대전", "대구", "부산", "울산", "광주", "세종", "제주"])
        if has_any_sido and not region_matches_text(region_str, addr1, li_txt):
            continue

        if is_addr_query:
            # On an exact address search, accept if name matches OR if it's an address-matched place with camp/lodging category
            is_camp_cat = any(k in li_txt for k in CAMP_CATEGORY_KEYWORDS)
            if not (name_matches_title(target_name, region_str, title) or (cand["is_addr_card"] and is_camp_cat)):
                continue
        else:
            if not name_matches_title(target_name, region_str, title):
                continue

        return {
            "total": cand["total"],
            "visitor": cand["visitor"],
            "blog": cand["blog"],
            "placeId": cand["pid"],
            "placeTitle": title,
            "url": f"https://m.place.naver.com/place/{cand['pid']}/home",
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
            # If we found a place via address search or list card that didn't display its review count directly,
            # try follow-up queries to trigger its single-place card on Naver search!
            if res["total"] == 0 and res.get("placeTitle"):
                pt = res["placeTitle"]
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
                        res["matchedQuery"] = f"{q} -> {fq}"
                        break
            res.pop("placeTitle", None)
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
        "url": None,
        "matchedQuery": queries[0][0] if queries else "",
    }


def main():
    parser = argparse.ArgumentParser(description="네이버 리뷰 수 수집기")
    parser.add_argument("--file", default=DEFAULT_JSON_PATH, help="수정할 JSON 파일 경로")
    parser.add_argument("--limit", type=int, default=0, help="수집할 개수 제한 (0: 전체)")
    parser.add_argument("--delay", type=float, default=1.0, help="요청 간 딜레이(초)")
    parser.add_argument("--force", action="store_true", help="이미 수집된 항목도 덮어쓰기")
    parser.add_argument("--save-interval", type=int, default=50, help="중간 저장 주기")
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

        # 이어하기 검사: 이미 유효한 naverReview(placeId 존재 또는 오늘 갱신됨)가 있고 force가 아니면 스킵
        nr = item.get("naverReview")
        if not args.force and nr and (
            (nr.get("total", 0) > 0 and nr.get("placeId"))
            or nr.get("placeId")
            or nr.get("updatedAt") == today_str
        ):
            skipped_count += 1
            continue

        review_info = fetch_campsite_review(item)
        review_info["updatedAt"] = today_str
        item["naverReview"] = review_info
        updated_count += 1

        total_rev = review_info.get("total", 0)
        vis_rev = review_info.get("visitor", 0)
        q_used = review_info.get("matchedQuery", "")
        print(f"[{idx+1}/{target_count}] ({rank}위) {name} ({region}) -> 리뷰 {total_rev}개 (방문자 {vis_rev}) [검색어: {q_used}]")

        # 중간 저장
        if (updated_count % args.save_interval == 0) and updated_count > 0:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"  💾 [임시 저장] {idx+1}번째 항목까지 저장 완료")

        time.sleep(args.delay)

    # 최종 저장
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    elapsed = time.time() - start_time
    print(f"==================================================")
    print(f"✅ 수집 완료!")
    print(f"⏱️  소요 시간: {elapsed:.1f}초")
    print(f"✨ 갱신된 항목: {updated_count}개 / 스킵된 항목: {skipped_count}개")
    print(f"📁 파일 저장 완료: {file_path}")
    print(f"==================================================")


if __name__ == "__main__":
    main()
