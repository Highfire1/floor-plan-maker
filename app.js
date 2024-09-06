// Scale: 1 pixel = 1 cm
const SCALE = 1; // 1 pixel per cm
const METERS_TO_PIXELS = 100 * SCALE; // 100 cm = 1 meter

// Common dimensions
const DOOR_WIDTH = 80 * SCALE; // Standard door width: 80 cm
const TABLE_WIDTH = 150 * SCALE; // Standard table width: 150 cm
const TABLE_DEPTH = 75 * SCALE; // Standard table depth: 75 cm
const CHAIR_SIZE = 50 * SCALE; // Approximate chair size: 50 cm x 50 cm

// Floor plan dimensions
const FLOOR_PLAN_WIDTH = 7000;
const FLOOR_PLAN_HEIGHT = 4000;

// Event space dimensions (assuming it's roughly the left half of the image)
const EVENT_SPACE_WIDTH = Math.floor(FLOOR_PLAN_WIDTH * 0.5);
const EVENT_SPACE_HEIGHT = FLOOR_PLAN_HEIGHT;

// Conversion functions
function metersToPixels(meters) {
    return Math.round(meters * METERS_TO_PIXELS);
}

function pixelsToMeters(pixels) {
    return pixels / METERS_TO_PIXELS;
}

let isDragging = false;
let startX, startY;
let floorPlan;

// Add this near the top of the file, with other global variables
let selectedFurniture = [];
let currentScale = 1;

// Add these constants near the top of the file
const MIN_ZOOM_FACTOR = 0.5;  // Minimum zoom is 50% of the initial fit
const MAX_ZOOM_FACTOR = 5;    // Maximum zoom is 500% of the initial fit

let initialScale;
let isCurrentSetupSaved = true;

function initFloorPlan() {
    const floorPlanContainer = document.getElementById('floor-plan-container');
    floorPlan = document.getElementById('floor-plan');
    const furnitureLayer = document.createElement('div');
    furnitureLayer.id = 'furniture-layer';

    // Set the floor plan image
    floorPlan.style.backgroundImage = 'url("assets/floor-plans/TGallery.png")';
    floorPlan.style.backgroundSize = 'contain';
    floorPlan.style.backgroundPosition = 'center';
    floorPlan.style.backgroundRepeat = 'no-repeat';

    // Style the furniture layer
    furnitureLayer.style.position = 'absolute';
    furnitureLayer.style.top = '0';
    furnitureLayer.style.left = '0';
    furnitureLayer.style.width = '100%';
    furnitureLayer.style.height = '100%';
    furnitureLayer.style.pointerEvents = 'none';

    floorPlan.appendChild(furnitureLayer);

    // Set initial zoom and position to fit the floor plan
    const containerWidth = floorPlanContainer.offsetWidth;
    const containerHeight = floorPlanContainer.offsetHeight;
    initialScale = Math.min(containerWidth / FLOOR_PLAN_WIDTH, containerHeight / FLOOR_PLAN_HEIGHT);
    currentScale = initialScale;

    floorPlan.style.width = `${FLOOR_PLAN_WIDTH}px`;
    floorPlan.style.height = `${FLOOR_PLAN_HEIGHT}px`;
    floorPlan.style.transform = `scale(${currentScale})`;
    floorPlan.style.transformOrigin = 'top left';

    // Center the floor plan
    const scaledWidth = FLOOR_PLAN_WIDTH * currentScale;
    const scaledHeight = FLOOR_PLAN_HEIGHT * currentScale;
    floorPlan.style.left = `${(containerWidth - scaledWidth) / 2}px`;
    floorPlan.style.top = `${(containerHeight - scaledHeight) / 2}px`;

    // Add event listeners for panning
    floorPlanContainer.addEventListener('mousedown', startDragging);
    floorPlanContainer.addEventListener('mousemove', drag);
    floorPlanContainer.addEventListener('mouseup', stopDragging);
    floorPlanContainer.addEventListener('mouseleave', stopDragging);

    // Add event listener for zooming
    floorPlanContainer.addEventListener('wheel', handleZoom);

    // Add event listener for beforeunload
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Load saved plan if available
    const savedData = localStorage.getItem('floorPlanData');
    if (savedData) {
        loadPlan(false);
    }
}

function handleBeforeUnload(event) {
    if (!isCurrentSetupSaved) {
        event.preventDefault();
        event.returnValue = '';
    }
}

function handleZoom(e) {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    
    const newScale = currentScale * zoomFactor;
    
    // Check if the new scale is within the allowed range
    if (newScale >= initialScale * MIN_ZOOM_FACTOR && newScale <= initialScale * MAX_ZOOM_FACTOR) {
        const floorPlanContainer = document.getElementById('floor-plan-container');
        const rect = floorPlanContainer.getBoundingClientRect();
        
        // Calculate mouse position relative to the floor plan
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Calculate the position of the mouse on the floor plan before zooming
        const beforeZoomX = (mouseX - parseFloat(floorPlan.style.left)) / currentScale;
        const beforeZoomY = (mouseY - parseFloat(floorPlan.style.top)) / currentScale;
        
        // Update the scale
        currentScale = newScale;
        
        // Apply the new scale
        floorPlan.style.transform = `scale(${currentScale})`;
        
        // Calculate the position of the mouse on the floor plan after zooming
        const afterZoomX = beforeZoomX * currentScale;
        const afterZoomY = beforeZoomY * currentScale;
        
        // Adjust the floor plan position to keep the mouse over the same point
        floorPlan.style.left = `${mouseX - afterZoomX}px`;
        floorPlan.style.top = `${mouseY - afterZoomY}px`;
    }
}

function updateZoom() {
    // Ensure the currentScale is within the allowed range
    currentScale = Math.max(initialScale * MIN_ZOOM_FACTOR, Math.min(currentScale, initialScale * MAX_ZOOM_FACTOR));
    floorPlan.style.transform = `scale(${currentScale})`;
}

function startDragging(e) {
    isDragging = true;
    startX = e.clientX - floorPlan.offsetLeft;
    startY = e.clientY - floorPlan.offsetTop;
}

function drag(e) {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.clientX - startX;
    const y = e.clientY - startY;
    floorPlan.style.left = `${x}px`;
    floorPlan.style.top = `${y}px`;
}

function stopDragging() {
    isDragging = false;
}

function initZoomControls() {
    const zoomIn = document.getElementById('zoom-in');
    const zoomOut = document.getElementById('zoom-out');

    zoomIn.addEventListener('click', () => {
        const newScale = currentScale * 1.2;
        if (newScale <= initialScale * MAX_ZOOM_FACTOR) {
            currentScale = newScale;
            updateZoom();
        }
    });

    zoomOut.addEventListener('click', () => {
        const newScale = currentScale / 1.2;
        if (newScale >= initialScale * MIN_ZOOM_FACTOR) {
            currentScale = newScale;
            updateZoom();
        }
    });
}

function spawnFurniture(type) {
    const floorPlanContainer = document.getElementById('floor-plan-container');
    const rect = floorPlanContainer.getBoundingClientRect();
    
    // Calculate center of the visible area
    const centerX = (rect.width / 2 - parseFloat(floorPlan.style.left)) / currentScale;
    const centerY = (rect.height / 2 - parseFloat(floorPlan.style.top)) / currentScale;
    
    addFurniture(type, centerX, centerY);
    isCurrentSetupSaved = false;
}

function addFurniture(type, x, y) {
    const furnitureLayer = document.getElementById('furniture-layer');
    const furniture = document.createElement('div');
    furniture.className = 'furniture';
    furniture.dataset.type = type;
    furniture.style.position = 'absolute';
    furniture.style.left = `${x}px`;
    furniture.style.top = `${y}px`;
    
    // Set size based on furniture type
    const size = FURNITURE_SIZES[type] || { width: 50, height: 50 }; // Default to 50x50 if size not found
    
    furniture.style.width = `${size.width}px`;
    furniture.style.height = `${size.height}px`;
    furniture.style.backgroundImage = `url('assets/furniture/${type}.png')`;
    furniture.style.backgroundSize = 'contain';
    furniture.style.backgroundRepeat = 'no-repeat';
    furniture.style.backgroundPosition = 'center';
    furniture.style.pointerEvents = 'auto';
    furnitureLayer.appendChild(furniture);

    makeFurnitureDraggable(furniture);
    makeFurnitureSelectable(furniture);
    addRotateButton(furniture);
    addDeleteButton(furniture);
}

function makeFurnitureDraggable(furniture) {
    let isDragging = false;
    let startX, startY;

    furniture.addEventListener('mousedown', (e) => {
        if (e.shiftKey) return; // Don't start dragging if shift is pressed (for multi-select)
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        e.stopPropagation();

        // If the clicked furniture is not in the selection, clear selection and select only this one
        if (!selectedFurniture.includes(furniture)) {
            selectedFurniture.forEach(item => item.style.outline = 'none');
            selectedFurniture = [furniture];
            furniture.style.outline = '2px solid blue';
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();

        const dx = (e.clientX - startX) / currentScale;
        const dy = (e.clientY - startY) / currentScale;

        selectedFurniture.forEach(item => {
            const newLeft = item.offsetLeft + dx;
            const newTop = item.offsetTop + dy;
            item.style.left = `${newLeft}px`;
            item.style.top = `${newTop}px`;
        });

        startX = e.clientX;
        startY = e.clientY;
        isCurrentSetupSaved = false;
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

function makeFurnitureSelectable(furniture) {
    furniture.addEventListener('click', (e) => {
        if (e.shiftKey) {
            // Multi-select
            if (selectedFurniture.includes(furniture)) {
                selectedFurniture = selectedFurniture.filter(item => item !== furniture);
                furniture.style.outline = 'none';
            } else {
                selectedFurniture.push(furniture);
                furniture.style.outline = '2px solid blue';
            }
        } else {
            // Single select
            selectedFurniture.forEach(item => item.style.outline = 'none');
            selectedFurniture = [furniture];
            furniture.style.outline = '2px solid blue';
        }
        updateRotateButton();
        updateDeleteButton();
    });
}

function addRotateButton(furniture) {
    const rotateButton = document.createElement('div');
    rotateButton.className = 'rotate-button';
    rotateButton.innerHTML = '↻';
    rotateButton.style.display = 'none';
    furniture.appendChild(rotateButton);

    let isRotating = false;
    let startAngle, centerX, centerY;

    rotateButton.addEventListener('mousedown', (e) => {
        isRotating = true;
        const rect = furniture.getBoundingClientRect();
        centerX = rect.left + rect.width / 2;
        centerY = rect.top + rect.height / 2;
        startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isRotating) return;
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        const rotation = (angle - startAngle) * (180 / Math.PI);
        selectedFurniture.forEach(item => {
            const currentRotation = item.dataset.rotation ? parseFloat(item.dataset.rotation) : 0;
            const newRotation = currentRotation + rotation;
            item.style.transform = `rotate(${newRotation}deg)`;
            item.dataset.rotation = newRotation;
        });
        startAngle = angle;
        isCurrentSetupSaved = false;
    });

    document.addEventListener('mouseup', () => {
        isRotating = false;
    });
}

function addDeleteButton(furniture) {
    const deleteButton = document.createElement('div');
    deleteButton.className = 'delete-button';
    deleteButton.innerHTML = '×';
    deleteButton.style.display = 'none';
    furniture.appendChild(deleteButton);

    deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteFurniture(furniture);
    });
}

function deleteFurniture(furniture) {
    furniture.remove();
    selectedFurniture = selectedFurniture.filter(item => item !== furniture);
    updateRotateButton();
    updateDeleteButton();
    isCurrentSetupSaved = false;
}

function updateRotateButton() {
    const rotateButtons = document.querySelectorAll('.rotate-button');
    rotateButtons.forEach(button => button.style.display = 'none');

    if (selectedFurniture.length > 0) {
        const lastSelected = selectedFurniture[selectedFurniture.length - 1];
        const rotateButton = lastSelected.querySelector('.rotate-button');
        if (rotateButton) {
            rotateButton.style.display = 'block';
        }
    }
}

function updateDeleteButton() {
    const deleteButtons = document.querySelectorAll('.delete-button');
    deleteButtons.forEach(button => button.style.display = 'none');

    if (selectedFurniture.length > 0) {
        const lastSelected = selectedFurniture[selectedFurniture.length - 1];
        const deleteButton = lastSelected.querySelector('.delete-button');
        if (deleteButton) {
            deleteButton.style.display = 'block';
        }
    }
}

function savePlan() {
    const furnitureLayer = document.getElementById('furniture-layer');
    const furnitureData = Array.from(furnitureLayer.children).map(furniture => ({
        type: furniture.dataset.type,
        left: furniture.style.left,
        top: furniture.style.top,
        width: furniture.style.width,
        height: furniture.style.height,
        transform: furniture.style.transform
    }));

    const planData = {
        furniture: furnitureData,
        scale: currentScale,
        floorPlanLeft: floorPlan.style.left,
        floorPlanTop: floorPlan.style.top
    };

    localStorage.setItem('floorPlanData', JSON.stringify(planData));
    alert('Floor plan saved successfully!');
    isCurrentSetupSaved = true;
}
function loadPlan(showAlert = true) {
    const savedData = localStorage.getItem('floorPlanData');
    if (savedData) {
        const planData = JSON.parse(savedData);
        
        // Clear existing furniture
        const furnitureLayer = document.getElementById('furniture-layer');
        furnitureLayer.innerHTML = '';
        selectedFurniture = [];

        // Restore floor plan position and scale
        currentScale = planData.scale;
        floorPlan.style.left = planData.floorPlanLeft;
        floorPlan.style.top = planData.floorPlanTop;
        updateZoom();

        // Restore furniture
        planData.furniture.forEach(item => {
            const furniture = document.createElement('div');
            furniture.className = 'furniture';
            furniture.dataset.type = item.type;
            furniture.style.position = 'absolute';
            furniture.style.left = item.left;
            furniture.style.top = item.top;
            furniture.style.width = item.width;
            furniture.style.height = item.height;
            furniture.style.transform = item.transform;
            furniture.style.backgroundImage = `url('assets/furniture/${item.type}.png')`;
            furniture.style.backgroundSize = 'contain';
            furniture.style.backgroundRepeat = 'no-repeat';
            furniture.style.backgroundPosition = 'center';
            furniture.style.pointerEvents = 'auto';

            furnitureLayer.appendChild(furniture);
            makeFurnitureDraggable(furniture);
            makeFurnitureSelectable(furniture);
            addRotateButton(furniture);
            addDeleteButton(furniture);
        });

        if (showAlert) {
            alert('Floor plan loaded successfully!');
        }
    } else if (showAlert) {
        alert('No saved floor plan found!');
    }
}

function init() {
    initFloorPlan();
    initZoomControls();
    initFurnitureOptions();

    // Remove "Room Information" section
    const roomInfo = document.getElementById('room-info');
    if (roomInfo) {
        roomInfo.remove();
    }

    // Initialize save and load buttons
    const saveBtn = document.getElementById('save-btn');
    const loadBtn = document.getElementById('load-btn');
    saveBtn.addEventListener('click', savePlan);
    loadBtn.addEventListener('click', loadPlan);
}

// Furniture types ordered: tables first, then stage stuff, then misc, then chair
const FURNITURE_TYPES = [
    'table', 
    'table-2-chairs', 
    'table-4-chairs', 
    'round-table', 
    'round-table-8-chairs',
    'stage', 
    'lectern',
    'drape',
    'chair',
    'ruler'
];

// Define furniture sizes (in cm)
const FURNITURE_SIZES = {
    'table': { width: 183, height: 76 },
    'table-2-chairs': { width: 183, height: 136 },
    'table-4-chairs': { width: 183, height: 167 },
    'round-table': { width: 150, height: 150 },
    'round-table-8-chairs': { width: 250, height: 250 },
    'stage': { width: 100, height: 100 },
    'lectern': { width: 40, height: 60 },
    'drape': { width: 200, height: 20 },
    'chair': { width: 45, height: 40 },
    'ruler': { width: 1000, height: 100 }
};

function initFurnitureOptions() {
    const furnitureItems = document.querySelectorAll('.furniture-item');
    furnitureItems.forEach(item => {
        item.addEventListener('click', () => {
            const furnitureType = item.querySelector('span').textContent.toLowerCase().replace(/ /g, '-');
            spawnFurniture(furnitureType);
        });
    });
}

document.addEventListener('DOMContentLoaded', init);