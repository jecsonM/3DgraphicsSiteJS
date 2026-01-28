import * as THREE from 'three';
import { GLTFLoader } from 'GLTFLoader';
import { FBXLoader } from 'FBXLoader';

import { OrbitControls } from 'OrbitControls';


document.addEventListener('DOMContentLoaded', () => {


    let colliders = [];
    let mainCharacter;
    let characterSpeed = 5;
    let characterSize = 2;

    let clock = new THREE.Clock();
    const status = document.getElementById('status');
    const setStatus = (t) => { if (status) status.textContent = t; };

    const root = document.getElementById('WebGL-output');
    if (!root) return;

   
    if (root.dataset.inited === "1") return;
    root.dataset.inited = "1";

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xEEEEEE);

    const camera = new THREE.PerspectiveCamera(45, root.clientWidth / root.clientHeight, 0.1, 1000);
    camera.position.set(-30, 35, 30);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(root.clientWidth, root.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    root.append(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,    // Left button orbits (default)
        MIDDLE: THREE.MOUSE.DOLLY,   // Middle button zooms (default)
        RIGHT: null                  // Right button does nothing
    };

    scene.add(new THREE.AxesHelper(20));

    //const plane = new THREE.Mesh(
    //    new THREE.PlaneGeometry(80, 40),
    //    new THREE.MeshStandardMaterial({ color: 0xcccccc })
    //);
    //plane.rotation.x = -Math.PI / 2;
    //plane.receiveShadow = true;
    //scene.add(plane);

    const grid = new THREE.GridHelper(200, 40, 0x000000, 0x000000);
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    scene.add(grid);


    // Lights 
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));


    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 4);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff);
    dirLight.position.set(0, 20, 10);
    scene.add(dirLight);



    //const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    //dir.shadow.bias = -0.0005;
    //dir.shadow.normalBias = 0.005;
    //dir.position.set(-30, 50, -10);
    //dir.castShadow = true;
    //dir.shadow.mapSize.set(2048, 2048);
    //dir.shadow.camera.near = 1;
    //dir.shadow.camera.far = 200;
    //dir.shadow.camera.left = -60;
    //dir.shadow.camera.right = 60;
    //dir.shadow.camera.top = 60;
    //dir.shadow.camera.bottom = -60;
    //scene.add(dir);
    let mixer;
    let clips;
    
    const GLTFLloader = new GLTFLoader();
    GLTFLloader.load('/models/porsche959.glb', modelObj => {
        modelObj.scene.position.set(4, 0, -4);
        colliders.push({ 
            coords: modelObj.scene.position,
            radius: 1.5
            })
        scene.add(modelObj.scene);
    },
        function (error) {
            console.log('Error: ' + error)
        })

    GLTFLloader.load('/models/RobotExpressive.glb', modelObj => {
        mainCharacter = modelObj.scene;
        scene.add(modelObj.scene);
        mixer = new THREE.AnimationMixer(modelObj.scene);
        clips = modelObj.animations;
        console.log(clips);

    },
        function (error) {
            console.log('Error: ' + error)
        })

    const loaderFBX = new FBXLoader();
    loaderFBX.load('/models/OwlBear.fbx', someModelObj => {
        
        
        someModelObj.scale.set(0.001, 0.001, 0.001);
        someModelObj.position.set(4, 0, 4);

        colliders.push({
            coords: someModelObj.position,
            radius: 2.5
        })

        scene.add(someModelObj);
    },
        function (error) {
            console.log('Error: ' + error)
        })


    



    const dbMeshes = new Map();

    function meshFromEntity(e) {
        const p = JSON.parse(e.paramsJson ?? "{}");

        let geom;
        if (e.type === 0) {
            geom = new THREE.BoxGeometry(p.width, p.height, p.depth);
        } else if (e.type === 1) {
            geom = new THREE.SphereGeometry(p.radius, p.widthSegments ?? 20, p.heightSegments ?? 20);
        } else if (e.type === 2) {
            geom = new THREE.TorusGeometry(
                p.radius,
                p.tube,
                p.radialSegments ?? 16,
                p.tubularSegments ?? 100
            );
        } else {
            geom = new THREE.BoxGeometry(2, 2, 2);
        }

        const mat = new THREE.MeshStandardMaterial({ color: 0xaa33bb });
        

        const mesh = new THREE.Mesh(geom, mat);

        mesh.position.set(e.x, e.y, e.z);

        if (e.type === 1) { // Sphere
            const r = Number(p.radius ?? 4);
            mesh.position.y = mesh.position.y + r + 0.3;
            
        } else if (e.type === 2) { // Torus
            const R = Number(p.radius ?? 6);   
            const r = Number(p.tube ?? 2);     
            mesh.position.y = mesh.position.y + (R + r) + 0.3;   
        }


        mesh.castShadow = true;
        return mesh;
    }


    async function apiGet() {
        const res = await fetch('/api/shapes', { cache: 'no-store' });
        if (!res.ok) throw new Error(`GET /api/shapes -> ${res.status}`);
        return await res.json();
    }

    async function apiPost(payload) {
        const res = await fetch('/api/shapes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const text = await res.text();
        if (!res.ok) throw new Error(`POST -> ${res.status}: ${text}`);
        return JSON.parse(text);
    }

    async function apiDelete(id) {
        const res = await fetch(`/api/shapes/${id}`, { method: 'DELETE' });
        if (!res.ok && res.status !== 204) throw new Error(`DELETE -> ${res.status}`);
    }

    function renderList(items) {
        const list = document.getElementById('shapeList');
        if (!list) return;

        list.innerHTML = '';
        for (const e of items) {
            const row = document.createElement('div');
            row.className = 'list-group-item d-flex justify-content-between align-items-center';

            const label = document.createElement('div');
            label.textContent = `#${e.id} ${nameOf(e.type)} (${e.x}, ${e.y}, ${e.z})`;

            const btn = document.createElement('button');
            btn.className = 'btn btn-sm btn-danger';
            btn.textContent = 'Удалить';
            btn.addEventListener('click', async () => {
                try {
                    await apiDelete(e.id);
                    await sync();
                } catch (err) {
                    setStatus(String(err));
                }
            });

            row.append(label, btn);
            list.append(row);
        }
    }

    function nameOf(t) {
        if (t === 0) return 'Box';
        if (t === 1) return 'Sphere';
        if (t === 2) return 'Torus';
        return 'Unknown';
    }


    async function sync() {
        try {
            const items = await apiGet();
            const ids = new Set(items.map(x => x.id));

            for (const e of items) {
                if (!dbMeshes.has(e.id)) {
                    const mesh = meshFromEntity(e);
                    dbMeshes.set(e.id, mesh);
                    scene.add(mesh);
                }
            }

            for (const [id, mesh] of dbMeshes.entries()) {
                if (!ids.has(id)) {
                    scene.remove(mesh);
                    mesh.geometry.dispose();
                    mesh.material.dispose();
                    dbMeshes.delete(id);
                }
            }

            renderList(items);
            setStatus(`Загружено фигур из БД: ${items.length}`);
        } catch (err) {
            setStatus(String(err));
        }
    }

    // UI переключение параметров
    const shapeType = document.getElementById('shapeType');
    function toggleParams() {
        const t = Number(shapeType.value);
        document.getElementById('paramsBox').style.display = (t === 0) ? '' : 'none';
        document.getElementById('paramsSphere').style.display = (t === 1) ? '' : 'none';
        document.getElementById('paramsTorus').style.display = (t === 2) ? '' : 'none';
    }
    shapeType.addEventListener('change', toggleParams);
    toggleParams();

    
    document.getElementById('btnAdd').addEventListener('click', async () => {
        try {
            const t = Number(shapeType.value);

            const x = Number(document.getElementById('posX').value);
            const y = Number(document.getElementById('posY').value);
            const z = Number(document.getElementById('posZ').value);

            let params = {};
            if (t === 0) {
                params = {
                    width: Number(document.getElementById('boxW').value),
                    height: Number(document.getElementById('boxH').value),
                    depth: Number(document.getElementById('boxD').value),
                };
            } else if (t === 1) {
                params = {
                    radius: Number(document.getElementById('sphR').value),
                    widthSegments: Number(document.getElementById('sphWS').value),
                    heightSegments: Number(document.getElementById('sphHS').value),
                };
            } else if (t === 2) {
                params = {
                    radius: Number(document.getElementById('torusR').value),
                    tube: Number(document.getElementById('torusTube').value),
                    radialSegments: Number(document.getElementById('torusRadialSeg').value),
                    tubularSegments: Number(document.getElementById('torusTubularSeg').value),
                };
            }

            await apiPost({ type: t, x, y, z, params });
            await sync();
        } catch (err) {
            setStatus(String(err));
        }
    });


    let isRunning = false, isDancing = false, isDead = false;
    document.addEventListener('keydown', function (event) {
        if (isDead)
        {
            event.preventDefault();
            const clip = THREE.AnimationClip.findByName(clips, 'Death');
            const action = mixer.clipAction(clip);
            action.stop();
            isDead = false;
        }
        if (event.code == 'KeyD' && !isDancing) {
            console.log('dancing');
            isDancing = true;
            const clip = THREE.AnimationClip.findByName(clips, 'Dance');
            const action = mixer.clipAction(clip);
            action.reset();
            action.loop = THREE.LoopRepeat;
            action.play();
        }
        else if (event.code == 'ArrowUp' && !isRunning) {
            event.preventDefault();
            console.log('running'); 
            isRunning = true;
            const clip = THREE.AnimationClip.findByName(clips, 'Running');
            const action = mixer.clipAction(clip);
            action.reset();
            action.loop = THREE.LoopRepeat;
            action.play();

            
        }
        else if (event.code == 'Space') {
            event.preventDefault();
            const clip = THREE.AnimationClip.findByName(clips, 'Jump');
            const action = mixer.clipAction(clip);
            action.reset();
            action.loop = THREE.LoopOnce;
            action.play();
        }
        else if (event.code == 'KeyA') {
            event.preventDefault();
            isDead = true;
            const clip = THREE.AnimationClip.findByName(clips, 'Death');
            const action = mixer.clipAction(clip);
            action.reset();
            action.loop = THREE.LoopOnce;
            action.clampWhenFinished = true;
            action.play();
        }
        else if (event.code == 'KeyS') {
            event.preventDefault();
            const clip = THREE.AnimationClip.findByName(clips, 'Punch');
            const action = mixer.clipAction(clip);
            action.reset();
            action.loop = THREE.LoopOnce;
            action.play();
        }
        else if (event.code == 'KeyF') {
            event.preventDefault();
            const clip = THREE.AnimationClip.findByName(clips, 'Wave');
            const action = mixer.clipAction(clip);
            action.reset();
            action.loop = THREE.LoopOnce;
            action.play();
        }

        

        if (event.code == 'ArrowLeft')
        {
            mainCharacter.rotation.y += 0.1;
        }
        else if (event.code == 'ArrowRight')
        {
            mainCharacter.rotation.y -= 0.1;
        }
    });

    document.addEventListener('keyup', function (event) {
        if (event.code == 'ArrowUp' && isRunning) {
            isRunning = false;
            const clip = THREE.AnimationClip.findByName(clips, 'Running');
            const action = mixer.clipAction(clip);
            action.stop();
        }
        else if (event.code == 'KeyD' && isDancing) {
            isDancing = false;
            const clip = THREE.AnimationClip.findByName(clips, 'Dance');
            const action = mixer.clipAction(clip);
            action.stop();
        }
    });

    
    window.addEventListener('resize', () => {
        const w = root.clientWidth;
        const h = root.clientHeight;
        if (!w || !h) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });

    function checkCollision(x,z)
    {
        let nextPos = new THREE.Vector3(x, 0, z);
        let isCollisions = false;
        for (let i = 0; i < colliders.length; i++) {
            if (nextPos.distanceTo(colliders[i].coords) <= (colliders[i].radius+ characterSize))
            {
                isCollisions = true;
                break;
            }
        }
        return isCollisions;
    }

    function moveMainCharacter(dt)
    {
        if (isRunning ) {
            let angle = mainCharacter.rotation.y;
            let nextX = mainCharacter.position.x + Math.sin(angle) * characterSpeed * dt;
            let nextZ = mainCharacter.position.z + Math.cos(angle) * characterSpeed * dt;
            if (!checkCollision(nextX, nextZ))
            {
                mainCharacter.position.x = nextX;
                mainCharacter.position.z = nextZ;
                controls.target = mainCharacter.position;
            }
        }
    }


    // Render loop
    renderer.setAnimationLoop(() => {
        const dt = clock.getDelta();
        moveMainCharacter(dt);
        

        if (mixer)
            mixer.update(dt);

        controls.update();
        renderer.render(scene, camera);
    });

    // Start
    sync();
});
