import * as THREE from 'https://unpkg.com/three/build/three.module.js'; 
import { MathUtils } from 'https://unpkg.com/three/src/math/MathUtils.js';

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
let spheres = [];
let cube1, cube2;
let cubeSize = 75;
let clock = new THREE.Clock();
let xLevel = 0.0;

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

    gui.add(electricFieldControl, 'x', -10.0, 10.0).name('Electric Field V/cm   ').step(0.01).onChange(() => {
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

    // create initial electrons
    for (let i = 0; i < 50; i++) {
        createSphere();
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
function createSphere() {
  const geometry = new THREE.SphereGeometry(1, 32, 32);
  const material = new THREE.MeshBasicMaterial({ color: 0xF8DE7E});
  const sphere = new THREE.Mesh(geometry, material);
  
  // Random position within the cube
  sphere.position.set(
    THREE.MathUtils.randFloat(-cubeSize/2 + 1, cubeSize/2 - 20),
    THREE.MathUtils.randFloat(-cubeSize/2 + 1, cubeSize/2 - 20),
    THREE.MathUtils.randFloat(-cubeSize/2 + 1, cubeSize/2 - 20)
  );
  
  cube1.add(sphere);
  let randomVelocity = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
  spheres.push({ object: sphere, velocity: randomVelocity,
    speed: Math.random() * (maxScalar - minScalar + 1) + minScalar, initVelocity: randomVelocity});
}


function update() {
	requestAnimationFrame( update );
    // let time = 0.01;
    // let time = clock.getDelta();
    // console.log('pre:' + time);
    let time = clock.getDelta()/15;
    console.log("post" + time);
    
    //dis my electric field...
    let electricField = new THREE.Vector3(xLevel, 0, 0);
    let acc = electricField.x;
    
    // scatter every 6 seconds
    if (Date.now() % 6000 < 16.7) {
        console.log("6 sec");
        spheres.forEach((sphere) => {
            sphere.object.material = new THREE.MeshBasicMaterial({color: 0xFF5733});
            setTimeout(() => {
                sphere.object.material = new THREE.MeshBasicMaterial({color: 0xF8DE7E});
            }, 1000);
            sphere.velocity = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
        });
    }
    // adjust velocity
    spheres.forEach((sphere) => {
        //if electric field is active
        const currVelocity = sphere.velocity.clone();
        if (acc !== 0) {
            const accVector = new THREE.Vector3(-acc, 0, 0); 
            currVelocity.add(accVector.multiplyScalar(time));
        }
        
        currVelocity.normalize();
        // randomizes the electron speed
        currVelocity.multiplyScalar(sphere.speed);
       
        // Apply a minimum velocity threshold
        const minVelocity = 0.2;
        const maxVelocity = 0.6;
        currVelocity.clampLength(minVelocity, maxVelocity);

        sphere.object.position.add(currVelocity);
        sphere.velocity = currVelocity;
        checkBounds(sphere);
    }); 
	renderer.render( scene, camera );
}

function checkBounds(sphere) {
    // cube boundaries
    let edge = (cubeSize/2) - 2;
    let nedge = -(edge);
    
    if (sphere.object.position.x >= cubeSize/2 - 20) {
        console.log('sphere greater than x pos edge');
        // sphere.object.position.x = -edge;
        sphere.velocity.x *= -1;
    } else if(sphere.object.position.x <= nedge){
        // sphere.object.position.x = edge;
        sphere.velocity.x *= -1;
    }

    if (sphere.object.position.y >= edge) {
        console.log('sphere greater than y pos edge');
        sphere.object.position.y = -edge;
        // sphere.velocity.y *= -1;
    } else if (sphere.object.position.y <= nedge) {
        sphere.object.position.y = edge;
        // sphere.velocity.y *= -1;
    }
    if (sphere.object.position.z >= edge) {
        console.log('sphere greater than z pos edge');
        sphere.object.position.z = edge;
        // sphere.velocity.z *= -1;
    } else if (sphere.object.position.z <= nedge) {
        sphere.object.position.z = -edge;
        // sphere.velocity.z *= -1;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}


