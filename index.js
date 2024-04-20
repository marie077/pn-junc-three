import * as THREE from 'https://unpkg.com/three/build/three.module.js'; 
import { MathUtils } from 'https://unpkg.com/three/src/math/MathUtils.js';
import { ImprovedNoise } from 'https://unpkg.com/three/examples/jsm/math/ImprovedNoise.js';
import * as BufferGeometryUtils from 'https://unpkg.com/three@0.163.0/examples/jsm/utils/BufferGeometryUtils.js';

//scene set up variables and window variables
let container, camera, scene, renderer;
let electricFieldControl;
let cameraControls;
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
let xLevel = 0.0;

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

//scatter variables
let scatterTimeMean = 2;
const perlin = new ImprovedNoise();

//on mouse move
// document.addEventListener( 'mousemove', onDocumentMouseMove );
init();
update();

function init() {
    //camera, background textures, background, scene, initial geometry, materials, renderer
    container = document.createElement( 'div' );
    document.body.appendChild( container );
    //scene
    scene = new THREE.Scene();

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

    electricFieldControl = {
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

    gui.add(electricFieldControl, 'x', -10.0, 10.0).name('Electric Field V/cm   ').step(0.01).onChange(() => {
        xLevel = electricFieldControl.x;
    });

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
        randomVelocity = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
        let holes = createSphere(i, -(cubeSize.x/2) + 1, -2, 0xE3735E);
        createIon(-(cubeSize.x/2) + 1, -2, 0x6495ED, 'acceptor');
        holeSpheres.push({ object: holes, velocity: randomVelocity, speed: Math.random() * (maxScalar - minScalar + 1) + minScalar, scatterStartTime: performance.now(), scatterTime: (scatterTimeMean + (perlin.noise(i * 100, i * 200, performance.now() * 0.001) - 0.5)*0.3), highEnergy: false})
    }

    //create initial electrons and donors
    for (let i = 0; i < numSpheres; i++) {
        randomVelocity = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
        createIon(2, (cubeSize.x/2) - 1, 0xC70039, 'donor');
        let electron = createSphere(i, 2, (cubeSize.x/2) - 1, 0x71bbd4);
        electronSpheres.push({ object: electron, velocity: randomVelocity, speed: Math.random() * (maxScalar - minScalar + 1) + minScalar, scatterStartTime: performance.now(), scatterTime: (scatterTimeMean + (perlin.noise(i * 100, i * 200, performance.now() * 0.001) - 0.5)*0.3)});
    }

    //waits for two seconds before electrons and holes diffuse
    setTimeout(() => {
        shouldAnimate = true;
    }, 4000);
}

function createIon(minx, maxx, color, ionType) {
    let capsuleLength = 3;
    let radius = 0.5;
    const geometry = new THREE.CapsuleGeometry(radius, capsuleLength);
    //negative shape
    if (ionType == "acceptor") {
        let material = new THREE.MeshBasicMaterial({color: color, transparent: true, opacity: 0.4});
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
        let material = new THREE.MeshBasicMaterial({color: color, transparent: true,  opacity: 0.4});
        let donor = new THREE.Mesh(mergedGeometry, material);
        donor.position.set(
            THREE.MathUtils.randFloat(minx, maxx),
            THREE.MathUtils.randFloat(-cubeSize.y/2 + 1, cubeSize.y/2 - 1),
            THREE.MathUtils.randFloat(-cubeSize.z/2 + 1, cubeSize.z/2 - 1)
        );
        scene.add(donor);
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


// Function to reset GUI controls
function resetGUI() {
    console.log('reset attempted');
    Object.assign(cameraControls, electricFieldControl);
        electricFieldControl.x = 0;
        camera.position.x = 0;
        camera.rotation.y = MathUtils.degToRad(0);
        camera.position.z = 116; 
        xLevel = 0;
    gui.updateDisplay(); // Update GUI to reflect the changes
}



// Function to create a sphere inside the cube
function createSphere(i, minPos, maxPos, sphereColor) {
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: sphereColor});
    const sphere = new THREE.Mesh(geometry, material);

    // Random position within the cube as specified
    sphere.position.set(
    THREE.MathUtils.randFloat(minPos, maxPos),
    THREE.MathUtils.randFloat(-cubeSize.y/2 + 1, cubeSize.y/2 - 1),
    THREE.MathUtils.randFloat(-cubeSize.z/2 + 1, cubeSize.z/2 - 1)
    );
    scene.add(sphere);
    return sphere;
}


function update() {
	requestAnimationFrame( update );
    let currentTime = performance.now();
    let time = clock.getDelta()/15;
    console.log("time:" + currentTime);

    // update inner box size based on electric field
    innerBoxSize = (50 - (xLevel * 10));
    let minInnerBoxSize = 40;
    let maxInnerBoxSize = 100;
       
     
    //dis my electric field...
    let electricField = new THREE.Vector3(xLevel, 0, 0);
    let electricFieldCopy = electricField.clone();
    electricFieldCopy.normalize();

    let acc = electricField.x;

    

    scene.remove(innerCube);
    
    if (acc != 0) {
        if (acc >= 0) {
            // When the electric field is positive, make the inner box slightly smaller than the original size
            innerBoxSize = Math.max(minInnerBoxSize, innerBoxSize); // Adjust the scaling factor as desired
        } else if (acc <= 0) {
            innerBoxSize = Math.min(maxInnerBoxSize, innerBoxSize);
        
        } else {
            innerBoxSize = 50 + innerBoxSize; // Adjust the scaling factor as desired
        }
    
        // inner cubes
        innerCubeGeometry = box(innerBoxSize, cubeSize.y, cubeSize.z);
        innerCubeMaterial = new THREE.LineDashedMaterial({ color: 0xFF0000, dashSize: 3, gapSize: 1});
    
        innerCube = new THREE.LineSegments(innerCubeGeometry, innerCubeMaterial);
        innerCube.computeLineDistances();
        
        innerCube.position.set(0, 0, 0);
    
        scene.add(innerCube);
    }
   
    if (acc === 0) {
        scene.remove(arrowNegative);
        scene.remove(arrowPositive);
        arrowNegative = null;
        arrowPositive = null;
    } else if (acc < 0) {
        scene.remove(arrowPositive);
        arrowPositive =  null;
    } else if (acc > 0) {
        scene.remove(arrowNegative);
        arrowNegative = null;
    }
    const origin = new THREE.Vector3( 0, 70, 0 );
    const length = 50;
    const hex = 0xffff00;

    if (acc < 0) {
        if (!arrowNegative) {
            arrowNegative = new THREE.ArrowHelper( electricFieldCopy, origin, length, hex );
            scene.add(arrowNegative);
        }
        
    } else if (acc > 0) {
        if (!arrowPositive) {
            arrowPositive = new THREE.ArrowHelper( electricFieldCopy, origin, length, hex );
            scene.add(arrowPositive);
        }    
    } 

    
    // electron sphere movement/distribution
    for (let i = 0; i < numSpheres; i++) {
        // scatter everytime scatterStartTime >= scatterTime in milliseconds
        let currElectronScatterTime = (currentTime - electronSpheres[i].scatterStartTime)/1000;
        let currHoleScatterTime = (currentTime - holeSpheres[i].scatterStartTime)/1000;

       if (currElectronScatterTime >= electronSpheres[i].scatterTime) {
           console.log("scatter");
           scatter(electronSpheres[i], i);
       }
       if (currHoleScatterTime >= holeSpheres[i].scatterTime) {
        console.log("scatter");
        scatter(holeSpheres[i], i);
        }
       
       const currElectronVelocity = electronSpheres[i].velocity.clone();
       const currHoleVelocity = holeSpheres[i].velocity.clone();

       currElectronVelocity.normalize();
       currHoleVelocity.normalize();

       // randomizes the electron speed
       currElectronVelocity.multiplyScalar(electronSpheres[i].speed);
       currHoleVelocity.multiplyScalar(holeSpheres[i].speed);

       const minVelocity = 0.2;
       const maxVelocity = 0.6;

       // alright dis field active
       if (acc !== 0) {
            // if the electron and holes are within the range and the e field is active
            let inEFieldRange = (electronSpheres[i].object.position.x > -innerBoxSize/2 + 1 && electronSpheres[i].object.position.x < innerBoxSize/2 - 1) &&
            (holeSpheres[i].object.position.x > -innerBoxSize/2 + 1 && holeSpheres[i].object.position.x < innerBoxSize/2 - 1);
            if (inEFieldRange) {
            // then apply the acceleration and update position and velocity and clamp the positions to within the box
                const accVectorElectron = new THREE.Vector3(-acc, 0, 0); 
                const accVectorHole = new THREE.Vector3(acc, 0, 0); 
                currHoleVelocity.add(accVectorHole.multiplyScalar(time));
                currElectronVelocity.add(accVectorElectron.multiplyScalar(time));

                currElectronVelocity.clampLength(minVelocity, maxVelocity);
                currHoleVelocity.clampLength(minVelocity, maxVelocity);
    
                electronSpheres[i].object.position.add(currElectronVelocity);
                electronSpheres[i].velocity = currElectronVelocity;
    
                holeSpheres[i].object.position.add(currHoleVelocity);
                holeSpheres[i].velocity = currHoleVelocity;   
                

                // this should clamp the electric field to the inner box size...
                // electronSpheres[i].object.position.clamp(new THREE.Vector3(-innerBoxSize/2 + 1, -cubeSize.y / 2 + 1, -cubeSize.z / 2 + 1), new THREE.Vector3(innerBoxSize/2 - 1, cubeSize.y/2 - 1, cubeSize.z/2 -1));
                // holeSpheres[i].object.position.clamp(new THREE.Vector3(-innerBoxSize/2 + 1, -cubeSize.y / 2 + 1, -cubeSize.z / 2 + 1), new THREE.Vector3(innerBoxSize/2 - 1, cubeSize.y/2 - 1, cubeSize.z/2 -1));
                checkBounds(holeSpheres[i], electronSpheres[i], -innerBoxSize/2 + 1, innerBoxSize/2 - 1, -innerBoxSize/2 + 1, innerBoxSize/2 - 1);
            }

            if (!inEFieldRange) { //if the e field is active but they're not in the inner box then bound based on the innerbox
                currElectronVelocity.clampLength(minVelocity, maxVelocity);
                currHoleVelocity.clampLength(minVelocity, maxVelocity);
                electronSpheres[i].object.position.add(currElectronVelocity);
                electronSpheres[i].velocity = currElectronVelocity;
    
                holeSpheres[i].object.position.add(currHoleVelocity);
                holeSpheres[i].velocity = currHoleVelocity;   
                checkBounds(holeSpheres[i], electronSpheres[i], hBoundsMin, -innerBoxSize/2 + 10, innerBoxSize/2 - 10, eBoundsMax);

            }

          
       } else { //e field is not active act normal
         // Apply a minimum velocity threshold
            currElectronVelocity.clampLength(minVelocity, maxVelocity);
            currHoleVelocity.clampLength(minVelocity, maxVelocity);

            electronSpheres[i].object.position.add(currElectronVelocity);
            electronSpheres[i].velocity = currElectronVelocity;

            holeSpheres[i].object.position.add(currHoleVelocity);
            holeSpheres[i].velocity = currHoleVelocity;
            checkBounds(holeSpheres[i], electronSpheres[i], hBoundsMin, hBoundsMax, eBoundsMin, eBoundsMax);
       }
    }
	renderer.render( scene, camera );
}

function scatter(sphere, index) {
    //reset the velocity to something random
    sphere.velocity = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();

    //reset scatter start time and next scatter time
    sphere.scatterStartTime = performance.now();
    sphere.scatterTime = (scatterTimeMean + (perlin.noise(index * 100, index * 200, performance.now() * 0.001) - 0.5)*0.3);
    
}

function checkBounds(sphere1, sphere2, minX1, maxX1, minX2, maxX2) {

    //-30 - (cubeSize/2) + 1, -30 + (cubeSize/2) - 20
    // cube boundaries
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
        console.log('sphere greater than x pos edge');
        sphere1.object.position.x = minX1 + 1;
        // sphere1.velocity.multiplyScalar(-1);
    } else if(sphere1.object.position.x <= minX1){
        sphere1.object.position.x = THREE.MathUtils.randFloat(minX1 + 1, minX1 + 20);
        // sphere1.velocity.multiplyScalar(-1);
    }

    if (sphere2.object.position.x >= maxX2) {
        console.log('sphere greater than x pos edge');
        sphere2.object.position.x = THREE.MathUtils.randFloat(maxX2 - 20, maxX2 - 1);
        // sphere2.velocity.multiplyScalar(-1);
    } else if(sphere2.object.position.x <= minX2){
        sphere2.object.position.x = maxX2 - 1;
        // sphere2.velocity.multiplyScalar(-1);
    }

    if (sphere1.object.position.y > yedge) {
        console.log('sphere greater than y pos edge');
        sphere1.object.position.y = yedge - 1;
        sphere1.velocity.multiplyScalar(-1);
    } else if (sphere1.object.position.y < ynedge) {
        sphere1.object.position.y = ynedge + 1;
        sphere1.velocity.multiplyScalar(-1);
    }

    if (sphere2.object.position.y > yedge) {
        console.log('sphere greater than y pos edge');
        sphere2.object.position.y = yedge - 1;
        sphere2.velocity.multiplyScalar(-1);
    } else if (sphere2.object.position.y < ynedge) {
        sphere2.object.position.y = ynedge + 1;
        sphere2.velocity.multiplyScalar(-1);
    }

    if (sphere1.object.position.z > zedge) {
        console.log('sphere greater than z pos edge');
        sphere1.object.position.z = zedge - 1;
        sphere1.velocity.multiplyScalar(-1);
    } else if (sphere1.object.position.z < znedge) {
        sphere1.object.position.z = znedge + 1;
        sphere1.velocity.multiplyScalar(-1);
    }

    if (sphere2.object.position.z > zedge) {
        console.log('sphere greater than z pos edge');
        sphere2.object.position.z = zedge - 1;
        sphere2.velocity.multiplyScalar(-1);
    } else if (sphere2.object.position.z < znedge) {
        sphere2.object.position.z = znedge + 1;
        sphere2.velocity.multiplyScalar(-1);
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}


