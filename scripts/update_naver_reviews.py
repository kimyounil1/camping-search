#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
네이버 플레이스 리뷰 수(방문자 리뷰 + 블로그 리뷰) 자동 수집 및 JSON 업데이트 스크립트

사용법:
  python3 scripts/update_naver_reviews.py                 # 전체 업데이트 (기존 수집 항목 스킵 후 이어하기)
  python3 scripts/update_naver_reviews.py --limit 10       # 상위 10개만 테스트
  python3 scripts/update_naver_reviews.py --force          # 기존 수집된 리뷰도 강제 최신화
  python3 scripts/update_naver_reviews.py --delay 0.3      # 딜레이 0.3초 설정
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

def clean_region(region_str):
    if not region_str:
        return "", ""
    parts = region_str.split()
    sido = parts[0]
    sigungu = parts[1] if len(parts) > 1 else ""

    # 시도 단축명
    if "강원" in sido: sido_short = "강원"
    elif "경기" in sido: sido_short = "경기"
    elif "충청북" in sido or "충북" in sido: sido_short = "충북"
    elif "충청남" in sido or "충남" in sido: sido_short = "충남"
    elif "전라북" in sido or "전북" in sido: sido_short = "전북"
    elif "전라남" in sido or "전남" in sido: sido_short = "전남"
    elif "경상북" in sido or "경북" in sido: sido_short = "경북"
    elif "경상남" in sido or "경남" in sido: sido_short = "경남"
    elif "서울" in sido: sido_short = "서울"
    elif "인천" in sido: sido_short = "인천"
    elif "대전" in sido: sido_short = "대전"
    elif "대구" in sido: sido_short = "대구"
    elif "부산" in sido: sido_short = "부산"
    elif "울산" in sido: sido_short = "울산"
    elif "광주" in sido: sido_short = "광주"
    elif "세종" in sido: sido_short = "세종"
    elif "제주" in sido: sido_short = "제주"
    else: sido_short = sido[:2]

    # 시군구 끝자리 군/시/구 정리 (검색 최적화)
    clean_sigungu = sigungu
    return sido_short, clean_sigungu

def build_search_queries(item):
    name = item.get("name", "").strip()
    region = item.get("region", "").strip()
    facility = item.get("facility") or {}
    induty = facility.get("induty") or ""

    sido_short, sigungu = clean_region(region)
    loc = sigungu or sido_short

    has_cat = any(k in name for k in ["캠핑", "글램핑", "카라반", "야영장", "오토캠핑", "파크", "펜션"])

    queries = []
    if has_cat:
        if loc:
            queries.append(f"{loc} {name}")
        queries.append(name)
    else:
        suffix = "글램핑" if "글램핑" in induty else ("카라반" if "카라반" in induty else "캠핑장")
        if loc:
            queries.append(f"{loc} {name} {suffix}")
            queries.append(f"{sido_short} {name} {suffix}")
        queries.append(f"{name} {suffix}")

    # 중복 제거
    seen = set()
    unique_queries = []
    for q in queries:
        q = q.strip()
        if q and q not in seen:
            seen.add(q)
            unique_queries.append(q)

    return unique_queries

def parse_review_num(raw_str):
    if not raw_str:
        return 0
    raw_str = raw_str.strip().replace(",", "")
    if "만" in raw_str:
        m = re.search(r"(\d+(?:\.\d+)?)\s*만", raw_str)
        if m:
            return int(float(m.group(1)) * 10000)
    digits = re.sub(r"[^\d]", "", raw_str)
    val = int(digits) if digits else 0
    # 비정상 수치(100만 이상) 필터링
    return val if val < 1000000 else 0

def fetch_single_naver_review(query, target_name):
    encoded = urllib.parse.quote(query)
    url = f"https://m.search.naver.com/search.naver?query={encoded}"

    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
    except Exception:
        return None

    soup = BeautifulSoup(html, "html.parser")

    place_id = None
    place_url = None
    total = 0
    visitor = 0
    blog = 0

    # 1. 대상 캠핑장 이름과 관련된 링크/블록 우선 탐색
    clean_target = re.sub(r"[\s\-_]", "", target_name)
    best_candidate_block = None

    for el in soup.find_all(["li", "div", "a"]):
        txt = el.get_text(" ", strip=True)
        txt_nospace = re.sub(r"[\s\-_]", "", txt)
        if clean_target in txt_nospace and ("리뷰" in txt or "m.place.naver.com" in str(el)):
            best_candidate_block = el
            # 플레이스 ID 추출
            for a in el.find_all("a", href=True):
                m = re.search(r"m\.place\.naver\.com/(?:accommodation|place|attraction)/(\d+)", a["href"])
                if m:
                    place_id = m.group(1)
                    place_url = f"https://m.place.naver.com/place/{place_id}/home"
                    break
            if place_id:
                break

    # 2. 플레이스 링크가 있는 전체에서 ID 탐색 (fallback)
    if not place_id:
        for a in soup.find_all("a", href=True):
            m = re.search(r"m\.place\.naver\.com/(?:accommodation|place|attraction)/(\d+)", a["href"])
            if m:
                place_id = m.group(1)
                place_url = f"https://m.place.naver.com/place/{place_id}/home"
                break

    # 3. 리뷰 수 추출 (블록 내 우선)
    search_scope = best_candidate_block if best_candidate_block else soup
    text_to_search = search_scope.get_text(" ", strip=True)

    # 3-1. 방문자 리뷰
    m_vis = re.search(r"방문자\s*리뷰\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d+)?\s*만?|[0-9]+(?:\.\d+)?\s*만?)", text_to_search)
    if m_vis:
        visitor = parse_review_num(m_vis.group(1))

    # 3-2. 블로그 리뷰
    m_blog = re.search(r"블로그\s*리뷰\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d+)?\s*만?|[0-9]+(?:\.\d+)?\s*만?)", text_to_search)
    if m_blog:
        blog = parse_review_num(m_blog.group(1))

    # 3-3. 전체 리뷰 (또는 단독 '리뷰 N')
    m_tot = re.search(r"(?:전체\s*)?리뷰\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d+)?\s*만?|[0-9]+(?:\.\d+)?\s*만?)", text_to_search)
    if m_tot:
        total = parse_review_num(m_tot.group(1))

    # 3-4. 합산 보정
    if total == 0 and (visitor > 0 or blog > 0):
        total = visitor + blog
    elif total > 0 and visitor == 0 and blog == 0:
        # total만 있는 경우
        pass

    if total > 0 or visitor > 0 or blog > 0 or place_id:
        return {
            "total": total,
            "visitor": visitor,
            "blog": blog,
            "placeId": place_id,
            "url": place_url,
        }
    return None

def fetch_campsite_review(item):
    name = item.get("name", "").strip()
    queries = build_search_queries(item)
    for q in queries:
        res = fetch_single_naver_review(q, name)
        if res and (res["total"] > 0 or res["placeId"]):
            res["matchedQuery"] = q
            return res
        time.sleep(0.15)
    return {
        "total": 0,
        "visitor": 0,
        "blog": 0,
        "placeId": None,
        "url": None,
        "matchedQuery": queries[0] if queries else ""
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

        # 이어하기 검사: 이미 naverReview가 있고 force가 아니면 스킵
        if not args.force and item.get("naverReview") and item["naverReview"].get("total", 0) > 0:
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
