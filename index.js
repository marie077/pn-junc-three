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
let numSpheres = 200;
let cube1;
let cubeSize = new THREE.Vector3(150, 75, 75);
let clock = new THREE.Clock();
let acc_hole = 0;
let acc_electron = 0;

let hBoundsMin = -(cubeSize.x/2) + 1;
let hBoundsMax = (cubeSize.x/2) - 1;
let eBoundsMin = -(cubeSize.x/2) + 1;
let eBoundsMax = (cubeSize.x/2) - 1;

//electric field attributes
let arrowNegative;
let arrowPositive;
let innerBoxSize = 25;
let innerCubeGeometry;
let innerCubeMaterial;
let innerCube;
let voltage = 0.0;
let accScalar = 0.0;

//boltzmann distribution variables
let energy = 0.0;
const temperature = 300;
const boltzmann_const = 1.380649e-23
let scalar = 1.0;

//scatter variables
let scatterTimeMean = 2;
const perlin = new ImprovedNoise();

//recombination variables
const loader = new GLTFLoader();
let ready_recombine = false;
let hold_still = true;

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
        {nv: 1.7, quantity: 32}, {nv: 1.8, quantity: 24}, {nv: 1.9, quantity: 18}, {nv: 2.0, quantity: 13}, {nv: 2.1, quantity: 9}, {nv: 2.2, quantity: 6}, {nv: 2.3, quantity: 4},
        {nv: 2.4, quantity: 3}, {nv: 2.5, quantity: 2}, {nv: 2.6, quantity: 1}, {nv: 2.7, quantity: 1}];
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
        scale: 1.0,
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

    gui.add(voltageLevel, 'x', -1, 0.4).name('Voltage (V)').step(0.1).onChange(() => {
        voltage = voltageLevel.x;
    });

    gui.add(boltzScale, 'scale', 0.1, 20).name('Boltz Scale').step(0.1).onChange(() => {
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


    //text

    scene.add(cube1, plane);

    let randomVelocity;
    //create initial holes and acceptors
    for (let i = 0; i < numSpheres; i++) {
        // change this to boltzmann distributed velocity
        randomVelocity = getBoltzVelocity();
        let holes = createSphere(i, -(cubeSize.x/2) + 1, -2, 0xFF3131, false);
        createIon(-(cubeSize.x/2) + 1, -2, 0xffffff, 'acceptor');
        holeSpheres.push({recombine: true, canMove: true, id:'initial', object: holes.object, material: holes.material, velocity: randomVelocity, speed: Math.random() * (maxScalar - minScalar + 1) + minScalar, scatterStartTime: performance.now(), scatterTime: (scatterTimeMean + (perlin.noise(i * 100, i * 200, performance.now() * 0.001) - 0.5)*0.3), highEnergy: false});
    }

    //create initial electrons and donors
    for (let i = 0; i < numSpheres; i++) {
        randomVelocity = getBoltzVelocity();
        createIon(2, (cubeSize.x/2) - 1, 0xffffff, 'donor');
        let electron = createSphere(i, 2, (cubeSize.x/2) - 1, 0x1F51FF, false);
        electronSpheres.push({recombine: true, canMove: true, id: 'initial', object: electron.object, material: electron.material, velocity: randomVelocity, speed: Math.random() * (maxScalar - minScalar + 1) + minScalar, scatterStartTime: performance.now(), scatterTime: (scatterTimeMean + (perlin.noise(i * 100, i * 200, performance.now() * 0.001) - 0.5)*0.3)});
    }

    //waits for two seconds before electrons and holes diffuse
    setTimeout(() => {
        shouldAnimate = true;
    }, 4000);

    //generate after 10 seconds
    setTimeout(generation, 5000);

    // const rectLightHelper = new RectAreaLightHelper( rectLight );
    // rectLight.add( rectLightHelper );
}

function update() {
	requestAnimationFrame( update );
    let currentTime = performance.now();
    let time = clock.getDelta()/15;

    scene.remove(innerCube);
    let minSize = 40;

    // update inner box size based on formula using voltage
    innerBoxSize = 24.2*(0.58*(Math.sqrt(9.2 - voltage/0.05)));

    // if voltage if positive then we set a minSize for the innerbox
    if (voltage > 0) {
        innerBoxSize = Math.max(innerBoxSize, minSize);
    }

    // ARROW IMPLEMENTATION
    const origin = new THREE.Vector3( 0, 70, 0 );
    const length = 50;
    const hex = 0xffff00;

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

    // ARROW DONE

    innerCubeGeometry = box(innerBoxSize, cubeSize.y, cubeSize.z);
    innerCubeMaterial = new THREE.LineDashedMaterial({ color: 0xFF0000, dashSize: 3, gapSize: 1});

    innerCube = new THREE.LineSegments(innerCubeGeometry, innerCubeMaterial);
    innerCube.computeLineDistances();
    
    innerCube.position.set(0, 0, 0);

    scene.add(innerCube);

    // Recombination
        for (let i = 0; i < numSpheres; i++) {
            const e_sphere = electronSpheres[i];
            if (e_sphere.id == 'electron generated') {
                console.log('the regenerated electron is checking for collision');
            }
            for (let j = 0; j < numSpheres; j++) {
                const h_sphere = holeSpheres[j];
                if (electronSpheres[i].recombine == true && holeSpheres[j].recombine == true) {
 
                    if (checkCollision(e_sphere, h_sphere)) {
                        // slow the colliding spheres down
                        // turn it white lol
                        // stop for like a second or so
                        // fade out and remove from scene
                        e_sphere.speed = 0.1;
                        h_sphere.speed = 0.1;
                        let collisionPoint = e_sphere.object.position.clone().add(h_sphere.object.position.clone()).sub(e_sphere.object.position);
                        let size = 2;
                        loader.load('./assets/gltf/light_effect.glb', async function (gltf) {
                            const sparkModel = gltf.scene;
                            await renderer.compileAsync(sparkModel, camera, scene);
                            if (sparkModel) {
                                console.log('model loaded and collision');
        
        
                                sparkModel.position.copy(collisionPoint);
                                sparkModel.scale.setScalar(size);
                                console.log(electronSpheres[i].object);
                                scene.remove(electronSpheres[i].object);
                                scene.remove(holeSpheres[j].object);
        
                                electronSpheres[i].object.geometry.dispose();
                                holeSpheres[j].object.geometry.dispose();
        
                                electronSpheres[i].object.geometry.dispose();
                                holeSpheres[j].object.material.dispose();
        
                                // electronSpheres[i].object = undefined;
                                // holeSpheres[j].object = undefined;
        
                                // remove the e and h from array
                                electronSpheres.splice(i, 1);
                                holeSpheres.splice(j, 1);
                                numSpheres--;

                                scene.add(sparkModel);
        
                                setTimeout(()=> {
                                    scene.remove(sparkModel);
                                }, 1000);
                            } else {
                                console.error('failed to load model');
                            }
        
                        });
                    
        
                    
                    }
                }
            }
        }
   
   

    /*
    update the e and h velocities based on position
    */
    
    for (let i = 0; i < numSpheres; i++) {
        // implement scatter movement
        let currElectronScatterTime = (currentTime - electronSpheres[i].scatterStartTime)/1000;
        let currHoleScatterTime = (currentTime - holeSpheres[i].scatterStartTime)/1000;

       if (currElectronScatterTime >= electronSpheres[i].scatterTime) {
           scatter(electronSpheres[i], i);
       }
       if (currHoleScatterTime >= holeSpheres[i].scatterTime) {
            scatter(holeSpheres[i], i);
        }

        /* begin velocity calculations for each hole and each electron*/

        // store x positions of e and h
       let hole_x = holeSpheres[i].object.position.x;
       let electron_x = electronSpheres[i].object.position.x;
        // check hole and electron positions within the larger box and determine appropriate velocity (efield vs. no efield)

        // if position is within -Xn < X < 0
        if ((-innerBoxSize/2 < hole_x && hole_x < 0)) {
            // check if dividing by two is appropriate or not
            acc_hole = new THREE.Vector3(-1.53*(innerBoxSize/2 + hole_x), 0 , 0);
        }

        if ((-innerBoxSize/2 < electron_x && electron_x < 0)) {
            acc_electron = new THREE.Vector3(-1.53*(innerBoxSize/2 + electron_x), 0 , 0);
            // doing this because electrons will move opposite against the e-field
        }

        // is position is within 0 < X < Xn
        if ((0 < hole_x && hole_x < innerBoxSize/2)) {
            acc_hole = new THREE.Vector3(-1.53*(innerBoxSize/2 - hole_x), 0, 0);
        }

        if (0 < electron_x && electron_x < innerBoxSize/2) {
            acc_electron = new THREE.Vector3(-1.53*(innerBoxSize/2 - electron_x), 0, 0);
            // doing this because electrons will move opposite against the e-field
        }

        // everywhere else -- -cubeSize.x/2 + 1 < X < -Xn || Xn < X < cubeSize.x/2 - 1
        if ((-cubeSize.x/2 + 1 < hole_x && hole_x < -innerBoxSize/2) || (innerBoxSize/2 < hole_x && hole_x < cubeSize.x/2 - 1) || (hole_x == 0)) {
            acc_hole = new THREE.Vector3(0, 0, 0);
        }

        if ((-cubeSize.x/2 + 1 < electron_x && electron_x < -innerBoxSize/2) || (innerBoxSize/2 < electron_x && electron_x < cubeSize.x/2 - 1) || (electron_x == 0)) {
            acc_electron = new THREE.Vector3(0, 0, 0);
        }

         // now that we have our acceleration calculated, let's determine the new velocities for e and h        
       const currElectronVelocity = electronSpheres[i].velocity.clone();
       const currHoleVelocity = holeSpheres[i].velocity.clone();

       const minVelocity = 0.2;
       const maxVelocity = 0.7;

    //    currElectronVelocity.normalize();
    //    currHoleVelocity.normalize();

       // randomizes the electron speed
       currElectronVelocity.multiplyScalar(electronSpheres[i].speed);
       currHoleVelocity.multiplyScalar(holeSpheres[i].speed);

       //multiply scalar to acceleration
       acc_electron.multiplyScalar(accScalar);
       acc_hole.multiplyScalar(accScalar);

       currElectronVelocity.add(acc_electron.multiplyScalar(time).multiplyScalar(-1));
       currHoleVelocity.add(acc_hole.multiplyScalar(time));


    //    currElectronVelocity.add(getBoltzVelocity().multiplyScalar(time).multiplyScalar(2));
    //    currHoleVelocity.add(getBoltzVelocity().multiplyScalar(time).multiplyScalar(2));

       currElectronVelocity.clampLength(minVelocity, maxVelocity);
       currHoleVelocity.clampLength(minVelocity, maxVelocity);

       if (!hold_still && electronSpheres[i].id == 'generated' && holeSpheres[i].id == 'generated') {
            electronSpheres[i].canMove = true;
            holeSpheres[i].canMove = true;
       }

       if (electronSpheres[i].id == 'generated' && holeSpheres[i].id == 'generated') {
            let distancePostGenerated = new THREE.Vector3().subVectors(electronSpheres[i].object.position, holeSpheres[i].object.position).length();
            if (distancePostGenerated > 3) {
                electronSpheres[i].recombine = true;
                holeSpheres[i].recombine = true;
            }
       }

       if (electronSpheres[i].canMove == true) {
        electronSpheres[i].object.position.add(currElectronVelocity);
        electronSpheres[i].velocity = currElectronVelocity;

        holeSpheres[i].object.position.add(currHoleVelocity);
        holeSpheres[i].velocity = currHoleVelocity;   
       }

       
 
       checkBounds(holeSpheres[i], electronSpheres[i], hBoundsMin, hBoundsMax, eBoundsMin, eBoundsMax);

      
    }

   

	renderer.render( scene, camera );
}

function generation() {
    let threshold = 1.5;
    let rand_number = Math.random() * 2;
    // if (rand_number >= threshold) {
        let position = new Vector3(
            THREE.MathUtils.randFloat(-cubeSize.x/2 + 1, cubeSize.x/2 - 1), 
            THREE.MathUtils.randFloat(-cubeSize.y/2 + 1, cubeSize.y/2 - 1), 
            THREE.MathUtils.randFloat(-cubeSize.z/2 + 1, cubeSize.z/2 - 1));

            //orb
            const orbGeo = new THREE.SphereGeometry(3, 32, 32);
            const orbMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4});
            const orbSphere = new THREE.Mesh(orbGeo, orbMaterial);
        
            orbSphere.position.set(position.x, position.y, position.z);
            scene.add(orbSphere);
            hold_still = true;
            setTimeout(()=> {
                scene.remove(orbSphere);
                hold_still = false;
            }, 3000);

            let hole = createSphereAt(position.clone().add(new THREE.Vector3(1, 0, 0)), 0xFF3131, false);
            let electron = createSphereAt(position, 0x1F51FF, false);

            let randomVelocity_h = getBoltzVelocity();
            let randomVelocity_e = getBoltzVelocity();
            holeSpheres.push({recombine: false, canMove: false, id: 'generated', object: hole.object, material: hole.material, velocity: randomVelocity_h, speed: Math.random() * (maxScalar - minScalar + 1) + minScalar, scatterStartTime: performance.now(), scatterTime: (scatterTimeMean + (perlin.noise(Math.random(0, numSpheres) * 100, Math.random(0, numSpheres) * 200, performance.now() * 0.001) - 0.5)*0.3)});
            electronSpheres.push({recombine: false, canMove: false, id: 'generated', object: electron.object, material: electron.material, velocity: randomVelocity_e, speed: Math.random() * (maxScalar - minScalar + 1) + minScalar, scatterStartTime: performance.now(), scatterTime: (scatterTimeMean + (perlin.noise(Math.random(0, numSpheres) * 100, Math.random(0, numSpheres) * 200, performance.now() * 0.001) - 0.5)*0.3)});
            numSpheres++;
            ready_recombine = false;  
            //recursively call every 10 seconds and ready to recombine after 15 seconds
            
    // }
    setTimeout(generation, 5000);
}

function checkCollision(electron, hole) {
    // collision check...
    let distance = new Vector3().subVectors(electron.object.position, hole.object.position).length();
    //    let coll_dist = electronSpheres[i].object.geometry.parameters.radius + holeSpheres[i].object.geometry.parameters.radius;
    let coll_dist = 1;
    if (distance <= coll_dist) {
    return true;
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

    // const x = boltz[Math.floor(Math.random() * boltz.length)] * (Math.random() < 0.5 ? -1 : 1);
    // const y = boltz[Math.floor(Math.random() * boltz.length)] * (Math.random() < 0.5 ? -1 : 1);
    // const z = boltz[Math.floor(Math.random() * boltz.length)] * (Math.random() < 0.5 ? -1 : 1);
    let randomVelocity = new THREE.Vector3(x, y, z).multiplyScalar(scalar).normalize();

    return randomVelocity;
}


function scatter(sphere, index) {
    //reset the velocity to something random
    sphere.velocity = getBoltzVelocity();
    // sphere.velocity = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();

    //reset scatter start time and next scatter time
    sphere.scatterStartTime = performance.now();
    sphere.scatterTime = (scatterTimeMean + (perlin.noise(index * 100, index * 200, performance.now() * 0.001) - 0.5)*0.3);
    
}

function checkBounds(sphere1, sphere2, minX1, maxX1, minX2, maxX2) {
    // cube boundaries y and z
    let yedge = (cubeSize.y/2);
    let ynedge = -(yedge);
    let zedge = (cubeSize.z/2);
    let znedge = -(zedge);
    let tempMaxX1 = -4;
    let tempMinX2 = 4;
    if (shouldAnimate) {
        maxX1 = maxX1;
        minX2 = minX2;
    } else {
        maxX1 = tempMaxX1;
        minX2 = tempMinX2;
    }
    if (sphere1.object.position.x >= maxX1) {
        sphere1.object.position.x = minX1 + 1;
        // sphere1.velocity.multiplyScalar(-1);
    } else if(sphere1.object.position.x <= minX1){
        sphere1.object.position.x = THREE.MathUtils.randFloat(minX1 + 1, minX1 + 20);
        // sphere1.object.position.x = minX1 + 1;
        // sphere1.velocity.multiplyScalar(-1);
    }

    if (sphere2.object.position.x >= maxX2) {
        sphere2.object.position.x = THREE.MathUtils.randFloat(maxX2 - 15 , maxX2 - 1);
        // sphere2.velocity.multiplyScalar(-1);
    } else if(sphere2.object.position.x <= minX2){
        sphere2.object.position.x = maxX2 - 1;
        // sphere2.velocity.multiplyScalar(-1);
    }

    if (sphere1.object.position.y > yedge) {
        sphere1.object.position.y = yedge - 1;
        sphere1.velocity.multiplyScalar(-1);
    } else if (sphere1.object.position.y < ynedge) {
        sphere1.object.position.y = ynedge + 1;
        sphere1.velocity.multiplyScalar(-1);
    }

    if (sphere2.object.position.y > yedge) {
        sphere2.object.position.y = yedge - 1;
        sphere2.velocity.multiplyScalar(-1);
    } else if (sphere2.object.position.y < ynedge) {
        sphere2.object.position.y = ynedge + 1;
        sphere2.velocity.multiplyScalar(-1);
    }

    if (sphere1.object.position.z > zedge) {
        sphere1.object.position.z = zedge - 1;
        sphere1.velocity.multiplyScalar(-1);
    } else if (sphere1.object.position.z < znedge) {
        sphere1.object.position.z = znedge + 1;
        sphere1.velocity.multiplyScalar(-1);
    }

    if (sphere2.object.position.z > zedge) {
        sphere2.object.position.z = zedge - 1;
        sphere2.velocity.multiplyScalar(-1);
    } else if (sphere2.object.position.z < znedge) {
        sphere2.object.position.z = znedge + 1;
        sphere2.velocity.multiplyScalar(-1);
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
    return {object: sphere, material: material};
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
    return {object: sphere, material: material};
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


