import * as THREE from 'https://unpkg.com/three@0.163.0/build/three.module.js'; 
import { MathUtils } from 'https://unpkg.com/three@0.163.0/src/math/MathUtils.js';
import { ImprovedNoise } from 'https://unpkg.com/three@0.163.0/examples/jsm/math/ImprovedNoise.js';
import * as BufferGeometryUtils from 'https://unpkg.com/three@0.163.0/examples/jsm/utils/BufferGeometryUtils.js';
import { Vector3 } from 'https://unpkg.com/three@0.163.0/src/math/Vector3.js';
import { TransformControls } from 'https://unpkg.com/three@0.163.0/examples/jsm/controls/TransformControls.js';
import { OrbitControls } from 'https://unpkg.com/three@0.163.0/examples/jsm/controls/OrbitControls.js';


//scene set up variables and window variables
let container, camera, scene, renderer;
let updateId;
let voltageLevel;
let cameraControls;
let gui;
const voltageControl = document.getElementById('voltage');
let minScalar = 0.22;
let maxScalar = 0.88;
let cube1;
let orbitControls 

//Solar Cell Variables
let solarCell;
let trapezoid_top = 20;
let trapezoid_bottom = 60;
let solarCellActivated = true;
//PN Junction Initial Variables
let electronSpheres = [];
let holeSpheres = [];
let numSpheres = 50;

let cubeSize = new THREE.Vector3(150, 75, 75);
let clock = new THREE.Clock();
let maxElectrons = 75;
let maxHoles = 75;


let boxMin = -(cubeSize.x/2) + 1;
let boxMax = (cubeSize.x/2) - 1;


//electric field attributes
let arrowNegative;
let innerBoxSize = 25;
let innerCubeGeometry;
let innerCubeMaterial;
let innerCube;
let voltage = 0.0;

//boltzmann distribution variables
let scalar = 0.5;

//scatter variables
let scatterTimeMean = 2;
const perlin = new ImprovedNoise();

//battery variables
let positiveBatteryElements = [];
let negativeBatteryElements = [];

// populate boltz distribution table
let boltz = []; 

//populated boltz array

//recombination variables
let minDistance = 30;
let recombinationOccured = false;
let e_sphere_outside_depletion_range = false;
let h_sphere_outside_depletion_range = false;

init();
update();

 
function init() {
    //camera, background textures, background, scene, initial geometry, materials, renderer
    const norm_vel = [{nv: 0.1, quantity: 3}, {nv: 0.2, quantity: 10}, {nv: 0.3, quantity: 21}, {nv: 0.4, quantity: 35}, {nv: 0.5, quantity: 49}, 
        {nv: 0.6, quantity: 63}, {nv: 0.7, quantity: 74}, {nv: 0.8, quantity: 82}, {nv: 0.9, quantity: 86}, {nv: 1.0, quantity: 86},
        {nv: 1.1, quantity: 83}, {nv: 1.2, quantity: 77}, {nv: 1.3, quantity: 69}, {nv: 1.4, quantity: 59}, {nv: 1.5, quantity: 50}, {nv: 1.6, quantity: 40},
        {nv: 1.7, quantity: 32}, {nv: 1.8, quantity: 24}, {nv: 1.9, quantity: 18}, {nv: 3.0, quantity: 13}, {nv: 2.1, quantity: 9}, {nv: 2.2, quantity: 6}, {nv: 2.3, quantity: 4},
        {nv: 3.5, quantity: 3}, {nv: 4, quantity: 2}, {nv: 5, quantity: 1}, {nv: 6, quantity: 1}];
    for (let i = 0; i < norm_vel.length; i++) {
        let count = 0;
        while (count < norm_vel[i].quantity) {
            boltz.push(norm_vel[i].nv);
            count++;
        }
    }
    
    container = document.getElementById('three-container-scene-1');
    //scene
    scene = new THREE.Scene();
    //camera
    camera = new THREE.PerspectiveCamera( 75, container.clientWidth / container.clientHeight, 0.1, 1500);
    camera.position.z = 116;
    //renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(container.clientWidth, container.clientHeight);
    
    container.appendChild( renderer.domElement );

    //lighting
    const light = new THREE.AmbientLight( 0xffffff, 3); // soft white light
    scene.add( light );

 
    

   
    // GUI
    gui = new dat.GUI();
    cameraControls = {
        translateZ : 116,
        translateX: 0,
        rotateY: MathUtils.degToRad(0),
    };

    voltageLevel = {
        x: 0.0,
    };

  

    const resetButton = { 'Reset Cube': resetGUI };

    gui.add(cameraControls, 'translateX', -100, 100).onChange(() => {
        camera.position.x = cameraControls.translateX;
    });
    gui.add(cameraControls, 'translateZ', -50, 150).onChange(() => {
        camera.position.z = cameraControls.translateZ;
    });

    gui.add(cameraControls, 'rotateY', -50, 50).onChange(() => {
        camera.rotation.y = MathUtils.degToRad(cameraControls.rotateY);
    });

    // gui.add(voltageLevel, 'x', -1.4, 0.4).name('Voltage (V)').step(0.1).onChange(() => {
    //     voltage = voltageLevel.x;
    // });
    voltageControl.addEventListener('input', () => {
        const voltageLevel = parseFloat(voltageControl.value);
        voltage = voltageLevel;
     });



    // gui.add(temperatureLevel, 'temp', -100, 500).name('temperature').step(0.1).onChange(() => {
    //     temperature = temperatureLevel.temp;
    // });
    // Add a button to reset GUI controls
    gui.add(resetButton, 'Reset Cube');
    

    // window resize handler
    window.addEventListener( 'resize', onWindowResize);

    //transform controls
    let control = new TransformControls( camera, renderer.domElement );
    // Create orbit controls for camera navigation
    orbitControls = new OrbitControls(camera, renderer.domElement);
    // solar cell init
  
    const solarCellGeo = createTrapezoidGeometry(trapezoid_top, trapezoid_bottom, cubeSize.y, cubeSize.z);
    const solarMaterial = new THREE.MeshBasicMaterial( {color: 0xFFFF00, transparent: true, opacity: 0.4} ); 
    solarCell = new THREE.Mesh( solarCellGeo, solarMaterial ); 
    solarCell.position.set(0, -20, 0);
    scene.add(solarCell);
    
    control.attach( solarCell );
    scene.add(control);

    // Set the transform mode to 'translate'
    control.setMode('translate');

    // Add event listeners for transform control events
    control.addEventListener('dragging-changed', (event) => {
    orbitControls.enabled = !event.value;
    });

    // Create an angular path
    const curvePath = new THREE.CurvePath();

    // Define the points for our angular path
    const points = [
    new THREE.Vector3(-75, 0, 10),
    new THREE.Vector3(-120, 0, 10),
    new THREE.Vector3(-120, -65, 10),
    new THREE.Vector3(-30, -65, 10),

   
    ];

    // Create line segments between each pair of points
    for (let i = 0; i < points.length - 1; i++) {
    const lineCurve = new THREE.LineCurve3(points[i], points[i + 1]);
    curvePath.add(lineCurve);
    }

    // Create a visible path for reference
    const geometry = new THREE.BufferGeometry().setFromPoints(curvePath.getPoints(50));
    const material = new THREE.LineBasicMaterial({ color: 0xffffff });
    const visiblePath = new THREE.Line(geometry, material);
    scene.add(visiblePath);

    //ELECTRON WIRE
    // Create an angular path
    const electronPath = new THREE.CurvePath();

    // Define the points for our angular path
    const electronPathPoints = [
    new THREE.Vector3(75, 0, 10),
    new THREE.Vector3(120, 0, 10),
    new THREE.Vector3(120, -65, 10),
    new THREE.Vector3(30, -65, 10),

    
    ];

    // Create line segments between each pair of points
    for (let i = 0; i < electronPathPoints.length - 1; i++) {
    const lineCurve = new THREE.LineCurve3(electronPathPoints[i], electronPathPoints[i + 1]);
    electronPath.add(lineCurve);
    }

    // Create a visible path for reference
    const geometry2 = new THREE.BufferGeometry().setFromPoints(electronPath.getPoints(50));
    const material2 = new THREE.LineBasicMaterial({ color: 0xffffff });
    const visiblePath2 = new THREE.Line(geometry2, material2);
    scene.add(visiblePath2);

    // create cube container
    const cubeGeometry = box(cubeSize.x, cubeSize.y, cubeSize.z);
    const cubeMaterial = new THREE.LineDashedMaterial({ color: 0xFFFFFF, dashSize: 3, gapSize: 1});
    cube1 = new THREE.LineSegments(cubeGeometry, cubeMaterial);
    cube1.computeLineDistances();
    cube1.position.set(0, 0, 0);

    //battery geometry
    const batteryCylinderGeo =  new THREE.CylinderGeometry( 10, 10, 60, 32 );
    const wireframe = new THREE.WireframeGeometry( batteryCylinderGeo );

    const battery = new THREE.LineSegments( wireframe );
    battery.rotateZ(Math.PI/2);

    battery.material.depthTest = false;
    battery.material.opacity = 0.25;
    battery.material.transparent = true;
    battery.position.set(0, -70, 0);

    scene.add( battery );

    // create a plane in the middle to separate P type and N type
    const planeGeo = new THREE.PlaneGeometry(cubeSize.z, cubeSize.y);
    const planeMaterial = new THREE.LineDashedMaterial({
        color: 0xffffff,
        dashSize: 3,
        gapSize: 1,
    });
    // const planeMaterial = new THREE.MeshBasicMaterial( {color: 0xFFFFFF, side: THREE.DoubleSide, transparent: true} );
    let plane = new THREE.LineSegments(planeGeo, planeMaterial);
    plane.computeLineDistances();
    plane.position.set(0, 0, 0);
    plane.rotateY(Math.PI/2);

    scene.add(cube1, plane);

    let randomVelocity;
    //create initial holes and acceptors
    for (let i = 0; i < numSpheres; i++) {
        // change this to boltzmann distributed velocity
        randomVelocity = getBoltzVelocity();
        let holes = createSphere(i, -(cubeSize.x/2) + 1, -2, 0xFF3131, false);
        holes.crossReady = true;
        createIon(-(cubeSize.x/2) + 1, -2, 0xffffff, 'acceptor');
        holeSpheres.push({crossReady: holes.crossReady, crossed: false, pause: false, lerpProgress: 0, lerping: false, lerpPartner: new THREE.Vector3(), recombine: true, canMove: holes.canMove, id:'initial', object: holes.object, material: holes.material, velocity: randomVelocity, speed: Math.random() * (maxScalar - minScalar + 1) + minScalar, scatterStartTime: performance.now(), scatterTime: (scatterTimeMean + (perlin.noise(i * 100, i * 200, performance.now() * 0.001) - 0.5)*0.3)});
    }

    //create initial electrons and donors
    for (let i = 0; i < numSpheres; i++) {
        randomVelocity = getBoltzVelocity();
        createIon(2, (cubeSize.x/2) - 1, 0xffffff, 'donor');
        let electron = createSphere(i, 2, (cubeSize.x/2) - 1, 0x1F51FF, false);
        electron.crossReady = true;
        electronSpheres.push({crossReady: electron.crossReady, crossed: false, pause: false, lerpProgress: 0, lerping: false, lerpPartner: new THREE.Vector3(), recombine: true, canMove: electron.canMove, id: 'initial', object: electron.object, material: electron.material, velocity: randomVelocity, speed: Math.random() * (maxScalar - minScalar + 1) + minScalar, scatterStartTime: performance.now(), scatterTime: (scatterTimeMean + (perlin.noise(i * 100, i * 200, performance.now() * 0.001) - 0.5)*0.3)});
    }
    if (solarCellActivated) {
        setTimeout(solarCellGeneration, 500);
    }
    setTimeout(generation, 500);
}

function update() {
	updateId = requestAnimationFrame( update );
    let currentTime = performance.now();
    let time = clock.getDelta()/15;
    scene.remove(innerCube);

    console.log("electron #:" + electronSpheres.length);
    console.log("hole #:" + holeSpheres.length);

    //add innercube for electric field

    // update inner box size based on formula using voltage
    innerBoxSize = 24.2*(0.58*(Math.sqrt(9.2 - voltage/0.05)));

    innerCubeGeometry = box(innerBoxSize, cubeSize.y, cubeSize.z);
    innerCubeMaterial = new THREE.LineDashedMaterial({ color: 0xFF0000, dashSize: 3, gapSize: 1});

    innerCube = new THREE.LineSegments(innerCubeGeometry, innerCubeMaterial);
    innerCube.computeLineDistances();
    
    innerCube.position.set(0, 0, 0);
    scene.add(innerCube);

    let origin_x;
    // ARROW IMPLEMENTATION
    if (voltage > 0) {
        origin_x = innerBoxSize/2;
    } else if (voltage < 0) {
        origin_x = innerBoxSize/2 + 30;
    }
    const origin = new THREE.Vector3(origin_x, 70, 0 );
    const length = innerBoxSize + 20;
    const hex = 0xffff00;

    updateArrow(origin, length, hex);
   
    //SCATTER (update velocities for scattering)

    scatter(currentTime); 

    addAcceleration(electronSpheres, innerBoxSize, time, -1);
    addAcceleration(holeSpheres, innerBoxSize, time, 1);

    //determines if distance of generated pair is far enough to allow recombinationn
    updateRecombinationStatus();
    recombinationAnim();
   
    //check if a hole or electron needs to be supplied if they cross only if voltage level is negative
    if (voltage < 0) {
        sphereCrossed(electronSpheres, 'e');
        sphereCrossed(holeSpheres, 'h');
    }

    if (voltage > 0) {
        console.log(recombinationOccured);;
        if (recombinationOccured) {
            console.log("batt anim pos");
            let e_position = new THREE.Vector3(cubeSize.x/2 + 50, 0, 0);
            let electron = createSphereAt(e_position, 0x1F51FF, false);

            electron.value = "e";
            positiveBatteryElements.push(electron);
                
            let h_position = new THREE.Vector3(-cubeSize.x/2 - 50, 0, 0);
            let hole = createSphereAt(h_position, 0xFF3131, false);

            hole.value = "h";
            positiveBatteryElements.push(hole);
        }
    }
    
    if (positiveBatteryElements.length > 0) { //if something exists in battery
        positive_battery_anim();
    }

    if (negativeBatteryElements.length > 0) {
        negative_battery_anim();
    }

   

    //UPDATE SPHERE POSITION
    updateSpherePosition();
   
    // checkBounds(holeSpheres, electronSpheres, hBoundsMin, hBoundsMax, eBoundsMin, eBoundsMax);
    checkBounds(holeSpheres, electronSpheres, boxMin, boxMax);
    orbitControls.update();
	renderer.render( scene, camera );
}

function negative_battery_anim() {
    for (let i = negativeBatteryElements.length - 1; i >= 0; i--) {
        let sphere = negativeBatteryElements[i];
        let spherePosition = sphere.object.position;
        if (sphere.value == 'e') {
            if (spherePosition.x <= cubeSize.x/2) {
                //move linear
                sphere.object.position.add(new THREE.Vector3(0.2, 0, 0));

            } else {
                //fade out and remove from scene
                sphere.object.position.add(new THREE.Vector3(0.2, 0, 0));

                sphere.object.material.transparent = true;

                // Update opacity based on elapsed time
                // Calculate the distance from the electron to the edge of the system
                let distanceFromEdge = Math.abs(sphere.object.position.x - cubeSize.x/2);
                let maxDistance = 50; // Define the maximum distance at which the electron becomes fully transparent
                let opacity = THREE.MathUtils.clamp(1 - (distanceFromEdge / maxDistance), 0, 1);
                
                sphere.object.material.opacity = opacity;

                if (opacity <= 0) {
                    // Remove the electron from the scene and battery array
                    scene.remove(sphere.object);
                    negativeBatteryElements.splice(i, 1);
                }
            }

        } else if (sphere.value == 'h') {
            if (spherePosition.x >= -cubeSize.x/2) {
                //move linear
                sphere.object.position.add(new THREE.Vector3(-0.2, 0, 0));
            } else {
                //fade out and remove from scene
                sphere.object.position.add(new THREE.Vector3(-0.2, 0, 0));

                sphere.object.material.transparent = true;

                // Update opacity based on elapsed time
                // Calculate the distance from the electron to the edge of the system
                let distanceFromEdge = Math.abs(sphere.object.position.x + cubeSize.x/2);
                let maxDistance = 50; // Define the maximum distance at which the electron becomes fully transparent
                let opacity = THREE.MathUtils.clamp(1 - (distanceFromEdge / maxDistance), 0, 1);
                
                sphere.object.material.opacity = opacity;

                if (opacity <= 0) {
                    // Remove the electron from the scene and battery array
                    scene.remove(sphere.object);
                    negativeBatteryElements.splice(i, 1);
                }
            }
        }
    }
}

function positive_battery_anim() {
    for (let i = positiveBatteryElements.length - 1; i >= 0; i--) {
        let sphere = positiveBatteryElements[i];
        let spherePosition = sphere.object.position;
        if (sphere.value == 'e') {
            if (spherePosition.x < cubeSize.x/2 - 1) {
                sphere.canMove = true;
                sphere.crossReady = true;
                electronSpheres.push({
                    crossReady: sphere.crossReady,
                    crossed: false,
                    pause: false,
                    lerpProgress: 0,
                    lerping: false,
                    lerpPartner: new THREE.Vector3(),
                    recombine: true,
                    id: 'generated',
                    canMove: sphere.canMove,
                    object: sphere.object,
                    material: sphere.material,
                    velocity: getBoltzVelocity(),
                    speed: Math.random() * (maxScalar - minScalar + 1) + minScalar,
                    scatterStartTime: performance.now(),
                    scatterTime: (scatterTimeMean + (perlin.noise(Math.random(0, numSpheres) * 100, Math.random(0, numSpheres) * 200, performance.now() * 0.001) - 0.5)*0.3)
                });
                
                // Remove the electron from the battery array
                positiveBatteryElements.splice(i, 1);
            } else {
                sphere.object.position.add(new THREE.Vector3(-0.2, 0, 0));     
            }
                        
        } else if (sphere.value == 'h') { // hole
            if (spherePosition.x > -cubeSize.x/2 + 1) {
                sphere.canMove = true;
                sphere.crossReady = true;
                holeSpheres.push({
                    crossReady: sphere.crossReady,
                    crossed: false,
                    pause: false,
                    lerpProgress: 0,
                    lerping: false,
                    lerpPartner: new THREE.Vector3(),
                    recombine: true,
                    id: 'generated',
                    canMove: sphere.canMove,
                    object: sphere.object,
                    material: sphere.material,
                    velocity: getBoltzVelocity(),
                    speed: Math.random() * (maxScalar - minScalar + 1) + minScalar,
                    scatterStartTime: performance.now(),
                    scatterTime: (scatterTimeMean + (perlin.noise(Math.random(0, numSpheres) * 100, Math.random(0, numSpheres) * 200, performance.now() * 0.001) - 0.5)*0.3)
                });
                
                // Remove the electron from the battery array
                positiveBatteryElements.splice(i, 1);
            } else {
                sphere.object.position.add(new THREE.Vector3(0.2, 0, 0));
            } 
        }
        }
    
}

//keeps track of the newly created electrons/holes after a sphere crosses to the other side
function sphereCrossed(typeArray, type) { 
    for (let i = 0; i < typeArray.length; i++) {
        let spherePosition = typeArray[i].object.position.x;
        // if (voltage > 0) {
        //     if (type == 'e') {
        //         //if electron makes it to the otherside of the box
        //         //maybe second conditional isn't needed...
        //         if (-cubeSize.x/2 + 1 < spherePosition && spherePosition < -innerBoxSize/2 && !typeArray[i].crossed) {
        //             //create a new electron outside the box
        //             let position = new THREE.Vector3(cubeSize.x/2 + 50, 0, 0);
        //             let electron = createSphereAt(position, 0x1F51FF, false);

        //             electron.value = "e";
        //             typeArray[i].crossed = true;
        //             positiveBatteryElements.push(electron);
        //         }
        //     } else if (type == 'h') {
        //         //confirm this
        //         if ((innerBoxSize/2 < spherePosition && spherePosition < cubeSize.x/2 - 1) && !typeArray[i].crossed) {
        //             //create a new electron outside the box
        //             let position = new THREE.Vector3(-cubeSize.x/2 - 50, 0, 0);

        //             let hole = createSphereAt(position, 0xFF3131, false);

        //             hole.value = "h";

        //             typeArray[i].crossed = true;
        //             positiveBatteryElements.push(hole);
        //         } 
        //     }
        // } else 
        if (voltage < 0) {
            if (type == 'e') {
                if (spherePosition < -innerBoxSize/2 && !typeArray[i].crossed) {
                    console.log("electron crossed middle");
                    let position = new THREE.Vector3(cubeSize.x/2 - 5, 0, 0);
                    let electron = createSphereAt(position, 0x1F51FF, false);

                    electron.value = "e";

                    typeArray[i].crossed = true;
                    negativeBatteryElements.push(electron);


                    let randomIndex = Math.floor(Math.random() * electronSpheres.length);
                    scene.remove(electronSpheres[randomIndex].object);
                    electronSpheres[randomIndex].object.geometry.dispose();
                    electronSpheres[randomIndex].object.material.dispose();
                    electronSpheres.splice(randomIndex, 1);

                }

            } else if (type == 'h') {
                if (spherePosition > innerBoxSize/2 && !typeArray[i].crossed) {
                    let position = new THREE.Vector3(-cubeSize.x/2 + 5, 0, 0);
                    let hole = createSphereAt(position, 0xFF3131, false);
                    hole.value = "h";
                    typeArray[i].crossed = true;
                    negativeBatteryElements.push(hole);

                    //remove last electron from the existing electronArray
                    let randomIndex = Math.floor(Math.random() * holeSpheres.length);
                    scene.remove(holeSpheres[randomIndex].object);
                    holeSpheres[randomIndex].object.geometry.dispose();
                    holeSpheres[randomIndex].object.material.dispose();
                    holeSpheres.splice(randomIndex, 1);
                }
            }
        }
    }
}


function addAcceleration(type, innerBoxSize, time, scalar) {
    for (let i = 0; i < type.length; i++) {
        let spherePosition = type[i].object.position.x;
        let acc = new THREE.Vector3(0, 0, 0);
        // if position is within -Xn < X < 0
        if ((-innerBoxSize/2 < spherePosition && spherePosition < 0)) {
            // check if dividing by two is appropriate or not
            acc = new THREE.Vector3(-1.53*(innerBoxSize/2 + spherePosition), 0 , 0);
        }
    
        // is position is within 0 < X < Xn
        if ((0 < spherePosition && spherePosition < innerBoxSize/2)) {
            acc = new THREE.Vector3(-1.53*(innerBoxSize/2 - spherePosition), 0, 0);
        }
    
        // everywhere else -- -cubeSize.x/2 + 1 < X < -Xn || Xn < X < cubeSize.x/2 - 1
        if ((-cubeSize.x/2 + 1 < spherePosition && spherePosition < -innerBoxSize/2) || (innerBoxSize/2 < spherePosition && spherePosition < cubeSize.x/2 - 1) || (spherePosition == 0)) {
            acc = new THREE.Vector3(0, 0, 0);
        }
    
        if (scalar < 0) {
            electronSpheres[i].velocity.add(acc.multiplyScalar(time).multiplyScalar(scalar));
        } else {
            holeSpheres[i].velocity.add(acc.multiplyScalar(time));
        }
    }
}

function updateSpherePosition() {
    const minVelocity = 0.2;
    const maxVelocity = 30;
    for (let sphere of [...electronSpheres, ...holeSpheres]) {
        const currVelocity = sphere.velocity.clone();
        currVelocity.clampLength(minVelocity, maxVelocity);
        if (sphere.canMove == true) {

           sphere.object.position.add(currVelocity);
           sphere.velocity = currVelocity;
        }
    }    
}

function recombinationAnim() {
    const lerpSpeed = 0.005; // Adjust for faster/slower lerping
    const removalThreshold = 0.95; // When to consider spheres "recombined"
    const pauseDuration = 60; // Number of frames to pause (adjust as needed)
    

    // Check for collisions and initiate lerping
    let midpoint;
    for (let i = 0; i < electronSpheres.length; i++) {
        for (let j = 0; j < holeSpheres.length; j++) {
            if (!electronSpheres[i] || !holeSpheres[j]) continue;
            e_sphere_outside_depletion_range = electronSpheres[i].object.position.x < -innerBoxSize/2 - 20 || electronSpheres[i].object.position.x > innerBoxSize/2 + 20;
            h_sphere_outside_depletion_range = holeSpheres[j].object.position.x < -innerBoxSize/2 - 20|| holeSpheres[j].object.position.x > innerBoxSize/2 + 20;
            if (e_sphere_outside_depletion_range && h_sphere_outside_depletion_range) {
               
                if (checkCollision(electronSpheres[i], holeSpheres[j])) {
                    if (!electronSpheres[i].lerping && !holeSpheres[j].lerping) {
                        console.log("Collision detected, starting pause");
                        electronSpheres[i].lerping = true;
                        holeSpheres[j].lerping = true;
                        electronSpheres[i].lerpPartner = holeSpheres[j];
                        holeSpheres[j].lerpPartner = electronSpheres[i];
                        electronSpheres[i].pauseCounter = 0;
                        holeSpheres[j].pauseCounter = 0;
                        electronSpheres[i].lerpProgress = 0;
                        holeSpheres[j].lerpProgress = 0;
                        
                        electronSpheres[i].object.material.color.set(new THREE.Color(0x05D9FF));
                        holeSpheres[j].object.material.color.set(new THREE.Color(0xff9cb0));
                        // Set velocity to zero during pause
                        electronSpheres[i].velocity.set(0, 0, 0);
                        holeSpheres[j].velocity.set(0, 0, 0);

                        // Calculate and store midpoint for both spheres
                        midpoint = new THREE.Vector3().addVectors(electronSpheres[i].object.position, holeSpheres[j].object.position).multiplyScalar(0.5);
                        electronSpheres[i].targetPosition = midpoint.clone();
                        holeSpheres[j].targetPosition = midpoint.clone();     
                    }
                } else {
                    recombinationOccured = false;
                }
            }
        }
    }

    // Handle pausing and lerping
    for (let sphere of [...electronSpheres, ...holeSpheres]) {
        if (sphere.lerping) {
            if (sphere.pauseCounter < pauseDuration) {
                // Pausing phase
                sphere.pauseCounter++;
            } else {
                //when lerping, add an orb
               
                // Lerping phase
                sphere.lerpProgress += lerpSpeed;
            
                sphere.object.position.lerp(sphere.targetPosition, sphere.lerpProgress);
                let startingRadius = 3;
                // Check if lerping is complete
                
                // alright we only want to create the orb once, so only create if an orb does not exist
                if (sphere.lerpProgress <= .25 && !sphere.orb) { // when lerping is half way done, create an orb 
                    const orbGeo = new THREE.SphereGeometry(startingRadius, 32, 32);
                    const orbMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4});
                    const orbSphere = new THREE.Mesh(orbGeo, orbMaterial);
                    orbSphere.position.copy(sphere.targetPosition);
                    sphere.orb = orbSphere;
                    scene.add(sphere.orb);
                }
                if (sphere.orb) {
                    // Update orb position and scale
                    sphere.orb.position.copy(sphere.targetPosition);
                    let scale = 1 - (sphere.lerpProgress - 0.5) * 2; // Scale from 1 to 0 as lerp goes from 0.5 to 1
                    sphere.orb.scale.setScalar(Math.max(0, scale));

                    // Update opacity
                    sphere.orb.material.opacity = 0.3 * Math.max(0, scale);  
                    if ( sphere.orb.material.opacity == 0) {
                        scene.remove(sphere.orb);
                    }                 
                }
                if (sphere.lerpProgress >= removalThreshold) {
                    removeSpherePair(sphere, sphere.lerpPartner);
                }
                
            }
        }
    }
}

// Helper function to remove a pair of spheres
function removeSpherePair(sphere1, sphere2) {
    console.log("Spheres recombined, removing from scene");
    scene.remove(sphere1.object);
    scene.remove(sphere2.object);
    electronSpheres = electronSpheres.filter(s => s !== sphere1 && s !== sphere2);
    holeSpheres = holeSpheres.filter(s => s !== sphere1 && s !== sphere2);
    
    // Clean up THREE.js objects
    [sphere1, sphere2].forEach(sphere => {
        sphere.object.geometry.dispose();
        sphere.object.material.dispose();
    });
    recombinationOccured = true;
}

function generation() {
    let position = new Vector3(
        THREE.MathUtils.randFloat(-cubeSize.x/2 + 1, cubeSize.x/2 - 1), 
        THREE.MathUtils.randFloat(-cubeSize.y/2 + 1, cubeSize.y/2 - 1), 
        THREE.MathUtils.randFloat(-cubeSize.z/2 + 1, cubeSize.z/2 - 1));
    // holes and electron are created at the same position
    let hole = createSphereAt(position.clone().add(new THREE.Vector3(2,0,0)), 0xFF3131, false);
    let electron = createSphereAt(position, 0x1F51FF, false);

    // holes electron removed to maintain balance
    let randomIndex = 0;
    if (position.x < cubeSize.x/2 && position.x > innerBoxSize/2) {
        randomIndex = Math.floor(Math.random() * holeSpheres.length);
        scene.remove(holeSpheres[randomIndex].object);
        holeSpheres[randomIndex].object.geometry.dispose();
        holeSpheres[randomIndex].object.material.dispose();
        holeSpheres.splice(randomIndex, 1);
    } else if (position.x > -cubeSize.x/2 && position.x < -innerBoxSize/2) {
        randomIndex = Math.floor(Math.random() * electronSpheres.length);
        scene.remove(electronSpheres[randomIndex].object);
        electronSpheres[randomIndex].object.geometry.dispose();
        electronSpheres[randomIndex].object.material.dispose();
        electronSpheres.splice(randomIndex, 1);
    }
    //an orb is created of the same size as the hole and electron (1) at the same position, but orb grows as the two holes and electrons move  
    const orbGeo = new THREE.SphereGeometry(1, 32, 32);
    const orbMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.4});
    const orbSphere = new THREE.Mesh(orbGeo, orbMaterial);

    let midpoint = hole.object.position.add(electron.object.position).multiplyScalar(0.5);

    //orb set to same position as hole and electron
    orbSphere.position.set(midpoint.x, midpoint.y, midpoint.z);
    orbSphere.gradualVal = 0.5;

    scene.add(orbSphere);
    let requestID;
    let maxOrbSize = 6;
    //push orb into array that I can access outside of this function to update the scale...
    setTimeout(()=>{
    let boolean = true;
        var animateGeneration = (timestamp) => {
            if (orbSphere.gradualVal !== undefined) {
                if (orbSphere.gradualVal <= maxOrbSize && orbSphere.material.opacity > 0) {
                    orbSphere.scale.setScalar(orbSphere.gradualVal);
                    // Calculate opacity based on the current scale
                    let opacityFactor = Math.max(0, 1 - (orbSphere.gradualVal - 1) / (maxOrbSize - 1));
                    orbSphere.material.opacity = opacityFactor;
                    
                    orbSphere.gradualVal += 0.03; // Reduced speed for smoother animation
                    let holeSpeed = new THREE.Vector3(-0.02, 0, 0);
                    let electronSpeed =  new THREE.Vector3(0.02, 0, 0);
                    hole.object.position.add(holeSpeed);
                    electron.object.position.add(electronSpeed);
                    
                } else {
                    scene.remove(orbSphere);
                    hole.canMove = true;
                    electron.canMove = true;
                    hole.crossReady = false;
                    electron.crossReady = false;
                    hole.recombine = false;
                    electron.recombine = false;
                    boolean = false;
                
                
                    holeSpheres.push({initPos: hole.object.position.clone(), crossReady: hole.crossReady, crossed: false, pause: false, lerpProgress: 0, lerping: false, lerpPartner: new THREE.Vector3(), id: 'generated', recombine: hole.recombine, canMove: hole.canMove, object: hole.object, material: hole.material, velocity: getBoltzVelocity(), speed: Math.random() * (maxScalar - minScalar + 1) + minScalar, scatterStartTime: performance.now(), scatterTime: (scatterTimeMean + (perlin.noise(Math.random(0, numSpheres) * 100, Math.random(0, numSpheres) * 200, performance.now() * 0.001) - 0.5)*0.3)});
                    electronSpheres.push({initPos: electron.object.position.clone(), crossReady: electron.crossReady, crossed: false, pause: false, lerpProgress: 0, lerping: false, lerpPartner: new THREE.Vector3(), id: 'generated', recombine: electron.recombine, canMove: electron.canMove, object: electron.object, material: electron.material, velocity: getBoltzVelocity(), speed: Math.random() * (maxScalar - minScalar + 1) + minScalar, scatterStartTime: performance.now(), scatterTime: (scatterTimeMean + (perlin.noise(Math.random(0, numSpheres) * 100, Math.random(0, numSpheres) * 200, performance.now() * 0.001) - 0.5)*0.3)});    
                    
                
                    // if (hole.object.position <= 0) {
                    //     hole.crossReady = true;
                    // }
                    // if (electron.object.position >= 0) {
                    //     electron.crossReady = true;
                    // }
                } 
            }
            if (boolean == true) {
            requestID = requestAnimationFrame(animateGeneration);
            }
        }
        requestAnimationFrame(animateGeneration);   
        cancelAnimationFrame(requestID)

    }, 1000);

    setTimeout(generation, 2000);


}

function solarCellGeneration() {
        let position = new Vector3(
            THREE.MathUtils.randFloat(-trapezoid_top/2 + (solarCell.position.x), trapezoid_top/2 + (solarCell.position.x)), 
            THREE.MathUtils.randFloat(-cubeSize.y/2 + 1, cubeSize.y/2 - 1), 
            THREE.MathUtils.randFloat(-cubeSize.z/2 + 1, cubeSize.z/2 - 1));
        // holes and electron are created at the same position
        let hole = createSphereAt(position.clone().add(new THREE.Vector3(2,0,0)), 0xFF3131, false);
        let electron = createSphereAt(position, 0x1F51FF, false);
    
        // holes electron removed to maintain balance
        let randomIndex = 0;
        if (position.x < cubeSize.x/2 && position.x > innerBoxSize/2) {
            randomIndex = Math.floor(Math.random() * holeSpheres.length);
            scene.remove(holeSpheres[randomIndex].object);
            holeSpheres[randomIndex].object.geometry.dispose();
            holeSpheres[randomIndex].object.material.dispose();
            holeSpheres.splice(randomIndex, 1);
        } else if (position.x > -cubeSize.x/2 && position.x < -innerBoxSize/2) {
            randomIndex = Math.floor(Math.random() * electronSpheres.length);
            scene.remove(electronSpheres[randomIndex].object);
            electronSpheres[randomIndex].object.geometry.dispose();
            electronSpheres[randomIndex].object.material.dispose();
            electronSpheres.splice(randomIndex, 1);
        }
        //an orb is created of the same size as the hole and electron (1) at the same position, but orb grows as the two holes and electrons move  
        const orbGeo = new THREE.SphereGeometry(1, 32, 32);
        const orbMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.4});
        const orbSphere = new THREE.Mesh(orbGeo, orbMaterial);
    
        let midpoint = hole.object.position.add(electron.object.position).multiplyScalar(0.5);
    
        //orb set to same position as hole and electron
        orbSphere.position.set(midpoint.x, midpoint.y, midpoint.z);
        orbSphere.gradualVal = 0.5;
    
        scene.add(orbSphere);
        let requestID;
        let maxOrbSize = 6;
        //push orb into array that I can access outside of this function to update the scale...
        setTimeout(()=>{
        let boolean = true;
            var animateGeneration = (timestamp) => {
                if (orbSphere.gradualVal !== undefined) {
                    if (orbSphere.gradualVal <= maxOrbSize && orbSphere.material.opacity > 0) {
                        orbSphere.scale.setScalar(orbSphere.gradualVal);
                        // Calculate opacity based on the current scale
                        let opacityFactor = Math.max(0, 1 - (orbSphere.gradualVal - 1) / (maxOrbSize - 1));
                        orbSphere.material.opacity = opacityFactor;
                        
                        orbSphere.gradualVal += 0.03; // Reduced speed for smoother animation
                        let holeSpeed = new THREE.Vector3(-0.02, 0, 0);
                        let electronSpeed =  new THREE.Vector3(0.02, 0, 0);
                        hole.object.position.add(holeSpeed);
                        electron.object.position.add(electronSpeed);
                        
                    } else {
                        scene.remove(orbSphere);
                        hole.canMove = true;
                        electron.canMove = true;
                        hole.crossReady = false;
                        electron.crossReady = false;
                        hole.recombine = false;
                        electron.recombine = false;
                        boolean = false;
                    
                    
                        holeSpheres.push({initPos: hole.object.position.clone(), crossReady: hole.crossReady, crossed: false, pause: false, lerpProgress: 0, lerping: false, lerpPartner: new THREE.Vector3(), id: 'generated', recombine: hole.recombine, canMove: hole.canMove, object: hole.object, material: hole.material, velocity: getBoltzVelocity(), speed: Math.random() * (maxScalar - minScalar + 1) + minScalar, scatterStartTime: performance.now(), scatterTime: (scatterTimeMean + (perlin.noise(Math.random(0, numSpheres) * 100, Math.random(0, numSpheres) * 200, performance.now() * 0.001) - 0.5)*0.3)});
                        electronSpheres.push({initPos: electron.object.position.clone(), crossReady: electron.crossReady, crossed: false, pause: false, lerpProgress: 0, lerping: false, lerpPartner: new THREE.Vector3(), id: 'generated', recombine: electron.recombine, canMove: electron.canMove, object: electron.object, material: electron.material, velocity: getBoltzVelocity(), speed: Math.random() * (maxScalar - minScalar + 1) + minScalar, scatterStartTime: performance.now(), scatterTime: (scatterTimeMean + (perlin.noise(Math.random(0, numSpheres) * 100, Math.random(0, numSpheres) * 200, performance.now() * 0.001) - 0.5)*0.3)});    
                        
                    
                        // if (hole.object.position <= 0) {
                        //     hole.crossReady = true;
                        // }
                        // if (electron.object.position >= 0) {
                        //     electron.crossReady = true;
                        // }
                    } 
                }
                if (boolean == true) {
                requestID = requestAnimationFrame(animateGeneration);
                }
            }
            requestAnimationFrame(animateGeneration);   
            cancelAnimationFrame(requestID)
    
        }, 1000);
    
        setTimeout(solarCellGeneration, 500);
}

function updateRecombinationStatus() {
    for (let electron of electronSpheres) {
        for (let hole of holeSpheres) {
            if (electron.initPos != undefined && hole.initPos != undefined) {
                let electronDistance = electron.object.position.distanceTo(electron.initPos);
                let holeDistance = hole.object.position.distanceTo(hole.initPos);

                if (electronDistance > minDistance && holeDistance > minDistance) {
                    electron.recombine = true;
                    hole.recombine = true;
                }
            }
        }
    }
}

function checkCollision(electron, hole) {
    // collision check...
    // if two are created from generation then they can't recombine
    let distance = new Vector3().subVectors(electron.object.position, hole.object.position).length();
    let coll_dist = 20;
    if (electron.recombine && hole.recombine) {
        if (distance <= coll_dist) {
            return true;
        } else {
            return false;
        }
    }
}

function getBoltzVelocity() {
    let r = boltz[Math.floor(Math.random() * boltz.length)];
    let theta = Math.random() * Math.PI;
    let phi = Math.random() * (2*Math.PI);

    const x = r*Math.sin(theta)*Math.cos(phi);
    const y = r*Math.sin(theta)*Math.sin(phi);
    const z = r*Math.cos(theta);

    let randomVelocity = new THREE.Vector3(x, y, z).multiplyScalar(scalar);

    return randomVelocity;
}


function scatter(currentTime) {
     // implement scatter movement
     for (let i = 0; i < electronSpheres.length; i++) {
        for (let j = 0; j < holeSpheres.length; j++) {
            let electronScatterTime = (currentTime - electronSpheres[i].scatterStartTime)/1000;
            if (electronScatterTime >= electronSpheres[i].scatterTime) {
                electronSpheres[i].velocity = getBoltzVelocity();
                electronSpheres[i].scatterStartTime = performance.now();
                electronSpheres[i].scatterTime = (scatterTimeMean + (perlin.noise(i * 100, i * 200, performance.now() * 0.001) - 0.5)*0.3);
            }

            let holeScatterTime = (currentTime - holeSpheres[j].scatterStartTime)/1000;
            if (holeScatterTime >= holeSpheres[j].scatterTime) {
                holeSpheres[j].velocity = getBoltzVelocity();
                holeSpheres[j].scatterStartTime = performance.now();
                holeSpheres[j].scatterTime = (scatterTimeMean + (perlin.noise(j * 100, j * 200, performance.now() * 0.001) - 0.5)*0.3);
            }
        }
     }     
}

function checkBounds(sphere1, sphere2, min, max) {
    // cube boundaries y and z for (let i = 0; i < )
    let yedge = (cubeSize.y/2);
    let ynedge = -(yedge);
    let zedge = (cubeSize.z/2);
    let znedge = -(zedge);

    for (let i = 0; i < sphere1.length; i++) {
        if (sphere1[i].object.position.x >= max) {
            sphere1[i].object.position.x = min + 1;
            // sphere1.velocity.multiplyScalar(-1);
        } else if(sphere1[i].object.position.x <= min){
            sphere1[i].object.position.x = THREE.MathUtils.randFloat(min + 1, min + 20);
            // sphere1.object.position.x = minX1 + 1;
            // sphere1.velocity.multiplyScalar(-1);
        }
        if (sphere1[i].object.position.y > yedge) {
            sphere1[i].object.position.y = yedge - 1;
            sphere1[i].velocity.multiplyScalar(-1);
        } else if (sphere1[i].object.position.y < ynedge) {
            sphere1[i].object.position.y = ynedge + 1;
            sphere1[i].velocity.multiplyScalar(-1);
        }
        if (sphere1[i].object.position.z > zedge) {
            sphere1[i].object.position.z = zedge - 1;
            sphere1[i].velocity.multiplyScalar(-1);
        } else if (sphere1[i].object.position.z < znedge) {
            sphere1[i].object.position.z = znedge + 1;
            sphere1[i].velocity.multiplyScalar(-1);
        }
    }

    for (let i = 0; i < sphere2.length; i++) {
        if (sphere2[i].object.position.x >= max) {
            sphere2[i].object.position.x = THREE.MathUtils.randFloat(max - 15 , max - 1);
            // sphere2.velocity.multiplyScalar(-1);
        } else if(sphere2[i].object.position.x <= min){
            sphere2[i].object.position.x = max - 1;
            // sphere2.velocity.multiplyScalar(-1);
        }
    
        if (sphere2[i].object.position.y > yedge) {
            sphere2[i].object.position.y = yedge - 1;
            sphere2[i].velocity.multiplyScalar(-1);
        } else if (sphere2[i].object.position.y < ynedge) {
            sphere2[i].object.position.y = ynedge + 1;
            sphere2[i].velocity.multiplyScalar(-1);
        }
    
        if (sphere2[i].object.position.z > zedge) {
            sphere2[i].object.position.z = zedge - 1;
            sphere2[i].velocity.multiplyScalar(-1);
        } else if (sphere2[i].object.position.z < znedge) {
            sphere2[i].object.position.z = znedge + 1;
            sphere2[i].velocity.multiplyScalar(-1);
        }
    }
}

// Function to reset GUI controls
function resetGUI() {
    console.log('reset attempted');
    gui.__controllers.forEach(controller => controller.setValue(controller.initialValue));
}


function createIon(minx, maxx, color, ionType) {
    let capsuleLength = 3;
    let radius = 0.5;
    const geometry = new THREE.CapsuleGeometry(radius, capsuleLength);
    //negative shape
    if (ionType == "acceptor") {
        let material = new THREE.MeshBasicMaterial({color: color, transparent: true, opacity: 0.2});
        let acceptor = new THREE.Mesh(geometry, material);
        // acceptor.rotateX(Math.PI/2);
        acceptor.rotateZ(Math.PI/2);
        acceptor.position.set(
            THREE.MathUtils.randFloat(minx, maxx),
            THREE.MathUtils.randFloat(-cubeSize.y/2 + 1, cubeSize.y/2 - 1),
            THREE.MathUtils.randFloat(-cubeSize.z/2 + 1, cubeSize.z/2 - 1)
        );
        scene.add(acceptor);
    } else if (ionType == 'donor') { //positive shape
        //create second geometry for plus shape
        let geometry2 = new THREE.CapsuleGeometry(radius, capsuleLength);
        geometry2.rotateZ(Math.PI/2);  
        let mergedGeometry = new BufferGeometryUtils.mergeGeometries([geometry, geometry2]);
        let material = new THREE.MeshBasicMaterial({color: color, transparent: true,  opacity: 0.2});
        let donor = new THREE.Mesh(mergedGeometry, material);
        donor.position.set(
            THREE.MathUtils.randFloat(minx, maxx),
            THREE.MathUtils.randFloat(-cubeSize.y/2 + 1, cubeSize.y/2 - 1),
            THREE.MathUtils.randFloat(-cubeSize.z/2 + 1, cubeSize.z/2 - 1)
        );
        scene.add(donor);
    }
}


// Function to create a sphere inside the cube
function createSphere(i, minPos, maxPos, sphereColor, transparency) {
    let opacityVal = null;
    if (transparency) {
        opacityVal = 0.6;
    }
    let geometry;
    let material;
    geometry = new THREE.SphereGeometry(1, 32, 32);

    if (sphereColor === 0xFF3131) {
        material = new THREE.MeshBasicMaterial({ color: sphereColor, wireframe: true}); 
    } else {
        material = new THREE.MeshBasicMaterial({ color: sphereColor, transparent: transparency, opacity: opacityVal}); 
    }
    const sphere = new THREE.Mesh(geometry, material);

    // Random position within the cube as specified
    sphere.position.set(
    THREE.MathUtils.randFloat(minPos, maxPos),
    THREE.MathUtils.randFloat(-cubeSize.y/2 + 1, cubeSize.y/2 - 1),
    THREE.MathUtils.randFloat(-cubeSize.z/2 + 1, cubeSize.z/2 - 1)
    );
    scene.add(sphere);
    return {object: sphere, material: material, canMove: true};
}

function createSphereAt(position, sphereColor, transparency) {
    let opacityVal = null;
    let geometry;
    let material;
    if (transparency) {
        opacityVal = 0.6;
    }
    geometry = new THREE.SphereGeometry(1, 32, 32);

    if (sphereColor === 0xFF3131) {
        material = new THREE.MeshBasicMaterial({ color: sphereColor, wireframe: true}); 
    } else {
        material = new THREE.MeshBasicMaterial({ color: sphereColor, transparent: transparency, opacity: opacityVal}); 
    }
    const sphere = new THREE.Mesh(geometry, material);

    // Random position within the cube as specified
    sphere.position.set(position.x, position.y, position.z);
    scene.add(sphere);
    return {object: sphere, material: material, canMove: false};
}

function updateArrow(origin, length, hex) {
    let headLength = 10;
    if (voltage === 0) {
        scene.remove(arrowNegative);
        arrowNegative = null;
    } 
    if (voltage < 0 || voltage > 0) {
        if (!arrowNegative) {
            voltage = Math.abs(voltage);
            arrowNegative = new THREE.ArrowHelper(new THREE.Vector3(-voltage, 0, 0), origin, length, hex, headLength);
            scene.add(arrowNegative);
        } else {
            arrowNegative.setLength(length, headLength); // Update arrow length as the innerBoxSize changes
        }
    } 
}

function createTrapezoidGeometry(topWidth, bottomWidth, height, depth) {
    const geometry = new THREE.BufferGeometry();
  
    const vertices = [
      // Top face
      -topWidth / 2, height, -depth / 2,
      topWidth / 2, height, -depth / 2,
      topWidth / 2, height, depth / 2,
      -topWidth / 2, height, depth / 2,
  
      // Bottom face
      -bottomWidth / 2, 0, -depth / 2,
      bottomWidth / 2, 0, -depth / 2,
      bottomWidth / 2, 0, depth / 2,
      -bottomWidth / 2, 0, depth / 2,
  
      // Side faces
      -topWidth / 2, height, -depth / 2,
      -bottomWidth / 2, 0, -depth / 2,
      -bottomWidth / 2, 0, depth / 2,
      -topWidth / 2, height, depth / 2,
  
      topWidth / 2, height, -depth / 2,
      bottomWidth / 2, 0, -depth / 2,
      bottomWidth / 2, 0, depth / 2,
      topWidth / 2, height, depth / 2
    ];
  
    const indices = [
      0, 1, 2, 2, 3, 0, // Top face
      4, 5, 6, 6, 7, 4, // Bottom face
      3, 2, 6, 6, 7, 3, // Front face
      1, 5, 6, 6, 2, 1, // Right face
      0, 3, 7, 7, 4, 0, // Left face
      5, 1, 0, 0, 4, 5  // Back face
    ];
  
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    geometry.computeVertexNormals();
  
    return geometry;
  }

function box( width, height, depth ) {

    width = width * 0.5,
    height = height * 0.5,
    depth = depth * 0.5;

    const geometry = new THREE.BufferGeometry();
    const position = [];

    position.push(
        - width, - height, - depth,
        - width, height, - depth,

        - width, height, - depth,
        width, height, - depth,

        width, height, - depth,
        width, - height, - depth,

        width, - height, - depth,
        - width, - height, - depth,

        - width, - height, depth,
        - width, height, depth,

        - width, height, depth,
        width, height, depth,

        width, height, depth,
        width, - height, depth,

        width, - height, depth,
        - width, - height, depth,

        - width, - height, - depth,
        - width, - height, depth,

        - width, height, - depth,
        - width, height, depth,

        width, height, - depth,
        width, height, depth,

        width, - height, - depth,
        width, - height, depth
     );

    geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( position, 3 ) );

    return geometry;

}


function onWindowResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
}


