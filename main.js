import * as THREE from 'three';
// Potresti voler aggiungere OrbitControls per navigare la scena
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Elementi UI ---
const sceneContainer = document.getElementById('scene-container');
const goldDisplay = document.getElementById('gold');
const xpDisplay = document.getElementById('xp');
const soulsDisplay = document.getElementById('souls');
const ppDisplay = document.getElementById('pp');
const maxPPDisplay = document.getElementById('max-pp');
const buildPuntaButton = document.getElementById('build-punta');
const addLevelButton = document.getElementById('add-level');
const currentLevelDisplay = document.getElementById('current-level');
const logList = document.getElementById('log-list');

// --- Costanti di Gioco ---
const COSTS = {
    punta: { xp: 20000, souls: 4000, gold: 0, initialMaxPP: 10 },
    block: { gold: 10000, xp: 4000, souls: 0, pp_max_increase: 1 },
    // Aggiungi qui costi per Stanze e Lastre quando implementate
};

const BLOCK_SIZE = 1; // Dimensione visuale di un blocco
const LEVEL_HEIGHT = BLOCK_SIZE; // Altezza di un livello

// --- Stato del Gioco ---
let state = {
    resources: {
        gold: 150000, // Risorse iniziali (esempio)
        xp: 100000,
        souls: 10000,
    },
    pyramid: {
        hasPunta: false,
        currentLevel: 0, // Livello più alto costruito (0 = niente, 1 = solo Punta)
        levels: [], // Conterrà gli oggetti 3D dei blocchi per livello
    },
    pp: 0, // PP accumulati
    maxPP: 0, // Massimale PP
};

// --- Setup Three.js ---
let scene, camera, renderer, pyramidGroup;

function initThreeJS() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd0e0f0); // Colore cielo

    // Camera
    const aspect = sceneContainer.clientWidth / sceneContainer.clientHeight;
    camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    camera.position.set(10, 8, 10); // Posizione iniziale camera
    camera.lookAt(0, 2, 0); // Guarda verso il centro della base della piramide

    // Luci
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(sceneContainer.clientWidth, sceneContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    sceneContainer.appendChild(renderer.domElement);

    // Gruppo per contenere tutti gli oggetti della piramide
    pyramidGroup = new THREE.Group();
    scene.add(pyramidGroup);

    // Aggiungere un piano per il terreno (opzionale)
    const groundGeometry = new THREE.PlaneGeometry(40, 40);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0xc2b280, side: THREE.DoubleSide }); // Colore sabbia
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Ruota per essere orizzontale
    ground.position.y = -BLOCK_SIZE / 2; // Posiziona appena sotto la base
    scene.add(ground);


    // Controlli Camera (Opzionali, ma utili)
    // const controls = new OrbitControls(camera, renderer.domElement);
    // controls.target.set(0, 2, 0);
    // controls.update();

    // Gestione resize finestra
    window.addEventListener('resize', onWindowResize);

    animate();
}

function onWindowResize() {
    camera.aspect = sceneContainer.clientWidth / sceneContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(sceneContainer.clientWidth, sceneContainer.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    // controls.update(); // Se usi OrbitControls
    renderer.render(scene, camera);
}

// --- Logica di Gioco ---

function logAction(message, cost = null) {
    const li = document.createElement('li');
    let text = message;
    if (cost) {
        text += ' (Costo: ';
        const costParts = [];
        if (cost.gold) costParts.push(`${cost.gold} m.o.`);
        if (cost.xp) costParts.push(`${cost.xp} p.x.`);
        if (cost.souls) costParts.push(`${cost.souls} anime`);
        text += costParts.join(', ') + ')';
    }
    li.textContent = text;
    logList.insertBefore(li, logList.firstChild); // Aggiunge in cima
}

function updateUI() {
    goldDisplay.textContent = state.resources.gold;
    xpDisplay.textContent = state.resources.xp;
    soulsDisplay.textContent = state.resources.souls;
    ppDisplay.textContent = state.pp; // Da implementare accumulo/spesa
    maxPPDisplay.textContent = state.maxPP;
    currentLevelDisplay.textContent = state.pyramid.currentLevel;

    // Abilita/Disabilita bottoni in base allo stato e alle risorse
    buildPuntaButton.disabled = state.pyramid.hasPunta || !canAfford(COSTS.punta);
    addLevelButton.disabled = !state.pyramid.hasPunta || !canAffordLevel(state.pyramid.currentLevel + 1);
}

function canAfford(cost) {
    return state.resources.gold >= (cost.gold || 0) &&
           state.resources.xp >= (cost.xp || 0) &&
           state.resources.souls >= (cost.souls || 0);
}

function deductCost(cost) {
    state.resources.gold -= (cost.gold || 0);
    state.resources.xp -= (cost.xp || 0);
    state.resources.souls -= (cost.souls || 0);
}

function calculateBlocksForLevel(levelNum) {
    if (levelNum <= 1) return 0;
    return 4 * (levelNum - 1); // 4 per liv 2, 8 per liv 3, 12 per liv 4...
}

function calculateLevelCost(levelNum) {
    const numBlocks = calculateBlocksForLevel(levelNum);
    return {
        gold: numBlocks * COSTS.block.gold,
        xp: numBlocks * COSTS.block.xp,
        souls: numBlocks * COSTS.block.souls
    };
}

function canAffordLevel(levelNum) {
    const cost = calculateLevelCost(levelNum);
    return canAfford(cost);
}

function buildPunta() {
    if (state.pyramid.hasPunta || !canAfford(COSTS.punta)) {
        logAction("ERRORE: Non puoi costruire la Punta ora.");
        return;
    }

    deductCost(COSTS.punta);
    state.pyramid.hasPunta = true;
    state.pyramid.currentLevel = 1;
    state.maxPP = COSTS.punta.initialMaxPP; // Imposta il massimale base

    // --- Crea visualizzazione Punta ---
    const puntaHeight = LEVEL_HEIGHT * 1.5; // Rendila un po' più alta
    const puntaRadius = BLOCK_SIZE * 0.1; // Base sottile
    const puntaGeometry = new THREE.ConeGeometry(puntaRadius, puntaHeight, 4); // 4 lati per aspetto piramidale
    const puntaMaterial = new THREE.MeshStandardMaterial({ color: 0xf0e68c }); // Colore dorato/Khaki
    const puntaMesh = new THREE.Mesh(puntaGeometry, puntaMaterial);

    // Posiziona la punta sopra il livello base (che non esiste ancora visivamente)
    puntaMesh.position.y = LEVEL_HEIGHT / 2 + (puntaHeight / 2); // Centrata verticalmente, assume base a y=0
    puntaMesh.rotation.y = Math.PI / 4; // Allinea le facce agli assi (opzionale)

    pyramidGroup.add(puntaMesh);
    // Salva riferimento se necessario
    state.pyramid.levels[0] = { mesh: puntaMesh }; // Livello 1 rappresentato dalla punta

    logAction("Punta costruita!", COSTS.punta);
    updateUI();
}

function addLevel() {
    const nextLevelNum = state.pyramid.currentLevel + 1;
    if (!state.pyramid.hasPunta || !canAffordLevel(nextLevelNum)) {
         logAction(`ERRORE: Non puoi costruire il livello ${nextLevelNum} ora.`);
        return;
    }

    const levelCost = calculateLevelCost(nextLevelNum);
    deductCost(levelCost);
    state.pyramid.currentLevel = nextLevelNum;

    const numBlocks = calculateBlocksForLevel(nextLevelNum);
    state.maxPP += numBlocks * COSTS.block.pp_max_increase; // Aumenta massimale PP

     // --- Crea visualizzazione Livello ---
    const levelY = LEVEL_HEIGHT / 2 + (nextLevelNum - 2) * LEVEL_HEIGHT; // Altezza del centro del nuovo livello
    const sideLength = nextLevelNum -1; // Numero di blocchi per lato (escluso angoli doppi)
    const halfSideTotal = (nextLevelNum - 1) * BLOCK_SIZE; // Dimensione totale del lato del livello N

    const blockGeometry = new THREE.BoxGeometry(BLOCK_SIZE, LEVEL_HEIGHT, BLOCK_SIZE);
    const blockMaterial = new THREE.MeshStandardMaterial({ color: 0xfff8dc }); // Marmo (Cornsilk)

    const levelBlocks = [];
    const offset = (nextLevelNum - 1) * BLOCK_SIZE / 2 - BLOCK_SIZE / 2; // Offset dal centro

    for (let i = 0; i < nextLevelNum; i++) { // Coordinate x
        for (let j = 0; j < nextLevelNum; j++) { // Coordinate z
            // Costruisci solo il perimetro
            if (i === 0 || i === nextLevelNum - 1 || j === 0 || j === nextLevelNum - 1) {
                const blockMesh = new THREE.Mesh(blockGeometry, blockMaterial);
                const xPos = (i * BLOCK_SIZE) - offset;
                const zPos = (j * BLOCK_SIZE) - offset;
                blockMesh.position.set(xPos, levelY, zPos);
                pyramidGroup.add(blockMesh);
                levelBlocks.push(blockMesh);
            }
        }
    }

     // Sposta la punta più in alto
     if (state.pyramid.levels[0] && state.pyramid.levels[0].mesh) {
         const puntaMesh = state.pyramid.levels[0].mesh;
         const puntaHeight = puntaMesh.geometry.parameters.height;
         puntaMesh.position.y = levelY + LEVEL_HEIGHT / 2 + puntaHeight / 2;
     }


    state.pyramid.levels[nextLevelNum - 1] = { blocks: levelBlocks };

    logAction(`Livello ${nextLevelNum} costruito con ${numBlocks} blocchi.`, levelCost);
    updateUI();
}


// --- Inizializzazione ---
initThreeJS();
updateUI(); // Mostra stato iniziale

// --- Event Listener ---
buildPuntaButton.addEventListener('click', buildPunta);
addLevelButton.addEventListener('click', addLevel);

// --- TODO ---
// - Implementare aggiunta Stanze (con selezione tipo e livello)
// - Implementare aggiunta Lastre Esterne (con selezione lato e livello)
// - Implementare calcolo PP generati (richiede gestione tempo/turni)
// - Gestire visivamente le stanze (magari cambiando colore interno?)
// - Gestire visivamente le lastre (cambiando materiale facce esterne o aggiungendo piani sottili)
// - Salvare/Caricare lo stato
// - Aggiungere OrbitControls per navigare meglio