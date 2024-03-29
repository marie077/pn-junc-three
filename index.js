import * as THREE from 'https://unpkg.com/three/build/three.module.js'; 
import { MathUtils } from 'https://unpkg.com/three/src/math/MathUtils.js';
import { ImprovedNoise } from 'https://unpkg.com/three/examples/jsm/math/ImprovedNoise.js';


//scene set up variables and window variables
let container, camera, scene, renderer;
let mouseX = 0;
let mouseY = 0;
let electricFieldControl;
let cameraControls;
let initialCameraControls;
let initialElectricFieldControl;
let gui;
let minScalar = 0.22;
let maxScalar = 0.88;

//PN Junction Initial Variables
let electronSpheres = [];
let holeSpheres = [];
let numSpheres = 50;
let cube1, cube2;
let cubeSize = 75;
let clock = new THREE.Clock();
let xLevel = 0.0;

//electric field attributes
let arrowNegative;
let arrowPositive;

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

    initialCameraControls = {
        translateZ : 116,
        translateX: 0,
        rotateY: MathUtils.degToRad(0),
    };

    electricFieldControl = {
        x: 0.0,
    };

    initialElectricFieldControl = {
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

    gui.add(electricFieldControl, 'x', -50.0, 50.0).name('Electric Field V/cm   ').step(0.01).onChange(() => {
        xLevel = electricFieldControl.x;
    });

    // Add a button to reset GUI controls
    gui.add(resetButton, 'Reset Cube');

      

    // window resize handler
    window.addEventListener( 'resize', onWindowResize );
  
    //background
    //3d cube texture
    // const path = 'Textures/Cube/Pisa/';
    // const format = '.png';
    // const urls = [
    // path + 'Px' + format, path + 'Nx' + format,
    // path + 'Py' + format, path + 'Ny' + format,
    // path + 'Pz' + format, path + 'Nz' + format
    // ];

    // const textureCube = new THREE.CubeTextureLoader().load( urls );
    //add background to scene
    // scene.background = textureCube;

    // create cube container
    const cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x808080, wireframe: true, transparent: true, opacity: 0.1});
    cube1 = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube2 = new THREE.Mesh(cubeGeometry, cubeMaterial);
    //later position should be a param
    cube1.position.set(-30, 0, 0);
    cube2.position.set(30, 0, 0);
    scene.add(cube1, cube2);

    let randomVelocity;
    //create initial electrons
    for (let i = 0; i < numSpheres; i++) {
        let electron = createSphere(i, -30 - (cubeSize/2) + 1, -30 + (cubeSize/2) - 20, 0xF8DE7E);
        randomVelocity = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
        electronSpheres.push({ object: electron, velocity: randomVelocity, speed: Math.random() * (maxScalar - minScalar + 1) + minScalar, scatterStartTime: performance.now(), scatterTime: (scatterTimeMean + (perlin.noise(i * 100, i * 200, performance.now() * 0.001) - 0.5)*0.3)});
    }
    //create initial holes
    for (let i = 0; i < numSpheres; i++) {
        let hole = createSphere(i, (30 - cubeSize/2) + 20, (30 + cubeSize/2) - 1, 0xFFFFFF);
        randomVelocity = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
        holeSpheres.push({ object: hole, velocity: randomVelocity, speed: Math.random() * (maxScalar - minScalar + 1) + minScalar, scatterStartTime: performance.now(), scatterTime: (scatterTimeMean + (perlin.noise(i * 100, i * 200, performance.now() * 0.001) - 0.5)*0.3)});
    }

}

// Function to reset GUI controls
function resetGUI() {
    console.log('reset attempted');
    Object.assign(cameraControls, initialCameraControls, electricFieldControl, initialElectricFieldControl);
        camera.position.x = 0;
        camera.rotation.y = MathUtils.degToRad(0);
        camera.position.z = 116; 
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
    THREE.MathUtils.randFloat(-cubeSize/2 + 1, cubeSize/2 - 1),
    THREE.MathUtils.randFloat(-cubeSize/2 + 1, cubeSize/2 - 1)
    );
    scene.add(sphere);
    return sphere;
}


function update() {
	requestAnimationFrame( update );
    let currentTime = performance.now();
    let time = clock.getDelta()/15;
    console.log("time:" + currentTime);

    if (xLevel === 0) {
        scene.remove(arrowNegative);
        scene.remove(arrowPositive);
        arrowNegative = null;
        arrowPositive = null;
    } else if (xLevel < 0) {
        scene.remove(arrowPositive);
        arrowPositive =  null;
    } else if (xLevel > 0) {
        scene.remove(arrowNegative);
        arrowNegative = null;
    }
    
    //dis my electric field...
    let electricField = new THREE.Vector3(xLevel, 0, 0);
    let electricFieldCopy = electricField.clone();
    electricFieldCopy.normalize();
    const origin = new THREE.Vector3( 0, 70, 0 );
    const length = 50;
    const hex = 0xffff00;

    if (xLevel < 0) {
        if (!arrowNegative) {
            arrowNegative = new THREE.ArrowHelper( electricFieldCopy, origin, length, hex );
            scene.add(arrowNegative);
        }
        
    } else if (xLevel > 0) {
        if (!arrowPositive) {
            arrowPositive = new THREE.ArrowHelper( electricFieldCopy, origin, length, hex );
            scene.add(arrowPositive);
        }    
    } 
   
    let acc = electricField.x;
    
    // electron sphere movement/distribution
    let index = 0;
    for (let i = 0; i < numSpheres; i++) {
        // scatter everytime scatterStartTime >= scatterTime in milliseconds
        let currElectronScatterTime = (currentTime - electronSpheres[i].scatterStartTime)/1000;
        let currHoleScatterTime = (currentTime - holeSpheres[i].scatterStartTime)/1000;

        console.log("compute: " + currElectronScatterTime);
        console.log("next scatter time: " + electronSpheres[i].scatterTime);

       if (currElectronScatterTime >= electronSpheres[i].scatterTime) {
           console.log("scatter");
           scatter(electronSpheres[i], i);
       }
       if (currHoleScatterTime >= holeSpheres[i].scatterTime) {
        console.log("scatter");
        scatter(holeSpheres[i], i);
    }
       
       //if electric field is active
       const currElectronVelocity = electronSpheres[i].velocity.clone();
       const currHoleVelocity = holeSpheres[i].velocity.clone();

       if (acc !== 0) {
           const accVectorElectron = new THREE.Vector3(-acc, 0, 0); 
           const accVectorHole = new THREE.Vector3(acc, 0, 0); 
           currHoleVelocity.add(accVectorHole.multiplyScalar(time));
           currElectronVelocity.add(accVectorElectron.multiplyScalar(time));
       } 
       currElectronVelocity.normalize();
       currHoleVelocity.normalize();

       // randomizes the electron speed
       currElectronVelocity.multiplyScalar(electronSpheres[i].speed);
       currHoleVelocity.multiplyScalar(electronSpheres[i].speed);

      
       // Apply a minimum velocity threshold
       const minVelocity = 0.2;
       const maxVelocity = 0.6;
       currElectronVelocity.clampLength(minVelocity, maxVelocity);
       currHoleVelocity.clampLength(minVelocity, maxVelocity);


       electronSpheres[i].object.position.add(currElectronVelocity);
       electronSpheres[i].velocity = currElectronVelocity;

       holeSpheres[i].object.position.add(currHoleVelocity);
       holeSpheres[i].velocity = currHoleVelocity;

       checkBounds(electronSpheres[i], holeSpheres[i], -30 - (cubeSize/2) + 1, -30 + (cubeSize/2) - 18, 30 - (cubeSize/2) + 18, 30 + (cubeSize/2) - 1);
    }
    // electronSpheres.forEach((sphere) => {

    //      // scatter everytime scatterStartTime >= scatterTime in milliseconds
    //      let currentScatterTime = (currentTime - sphere.scatterStartTime)/1000;
    //      console.log("compute: " + currentScatterTime);
    //      console.log("next scatter time: " + sphere.scatterTime);

    //     if (currentScatterTime >= sphere.scatterTime) {
    //         console.log("scatter");
    //         scatter(sphere, index);
    //     }
        
    //     //if electric field is active
    //     const currVelocity = sphere.velocity.clone();
    //     if (acc !== 0) {
    //         const accVector = new THREE.Vector3(-acc, 0, 0); 
    //         currVelocity.add(accVector.multiplyScalar(time));
    //     } 
    //     currVelocity.normalize();
    //     // randomizes the electron speed
    //     currVelocity.multiplyScalar(sphere.speed);
       
    //     // Apply a minimum velocity threshold
    //     const minVelocity = 0.2;
    //     const maxVelocity = 0.6;
    //     currVelocity.clampLength(minVelocity, maxVelocity);

    //     sphere.object.position.add(currVelocity);
    //     sphere.velocity = currVelocity;
    //     checkElectronBounds(sphere, -30 - (cubeSize/2) + 1, -30 + (cubeSize/2) - 18);
    //     index++;
    // }); 

    //hole sphere movement/distribution
    //TODO
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
    let edge = (cubeSize/2) - 2;
    let nedge = -(edge);
    
    if (sphere1.object.position.x >= maxX1) {
        console.log('sphere greater than x pos edge');
        // sphere.object.position.x = -edge;
        sphere1.object.position.x = maxX1 - 1;
        sphere1.velocity.multiplyScalar(-1);
    } else if(sphere1.object.position.x <= minX1){
        // sphere.object.position.x = edge;
        sphere1.object.position.x = minX1 + 1;
        sphere1.velocity.multiplyScalar(-1);
    }

    if (sphere2.object.position.x >= maxX2) {
        console.log('sphere greater than x pos edge');
        // sphere.object.position.x = -edge;
        sphere2.object.position.x = maxX2 - 1;
        sphere2.velocity.multiplyScalar(-1);
    } else if(sphere2.object.position.x <= minX2){
        // sphere.object.position.x = edge;
        sphere2.object.position.x = minX2 + 1;
        sphere2.velocity.multiplyScalar(-1);
    }

    if (sphere1.object.position.y >= edge) {
        console.log('sphere greater than y pos edge');
        sphere1.object.position.y = nedge;
        // sphere.velocity.y *= -1;
    } else if (sphere1.object.position.y <= nedge) {
        sphere1.object.position.y = edge;
        // sphere.velocity.y *= -1;
    }

    if (sphere2.object.position.y >= edge) {
        console.log('sphere greater than y pos edge');
        sphere2.object.position.y = nedge;
        // sphere.velocity.y *= -1;
    } else if (sphere2.object.position.y <= nedge) {
        sphere2.object.position.y = edge;
        // sphere.velocity.y *= -1;
    }

    if (sphere1.object.position.z >= edge) {
        console.log('sphere greater than z pos edge');
        sphere1.object.position.z = nedge;
        // sphere.velocity.z *= -1;
    } else if (sphere1.object.position.z <= nedge) {
        sphere1.object.position.z = edge;
        // sphere.velocity.z *= -1;
    }

    if (sphere2.object.position.z >= edge) {
        console.log('sphere greater than z pos edge');
        sphere2.object.position.z = nedge;
        // sphere.velocity.z *= -1;
    } else if (sphere2.object.position.z <= nedge) {
        sphere2.object.position.z = edge;
        // sphere.velocity.z *= -1;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}


