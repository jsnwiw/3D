import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ════════════════════════════════════════════════════════════
// 1. Three.js 씬 초기화 (라이트 모드 배경)
// ════════════════════════════════════════════════════════════
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf1f5f9);
scene.fog = new THREE.FogExp2(0xf1f5f9, 0.015);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 10, 20);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
container.appendChild(renderer.domElement);

// ── OrbitControls ──
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 3;
controls.maxDistance = 80;
controls.maxPolarAngle = Math.PI * 0.85;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
controls.target.set(0, 2, 0);

// ── 조명 (라이트 모드에 최적화된 밝은 환경) ──
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
dirLight.position.set(12, 20, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(1024, 1024);
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 60;
dirLight.shadow.camera.left = -20;
dirLight.shadow.camera.right = 20;
dirLight.shadow.camera.top = 20;
dirLight.shadow.camera.bottom = -20;
scene.add(dirLight);

const pointLight = new THREE.PointLight(0x818cf8, 0.8, 50);
pointLight.position.set(-8, 12, -5);
scene.add(pointLight);

// ── 바닥 및 그리드 (부드러운 슬레이트 그레이) ──
const gridHelper = new THREE.GridHelper(40, 40, 0xcbd5e1, 0xe2e8f0);
scene.add(gridHelper);

const floorGeo = new THREE.PlaneGeometry(40, 40);
const floorMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc, roughness: 0.9, metalness: 0.1
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.01;
floor.receiveShadow = true;
scene.add(floor);

// ════════════════════════════════════════════════════════════
// 2. 전역 상태
// ════════════════════════════════════════════════════════════
let parsedData = null;
let analysisResult = null;
let chart2d = null;
let miniChart = null;
let dataObjects = [];
let extraVisuals = [];
let domLabels = [];
let showLabels = true;
let selectedObject = null;
let hoveredObject = null;
let cameraAnim = null;

// ════════════════════════════════════════════════════════════
// 3. DOM 참조
// ════════════════════════════════════════════════════════════
const $ = id => document.getElementById(id);
const csvUpload = $('csv-upload');
const fileNameDisplay = $('file-name');
const statusIndicator = $('status-indicator');
const detailSection = $('detail-card-section');
const detailName = $('detail-name');
const detailStats = $('detail-stats');
const analysisSection = $('analysis-section');
const analysisResultEl = $('analysis-result');
const vizSection = $('viz-section');
const chartTypeSelect = $('chart-type-select');
const xAxisSelect = $('x-axis-select');
const yAxisSelect = $('y-axis-select');
const applyBtn = $('apply-btn');
const filterSection = $('filter-section');
const dataFilter = $('data-filter');
const rangeMin = $('range-min');
const rangeMax = $('range-max');
const btnApplyRange = $('btn-apply-range');
const sortSelect = $('sort-select');
const chartPanel = $('chart-panel');
const chartTitle = $('chart-title');
const chartCloseBtn = $('chart-close-btn');
const chartMaxBtn = $('chart-maximize-btn');
const hoverTooltip = $('hover-tooltip');
const tooltipName = $('tooltip-name');
const tooltipValue = $('tooltip-value');
const labelLayer = $('label-layer');
const barStyleSelect = $('bar-style');
const btnLoadSample = $('btn-load-sample');
const menuPanel = $('menu-panel');
const btnToggleMenu = $('btn-toggle-menu');
const btnCloseMenu = $('btn-close-menu');
const autoRecommendToggle = $('auto-recommend-toggle');
const autoRecommendStatusBadge = $('auto-recommend-status-badge');
const appliedRecommendNotice = $('applied-recommend-notice');
const btnForceRecommend = $('btn-force-recommend');

// ════════════════════════════════════════════════════════════
// 4. 카메라 제어 (부드러운 전환 & 프리셋 뷰)
// ════════════════════════════════════════════════════════════
function animateCamera(targetPos, targetLookAt, duration = 800) {
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const endPos = new THREE.Vector3(...targetPos);
    const endTarget = new THREE.Vector3(...targetLookAt);
    const startTime = performance.now();
    cameraAnim = { startPos, startTarget, endPos, endTarget, startTime, duration };
}

function updateCameraAnim() {
    if (!cameraAnim) return;
    const { startPos, startTarget, endPos, endTarget, startTime, duration } = cameraAnim;
    const elapsed = performance.now() - startTime;
    const t = Math.min(elapsed / duration, 1);
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    camera.position.lerpVectors(startPos, endPos, ease);
    controls.target.lerpVectors(startTarget, endTarget, ease);
    if (t >= 1) cameraAnim = null;
}

$('btn-reset-camera').addEventListener('click', () => {
    const spread = Math.max(dataObjects.length * 1.3, 10);
    animateCamera([0, spread * 0.5 + 5, spread * 0.7 + 8], [0, 2, 0]);
});
$('btn-iso-view').addEventListener('click', () => {
    const spread = Math.max(dataObjects.length * 1.3, 10);
    animateCamera([spread * 0.7, spread * 0.6 + 6, spread * 0.7], [0, 1.5, 0]);
});
$('btn-top-view').addEventListener('click', () => {
    const spread = Math.max(dataObjects.length * 1.3, 10);
    animateCamera([0, spread + 10, 0.1], [0, 0, 0]);
});
$('btn-front-view').addEventListener('click', () => {
    const spread = Math.max(dataObjects.length * 1.3, 10);
    animateCamera([0, 4, spread * 0.8 + 10], [0, 3, 0]);
});
$('btn-auto-rotate').addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
    controls.autoRotateSpeed = 2.0;
    $('btn-auto-rotate').style.background = controls.autoRotate ? '#e0e7ff' : '';
    $('btn-auto-rotate').style.color = controls.autoRotate ? '#4338ca' : '';
});
$('btn-toggle-grid').addEventListener('click', () => {
    gridHelper.visible = !gridHelper.visible;
});
$('btn-toggle-labels').addEventListener('click', () => {
    showLabels = !showLabels;
    domLabels.forEach(l => l.el.style.display = showLabels ? '' : 'none');
});
$('btn-fullscreen').addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
});

// ════════════════════════════════════════════════════════════
// 5. 대시보드 메뉴 & 아코디언 설정 (단일 패널 오픈)
// ════════════════════════════════════════════════════════════
function openAccordionSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const header = section.querySelector('.accordion-header');
    const body = section.querySelector('.accordion-body');
    if (!header || !body) return;

    // 다른 모든 아코디언 닫기
    document.querySelectorAll('.accordion-header').forEach(h => {
        h.classList.remove('active');
        const icon = h.querySelector('.chevron');
        if (icon) icon.textContent = '▾';
    });
    document.querySelectorAll('.accordion-body').forEach(b => {
        b.classList.remove('open');
    });
    document.querySelectorAll('.accordion-item').forEach(it => {
        it.classList.remove('active');
    });

    // 선택된 섹션만 열기
    section.classList.add('active');
    header.classList.add('active');
    body.classList.add('open');
    const icon = header.querySelector('.chevron');
    if (icon) icon.textContent = '▴';
}

function initAccordion() {
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            const targetId = header.getAttribute('data-target');
            const targetBody = document.getElementById(targetId);
            const item = header.closest('.accordion-item');
            const isAlreadyOpen = targetBody && targetBody.classList.contains('open');

            // 다른 열려있는 모든 패널 닫기
            document.querySelectorAll('.accordion-header').forEach(h => {
                h.classList.remove('active');
                const icon = h.querySelector('.chevron');
                if (icon) icon.textContent = '▾';
            });
            document.querySelectorAll('.accordion-body').forEach(b => {
                b.classList.remove('open');
            });
            document.querySelectorAll('.accordion-item').forEach(it => {
                it.classList.remove('active');
            });

            // 클릭한 패널이 닫혀있었으면 열기 (이미 열려있었다면 닫힌 상태 유지)
            if (!isAlreadyOpen && targetBody) {
                header.classList.add('active');
                targetBody.classList.add('open');
                if (item) item.classList.add('active');
                const icon = header.querySelector('.chevron');
                if (icon) icon.textContent = '▴';
            }
        });
    });
}
initAccordion();

$('ambient-intensity').addEventListener('input', e => { ambientLight.intensity = parseFloat(e.target.value); });
$('point-intensity').addEventListener('input', e => { pointLight.intensity = parseFloat(e.target.value); });
$('camera-fov').addEventListener('input', e => {
    camera.fov = parseInt(e.target.value);
    camera.updateProjectionMatrix();
});
$('bg-color').addEventListener('input', e => {
    const c = e.target.value;
    scene.background = new THREE.Color(c);
    scene.fog.color = new THREE.Color(c);
});
$('bar-style').addEventListener('change', () => {
    if (parsedData && analysisResult) applyVisualization();
});
if ($('color-theme-select')) {
    $('color-theme-select').addEventListener('change', () => {
        if (parsedData && analysisResult) applyVisualization();
    });
}

// ════════════════════════════════════════════════════════════
// 6. CSV 파싱
// ════════════════════════════════════════════════════════════
function parseCSV(text) {
    const lines = text.trim().replace(/\r\n/g, '\n').split('\n');
    if (lines.length < 2) return null;
    const parseRow = (line) => {
        const result = []; let cur = ''; let inQ = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQ) {
                if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
                else if (ch === '"') inQ = false;
                else cur += ch;
            } else {
                if (ch === '"') inQ = true;
                else if (ch === ',') { result.push(cur.trim()); cur = ''; }
                else cur += ch;
            }
        }
        result.push(cur.trim());
        return result;
    };
    const headers = parseRow(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const row = parseRow(lines[i]);
        if (row.length === headers.length && row.some(v => v !== '')) rows.push(row);
    }
    return rows.length ? { headers, rows } : null;
}

// ════════════════════════════════════════════════════════════
// 7. 데이터 분석 엔진
// ════════════════════════════════════════════════════════════
function analyzeData(data) {
    const { headers, rows } = data;
    const colCount = headers.length, rowCount = rows.length;
    const columnTypes = [], numericCols = [], categoryCols = [], dateCols = [];

    for (let c = 0; c < colCount; c++) {
        const vals = rows.map(r => r[c]).filter(v => v !== '');
        const numRatio = vals.filter(v => !isNaN(parseFloat(v)) && isFinite(v)).length / Math.max(vals.length, 1);
        const datePatterns = [/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/, /^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/, /^\d{4}년/, /^\d{4}$/];
        const dateRatio = vals.filter(v => datePatterns.some(p => p.test(v))).length / Math.max(vals.length, 1);

        if (numRatio >= 0.8) { columnTypes.push('number'); numericCols.push(c); }
        else if (dateRatio >= 0.6) { columnTypes.push('date'); dateCols.push(c); }
        else { columnTypes.push('category'); categoryCols.push(c); }
    }

    const numericStats = {};
    numericCols.forEach(c => {
        const vals = rows.map(r => parseFloat(r[c])).filter(v => !isNaN(v));
        if (!vals.length) return;
        const sum = vals.reduce((a, b) => a + b, 0);
        const mean = sum / vals.length;
        const sorted = [...vals].sort((a, b) => a - b);
        numericStats[headers[c]] = {
            sum, mean, min: sorted[0], max: sorted[sorted.length - 1],
            median: sorted[Math.floor(sorted.length / 2)], count: vals.length,
            stddev: Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length)
        };
    });

    const categoryInfo = {};
    categoryCols.forEach(c => {
        const vals = rows.map(r => r[c]).filter(v => v !== '');
        const unique = [...new Set(vals)];
        categoryInfo[headers[c]] = { uniqueCount: unique.length, topValues: unique.slice(0, 20) };
    });

    const recommendedCharts = getRecommendations(rowCount, numericCols, categoryCols, dateCols, headers, categoryInfo);
    return { rowCount, colCount, columnTypes, numericCols, categoryCols, dateCols, numericStats, categoryInfo, recommendedCharts, headers };
}

function getRecommendations(rowCount, numericCols, categoryCols, dateCols, headers, categoryInfo) {
    const recs = [];
    const hasDate = dateCols.length > 0, hasCat = categoryCols.length > 0, hasNum = numericCols.length > 0;

    if (hasDate && hasNum) recs.push({ type: 'line', reason: '시계열 추세 분석' });
    if (hasCat && hasNum) {
        const uq = categoryInfo[headers[categoryCols[0]]]?.uniqueCount || 0;
        if (uq <= 8) { recs.push({ type: 'pie', reason: `${uq}개 카테고리 비율` }); recs.push({ type: 'doughnut', reason: '도넛 비율' }); }
        if (uq <= 15) { recs.push({ type: 'bar', reason: '카테고리별 비교' }); recs.push({ type: 'radar', reason: '다항목 비교' }); }
        else recs.push({ type: 'horizontalBar', reason: `많은 항목(${uq}개) 가로 비교` });
    }
    if (numericCols.length >= 2) recs.push({ type: 'scatter', reason: '수치 상관관계 분석' });
    if (!hasCat && !hasDate && hasNum) recs.push({ type: 'bar', reason: '수치 비교' });
    if (!recs.length) recs.push({ type: 'bar', reason: '기본 막대' });
    return recs;
}

// ════════════════════════════════════════════════════════════
// 8. 분석 결과 UI 표출
// ════════════════════════════════════════════════════════════
function displayAnalysis(analysis) {
    analysisSection.style.display = '';
    const tl = { number: '숫자', date: '날짜', category: '문자' };
    let html = '';
    html += statRow('행 × 열', `${analysis.rowCount} × ${analysis.colCount}`);
    html += `<div class="stat-row"><span class="stat-label">컬럼</span><span class="stat-value" style="font-size:11px;">`;
    analysis.columnTypes.forEach((t, i) => { html += `${analysis.headers[i]}(${tl[t]}) `; });
    html += `</span></div>`;

    Object.entries(analysis.numericStats).forEach(([col, s]) => {
        html += `<div style="margin-top:8px;"><strong style="color:#4338ca;">${col}</strong></div>`;
        html += statRow('평균', fmt(s.mean));
        html += statRow('범위', `${fmt(s.min)} ~ ${fmt(s.max)}`);
        html += statRow('합계', fmt(s.sum));
        html += statRow('표준편차', fmt(s.stddev));
    });

    html += `<div id="dynamic-recommend-box"></div>`;
    analysisResultEl.innerHTML = html;
}

function statRow(label, value) {
    return `<div class="stat-row"><span class="stat-label">${label}</span><span class="stat-value">${value}</span></div>`;
}
function fmt(n) { return typeof n === 'number' ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : n; }

// ════════════════════════════════════════════════════════════
// 9. 축 & 필터 설정
// ════════════════════════════════════════════════════════════
function updateAxisSelectors(analysis) {
    vizSection.style.display = '';
    filterSection.style.display = '';

    xAxisSelect.innerHTML = '';
    yAxisSelect.innerHTML = '';
    analysis.headers.forEach((h, i) => {
        xAxisSelect.appendChild(new Option(h, i));
        yAxisSelect.appendChild(new Option(h, i));
    });

    const defX = [...analysis.categoryCols, ...analysis.dateCols, 0][0];
    const defY = analysis.numericCols.length ? analysis.numericCols[0] : (analysis.headers.length > 1 ? 1 : 0);
    xAxisSelect.value = defX;
    yAxisSelect.value = defY;
    updateFilter(defX);
}

function updateFilter(colIdx) {
    dataFilter.innerHTML = '<option value="all">전체 보기</option>';
    if (!parsedData) return;
    [...new Set(parsedData.rows.map(r => r[colIdx]))].slice(0, 60).forEach(v => {
        dataFilter.appendChild(new Option(v, v));
    });
}

// ════════════════════════════════════════════════════════════
// 10. 데이터 테이블 연동
// ════════════════════════════════════════════════════════════
function renderDataTable(data, highlightRow = -1) {
    const table = $('data-table');
    const rowCountEl = $('row-count');
    const max = 80;
    let html = '<thead><tr>';
    data.headers.forEach(h => { html += `<th>${h}</th>`; });
    html += '</tr></thead><tbody>';
    data.rows.slice(0, max).forEach((row, idx) => {
        html += `<tr class="${idx === highlightRow ? 'selected' : ''}" data-idx="${idx}">`;
        row.forEach(v => { html += `<td>${v}</td>`; });
        html += '</tr>';
    });
    html += '</tbody>';
    table.innerHTML = html;
    rowCountEl.textContent = `(${data.rows.length}행 중 ${Math.min(max, data.rows.length)}행)`;

    table.querySelectorAll('tbody tr').forEach(tr => {
        tr.addEventListener('click', () => {
            const idx = parseInt(tr.dataset.idx);
            if (idx < dataObjects.length) selectObject(dataObjects[idx], idx);
        });
    });
}

// ════════════════════════════════════════════════════════════
// 11. 3D 다양한 스타일 렌더러
// ════════════════════════════════════════════════════════════
function clearScene() {
    dataObjects.forEach(obj => {
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
        }
    });
    dataObjects = [];

    extraVisuals.forEach(obj => {
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
    });
    extraVisuals = [];

    domLabels.forEach(l => l.el.remove());
    domLabels = [];
    selectedObject = null;
    hoveredObject = null;
}

function inferBest3DStyle(labels, values, analysis) {
    if (!analysis) return 'box';

    const xIdx = parseInt(xAxisSelect ? xAxisSelect.value : 0);
    const yIdx = parseInt(yAxisSelect ? yAxisSelect.value : (analysis.numericCols[0] || 0));
    const isXDate = analysis.dateCols.includes(xIdx);
    const count = labels.length;

    // 1) 날짜/시계열 축인 경우 -> 3D 튜브 라인 또는 입체 면적
    if (isXDate) {
        return count >= 10 ? 'area' : 'line';
    }

    // 2) 카테고리 수가 적고(<=8개) 비율/점유율 비교 -> 파이 또는 도넛
    if (count <= 8 && count >= 2) {
        return count <= 5 ? 'pie' : 'donut';
    }

    // 3) 수치형 컬럼이 2개 이상이고 산포도 확인 적합 -> 입체 산점도
    if (analysis.numericCols.length >= 2 && count > 14) {
        return 'scatter';
    }

    // 4) 항목이 16개 이상으로 연속적이거나 광범위 -> 3D 곡면 서피스
    if (count >= 16) {
        return 'surface';
    }

    // 5) 항목이 8~15개 범주 비교 -> 원기둥 타워 또는 피라미드
    if (count >= 8) {
        return 'cylinder';
    }

    return 'box';
}

// 현재 선택된 축/필터 데이터 옵션 기반 실시간 시각화 추천 계산
function getDynamicRecommendations(labels, values, analysis) {
    if (!analysis) return [];

    const xIdx = parseInt(xAxisSelect.value);
    const yIdx = parseInt(yAxisSelect.value);
    const isXDate = analysis.dateCols.includes(xIdx);
    const count = labels.length;
    const recs = [];

    if (isXDate) {
        recs.push({ type: 'line', reason: `X축[${analysis.headers[xIdx]}]이 시계열 데이터이므로 추세선이 가장 적합합니다.` });
        recs.push({ type: 'area', reason: '시간 경과에 따른 누적 볼륨을 3D 입체 면적으로 파악하기 좋습니다.' });
    }

    if (count <= 8 && count >= 2) {
        recs.push({ type: 'pie', reason: `항목 수(${count}개)가 적어 원형 비율 및 점유율 파악에 이상적입니다.` });
        recs.push({ type: 'donut', reason: '중앙 링 구조로 데이터 비율을 현대적으로 표현합니다.' });
    }

    if (analysis.numericCols.length >= 2) {
        recs.push({ type: 'scatter', reason: '다변량 수치 간의 상관관계 및 이상치 분포를 3D 공간에 매핑합니다.' });
    }

    if (count >= 15) {
        recs.push({ type: 'surface', reason: `항목 수(${count}개)가 많아 연속된 3D 곡면 지형으로 전반적 패턴을 조망하기 좋습니다.` });
        recs.push({ type: 'horizontalBar', reason: '많은 라벨을 가로로 배치하여 텍스트 겹침 없이 비교합니다.' });
    } else {
        recs.push({ type: 'bar', reason: '각 항목별 정밀한 수치 크기를 비교하기 가장 명확합니다.' });
        recs.push({ type: 'cylinder', reason: '원기둥 기둥으로 회전 대칭적 시인성을 제공합니다.' });
    }

    return recs;
}

// 데이터 옵션(X축/Y축/필터/정렬) 변경 시 실시간으로 추천 배지 및 가이드 갱신
function updateDynamicRecommendations(labels, values, analysis) {
    if (!analysis) return;

    const best3D = inferBest3DStyle(labels, values, analysis);
    const styleKorean = {
        pie: '🥧 3D 파이 슬라이스',
        donut: '🍩 3D 도넛 링 차트',
        line: '📈 3D 입체 튜브 라인',
        area: '🏔️ 3D 산악형 면적 차트',
        scatter: '🌐 3D 입체 산점도',
        surface: '🌊 3D 곡면 서피스',
        cylinder: '● 3D 원기둥 타워',
        pyramid: '🔺 3D 피라미드 타워',
        box: '📊 3D 직육면체 막대'
    }[best3D] || '📊 3D 막대';

    const recs = getDynamicRecommendations(labels, values, analysis);
    const typeIcons = { bar:'📊 막대', horizontalBar:'📊 가로막대', line:'📈 선', pie:'🥧 파이', doughnut:'🍩 도넛', scatter:'⚬ 산점도', radar:'🕸 레이더', polarArea:'🎯 폴라' };

    // 추천 2D 차트 결정
    const valid2DTypes = ['bar', 'horizontalBar', 'line', 'pie', 'doughnut', 'scatter', 'radar', 'polarArea'];
    const matched2D = recs.find(r => {
        const mapped = r.type === 'donut' ? 'doughnut' : r.type;
        return valid2DTypes.includes(mapped);
    });
    const best2DType = matched2D ? (matched2D.type === 'donut' ? 'doughnut' : matched2D.type) : 'bar';
    const best2DLabel = typeIcons[best2DType] || '📊 막대';

    let html = '';
    html += `<div style="margin-top:10px;"><strong style="color:#4338ca;">✨ 선택 데이터 자동 추천:</strong></div>`;
    html += `<div style="display:flex; flex-wrap:wrap; gap:4px; margin:4px 0;">`;
    html += `<span class="recommend-badge" style="background:#dcfce7; color:#15803d; font-size:11px; font-weight:700;">3D 자동적용: ${styleKorean}</span>`;
    html += `<span class="recommend-badge" style="background:#e0e7ff; color:#4338ca; font-size:11px; font-weight:700;">2D 자동적용: ${best2DLabel}</span>`;
    html += `</div>`;

    if (recs.length > 0) {
        html += `<div style="font-size:11px; color:#4f46e5; margin-top:5px; line-height:1.4; background:#f0fdf4; padding:6px 8px; border-radius:6px; border:1px solid #bbf7d0;">💡 ${recs[0].reason}</div>`;
    }

    const recEl = document.getElementById('dynamic-recommend-box');
    if (recEl) {
        recEl.innerHTML = html;
    }
}

// 색상 테마 팔레트 생성 함수
function getThemeColor(index, count, alpha = 1) {
    const theme = $('color-theme-select') ? $('color-theme-select').value : 'vibrant';
    const t = count > 1 ? index / (count - 1) : 0;
    
    switch (theme) {
        case 'ocean': {
            // 깊은 인디고 -> 아쿠아 시안
            const hue = 190 + t * 45;
            return new THREE.Color(`hsl(${hue}, 85%, ${45 + t * 15}%)`);
        }
        case 'neon': {
            // 사이버펑크 핑크 -> 일렉트릭 퍼플 -> 네온 블루
            const hue = (280 + index * 40) % 360;
            return new THREE.Color(`hsl(${hue}, 95%, 60%)`);
        }
        case 'sunset': {
            // 따뜻한 앰버 옐로우 -> 오렌지 -> 핫핑크
            const hue = 35 + t * 310;
            return new THREE.Color(`hsl(${hue % 360}, 90%, 55%)`);
        }
        case 'emerald': {
            // 산뜻한 라임 -> 에메랄드 딥그린 -> 민트
            const hue = 140 + t * 35;
            return new THREE.Color(`hsl(${hue}, 80%, ${40 + t * 15}%)`);
        }
        case 'vibrant':
        default: {
            const hue = (index * (360 / Math.max(count, 1))) % 360;
            return new THREE.Color(`hsl(${hue}, 75%, 52%)`);
        }
    }
}

function render3DVisualization(labels, values) {
    clearScene();
    if (!values || !values.length) return;

    let selectedStyle = $('bar-style').value;
    if (selectedStyle === 'auto') {
        selectedStyle = inferBest3DStyle(labels, values, analysisResult);
    }

    switch (selectedStyle) {
        case 'pie': render3DPie(labels, values); break;
        case 'donut': render3DDonut(labels, values); break;
        case 'line': render3DLine(labels, values); break;
        case 'area': render3DArea(labels, values); break;
        case 'scatter': render3DScatter(labels, values); break;
        case 'surface': render3DSurface(labels, values); break;
        case 'pyramid': render3DBarMesh(labels, values, 'pyramid'); break;
        case 'cylinder': render3DBarMesh(labels, values, 'cylinder'); break;
        case 'box':
        default:
            render3DBarMesh(labels, values, 'box'); break;
    }
}

function render3DBarMesh(labels, values, shape = 'box') {
    const maxVal = Math.max(...values, 1);
    const scale = 8 / maxVal;
    const count = labels.length;

    labels.forEach((label, i) => {
        const val = values[i];
        const h = Math.max(val * scale, 0.1);
        const color = getThemeColor(i, count);

        let geometry;
        if (shape === 'cylinder') {
            geometry = new THREE.CylinderGeometry(0.38, 0.38, h, 24);
        } else if (shape === 'pyramid') {
            // 사각뿔 피라미드 타워 (top radius: 0, bottom radius: 0.5, 4 segments)
            geometry = new THREE.CylinderGeometry(0.02, 0.55, h, 4);
        } else {
            geometry = new THREE.BoxGeometry(0.72, h, 0.72);
        }

        const material = new THREE.MeshStandardMaterial({
            color, metalness: 0.25, roughness: 0.35,
            emissive: color.clone().multiplyScalar(0.08)
        });

        const mesh = new THREE.Mesh(geometry, material);
        const xPos = (i - (count - 1) / 2) * 1.35;
        mesh.position.set(xPos, h / 2, 0);
        if (shape === 'pyramid') mesh.rotation.y = Math.PI / 4;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { name: label, value: val, index: i, baseColor: color.clone(), baseY: h / 2 };

        scene.add(mesh);
        dataObjects.push(mesh);
        addDomLabel(label, xPos, -0.3, 0);
    });

    const spread = count * 1.35;
    animateCamera([0, spread * 0.4 + 5, spread * 0.6 + 8], [0, 2, 0]);
}

function render3DPie(labels, values) {
    render3DRing(labels, values, 0);
}

function render3DDonut(labels, values) {
    render3DRing(labels, values, 2.2);
}

function render3DRing(labels, values, innerRadius = 0) {
    const total = values.reduce((sum, v) => sum + Math.max(v, 0), 0) || 1;
    const outerRadius = 5.2;
    const thickness = 1.3;
    let currentAngle = 0;
    const count = labels.length;

    labels.forEach((label, i) => {
        const val = values[i];
        const sliceAngle = (Math.max(val, 0) / total) * Math.PI * 2;
        if (sliceAngle <= 0.001) return;

        const color = getThemeColor(i, count);
        const shape = new THREE.Shape();

        if (innerRadius > 0) {
            // 도넛 링 섹터
            shape.absarc(0, 0, outerRadius, currentAngle, currentAngle + sliceAngle, false);
            shape.absarc(0, 0, innerRadius, currentAngle + sliceAngle, currentAngle, true);
        } else {
            // 파이 부채꼴
            shape.moveTo(0, 0);
            shape.arc(0, 0, outerRadius, currentAngle, currentAngle + sliceAngle, false);
            shape.lineTo(0, 0);
        }

        const extrudeSettings = {
            depth: thickness, bevelEnabled: true, bevelSegments: 3,
            steps: 1, bevelSize: 0.08, bevelThickness: 0.08
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.rotateX(-Math.PI / 2);

        const material = new THREE.MeshStandardMaterial({
            color, metalness: 0.25, roughness: 0.35,
            emissive: color.clone().multiplyScalar(0.06)
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(0, thickness, 0);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const midAngle = currentAngle + sliceAngle / 2;
        const labelRadius = outerRadius + 1.2;
        const labelX = Math.cos(midAngle) * labelRadius;
        const labelZ = -Math.sin(midAngle) * labelRadius;

        mesh.userData = {
            name: `${label} (${((val / total) * 100).toFixed(1)}%)`,
            value: val, index: i, baseColor: color.clone(), midAngle
        };

        scene.add(mesh);
        dataObjects.push(mesh);
        addDomLabel(label, labelX, 0.2, labelZ);
        currentAngle += sliceAngle;
    });

    animateCamera([0, 11, 14], [0, 1, 0]);
}

function render3DArea(labels, values) {
    const maxVal = Math.max(...values, 1);
    const scale = 7 / maxVal;
    const count = labels.length;
    if (count < 2) {
        render3DBarMesh(labels, values, 'box');
        return;
    }

    const depth = 2.0;
    const shape = new THREE.Shape();
    const startX = (0 - (count - 1) / 2) * 1.5;
    shape.moveTo(startX, 0);

    const points = [];
    labels.forEach((label, i) => {
        const val = values[i];
        const y = Math.max(val * scale, 0.2);
        const x = (i - (count - 1) / 2) * 1.5;
        shape.lineTo(x, y);
        points.push({ x, y, val, label, i });
    });

    const endX = ((count - 1) - (count - 1) / 2) * 1.5;
    shape.lineTo(endX, 0);
    shape.lineTo(startX, 0);

    const extrudeSettings = { depth: depth, bevelEnabled: false };
    const areaGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const areaMat = new THREE.MeshStandardMaterial({
        color: 0x4f46e5, metalness: 0.2, roughness: 0.35,
        transparent: true, opacity: 0.85, side: THREE.DoubleSide
    });
    const areaMesh = new THREE.Mesh(areaGeo, areaMat);
    areaMesh.position.set(0, 0, -depth / 2);
    areaMesh.receiveShadow = true;
    areaMesh.castShadow = true;
    scene.add(areaMesh);
    extraVisuals.push(areaMesh);

    // 각 정점에 인터랙티브 데이터 노드 구체 배치
    points.forEach(p => {
        const color = getThemeColor(p.i, count);
        const nodeGeo = new THREE.SphereGeometry(0.35, 20, 20);
        const nodeMat = new THREE.MeshStandardMaterial({
            color, metalness: 0.3, roughness: 0.3,
            emissive: color.clone().multiplyScalar(0.2)
        });
        const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
        nodeMesh.position.set(p.x, p.y, 0);
        nodeMesh.castShadow = true;
        nodeMesh.userData = { name: p.label, value: p.val, index: p.i, baseColor: color.clone(), baseY: p.y };

        scene.add(nodeMesh);
        dataObjects.push(nodeMesh);
        addDomLabel(p.label, p.x, -0.3, 0);
    });

    const spread = count * 1.5;
    animateCamera([spread * 0.5, spread * 0.4 + 5, spread * 0.7 + 7], [0, 2, 0]);
}

function render3DLine(labels, values) {
    const maxVal = Math.max(...values, 1);
    const scale = 7 / maxVal;
    const count = labels.length;
    const points = [];

    labels.forEach((label, i) => {
        const val = values[i];
        const y = Math.max(val * scale, 0.2);
        const x = (i - (count - 1) / 2) * 1.5;
        const pt = new THREE.Vector3(x, y, 0);
        points.push(pt);

        const hue = (i * (360 / Math.max(count, 1))) % 360;
        const color = new THREE.Color(`hsl(${hue}, 80%, 50%)`);
        const nodeGeo = new THREE.SphereGeometry(0.35, 20, 20);
        const nodeMat = new THREE.MeshStandardMaterial({
            color, metalness: 0.3, roughness: 0.3,
            emissive: color.clone().multiplyScalar(0.2)
        });
        const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
        nodeMesh.position.copy(pt);
        nodeMesh.castShadow = true;
        nodeMesh.userData = { name: label, value: val, index: i, baseColor: color.clone(), baseY: y };

        scene.add(nodeMesh);
        dataObjects.push(nodeMesh);

        const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, y, 8);
        const stemMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.6 });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.set(x, y / 2, 0);
        scene.add(stem);
        extraVisuals.push(stem);

        addDomLabel(label, x, -0.3, 0);
    });

    if (points.length >= 2) {
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeo = new THREE.TubeGeometry(curve, Math.max(count * 6, 40), 0.12, 12, false);
        const tubeMat = new THREE.MeshStandardMaterial({
            color: 0x4f46e5, metalness: 0.4, roughness: 0.2,
            emissive: 0x4338ca, emissiveIntensity: 0.3
        });
        const tube = new THREE.Mesh(tubeGeo, tubeMat);
        tube.castShadow = true;
        scene.add(tube);
        extraVisuals.push(tube);
    }

    const spread = count * 1.5;
    animateCamera([0, spread * 0.4 + 4, spread * 0.7 + 7], [0, 2, 0]);
}

function render3DScatter(labels, values) {
    const maxVal = Math.max(...values, 1);
    const count = labels.length;
    const yIdx = parseInt(yAxisSelect.value);
    const otherNumCols = (analysisResult?.numericCols || []).filter(c => c !== yIdx);
    const zIdx = otherNumCols.length > 0 ? otherNumCols[0] : null;

    let zValues = [];
    if (zIdx !== null && parsedData) {
        zValues = parsedData.rows.map(r => parseFloat(r[zIdx]) || 0);
    }
    const maxZ = zValues.length ? Math.max(...zValues, 1) : 1;

    labels.forEach((label, i) => {
        const val = values[i];
        const y = (val / maxVal) * 7 + 0.5;
        const x = (i - (count - 1) / 2) * 1.2;
        const z = zValues.length ? ((zValues[i] / maxZ) * 8 - 4) : Math.sin(i * 0.8) * 3;

        const sphereRadius = Math.max((val / maxVal) * 0.45 + 0.2, 0.2);
        const hue = (i * (360 / Math.max(count, 1))) % 360;
        const color = new THREE.Color(`hsl(${hue}, 80%, 50%)`);

        const geometry = new THREE.SphereGeometry(sphereRadius, 24, 24);
        const material = new THREE.MeshStandardMaterial({
            color, metalness: 0.3, roughness: 0.3,
            emissive: color.clone().multiplyScalar(0.15)
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.userData = { name: label, value: val, index: i, baseColor: color.clone(), baseY: y };

        scene.add(mesh);
        dataObjects.push(mesh);

        const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x, 0, z),
            new THREE.Vector3(x, y, z)
        ]);
        const lineMat = new THREE.LineDashedMaterial({ color: 0x94a3b8, dashSize: 0.3, gapSize: 0.2 });
        const line = new THREE.Line(lineGeo, lineMat);
        line.computeLineDistances();
        scene.add(line);
        extraVisuals.push(line);

        addDomLabel(label, x, -0.3, z);
    });

    animateCamera([0, 9, 16], [0, 2, 0]);
}

function render3DSurface(labels, values) {
    const maxVal = Math.max(...values, 1);
    const count = labels.length;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);

    const width = 12;
    const depth = 12;
    const planeGeo = new THREE.PlaneGeometry(width, depth, cols - 1, rows - 1);
    const pos = planeGeo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
        const val = values[i % count] || 0;
        pos.setZ(i, (val / maxVal) * 6);
    }
    planeGeo.computeVertexNormals();

    const planeMat = new THREE.MeshStandardMaterial({
        color: 0x4f46e5, metalness: 0.2, roughness: 0.4, side: THREE.DoubleSide
    });

    const surfaceMesh = new THREE.Mesh(planeGeo, planeMat);
    surfaceMesh.rotation.x = -Math.PI / 2;
    surfaceMesh.position.set(0, 0, 0);
    surfaceMesh.receiveShadow = true;
    surfaceMesh.castShadow = true;
    scene.add(surfaceMesh);
    extraVisuals.push(surfaceMesh);

    labels.forEach((label, i) => {
        const val = values[i];
        const c = i % cols;
        const r = Math.floor(i / cols);
        const x = (c / Math.max(cols - 1, 1) - 0.5) * width;
        const z = (r / Math.max(rows - 1, 1) - 0.5) * depth;
        const y = (val / maxVal) * 6 + 0.2;

        const pinGeo = new THREE.CylinderGeometry(0.08, 0.08, y, 8);
        const hue = (i * (360 / Math.max(count, 1))) % 360;
        const color = new THREE.Color(`hsl(${hue}, 80%, 55%)`);
        const pinMat = new THREE.MeshStandardMaterial({ color, emissive: color.clone().multiplyScalar(0.2) });
        const pinMesh = new THREE.Mesh(pinGeo, pinMat);
        pinMesh.position.set(x, y / 2, z);
        pinMesh.userData = { name: label, value: val, index: i, baseColor: color.clone(), baseY: y };

        scene.add(pinMesh);
        dataObjects.push(pinMesh);
        addDomLabel(label, x, -0.3, z);
    });

    animateCamera([10, 10, 15], [0, 2, 0]);
}

function addDomLabel(text, x, y, z) {
    const labelEl = document.createElement('div');
    labelEl.className = 'label-3d';
    labelEl.textContent = text;
    labelEl.style.display = showLabels ? '' : 'none';
    labelLayer.appendChild(labelEl);
    domLabels.push({ el: labelEl, worldPos: new THREE.Vector3(x, y, z) });
}

// ════════════════════════════════════════════════════════════
// 12. 3D ↔ 2D 좌표 투영 동기화
// ════════════════════════════════════════════════════════════
const tempVec = new THREE.Vector3();

function syncLabelsToScreen() {
    const hw = window.innerWidth / 2;
    const hh = window.innerHeight / 2;

    domLabels.forEach(({ el, worldPos }) => {
        tempVec.copy(worldPos).project(camera);
        if (tempVec.z > 1) { el.style.opacity = '0'; return; }
        el.style.left = (tempVec.x * hw + hw) + 'px';
        el.style.top = (-tempVec.y * hh + hh) + 'px';
        el.style.opacity = '1';
    });
}

function showTooltipAt(obj, screenX, screenY) {
    const ud = obj.userData;
    tooltipName.textContent = ud.name;
    tooltipValue.textContent = typeof ud.value === 'number' ? ud.value.toLocaleString() : ud.value;
    hoverTooltip.style.display = '';
    hoverTooltip.style.left = (screenX + 18) + 'px';
    hoverTooltip.style.top = (screenY - 10) + 'px';
}
function hideTooltip() { hoverTooltip.style.display = 'none'; }

// ════════════════════════════════════════════════════════════
// 13. 레이캐스팅 (호버 & 클릭)
// ════════════════════════════════════════════════════════════
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onPointerMove(event) {
    if (!dataObjects.length) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(dataObjects);

    if (hoveredObject && hoveredObject !== selectedObject) {
        resetObjectAppearance(hoveredObject);
    }

    if (hits.length > 0) {
        const obj = hits[0].object;
        hoveredObject = obj;
        if (obj !== selectedObject) {
            obj.material.emissive.copy(obj.userData.baseColor).multiplyScalar(0.3);
        }
        container.style.cursor = 'pointer';
        showTooltipAt(obj, event.clientX, event.clientY);
    } else {
        hoveredObject = null;
        container.style.cursor = 'grab';
        hideTooltip();
    }
}
renderer.domElement.addEventListener('pointermove', onPointerMove);

function onPointerClick(event) {
    if (!dataObjects.length) return;
    if (event.target.closest('#dashboard-panel') || event.target.closest('#chart-panel') || event.target.closest('#top-bar')) return;

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(dataObjects);

    if (hits.length > 0) {
        selectObject(hits[0].object, hits[0].object.userData.index);
    } else {
        deselectAll();
    }
}
window.addEventListener('click', onPointerClick);

function selectObject(obj, idx) {
    deselectAll();
    selectedObject = obj;
    obj.material.emissive.set(0x4f46e5);
    obj.material.emissiveIntensity = 0.6;

    showDetailCard(obj.userData, idx);
    highlightTableRow(idx);

    const pos = obj.position;
    animateCamera(
        [pos.x + 3, pos.y + 5, pos.z + 6],
        [pos.x, pos.y, pos.z]
    );
}

function deselectAll() {
    dataObjects.forEach(resetObjectAppearance);
    selectedObject = null;
    detailSection.style.display = 'none';
    document.querySelectorAll('#data-table tr.selected').forEach(tr => tr.classList.remove('selected'));
}

function resetObjectAppearance(obj) {
    if (!obj.userData.baseColor) return;
    obj.material.emissive.copy(obj.userData.baseColor).multiplyScalar(0.05);
    obj.material.emissiveIntensity = 1;
}

function highlightTableRow(idx) {
    document.querySelectorAll('#data-table tbody tr').forEach((tr, i) => {
        tr.classList.toggle('selected', i === idx);
    });
    const row = document.querySelector(`#data-table tbody tr[data-idx="${idx}"]`);
    if (row) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// ════════════════════════════════════════════════════════════
// 14. 상세 카드 & 미니 차트 (라이트 테마)
// ════════════════════════════════════════════════════════════
function showDetailCard(ud, idx) {
    detailSection.style.display = '';
    openAccordionSection('detail-card-section');
    if (menuPanel) menuPanel.classList.add('open');
    detailName.textContent = `📌 ${ud.name}`;

    if (!parsedData) return;
    const row = parsedData.rows[idx];
    let html = `<div class="stat-highlight">${typeof ud.value === 'number' ? ud.value.toLocaleString() : ud.value}</div>`;
    parsedData.headers.forEach((h, ci) => {
        html += statRow(h, row[ci]);
    });

    if (analysisResult && analysisResult.numericCols.length > 0) {
        const yIdx = parseInt(yAxisSelect.value);
        const allVals = parsedData.rows.map(r => parseFloat(r[yIdx]) || 0);
        const sorted = [...allVals].sort((a, b) => b - a);
        const rank = sorted.indexOf(parseFloat(row[yIdx]) || 0) + 1;
        html += statRow('순위', `${rank} / ${allVals.length}`);
        const pct = ((parseFloat(row[yIdx]) || 0) / Math.max(...allVals, 1) * 100).toFixed(1);
        html += statRow('최대값 대비', `${pct}%`);
    }
    detailStats.innerHTML = html;
    renderMiniChart(idx);
}

function renderMiniChart(highlightIdx) {
    if (miniChart) { miniChart.destroy(); miniChart = null; }
    if (!parsedData) return;

    const yIdx = parseInt(yAxisSelect.value);
    const xIdx = parseInt(xAxisSelect.value);
    const labels = parsedData.rows.map(r => r[xIdx]);
    const values = parsedData.rows.map(r => parseFloat(r[yIdx]) || 0);

    const bgColors = values.map((_, i) =>
        i === highlightIdx ? 'rgba(79, 70, 229, 0.9)' : 'rgba(79, 70, 229, 0.2)'
    );

    const ctx = $('detail-mini-chart').getContext('2d');
    miniChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels, datasets: [{ data: values, backgroundColor: bgColors, borderRadius: 3, borderSkipped: false }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: true } },
            scales: {
                x: { display: false },
                y: { display: false, beginAtZero: true }
            }
        }
    });
}

// ════════════════════════════════════════════════════════════
// 15. Chart.js 2D 차트 (라이트 테마 최적화)
// ════════════════════════════════════════════════════════════
const COLORS = [
    'rgba(79, 70, 229, 0.85)', 'rgba(236, 72, 153, 0.85)', 'rgba(16, 185, 129, 0.85)',
    'rgba(245, 158, 11, 0.85)', 'rgba(124, 58, 237, 0.85)', 'rgba(14, 165, 233, 0.85)',
    'rgba(239, 68, 68, 0.85)', 'rgba(34, 197, 94, 0.85)', 'rgba(168, 85, 247, 0.85)'
];
const BORDERS = COLORS.map(c => c.replace('0.85)', '1)'));

function getFilteredRows() {
    if (!parsedData) return [];
    let rows = [...parsedData.rows];
    const xIdx = parseInt(xAxisSelect.value);
    const yIdx = parseInt(yAxisSelect.value);

    const fv = dataFilter.value;
    if (fv !== 'all') rows = rows.filter(r => r[xIdx] === fv);

    const rMin = rangeMin.value !== '' ? parseFloat(rangeMin.value) : -Infinity;
    const rMax = rangeMax.value !== '' ? parseFloat(rangeMax.value) : Infinity;
    if (rMin !== -Infinity || rMax !== Infinity) {
        rows = rows.filter(r => {
            const v = parseFloat(r[yIdx]);
            return !isNaN(v) && v >= rMin && v <= rMax;
        });
    }

    const sort = sortSelect.value;
    if (sort === 'asc') rows.sort((a, b) => (parseFloat(a[yIdx]) || 0) - (parseFloat(b[yIdx]) || 0));
    else if (sort === 'desc') rows.sort((a, b) => (parseFloat(b[yIdx]) || 0) - (parseFloat(a[yIdx]) || 0));

    return rows;
}

function render2DChart() {
    if (!parsedData || !analysisResult) return;
    const xIdx = parseInt(xAxisSelect.value);
    const yIdx = parseInt(yAxisSelect.value);
    const rows = getFilteredRows();

    const labels = rows.map(r => r[xIdx]);
    const values = rows.map(r => parseFloat(r[yIdx]) || 0);

    // 현재 변경된 데이터 옵션(X축, Y축, 행 개수, 데이터 타입) 기반 동적 추천 산출
    const dynamicRecs = getDynamicRecommendations(labels, values, analysisResult);

    let chartType = chartTypeSelect.value;
    if (chartType === 'auto') {
        // 선택된 데이터의 최적 2D 차트 추천 자동 선택
        const valid2DTypes = ['bar', 'horizontalBar', 'line', 'pie', 'doughnut', 'scatter', 'radar', 'polarArea'];
        const matchedRec = dynamicRecs.find(r => {
            const mapped = r.type === 'donut' ? 'doughnut' : r.type;
            return valid2DTypes.includes(mapped);
        });
        chartType = matchedRec ? (matchedRec.type === 'donut' ? 'doughnut' : matchedRec.type) : 'bar';
    }

    if (chart2d) { chart2d.destroy(); chart2d = null; }
    chartPanel.style.display = '';

    const canvas = $('chart-2d');
    const ctx = canvas.getContext('2d');
    const typeLabels = { bar:'막대', horizontalBar:'가로 막대', line:'선', pie:'파이', doughnut:'도넛', scatter:'산점도', radar:'레이더', polarArea:'폴라 에어리어' };
    chartTitle.textContent = `${typeLabels[chartType] || chartType} — ${parsedData.headers[yIdx]}`;

    if (chartType === 'scatter' && analysisResult.numericCols.length >= 2) {
        const xN = analysisResult.numericCols[0], yN = analysisResult.numericCols[1];
        chart2d = new Chart(ctx, {
            type: 'scatter',
            data: { datasets: [{ label: `${parsedData.headers[xN]} vs ${parsedData.headers[yN]}`, data: rows.map(r => ({ x: parseFloat(r[xN]) || 0, y: parseFloat(r[yN]) || 0 })), backgroundColor: COLORS[0], pointRadius: 6, pointHoverRadius: 10 }] },
            options: chartOptions(chartType, parsedData.headers[xN], parsedData.headers[yN])
        });
    } else {
        const actualType = chartType === 'horizontalBar' ? 'bar' : chartType;
        const isPie = ['pie', 'doughnut', 'polarArea'].includes(chartType);
        const ds = {
            label: parsedData.headers[yIdx], data: values,
            backgroundColor: isPie ? COLORS.slice(0, values.length) : COLORS[0],
            borderColor: isPie ? BORDERS.slice(0, values.length) : BORDERS[0],
            borderWidth: 2, fill: chartType === 'line' ? 'origin' : undefined,
            tension: chartType === 'line' ? 0.4 : undefined,
            pointRadius: chartType === 'line' ? 4 : undefined,
            borderRadius: chartType === 'bar' || chartType === 'horizontalBar' ? 4 : undefined,
        };
        const cfg = { type: actualType, data: { labels, datasets: [ds] }, options: chartOptions(chartType, parsedData.headers[xIdx], parsedData.headers[yIdx]) };
        if (chartType === 'horizontalBar') cfg.options.indexAxis = 'y';
        chart2d = new Chart(ctx, cfg);
    }

    render3DVisualization(labels, values);
    renderDataTable(parsedData);
    updateDynamicRecommendations(labels, values, analysisResult);
}

function chartOptions(type, xLabel, yLabel) {
    const isPie = ['pie', 'doughnut', 'polarArea'].includes(type);
    return {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 600, easing: 'easeOutQuart' },
        plugins: {
            legend: { display: isPie, position: 'right', labels: { color: '#334155', font: { size: 10 }, padding: 6 } },
            tooltip: { backgroundColor: 'rgba(255, 255, 255, 0.95)', titleColor: '#4338ca', bodyColor: '#1e293b', borderColor: '#cbd5e1', borderWidth: 1, padding: 10, cornerRadius: 8 }
        },
        scales: isPie ? {} : {
            x: { title: { display: true, text: xLabel, color: '#64748b', font: { size: 11 } }, ticks: { color: '#64748b', maxRotation: 45, font: { size: 9 } }, grid: { color: '#f1f5f9' } },
            y: { title: { display: true, text: yLabel, color: '#64748b', font: { size: 11 } }, ticks: { color: '#64748b', font: { size: 9 } }, grid: { color: '#f1f5f9' }, beginAtZero: true }
        }
    };
}

function applyVisualization() {
    render2DChart();
}

// ════════════════════════════════════════════════════════════
// 16. 이벤트 리스너
// ════════════════════════════════════════════════════════════
csvUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    fileNameDisplay.textContent = `📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    statusIndicator.textContent = '● 로딩 중...';
    statusIndicator.className = 'status loading';

    const reader = new FileReader();
    reader.onload = evt => {
        parsedData = parseCSV(evt.target.result);
        if (!parsedData) {
            statusIndicator.textContent = '● 파싱 실패';
            statusIndicator.className = 'status offline';
            return;
        }
        processData(`📄 ${file.name}`);
    };
    reader.readAsText(file);
});

const SAMPLE_CSV = `지역,매출,비용,이익
서울,15000,8500,6500
부산,9200,5100,4100
대구,7800,4200,3600
인천,8500,4800,3700
광주,5600,3200,2400
대전,6100,3500,2600
울산,4800,2700,2100
세종,3200,1800,1400
제주,6700,3900,2800
수원,7100,4000,3100`;

btnLoadSample?.addEventListener('click', () => {
    parsedData = parseCSV(SAMPLE_CSV);
    if (!parsedData) return;
    fileNameDisplay.textContent = 'sample_data.csv (기본 샘플)';
    processData('기본 샘플 데이터');
});

function processData(sourceName) {
    analysisResult = analyzeData(parsedData);
    displayAnalysis(analysisResult);
    updateAxisSelectors(analysisResult);
    renderDataTable(parsedData);
    applyVisualization();

    statusIndicator.textContent = `● ${sourceName}`;
    statusIndicator.className = 'status online';

    // 메뉴 패널 열고 시각화 설정 아코디언 열기
    if (menuPanel) menuPanel.classList.add('open');
    openAccordionSection('viz-section');
}

// 메뉴 드로어 토글
btnToggleMenu?.addEventListener('click', () => {
    if (menuPanel) menuPanel.classList.toggle('open');
});
btnCloseMenu?.addEventListener('click', () => {
    if (menuPanel) menuPanel.classList.remove('open');
});

// 자동 추천 토글 및 즉시 적용 버튼
autoRecommendToggle?.addEventListener('change', () => {
    const isAuto = autoRecommendToggle.checked;
    if (autoRecommendStatusBadge) {
        autoRecommendStatusBadge.textContent = isAuto ? 'ON (자동)' : 'OFF (수동)';
        autoRecommendStatusBadge.className = isAuto ? 'badge-auto-on' : 'badge-auto-off';
    }
    if (appliedRecommendNotice) {
        appliedRecommendNotice.textContent = isAuto
            ? '선택한 데이터에 맞춰 3D 및 2D 시각화가 최적으로 자동 적용됩니다.'
            : '수동 설정 모드입니다. 원하는 3D 형태와 2D 차트를 직접 지정하세요.';
    }
});

btnForceRecommend?.addEventListener('click', () => {
    if (!parsedData || !analysisResult) return;
    const xIdx = parseInt(xAxisSelect.value);
    const yIdx = parseInt(yAxisSelect.value);
    const rows = getFilteredRows();
    const labels = rows.map(r => r[xIdx]);
    const values = rows.map(r => parseFloat(r[yIdx]) || 0);
    const best3D = inferBest3DStyle(labels, values, analysisResult);
    if (barStyleSelect) barStyleSelect.value = best3D;
    const recs = getDynamicRecommendations(labels, values, analysisResult);
    const valid2DTypes = ['bar', 'horizontalBar', 'line', 'pie', 'doughnut', 'scatter', 'radar', 'polarArea'];
    const matched2D = recs.find(r => valid2DTypes.includes(r.type === 'donut' ? 'doughnut' : r.type));
    if (matched2D && chartTypeSelect) {
        chartTypeSelect.value = matched2D.type === 'donut' ? 'doughnut' : matched2D.type;
    }
    applyVisualization();
});

chartTypeSelect.addEventListener('change', () => { if (parsedData) applyVisualization(); });

// X축 또는 Y축 옵션을 변경할 때마다 즉시 실시간 맞춤 시각화 추천 및 화면 갱신
xAxisSelect.addEventListener('change', () => {
    if (!parsedData) return;
    updateFilter(parseInt(xAxisSelect.value));
    applyVisualization();
});
yAxisSelect.addEventListener('change', () => {
    if (!parsedData) return;
    applyVisualization();
});

applyBtn.addEventListener('click', () => {
    if (!parsedData) return;
    updateFilter(parseInt(xAxisSelect.value));
    applyVisualization();
});
dataFilter.addEventListener('change', () => { if (parsedData) applyVisualization(); });
btnApplyRange.addEventListener('click', () => { if (parsedData) applyVisualization(); });
sortSelect.addEventListener('change', () => { if (parsedData) applyVisualization(); });

chartCloseBtn.addEventListener('click', () => { chartPanel.style.display = 'none'; });
chartMaxBtn.addEventListener('click', () => { chartPanel.classList.toggle('maximized'); if (chart2d) chart2d.resize(); });

// ════════════════════════════════════════════════════════════
// 17. 렌더 루프
// ════════════════════════════════════════════════════════════
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    dataObjects.forEach(obj => {
        const isHovered = obj === hoveredObject || obj === selectedObject;
        const targetScale = isHovered ? 1.08 : 1.0;
        obj.scale.x += (targetScale - obj.scale.x) * 5 * dt;
        obj.scale.z += (targetScale - obj.scale.z) * 5 * dt;
    });

    updateCameraAnim();
    controls.update();
    syncLabelsToScreen();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.domElement.addEventListener('touchstart', e => {
    const t = e.touches[0];
    onPointerMove({ clientX: t.clientX, clientY: t.clientY });
}, { passive: true });

animate();
