import * as THREE from 'https://unpkg.com/three@0.163.0/build/three.module.js'; 
import { MathUtils } from 'https://unpkg.com/three/src/math/MathUtils.js';
import { ImprovedNoise } from 'https://unpkg.com/three/examples/jsm/math/ImprovedNoise.js';
import * as BufferGeometryUtils from 'https://unpkg.com/three@0.163.0/examples/jsm/utils/BufferGeometryUtils.js';
import { Sphere } from 'https://unpkg.com/three@0.163.0/src/math/Sphere.js';
import { Vector3 } from 'https://unpkg.com/three@0.163.0/src/math/Vector3.js';
import {GLTFLoader} from 'https://unpkg.com/three@0.163.0/examples/jsm/loaders/GLTFLoader.js'

//scene set up variables and window variables
let container, camera, scene, renderer;
let voltageLevel;
let cameraControls;
let accScale;
let energyLevel;
let boltzScale;
let gui;
let minScalar = 0.22;
let maxScalar = 0.88;
let shouldAnimate = false;

//PN Junction Initial Variables
let electronSpheres = [];
let holeSpheres = [];
let numSpheres = 100;
let cube1;
let cubeSize = new THREE.Vector3(150, 75, 75);
let clock = new THREE.Clock();


let boxMin = -(cubeSize.x/2) + 1;
let boxMax = (cubeSize.x/2) - 1;


//electric field attributes
let arrowNegative;
let arrowPositive;
let innerBoxSize = 25;
let innerCubeGeometry;
let innerCubeMaterial;
let innerCube;
let voltage = 0.0;
let accScalar = 1.0;

//boltzmann distribution variables
let energy = 0.0;
const temperature = 300;
const boltzmann_const = 1.380649e-23
let scalar = 0.5;

//scatter variables
let scatterTimeMean = 2;
const perlin = new ImprovedNoise();

//recombination variables
const loader = new GLTFLoader();
let ready_recombine = false;
let hold_still = true;

//generation variables
let gradualVal = 2;  
let generatedOrb = [];


// populate boltz distribution table
let boltz = []; 

//populated boltz array
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
    
    container = document.createElement( 'div' );
    document.body.appendChild( container );
    //scene
    scene = new THREE.Scene();

    const light = new THREE.AmbientLight( 0xffffff, 3); // soft white light
    scene.add( light );
    //camera
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1500 );
    // camera.position.x = 86;
    // camera.rotation.y = MathUtils.degToRad(38);
    camera.position.z = 116;
    //renderer
    renderer = new THREE.WebGLRenderer();

    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild( renderer.domElement );

   
    // GUI
    gui = new dat.GUI();
    cameraControls = {
        translateZ : 116,
        translateX: 0,
        rotateY: MathUtils.degToRad(0),
    };

    boltzScale = {
        scale: 0.5,
    }
    voltageLevel = {
        x: 0.0,
    };

    accScale = {
        scale: 1.0,
    }

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

    gui.add(voltageLevel, 'x', -1.4, 0.4).name('Voltage (V)').step(0.1).onChange(() => {
        voltage = voltageLevel.x;
    });

    gui.add(boltzScale, 'scale', 0.5, 1.0).name('Boltz Scale').step(0.1).onChange(() => {
        scalar = boltzScale.scale;
    });

    gui.add(accScale, 'scale', 0.1, 10).name('Acceleration Scalar').step(0.1).onChange(() => {
        accScalar = accScale.scale;
    });



    // gui.add(temperatureLevel, 'temp', -100, 500).name('temperature').step(0.1).onChange(() => {
    //     temperature = temperatureLevel.temp;
    // });
    // Add a button to reset GUI controls
    gui.add(resetButton, 'Reset Cube');

    // window resize handler
    window.addEventListener( 'resize', onWindowResize );

    // create cube container
    const cubeGeometry = box(cubeSize.x, cubeSize.y, cubeSize.z);
    const cubeMaterial = new THREE.LineDashedMaterial({ color: 0xFFFFFF, dashSize: 3, gapSize: 1});
    cube1 = new THREE.LineSegments(cubeGeometry, cubeMaterial);
    cube1.computeLineDistances();
    cube1.position.set(0, 0, 0);

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
        createIon(-(cubeSize.x/2) + 1, -2, 0xffffff, 'acceptor');
        holeSpheres.push({pause: false, lerpProgress: 0, lerping: false, lerpPartner: new THREE.Vector3(), recombine: true, canMove: holes.canMove, id:'initial', object: holes.object, material: holes.material, velocity: randomVelocity, speed: Math.random() * (maxScalar - minScalar + 1) + minScalar, scatterStartTime: performance.now(), scatterTime: (scatterTimeMean + (perlin.noise(i * 100, i * 200, performance.now() * 0.001) - 0.5)*0.3)});
    }

    //create initial electrons and donors
    for (let i = 0; i < numSpheres; i++) {
        randomVelocity = getBoltzVelocity();
        createIon(2, (cubeSize.x/2) - 1, 0xffffff, 'donor');
        let electron = createSphere(i, 2, (cubeSize.x/2) - 1, 0x1F51FF, false);
        electronSpheres.push({pause: false, lerpProgress: 0, lerping: false, lerpPartner: new THREE.Vector3(), recombine: true, canMove: electron.canMove, id: 'initial', object: electron.object, material: electron.material, velocity: randomVelocity, speed: Math.random() * (maxScalar - minScalar + 1) + minScalar, scatterStartTime: performance.now(), scatterTime: (scatterTimeMean + (perlin.noise(i * 100, i * 200, performance.now() * 0.001) - 0.5)*0.3)});
    }

    //generate after 10 seconds
    setTimeout(generation, 500);

    // const rectLightHelper = new RectAreaLightHelper( rectLight );
    // rectLight.add( rectLightHelper );
}

function update() {
	requestAnimationFrame( update );
    let currentTime = performance.now();
    let time = clock.getDelta()/15;

    scene.remove(innerCube);

    //add innercube for electric field

    // update inner box size based on formula using voltage
    innerBoxSize = 24.2*(0.58*(Math.sqrt(9.2 - voltage/0.05)));

    innerCubeGeometry = box(innerBoxSize, cubeSize.y, cubeSize.z);
    innerCubeMaterial = new THREE.LineDashedMaterial({ color: 0xFF0000, dashSize: 3, gapSize: 1});

    innerCube = new THREE.LineSegments(innerCubeGeometry, innerCubeMaterial);
    innerCube.computeLineDistances();
    
    innerCube.position.set(0, 0, 0);

    scene.add(innerCube);

    // ARROW IMPLEMENTATION
    const origin = new THREE.Vector3( 0, 70, 0 );
    const length = 50;
    const hex = 0xffff00;

    updateArrow(origin, length, hex);
   
    //SCATTER (update velocities for scattering)

    scatter(currentTime); 

    addAcceleration(electronSpheres, innerBoxSize, time, -1);
    addAcceleration(holeSpheres, innerBoxSize, time, 1);

    recombinationAnim();
  

    //UPDATE SPHERE POSITION
   updateSpherePosition();
   
    // checkBounds(holeSpheres, electronSpheres, hBoundsMin, hBoundsMax, eBoundsMin, eBoundsMax);
    checkBounds(holeSpheres, electronSpheres, boxMin, boxMax);
	renderer.render( scene, camera );
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
    
        //multiply scalar to acceleration
        acc.multiplyScalar(accScalar);
    
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
    for (let i = 0; i < electronSpheres.length; i++) {
        for (let j = 0; j < holeSpheres.length; j++) {
            if (!electronSpheres[i] || !holeSpheres[j]) continue;
            
            if (canRecombine(electronSpheres[i], holeSpheres[j]) && checkCollision(electronSpheres[i], holeSpheres[j])) {
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

                    // Set velocity to zero during pause
                    electronSpheres[i].velocity.set(0, 0, 0);
                    holeSpheres[j].velocity.set(0, 0, 0);
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
                let midpoint = new THREE.Vector3().addVectors(sphere.object.position, sphere.lerpPartner.object.position).multiplyScalar(0.5);
            
                sphere.object.position.lerp(midpoint, sphere.lerpProgress);
                let startingRadius = 5;
                // Check if lerping is complete
                
                // alright we only want to create the orb once, so only create if an orb does not exist
                if (sphere.lerpProgress >= .25 && !sphere.orb) { // when lerping is half way done, create an orb 
                    const orbGeo = new THREE.SphereGeometry(startingRadius, 32, 32);
                    const orbMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4});
                    const orbSphere = new THREE.Mesh(orbGeo, orbMaterial);
                    orbSphere.position.copy(midpoint);
                    sphere.orb = orbSphere;
                    scene.add(sphere.orb);
                }
                if (sphere.orb) {
                    // Update orb position and scale
                    sphere.orb.position.copy(midpoint);
                    let scale = 1 - (sphere.lerpProgress - 0.5) * 2; // Scale from 1 to 0 as lerp goes from 0.5 to 1
                    sphere.orb.scale.setScalar(Math.max(0, scale));

                    // Update opacity
                    sphere.orb.material.opacity = 0.4 * Math.max(0, scale);  
                    if ( sphere.orb.material.opacity == 0) {
                        scene.remove(sphere.orb);
                    }                 
                }
                //the issue with this is that it is waiting till the next frame....so I think what I need to do is
                // remove the sphere each frame after it's made.... but then it won't exist. but it might have an illusion of it being made
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
}

function generation() {
    let position = new Vector3(
        THREE.MathUtils.randFloat(-cubeSize.x/2 + 1, cubeSize.x/2 - 1), 
        THREE.MathUtils.randFloat(-cubeSize.y/2 + 1, cubeSize.y/2 - 1), 
        THREE.MathUtils.randFloat(-cubeSize.z/2 + 1, cubeSize.z/2 - 1));
    // holes and electron are created at the same position
    let hole = createSphereAt(position.clone().add(new THREE.Vector3(2,0,0)), 0xFF3131, false);
    let electron = createSphereAt(position, 0x1F51FF, false);


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
    let maxOrbSize = 5;
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
                    boolean = false;
                    scene.remove(orbSphere);
                    hole.canMove = true;
                    electron.canMove = true;
                    holeSpheres.push({pause: false, lerpProgress: 0, lerping: false, lerpPartner: new THREE.Vector3(), recombine: false , id: 'generated', canMove: hole.canMove, object: hole.object, material: hole.material, velocity: getBoltzVelocity(), speed: Math.random() * (maxScalar - minScalar + 1) + minScalar, scatterStartTime: performance.now(), scatterTime: (scatterTimeMean + (perlin.noise(Math.random(0, numSpheres) * 100, Math.random(0, numSpheres) * 200, performance.now() * 0.001) - 0.5)*0.3)});
                    electronSpheres.push({pause: false, lerpProgress: 0, lerping: false, lerpPartner: new THREE.Vector3(), recombine: false, id: 'generated', canMove: electron.canMove, object: electron.object, material: electron.material, velocity: getBoltzVelocity(), speed: Math.random() * (maxScalar - minScalar + 1) + minScalar, scatterStartTime: performance.now(), scatterTime: (scatterTimeMean + (perlin.noise(Math.random(0, numSpheres) * 100, Math.random(0, numSpheres) * 200, performance.now() * 0.001) - 0.5)*0.3)});    
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

function canRecombine(electron, hole) {
    if (electron.id == 'generated' && hole.id == 'generated') {
        let distancePostGenerated = new THREE.Vector3().subVectors(electron.object.position, hole.object.position).length();
        if (distancePostGenerated > 3) {
            electronSpheres.recombine = true;
            holeSpheres.recombine = true;
            return true;
        } else {
            return false;
        }
    } else {
        return true;
    }
}

function checkCollision(electron, hole) {
    // collision check...
    // if two are created from generation then they can't recombine
    let distance = new Vector3().subVectors(electron.object.position, hole.object.position).length();
    let coll_dist = 5;
    if (distance <= coll_dist) {
        if (electron.id == 'generated' && hole.id == 'generated') {
            return false;
        } else {
            console.log("collided");
            return true;
        }
    } else {
     return false;
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
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: sphereColor, transparent: transparency, opacity: opacityVal});
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
    if (transparency) {
        opacityVal = 0.6;
    }
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: sphereColor, transparent: transparency, opacity: opacityVal});
    const sphere = new THREE.Mesh(geometry, material);

    // Random position within the cube as specified
    sphere.position.set(position.x, position.y, position.z);
    scene.add(sphere);
    return {object: sphere, material: material, canMove: false};
}

function updateArrow(origin, length, hex) {
    if (voltage === 0) {
        scene.remove(arrowNegative);
        scene.remove(arrowPositive);
        arrowNegative = null;
        arrowPositive = null;
    } else if (voltage < 0) {
        scene.remove(arrowPositive);
        arrowPositive =  null;
    } else if (voltage > 0) {
        scene.remove(arrowNegative);
        arrowNegative = null;
    }
    
    if (voltage < 0) {
        if (!arrowNegative) {
            arrowNegative = new THREE.ArrowHelper(new THREE.Vector3(voltage, 0, 0), origin, length, hex );
            scene.add(arrowNegative);
        }
        
    } else if (voltage > 0) {
        if (!arrowPositive) {
            arrowPositive = new THREE.ArrowHelper(new THREE.Vector3(voltage, 0, 0), origin, length, hex );
            scene.add(arrowPositive);
        }    
    } 
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
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}


