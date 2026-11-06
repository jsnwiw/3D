import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

def create_deck():
    prs = Presentation()
    # 16:9 widescreen
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Palette
    C_BG_DARK = RGBColor(15, 23, 42)      # #0f172a
    C_CARD_BG = RGBColor(30, 41, 59)      # #1e293b
    C_CARD_BORDER = RGBColor(99, 102, 241) # #6366f1
    C_PRIMARY = RGBColor(99, 102, 241)    # Indigo
    C_SECONDARY = RGBColor(139, 92, 246)  # Purple
    C_ACCENT = RGBColor(16, 185, 129)     # Emerald Green
    C_WHITE = RGBColor(241, 245, 249)     # Text white
    C_MUTED = RGBColor(148, 163, 184)     # Text muted
    C_LIGHT_BG = RGBColor(51, 65, 85)

    def set_bg(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = C_BG_DARK
        bg.line.fill.background()
        return bg

    def add_header(slide, title_text, category_text="3D DATA VISUALIZATION SYSTEM"):
        # Category badge/text
        tb_cat = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(11.7), Inches(0.4))
        p_cat = tb_cat.text_frame.paragraphs[0]
        p_cat.text = category_text.upper()
        p_cat.font.name = "Malgun Gothic"
        p_cat.font.size = Pt(11)
        p_cat.font.bold = True
        p_cat.font.color.rgb = C_PRIMARY

        # Main Title
        tb = slide.shapes.add_textbox(Inches(0.8), Inches(0.85), Inches(11.7), Inches(0.7))
        p = tb.text_frame.paragraphs[0]
        p.text = title_text
        p.font.name = "Malgun Gothic"
        p.font.size = Pt(24)
        p.font.bold = True
        p.font.color.rgb = C_WHITE

    def add_card(slide, left, top, width, height, title, content_list, highlight_text=""):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = C_CARD_BG
        card.line.color.rgb = C_CARD_BORDER
        card.line.width = Pt(1)

        tf = card.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.25)
        tf.margin_right = Inches(0.25)
        tf.margin_top = Inches(0.25)
        tf.margin_bottom = Inches(0.2)

        p0 = tf.paragraphs[0]
        p0.text = title
        p0.font.name = "Malgun Gothic"
        p0.font.size = Pt(15)
        p0.font.bold = True
        p0.font.color.rgb = C_WHITE
        p0.space_after = Pt(8)

        if highlight_text:
            p_sub = tf.add_paragraph()
            p_sub.text = highlight_text
            p_sub.font.name = "Malgun Gothic"
            p_sub.font.size = Pt(11)
            p_sub.font.bold = True
            p_sub.font.color.rgb = C_ACCENT
            p_sub.space_after = Pt(10)

        for item in content_list:
            p = tf.add_paragraph()
            p.text = "• " + item
            p.font.name = "Malgun Gothic"
            p.font.size = Pt(11)
            p.font.color.rgb = C_MUTED
            p.space_after = Pt(6)

        return card

    # ==========================================
    # SLIDE 1: COVER
    # ==========================================
    s1 = prs.slides.add_slide(blank_layout)
    set_bg(s1)

    # Accent decorative bar
    bar = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.2), Inches(2.2), Inches(0.12), Inches(2.8))
    bar.fill.solid()
    bar.fill.fore_color.rgb = C_PRIMARY
    bar.line.fill.background()

    # Title Box
    t_box = s1.shapes.add_textbox(Inches(1.5), Inches(2.1), Inches(10.5), Inches(3.0))
    tf1 = t_box.text_frame
    tf1.word_wrap = True

    p_badge = tf1.paragraphs[0]
    p_badge.text = "PROJECT REPORT | 개인 프로젝트"
    p_badge.font.name = "Malgun Gothic"
    p_badge.font.size = Pt(13)
    p_badge.font.bold = True
    p_badge.font.color.rgb = C_ACCENT
    p_badge.space_after = Pt(10)

    p_main = tf1.add_paragraph()
    p_main.text = "CSV 데이터 자동 분석 및\n3D 맞춤형 공간 시각화 시스템"
    p_main.font.name = "Malgun Gothic"
    p_main.font.size = Pt(32)
    p_main.font.bold = True
    p_main.font.color.rgb = C_WHITE
    p_main.space_after = Pt(16)

    p_sub = tf1.add_paragraph()
    p_sub.text = "사용자 CSV 데이터 분석 기반의 지능형 3D/2D 다중 인터랙티브 대시보드 구축 보고서"
    p_sub.font.name = "Malgun Gothic"
    p_sub.font.size = Pt(14)
    p_sub.font.color.rgb = C_MUTED

    # Bottom Meta Card
    m_card = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.5), Inches(5.5), Inches(10.3), Inches(0.9))
    m_card.fill.solid()
    m_card.fill.fore_color.rgb = C_CARD_BG
    m_card.line.color.rgb = C_PRIMARY
    m_tf = m_card.text_frame
    m_tf.margin_top = Inches(0.2)
    m_p = m_tf.paragraphs[0]
    m_p.text = "핵심 기술: Three.js (WebGL 3D) · Chart.js (2D) · 스마트 데이터 분석 엔진 · 3D 레이캐스팅 동기화"
    m_p.font.name = "Malgun Gothic"
    m_p.font.size = Pt(12)
    m_p.font.bold = True
    m_p.font.color.rgb = C_WHITE

    # ==========================================
    # SLIDE 2: 개요 및 개발 배경
    # ==========================================
    s2 = prs.slides.add_slide(blank_layout)
    set_bg(s2)
    add_header(s2, "1. 프로젝트 개요 및 추진 배경")

    add_card(s2, Inches(0.8), Inches(1.8), Inches(3.6), Inches(5.0),
             "기존 2D 차트의 한계",
             ["평면적인 2D 그래프는 다차원 데이터 관계 파악에 한계 존재",
              "대량 데이터 및 복합 지표 간의 공간적 상관관계 직관성 부족",
              "사용자의 수동 차트 유형 선택에 따른 분석 진입장벽",
              "데이터 속성에 따른 적합한 시각화 형태를 찾기 어려움"],
             "단순 수치 나열의 한계 극복 필요")

    add_card(s2, Inches(4.8), Inches(1.8), Inches(3.6), Inches(5.0),
             "프로젝트 목표",
             ["CSV 파일 업로드만으로 데이터 유형 자동 식별 및 통계 산출",
              "데이터 특성(시계열, 범주형, 수치형)에 맞는 3D 스타일 자동 추천",
              "3D 장면과 2D DOM 인터페이스 간 실시간 실감형 동기화",
              "웹 표준 기술 기반 무설치(Zero-Install) 브라우저 구동"],
             "데이터 분석 + 3D 실감형 시각화 통합")

    add_card(s2, Inches(8.8), Inches(1.8), Inches(3.7), Inches(5.0),
             "기대 효과 및 가치",
             ["입체적 깊이감(Z축)을 활용한 다변량 데이터의 효과적 인지",
              "데이터 분석 지식이 부족한 일반 사용자도 직관적 탐색 가능",
              "반응형 웹 기반으로 다양한 디바이스 환경에서 즉각 활용",
              "인터랙티브 상호작용으로 데이터 몰입감 및 분석 효율 극대화"],
             "차세대 데이터 시각화 패러다임 제시")

    # ==========================================
    # SLIDE 3: 시스템 아키텍처 및 핵심 기술
    # ==========================================
    s3 = prs.slides.add_slide(blank_layout)
    set_bg(s3)
    add_header(s3, "2. 시스템 구조 및 핵심 기술 스택")

    add_card(s3, Inches(0.8), Inches(1.8), Inches(2.7), Inches(5.0),
             "3D 렌더링 엔진",
             ["Three.js (v0.160.0 최신 모듈)",
              "WebGL 기반 하드웨어 가속 렌더링",
              "ACESFilmicToneMapping & PCFSoftShadow",
              "실시간 조명(Ambient, Dir, Point, Rim)",
              "안개(Fog) 및 심도 표현을 통한 공간감"],
             "WebGL & Three.js")

    add_card(s3, Inches(3.8), Inches(1.8), Inches(2.7), Inches(5.0),
             "데이터 분석 엔진",
             ["순수 클라이언트 기반 고속 CSV 파서",
              "문자형/숫자형/날짜형 컬럼 자동 판별",
              "기술 통계량(평균, 최대, 최소, 표준편차)",
              "데이터 분포 분석을 통한 자동 차트 추천"],
             "Smart Analytics Engine")

    add_card(s3, Inches(6.8), Inches(1.8), Inches(2.7), Inches(5.0),
             "인터랙션 & 동기화",
             ["Raycaster 기반 마우스 호버/클릭 탐지",
              "3D 월드 좌표 → 2D 화면 좌표 투영 동기화",
              "선택 개체 실시간 발광(Emissive) 효과",
              "카메라 부드러운 위치 이동(Lerp 보간)"],
             "Raycasting & Screen Projection")

    add_card(s3, Inches(9.8), Inches(1.8), Inches(2.7), Inches(5.0),
             "2D 대시보드 & 차트",
             ["Chart.js (v4.4.1) 2D 대시보드 연동",
              "선택 항목 상세 카드 및 비교 미니차트",
              "데이터 테이블 양방향 선택 연동",
              "카테고리/수치 범위 필터 & 정렬 제어"],
             "Chart.js & Glassmorphism UI")

    # ==========================================
    # SLIDE 4: 6가지 3D 스타일 자동 분석 엔진
    # ==========================================
    s4 = prs.slides.add_slide(blank_layout)
    set_bg(s4)
    add_header(s4, "3. 지능형 3D 시각화 스타일 자동 추천 엔진")

    add_card(s4, Inches(0.8), Inches(1.8), Inches(3.7), Inches(2.35),
             "📈 3D 입체 튜브 라인 (Line)",
             ["적용 조건: 날짜/시계열 데이터 감지 시",
              "시각 효과: CatmullRomCurve3 매끄러운 3D 튜브 라인과 발광 구체 노드 및 가이드 기둥 표시"],
             "시계열 추세 분석 특화")

    add_card(s4, Inches(4.8), Inches(1.8), Inches(3.7), Inches(2.35),
             "🥧 3D 파이 슬라이스 (Pie)",
             ["적용 조건: 카테고리 수가 8개 이하일 때",
              "시각 효과: ExtrudeGeometry 입체 부채꼴 슬라이스를 원형 배치하여 점유율/비율 비교"],
             "비율 및 점유율 특화")

    add_card(s4, Inches(8.8), Inches(1.8), Inches(3.7), Inches(2.35),
             "🌐 3D 입체 산점도 (Scatter)",
             ["적용 조건: 수치형 컬럼 2개 이상 감지 시",
              "시각 효과: X-Y-Z 3차원 공간 좌표에 크기와 색상이 가변되는 구체 및 바닥 투영선"],
             "다변량 상관관계 분석")

    add_card(s4, Inches(0.8), Inches(4.45), Inches(3.7), Inches(2.35),
             "🌊 3D 곡면 서피스 (Surface)",
             ["적용 조건: 데이터 항목 16개 이상 연속적일 때",
              "시각 효과: 데이터 고저차를 3차원 지형 메쉬로 생성하여 전체적 분포 지형 표현"],
             "광범위 데이터 지형화")

    add_card(s4, Inches(4.8), Inches(4.45), Inches(3.7), Inches(2.35),
             "● 3D 원기둥 막대 (Cylinder)",
             ["적용 조건: 10개 이상의 다수 카테고리 비교 시",
              "시각 효과: 실린더 형태의 기둥으로 회전 대칭적 시인성을 높여 복잡도 완화"],
             "다수 범주 비교 특화")

    add_card(s4, Inches(8.8), Inches(4.45), Inches(3.7), Inches(2.35),
             "📊 3D 직육면체 막대 (Box)",
             ["적용 조건: 기본 범주형 비교 데이터",
              "시각 효과: 명확한 그림자와 각진 모서리로 데이터 크기를 한눈에 비교 가능"],
             "기본 범주 비교")

    # ==========================================
    # SLIDE 5: 실시간 인터랙션 및 동기화 기술
    # ==========================================
    s5 = prs.slides.add_slide(blank_layout)
    set_bg(s5)
    add_header(s5, "4. 실시간 인터랙션 및 3D ↔ 2D 좌표 동기화")

    add_card(s5, Inches(0.8), Inches(1.8), Inches(3.6), Inches(5.0),
             "정밀 레이캐스팅 상호작용",
             ["마우스/터치 위치에서 3D 뷰포트로 광선 투사",
              "호버(Hover) 시 해당 메쉬 1.08배 스케일 확대 애니메이션",
              "발광(Emissive) 효과로 직관적인 포커스 피드백",
              "클릭 시 대상 오브젝트로 카메라 부드럽게 줌인(Lerp)"],
             "마우스 & 터치 인터랙션")

    add_card(s5, Inches(4.8), Inches(1.8), Inches(3.6), Inches(5.0),
             "실시간 스크린 투영 동기화",
             ["Vector3.project(camera) 수학 알고리즘 적용",
              "3D 월드 좌표를 2D 화면 DOM 픽셀 좌표로 실시간 변환",
              "카메라가 회전/줌 이동해도 라벨 및 툴팁이 객체를 정확히 추적",
              "호버 시 3D 개체 위에 바로 뜨는 플로팅 툴팁 구현"],
             "3D 월드 → 2D DOM 완전 일치")

    add_card(s5, Inches(8.8), Inches(1.8), Inches(3.7), Inches(5.0),
             "양방향 데이터 테이블 연동",
             ["3D 개체 선택 시 2D 대시보드 테이블 해당 행 자동 선택 & 스크롤",
              "반대로 2D 테이블 행 클릭 시 3D 오브젝트 포커싱",
              "선택 개체의 상세 속성, 전체 대비 백분율 및 순위 실시간 산출",
              "선택 항목이 하이라이트된 미니 바 차트 즉각 렌더링"],
             "완전한 양방향 데이터 연동")

    # ==========================================
    # SLIDE 6: 2D 대시보드 및 사용자 제어 기능
    # ==========================================
    s6 = prs.slides.add_slide(blank_layout)
    set_bg(s6)
    add_header(s6, "5. 2D 대시보드 및 사용자 분석 제어 기능")

    add_card(s6, Inches(0.8), Inches(1.8), Inches(2.7), Inches(5.0),
             "스마트 2D 차트",
             ["Chart.js 기반 8종 차트 지원",
              "(막대, 가로막대, 선, 파이, 도넛, 산점도, 레이더, 폴라)",
              "3D 시각화와 동시에 2D 차트 렌더링",
              "창 최대화 및 닫기 기능 지원"],
             "2D 다각도 시각화")

    add_card(s6, Inches(3.8), Inches(1.8), Inches(2.7), Inches(5.0),
             "다차원 축 제어",
             ["X축(라벨) 컬럼 자유 선택",
              "Y축(값) 컬럼 자유 선택",
              "Z축(공간 깊이) 자동 매핑",
              "적용 버튼 클릭 시 실시간 3D/2D 동시 반영"],
             "자유로운 축 선택")

    add_card(s6, Inches(6.8), Inches(1.8), Inches(2.7), Inches(5.0),
             "조건별 데이터 필터",
             ["카테고리별 세부 필터링",
              "수치형 값 범위(최소~최대) 지정",
              "오름차순 / 내림차순 정렬 기능",
              "필터링 결과 즉시 3D 뷰포트 재구성"],
             "정밀 데이터 필터링")

    add_card(s6, Inches(9.8), Inches(1.8), Inches(2.7), Inches(5.0),
             "3D 환경 설정",
             ["환경광(Ambient) & 포인트 라이트 조절",
              "카메라 화각(FOV) 실시간 조절",
              "배경색상 커스텀 피커",
              "상단 뷰 프리셋 (탑뷰, 정면, 리셋)"],
             "맞춤형 3D 환경 튜닝")

    # ==========================================
    # SLIDE 7: 종합 결론 및 향후 발전 방향
    # ==========================================
    s7 = prs.slides.add_slide(blank_layout)
    set_bg(s7)
    add_header(s7, "6. 결론 및 향후 발전 로드맵")

    add_card(s7, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "프로젝트 성과 요약",
             ["✔ 웹 표준 무설치 기반의 실시간 3D 데이터 시각화 완성",
              "✔ 임의의 CSV 업로드 시 자동 분석 및 최적 3D/2D 차트 추천 성공",
              "✔ 3D 막대 단일 형태에서 탈피하여 파이, 튜브라인, 산점도, 서피스 등 6종 3D 스타일 다변화",
              "✔ 정밀한 레이캐스팅과 3D-2D 투영 동기화로 몰입감 있는 UX 제공",
              "✔ 축 선택, 범위 필터, 정렬, 상세 카드 연동 등 완성도 높은 대시보드 구축"],
             "차세대 3D 웹 데이터 분석 솔루션 구현")

    add_card(s7, Inches(6.8), Inches(1.8), Inches(5.7), Inches(5.0),
             "향후 확장 및 발전 방향",
             ["1. 대용량 빅데이터 처리 최적화 (InstancedMesh 및 WebWorker 도입)",
              "2. 시계열 애니메이션 타임라인 바 추가 (시간 경과에 따른 3D 데이터 변화)",
              "3. 시각화 결과물 내보내기 기능 (고해상도 3D 이미지 캡처 및 PDF 리포트)",
              "4. 웹 기반 협업 기능 (URL 파라미터 기반 시각화 상태 공유)",
              "5. WebXR 기반 VR/AR 기기 지원 (공간 컴퓨팅 데이터 시각화)"],
             "지속 가능한 확장 로드맵")

    output_path = r"c:\Users\두드림\OneDrive\Desktop\개인프로젝트\3D_데이터_시각화_보고서.pptx"
    prs.save(output_path)
    print(f"Presentation saved to: {output_path}")

if __name__ == "__main__":
    create_deck()
